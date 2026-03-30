from __future__ import annotations

import collections
import copy
import logging
import os
import re
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.staticfiles import StaticFiles

from app import ai, db
from app.board import DEFAULT_BOARD, validate_board_integrity
from app.models import (
    AIChatResponse,
    AIHealthRequest,
    AIHealthResponse,
    AIPlanRequest,
    AuthRequest,
    AuthResponse,
    BoardEnvelope,
    BoardPayload,
    BoardValidationError,
    AIConnectivityError,
    AIResponseValidationError,
    AIChatRequest,
    ProjectPayload,
    ProjectCreateRequest,
    ProjectRenameRequest,
    TagPayload,
    TagCreateRequest,
    TagUpdateRequest,
)

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "frontend"
DEFAULT_DB_PATH = BASE_DIR / "data" / "pm.db"


class RateLimiter:
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self._max_requests = max_requests
        self._window_seconds = window_seconds
        self._requests: dict[str, collections.deque[float]] = {}

    def check(self, key: str) -> bool:
        now = time.monotonic()
        if key not in self._requests:
            self._requests[key] = collections.deque()
        timestamps = self._requests[key]
        while timestamps and now - timestamps[0] > self._window_seconds:
            timestamps.popleft()
        if len(timestamps) >= self._max_requests:
            return False
        timestamps.append(now)
        return True


ai_rate_limiter = RateLimiter(max_requests=10, window_seconds=60)


def get_db_path() -> Path:
    db_path_env = os.getenv("PM_DB_PATH")
    if db_path_env:
        return Path(db_path_env)
    return DEFAULT_DB_PATH


def get_authenticated_user(
    x_user: Annotated[str | None, Header(alias="X-User")] = None,
) -> str:
    if not x_user or not x_user.strip():
        raise HTTPException(status_code=401, detail="Missing authenticated user header.")
    cleaned = x_user.strip()
    if not re.match(r'^[a-zA-Z0-9_-]{1,100}$', cleaned):
        raise HTTPException(status_code=401, detail="Invalid user header.")
    return cleaned


