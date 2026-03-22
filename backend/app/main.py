from __future__ import annotations

import copy
import json
import os
import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Any

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "frontend"
FALLBACK_INDEX_PATH = BASE_DIR / "static" / "index.html"
DEFAULT_DB_PATH = BASE_DIR / "data" / "pm.db"

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
            connection.commit()
        return BoardEnvelope(board=BoardPayload.model_validate(board))

    @app.put("/api/board", response_model=BoardEnvelope)
    def update_board(
        payload: BoardEnvelope,
        request: Request,
        username: str = Depends(get_authenticated_user),
    ) -> BoardEnvelope:
        board_data = payload.board.model_dump()
        with get_connection(request.app.state.db_path) as connection:
            user_id = ensure_user(connection, username)
            save_board(connection, user_id, board_data)
            connection.commit()
        return BoardEnvelope(board=payload.board)

    if FRONTEND_DIR.exists():
        app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
    else:

        @app.get("/", response_class=FileResponse)
        async def index() -> FileResponse:
            return FileResponse(FALLBACK_INDEX_PATH)

    return app


app = create_app()
