from __future__ import annotations

import copy
import json
import os
import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Any, Literal

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from openai import AuthenticationError, OpenAI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, ValidationError

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "frontend"
FALLBACK_INDEX_PATH = BASE_DIR / "static" / "index.html"
DEFAULT_DB_PATH = BASE_DIR / "data" / "pm.db"
DEFAULT_OPENAI_MODEL = "gpt-5.4-mini"
AI_OUTPUT_FALLBACK_MESSAGE = (
    "I could not apply this AI update safely, so the board was left unchanged."
)

DEFAULT_BOARD: dict[str, Any] = {
    "columns": [
        {"id": "col-backlog", "title": "Backlog", "cardIds": ["card-1", "card-2"]},
        {"id": "col-discovery", "title": "Discovery", "cardIds": ["card-3"]},
        {"id": "col-progress", "title": "In Progress", "cardIds": ["card-4", "card-5"]},
        {"id": "col-review", "title": "Review", "cardIds": ["card-6"]},
        {"id": "col-done", "title": "Done", "cardIds": ["card-7", "card-8"]},
    ],
    "cards": {
        "card-1": {
            "id": "card-1",
            "title": "Align roadmap themes",
            "details": "Draft quarterly themes with impact statements and metrics.",
        },
        "card-2": {
            "id": "card-2",
            "title": "Gather customer signals",
            "details": "Review support tags, sales notes, and churn feedback.",
        },
        "card-3": {
            "id": "card-3",
            "title": "Prototype analytics view",
            "details": "Sketch initial dashboard layout and key drill-downs.",
        },
        "card-4": {
            "id": "card-4",
            "title": "Refine status language",
            "details": "Standardize column labels and tone across the board.",
        },
        "card-5": {
            "id": "card-5",
            "title": "Design card layout",
            "details": "Add hierarchy and spacing for scanning dense lists.",
        },
        "card-6": {
            "id": "card-6",
            "title": "QA micro-interactions",
            "details": "Verify hover, focus, and loading states.",
        },
        "card-7": {
            "id": "card-7",
            "title": "Ship marketing page",
            "details": "Final copy approved and asset pack delivered.",
        },
        "card-8": {
            "id": "card-8",
            "title": "Close onboarding sprint",
            "details": "Document release notes and share internally.",
        },
    },
}


class CardPayload(BaseModel):
    id: str
    title: str
    details: str


class ColumnPayload(BaseModel):
    id: str
    title: str
    cardIds: list[str]


class BoardPayload(BaseModel):
    columns: list[ColumnPayload]
    cards: dict[str, CardPayload]


class BoardEnvelope(BaseModel):
    board: BoardPayload


class AIHealthRequest(BaseModel):
    prompt: str = "2+2"


class AIHealthResponse(BaseModel):
    status: str
    model: str
    prompt: str
    response: str