def create_app(db_path: Path | None = None) -> FastAPI:
    resolved_db_path = db_path or get_db_path()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        logger.info("Initializing database at %s", app.state.db_path)
        db.initialize_database(app.state.db_path)
        logger.info("Application startup complete")
        yield

    app = FastAPI(title="Replay Studio Backend", lifespan=lifespan)
    app.state.db_path = resolved_db_path

    @app.get("/api/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    # ---------- Auth ----------

    @app.post("/api/auth/register", response_model=AuthResponse)
    def register(payload: AuthRequest, request: Request) -> AuthResponse:
        with db.get_connection(request.app.state.db_path) as connection:
            if db.user_exists(connection, payload.username):
                raise HTTPException(status_code=409, detail="Username already taken.")
            user_id = db.create_user(connection, payload.username, payload.password)
            db.create_project(connection, user_id, "My Project")
            connection.commit()
        return AuthResponse(username=payload.username, message="Account created successfully.")

    @app.post("/api/auth/login", response_model=AuthResponse)
    def login(payload: AuthRequest, request: Request) -> AuthResponse:
        with db.get_connection(request.app.state.db_path) as connection:
            user_id = db.verify_user(connection, payload.username, payload.password)
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid username or password.")
        return AuthResponse(username=payload.username, message="Login successful.")

    # ---------- Projects ----------

    @app.get("/api/projects", response_model=list[ProjectPayload])
    def list_projects(
        request: Request,
        username: str = Depends(get_authenticated_user),
    ) -> list[ProjectPayload]:
        with db.get_connection(request.app.state.db_path) as connection:
            user_id = db.ensure_user(connection, username)
            projects = db.list_projects(connection, user_id)
            connection.commit()
        return [ProjectPayload(**p) for p in projects]

    @app.post("/api/projects", response_model=ProjectPayload, status_code=201)
    def create_project(
        payload: ProjectCreateRequest,
        request: Request,
        username: str = Depends(get_authenticated_user),
    ) -> ProjectPayload:
        with db.get_connection(request.app.state.db_path) as connection:
            user_id = db.ensure_user(connection, username)
            project = db.create_project(connection, user_id, payload.name)
            connection.commit()
        return ProjectPayload(**project)

    @app.put("/api/projects/{project_id}", response_model=ProjectPayload)
    def rename_project(
        project_id: int,
        payload: ProjectRenameRequest,
        request: Request,
        username: str = Depends(get_authenticated_user),
    ) -> ProjectPayload:
        with db.get_connection(request.app.state.db_path) as connection:
            user_id = db.ensure_user(connection, username)
            if not db.rename_project(connection, user_id, project_id, payload.name):
                raise HTTPException(status_code=404, detail="Project not found.")
            connection.commit()
        return ProjectPayload(id=project_id, name=payload.name)

    @app.delete("/api/projects/{project_id}", status_code=204)
    def delete_project_endpoint(
        project_id: int,
        request: Request,
        username: str = Depends(get_authenticated_user),
    ) -> None:
        with db.get_connection(request.app.state.db_path) as connection:
            user_id = db.ensure_user(connection, username)
            if not db.delete_project(connection, user_id, project_id):
                raise HTTPException(status_code=404, detail="Project not found.")
            connection.commit()

    # ---------- Tags ----------

    @app.get("/api/tags", response_model=list[TagPayload])
    def list_tags(
        request: Request,
        username: str = Depends(get_authenticated_user),
    ) -> list[TagPayload]:
        with db.get_connection(request.app.state.db_path) as connection:
            user_id = db.ensure_user(connection, username)
            tags = db.list_tags(connection, user_id)
            connection.commit()
        return [TagPayload(**t) for t in tags]

    @app.post("/api/tags", response_model=TagPayload, status_code=201)
    def create_tag(
        payload: TagCreateRequest,
        request: Request,
        username: str = Depends(get_authenticated_user),
    ) -> TagPayload:
        with db.get_connection(request.app.state.db_path) as connection:
            user_id = db.ensure_user(connection, username)
            try:
                tag = db.create_tag(connection, user_id, payload.name, payload.color)
            except Exception:
                raise HTTPException(status_code=409, detail="Tag with this name already exists.")
            connection.commit()
        return TagPayload(**tag)

    @app.put("/api/tags/{tag_id}", response_model=TagPayload)
    def update_tag(
        tag_id: int,
        payload: TagUpdateRequest,
        request: Request,
        username: str = Depends(get_authenticated_user),
    ) -> TagPayload:
        with db.get_connection(request.app.state.db_path) as connection:
            user_id = db.ensure_user(connection, username)
            if not db.update_tag(connection, user_id, tag_id, payload.name, payload.color):
                raise HTTPException(status_code=404, detail="Tag not found.")
            connection.commit()
            tags = db.list_tags(connection, user_id)
            tag = next((t for t in tags if t["id"] == tag_id), None)
            if not tag:
                raise HTTPException(status_code=404, detail="Tag not found.")
        return TagPayload(**tag)

    @app.delete("/api/tags/{tag_id}", status_code=204)
    def delete_tag_endpoint(
        tag_id: int,
        request: Request,
        username: str = Depends(get_authenticated_user),
    ) -> None:
        with db.get_connection(request.app.state.db_path) as connection:
            user_id = db.ensure_user(connection, username)
            if not db.delete_tag(connection, user_id, tag_id):
                raise HTTPException(status_code=404, detail="Tag not found.")
            connection.commit()

    # ---------- Board (project-scoped) ----------

    @app.get("/api/projects/{project_id}/board", response_model=BoardEnvelope)
    def read_project_board(
        project_id: int,
        request: Request,
        username: str = Depends(get_authenticated_user),
    ) -> BoardEnvelope:
        with db.get_connection(request.app.state.db_path) as connection:
            user_id = db.ensure_user(connection, username)
            project = db.get_project(connection, user_id, project_id)
            if not project:
                raise HTTPException(status_code=404, detail="Project not found.")
            board = db.load_board_for_project(connection, user_id, project_id)
            if not board:
                board = copy.deepcopy(db.EMPTY_BOARD)
                db.save_board_for_project(connection, user_id, project_id, board)
            else:
                try:
                    validate_board_integrity(board)
                except BoardValidationError as exc:
                    logger.warning("Board integrity failed for project %d: %s. Resetting.", project_id, exc)
                    board = copy.deepcopy(db.EMPTY_BOARD)
                    db.save_board_for_project(connection, user_id, project_id, board)
            connection.commit()
        return BoardEnvelope(board=BoardPayload.model_validate(board))

    @app.put("/api/projects/{project_id}/board", response_model=BoardEnvelope)
    def update_project_board(
        project_id: int,
        payload: BoardEnvelope,
        request: Request,
        username: str = Depends(get_authenticated_user),
    ) -> BoardEnvelope:
        board_data = payload.board.model_dump()
        try:
            validate_board_integrity(board_data)
        except BoardValidationError as error:
            raise HTTPException(status_code=422, detail=error.message) from error

        with db.get_connection(request.app.state.db_path) as connection:
            user_id = db.ensure_user(connection, username)
            project = db.get_project(connection, user_id, project_id)
            if not project:
                raise HTTPException(status_code=404, detail="Project not found.")
            db.save_board_for_project(connection, user_id, project_id, board_data)
            connection.commit()
        return BoardEnvelope(board=payload.board)

    # ---------- AI ----------

    @app.post("/api/ai/health", response_model=AIHealthResponse)
    def ai_health_check(payload: AIHealthRequest) -> AIHealthResponse:
        if not ai_rate_limiter.check("__health__"):
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again later.")
        api_key = os.getenv("OPENAI_API_KEY", "").strip()
        if not api_key:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured.")

        model = ai.get_openai_model()
        try:
            response_text = ai.run_openai_connectivity_check(
                api_key=api_key, model=model, prompt=payload.prompt,
            )
        except AIConnectivityError as error:
            raise HTTPException(status_code=error.status_code, detail=error.message) from error

        return AIHealthResponse(
            status="ok", model=model, prompt=payload.prompt, response=response_text,
        )

    @app.post("/api/projects/{project_id}/ai/chat", response_model=AIChatResponse)
    def ai_chat(
        project_id: int,
        payload: AIChatRequest,
        request: Request,
        username: str = Depends(get_authenticated_user),
    ) -> AIChatResponse:
        if not ai_rate_limiter.check(username):
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again later.")
        api_key = os.getenv("OPENAI_API_KEY", "").strip()
        if not api_key:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured.")

        with db.get_connection(request.app.state.db_path) as connection:
            user_id = db.ensure_user(connection, username)
            project = db.get_project(connection, user_id, project_id)
            if not project:
                raise HTTPException(status_code=404, detail="Project not found.")
            current_board = db.load_board_for_project(connection, user_id, project_id)
            if not current_board:
                current_board = copy.deepcopy(db.EMPTY_BOARD)
            connection.commit()

        model = ai.get_openai_model()
        try:
            raw_output = ai.run_openai_board_operation(
                api_key=api_key, model=model, prompt=payload.prompt,
                chat_history=payload.chat_history, board=current_board,
            )
        except AIConnectivityError as error:
            raise HTTPException(status_code=error.status_code, detail=error.message) from error

        board_updated = False
        used_fallback = False
        response_text = ai.AI_OUTPUT_FALLBACK_MESSAGE
        final_board = current_board

        try:
            structured = ai.parse_structured_board_output(raw_output)
            response_text = structured.assistant_response.strip()

            if structured.board is not None:
                final_board = structured.board.model_dump()
                validate_board_integrity(final_board)
                with db.get_connection(request.app.state.db_path) as connection:
                    db.save_board_for_project(connection, user_id, project_id, final_board)
                    connection.commit()
                board_updated = True
        except AIResponseValidationError as exc:
            logger.warning("AI response validation failed: %s", exc)
            used_fallback = True
        except BoardValidationError as exc:
            logger.warning("AI board integrity check failed: %s", exc)
            used_fallback = True
            response_text = ai.AI_OUTPUT_FALLBACK_MESSAGE
            final_board = current_board

        return AIChatResponse(
            assistant_response=response_text,
            board=BoardPayload.model_validate(final_board),
            board_updated=board_updated,
            used_fallback=used_fallback,
            model=model,
        )

    @app.post("/api/projects/{project_id}/ai/plan", response_model=AIChatResponse)
    def ai_plan(
        project_id: int,
        payload: AIPlanRequest,
        request: Request,
        username: str = Depends(get_authenticated_user),
    ) -> AIChatResponse:
        if not ai_rate_limiter.check(username):
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again later.")
        api_key = os.getenv("OPENAI_API_KEY", "").strip()
        if not api_key:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured.")

        with db.get_connection(request.app.state.db_path) as connection:
            user_id = db.ensure_user(connection, username)
            project = db.get_project(connection, user_id, project_id)
            if not project:
                raise HTTPException(status_code=404, detail="Project not found.")
            current_board = db.load_board_for_project(connection, user_id, project_id)
            if not current_board:
                current_board = copy.deepcopy(db.EMPTY_BOARD)
            existing_tags = db.list_tags(connection, user_id)
            connection.commit()

        model = ai.get_openai_model()
        try:
            raw_output = ai.run_openai_plan_operation(
                api_key=api_key, model=model, description=payload.description,
                chat_history=payload.chat_history, board=current_board,
                existing_tags=existing_tags,
            )
        except AIConnectivityError as error:
            raise HTTPException(status_code=error.status_code, detail=error.message) from error

        board_updated = False
        used_fallback = False
        response_text = ai.AI_OUTPUT_FALLBACK_MESSAGE
        final_board = current_board

        try:
            structured = ai.parse_structured_plan_output(raw_output)
            response_text = structured["assistant_response"]

            if structured.get("tags") and structured.get("board"):
                with db.get_connection(request.app.state.db_path) as connection:
                    user_id = db.ensure_user(connection, username)
                    tag_id_map: dict[str, int] = {}
                    for tag_info in structured["tags"]:
                        tag = db.get_or_create_tag(connection, user_id, tag_info["name"], tag_info["color"])
                        tag_id_map[tag_info["name"]] = tag["id"]

                    plan_board = structured["board"]
                    for card in plan_board.get("cards", {}).values():
                        tag_names = card.get("tagNames", [])
                        card["tagIds"] = [tag_id_map[n] for n in tag_names if n in tag_id_map]
                        card.pop("tagNames", None)

                    validated = BoardPayload.model_validate(plan_board)
                    final_board = validated.model_dump()
                    validate_board_integrity(final_board)
                    db.save_board_for_project(connection, user_id, project_id, final_board)
                    connection.commit()
                    board_updated = True
            elif structured.get("board"):
                validated = BoardPayload.model_validate(structured["board"])
                final_board = validated.model_dump()
                validate_board_integrity(final_board)
                with db.get_connection(request.app.state.db_path) as connection:
                    db.save_board_for_project(connection, user_id, project_id, final_board)
                    connection.commit()
                board_updated = True
        except (AIResponseValidationError, BoardValidationError, Exception) as exc:
            logger.warning("AI plan processing failed: %s", exc)
            used_fallback = True
            response_text = ai.AI_OUTPUT_FALLBACK_MESSAGE
            final_board = current_board

        return AIChatResponse(
            assistant_response=response_text,
            board=BoardPayload.model_validate(final_board),
            board_updated=board_updated,
            used_fallback=used_fallback,
            model=model,
        )

    # ---------- Legacy board routes (backward compat for old tests) ----------

    @app.get("/api/board", response_model=BoardEnvelope)
    def read_board(
        request: Request,
        username: str = Depends(get_authenticated_user),
    ) -> BoardEnvelope:
        with db.get_connection(request.app.state.db_path) as connection:
            user_id = db.ensure_user(connection, username)
            board = db.load_or_create_board(connection, user_id)
            try:
                validate_board_integrity(board)
            except BoardValidationError as exc:
                logger.warning("Board integrity failed for user %s: %s. Resetting.", username, exc)
                board = copy.deepcopy(DEFAULT_BOARD)
                db.save_board(connection, user_id, board)
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

        with db.get_connection(request.app.state.db_path) as connection:
            user_id = db.ensure_user(connection, username)
            db.save_board(connection, user_id, board_data)
            connection.commit()
        return BoardEnvelope(board=payload.board)

    @app.post("/api/ai/chat", response_model=AIChatResponse)
    def ai_chat_legacy(
        payload: AIChatRequest,
        request: Request,
        username: str = Depends(get_authenticated_user),
    ) -> AIChatResponse:
        if not ai_rate_limiter.check(username):
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again later.")
        api_key = os.getenv("OPENAI_API_KEY", "").strip()
        if not api_key:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured.")

        with db.get_connection(request.app.state.db_path) as connection:
            user_id = db.ensure_user(connection, username)
            current_board = db.load_or_create_board(connection, user_id)
            connection.commit()

        model = ai.get_openai_model()
        try:
            raw_output = ai.run_openai_board_operation(
                api_key=api_key, model=model, prompt=payload.prompt,
                chat_history=payload.chat_history, board=current_board,
            )
        except AIConnectivityError as error:
            raise HTTPException(status_code=error.status_code, detail=error.message) from error

        board_updated = False
        used_fallback = False
        response_text = ai.AI_OUTPUT_FALLBACK_MESSAGE
        final_board = current_board

        try:
            structured = ai.parse_structured_board_output(raw_output)
            response_text = structured.assistant_response.strip()

            if structured.board is not None:
                final_board = structured.board.model_dump()
                validate_board_integrity(final_board)
                with db.get_connection(request.app.state.db_path) as connection:
                    db.save_board(connection, user_id, final_board)
                    connection.commit()
                board_updated = True
        except AIResponseValidationError as exc:
            logger.warning("AI response validation failed: %s", exc)
            used_fallback = True
        except BoardValidationError as exc:
            logger.warning("AI board integrity check failed: %s", exc)
            used_fallback = True
            response_text = ai.AI_OUTPUT_FALLBACK_MESSAGE
            final_board = current_board

        return AIChatResponse(
            assistant_response=response_text,
            board=BoardPayload.model_validate(final_board),
            board_updated=board_updated,
            used_fallback=used_fallback,
            model=model,
        )

    # ---------- Static files ----------

    if FRONTEND_DIR.exists():
        app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

    return app


app = create_app()