class ChatMessagePayload(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class AIChatRequest(BaseModel):
    prompt: str
    chat_history: list[ChatMessagePayload] = Field(default_factory=list)


class AIStructuredBoardOutput(BaseModel):
    assistant_response: str
    board: BoardPayload | None = None


class AIChatResponse(BaseModel):
    assistant_response: str
    board: BoardPayload
    board_updated: bool
    used_fallback: bool
    model: str


class AIConnectivityError(Exception):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class AIResponseValidationError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class BoardValidationError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def get_db_path() -> Path:
    db_path = os.getenv("PM_DB_PATH")
    if db_path:
        return Path(db_path)
    return DEFAULT_DB_PATH


def get_connection(db_path: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def initialize_database(db_path: Path) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with get_connection(db_path) as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              username TEXT NOT NULL UNIQUE,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS boards (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL UNIQUE,
              board_json TEXT NOT NULL CHECK (json_valid(board_json)),
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )
        connection.commit()


def ensure_user(connection: sqlite3.Connection, username: str) -> int:
    row = connection.execute(
        "SELECT id FROM users WHERE username = ?",
        (username,),
    ).fetchone()
    if row:
        return int(row["id"])

    cursor = connection.execute(
        "INSERT INTO users (username) VALUES (?)",
        (username,),
    )
    return int(cursor.lastrowid)


def load_or_create_board(connection: sqlite3.Connection, user_id: int) -> dict[str, Any]:
    row = connection.execute(
        "SELECT board_json FROM boards WHERE user_id = ?",
        (user_id,),
    ).fetchone()
    if row:
        return json.loads(str(row["board_json"]))

    board_data = copy.deepcopy(DEFAULT_BOARD)
    connection.execute(
        "INSERT INTO boards (user_id, board_json) VALUES (?, ?)",
        (user_id, json.dumps(board_data)),
    )
    return board_data


def save_board(connection: sqlite3.Connection, user_id: int, board: dict[str, Any]) -> None:
    serialized_board = json.dumps(board)
    row = connection.execute(
        "SELECT id FROM boards WHERE user_id = ?",
        (user_id,),
    ).fetchone()

    if row:
        connection.execute(
            """
            UPDATE boards
            SET board_json = ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
            """,
            (serialized_board, user_id),
        )
        return

    connection.execute(
        "INSERT INTO boards (user_id, board_json) VALUES (?, ?)",
        (user_id, serialized_board),
    )


def get_authenticated_user(
    x_user: Annotated[str | None, Header(alias="X-User")] = None,
) -> str:
    if not x_user or not x_user.strip():
        raise HTTPException(status_code=401, detail="Missing authenticated user header.")
    return x_user.strip()


def get_openai_model() -> str:
    return os.getenv("OPENAI_MODEL", DEFAULT_OPENAI_MODEL)


def run_openai_connectivity_check(api_key: str, model: str, prompt: str) -> str:
    try:
        client = OpenAI(api_key=api_key)
        response = client.responses.create(model=model, input=prompt)
    except AuthenticationError as error:
        raise AIConnectivityError(
            "OpenAI authentication failed. Check OPENAI_API_KEY.",
            status_code=502,
        ) from error
    except Exception as error:
        raise AIConnectivityError(f"OpenAI request failed: {error}") from error

    response_text = (response.output_text or "").strip()
    if not response_text:
        raise AIConnectivityError("OpenAI returned an empty response.")
    return response_text


def build_ai_board_operation_input(
    prompt: str,
    chat_history: list[ChatMessagePayload],
    board: dict[str, Any],
) -> str:
    if chat_history:
        history_text = "\n".join(
            f"{item.role}: {item.content.strip()}" for item in chat_history if item.content.strip()
        )
    else:
        history_text = "(none)"

    return (
        "You are an assistant for a project management board.\n"
        "Return only valid JSON with this shape:\n"
        '{"assistant_response":"string","board":{...optional board payload...}}\n'
        "Use the board field only if updates are needed. If no updates are needed, omit board.\n"
        f"Current board JSON:\n{json.dumps(board)}\n"
        f"Conversation history:\n{history_text}\n"
        f"Latest user prompt:\n{prompt.strip()}"
    )


def run_openai_board_operation(
    api_key: str,
    model: str,
    prompt: str,
    chat_history: list[ChatMessagePayload],
    board: dict[str, Any],
) -> str:
    user_input = build_ai_board_operation_input(
        prompt=prompt,
        chat_history=chat_history,
        board=board,
    )
    try:
        client = OpenAI(api_key=api_key)
        response = client.responses.create(model=model, input=user_input)
    except AuthenticationError as error:
        raise AIConnectivityError(
            "OpenAI authentication failed. Check OPENAI_API_KEY.",
            status_code=502,
        ) from error
    except Exception as error:
        raise AIConnectivityError(f"OpenAI request failed: {error}") from error

    response_text = (response.output_text or "").strip()
    if not response_text:
        raise AIConnectivityError("OpenAI returned an empty response.")
    return response_text


def parse_structured_board_output(raw_output: str) -> AIStructuredBoardOutput:
    try:
        payload = json.loads(raw_output)
    except json.JSONDecodeError as error:
        raise AIResponseValidationError(f"AI response is not valid JSON: {error.msg}") from error

    try:
        structured = AIStructuredBoardOutput.model_validate(payload)
    except ValidationError as error:
        raise AIResponseValidationError("AI response does not match required schema.") from error

    if not structured.assistant_response.strip():
        raise AIResponseValidationError("assistant_response cannot be empty.")

    return structured


def validate_board_integrity(board: dict[str, Any]) -> None:
    cards = board.get("cards", {})
    columns = board.get("columns", [])

    mismatched_ids = [
        card_key for card_key, card_payload in cards.items() if card_payload.get("id") != card_key
    ]
    if mismatched_ids:
        raise BoardValidationError(
            f"Card key/id mismatch for: {', '.join(sorted(mismatched_ids))}."
        )

    seen_card_ids: set[str] = set()
    duplicate_card_ids: set[str] = set()

    for column in columns:
        column_id = column.get("id", "unknown")
        for card_id in column.get("cardIds", []):
            if card_id not in cards:
                raise BoardValidationError(
                    f"Column '{column_id}' references missing card '{card_id}'."
                )
            if card_id in seen_card_ids:
                duplicate_card_ids.add(card_id)
            seen_card_ids.add(card_id)

    if duplicate_card_ids:
        raise BoardValidationError(
            "Cards may appear in only one column. Duplicates: "
            + ", ".join(sorted(duplicate_card_ids))
            + "."
        )

    unassigned_cards = sorted(card_id for card_id in cards if card_id not in seen_card_ids)
    if unassigned_cards:
        raise BoardValidationError(
            "Cards must appear in a column. Unassigned: " + ", ".join(unassigned_cards) + "."
        )


def create_app(db_path: Path | None = None) -> FastAPI:
    resolved_db_path = db_path or get_db_path()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        initialize_database(app.state.db_path)
        yield

    app = FastAPI(title="Project Management MVP Backend", lifespan=lifespan)
    app.state.db_path = resolved_db_path

    @app.get("/api/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/api/board", response_model=BoardEnvelope)
    def read_board(
        request: Request,
        username: str = Depends(get_authenticated_user),
    ) -> BoardEnvelope:
        with get_connection(request.app.state.db_path) as connection:
            user_id = ensure_user(connection, username)
            board = load_or_create_board(connection, user_id)
            try:
                validate_board_integrity(board)
            except BoardValidationError:
                board = copy.deepcopy(DEFAULT_BOARD)
                save_board(connection, user_id, board)
            connection.commit()
        return BoardEnvelope(board=BoardPayload.model_validate(board))

    @app.put("/api/board", response_model=BoardEnvelope)
    def update_board(
        payload: BoardEnvelope,
        request: Request,
        username: str = Depends(get_authenticated_user),
    ) -> BoardEnvelope:
        board_data = payload.board.model_dump()
        try:
            validate_board_integrity(board_data)
        except BoardValidationError as error:
            raise HTTPException(status_code=422, detail=error.message) from error

        with get_connection(request.app.state.db_path) as connection:
            user_id = ensure_user(connection, username)
            save_board(connection, user_id, board_data)
            connection.commit()
        return BoardEnvelope(board=payload.board)

    @app.post("/api/ai/health", response_model=AIHealthResponse)
    def ai_health_check(payload: AIHealthRequest) -> AIHealthResponse:
        api_key = os.getenv("OPENAI_API_KEY", "").strip()
        if not api_key:
            raise HTTPException(
                status_code=500,
                detail="OPENAI_API_KEY is not configured.",
            )

        model = get_openai_model()
        try:
            response_text = run_openai_connectivity_check(
                api_key=api_key,
                model=model,
                prompt=payload.prompt,
            )
        except AIConnectivityError as error:
            raise HTTPException(status_code=error.status_code, detail=error.message) from error

        return AIHealthResponse(
            status="ok",
            model=model,
            prompt=payload.prompt,
            response=response_text,
        )

    @app.post("/api/ai/chat", response_model=AIChatResponse)
    def ai_chat(
        payload: AIChatRequest,
        request: Request,
        username: str = Depends(get_authenticated_user),
    ) -> AIChatResponse:
        api_key = os.getenv("OPENAI_API_KEY", "").strip()
        if not api_key:
            raise HTTPException(
                status_code=500,
                detail="OPENAI_API_KEY is not configured.",
            )

        with get_connection(request.app.state.db_path) as connection:
            user_id = ensure_user(connection, username)
            current_board = load_or_create_board(connection, user_id)
            connection.commit()

        model = get_openai_model()
        try:
            raw_output = run_openai_board_operation(
                api_key=api_key,
                model=model,
                prompt=payload.prompt,
                chat_history=payload.chat_history,
                board=current_board,
            )
        except AIConnectivityError as error:
            raise HTTPException(status_code=error.status_code, detail=error.message) from error

        board_updated = False
        used_fallback = False
        response_text = AI_OUTPUT_FALLBACK_MESSAGE
        final_board = current_board

        try:
            structured = parse_structured_board_output(raw_output)
            response_text = structured.assistant_response.strip()

            if structured.board is not None:
                final_board = structured.board.model_dump()
                validate_board_integrity(final_board)
                with get_connection(request.app.state.db_path) as connection:
                    save_board(connection, user_id, final_board)
                    connection.commit()
                board_updated = True
        except AIResponseValidationError:
            used_fallback = True
        except BoardValidationError:
            used_fallback = True
            response_text = AI_OUTPUT_FALLBACK_MESSAGE
            final_board = current_board

        return AIChatResponse(
            assistant_response=response_text,
            board=BoardPayload.model_validate(final_board),
            board_updated=board_updated,
            used_fallback=used_fallback,
            model=model,
        )

    if FRONTEND_DIR.exists():
        app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
    else:

        @app.get("/", response_class=FileResponse)
        async def index() -> FileResponse:
            return FileResponse(FALLBACK_INDEX_PATH)

    return app


app = create_app()
