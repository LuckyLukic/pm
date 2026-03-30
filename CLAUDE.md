# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Replay Studio -- a multi-project Kanban board app with AI chat sidebar. Runs entirely in Docker. Each user can create multiple projects (each with its own board). Registration and login backed by SQLite (passwords hashed via PBKDF2).

## Commands

### Running the app

```bash
./scripts/start.sh   # docker compose up -d --build
./scripts/stop.sh    # docker compose down
```

App is served at `http://localhost:8000`.

### Backend tests (run inside Docker)

```bash
docker compose run --rm app sh -lc "uv sync --dev && uv run pytest tests/test_board_api.py"
docker compose run --rm app sh -lc "uv sync --dev && uv run pytest tests/test_ai_health_api.py"
docker compose run --rm app sh -lc "uv sync --dev && uv run pytest tests/test_ai_board_ops_api.py"
# All backend tests:
docker compose run --rm app sh -lc "uv sync --dev && uv run pytest"
```

### Frontend commands (run from `frontend/`)

```bash
npm install
npm run dev               # local dev server (no backend)
npm run build             # production build
npm run test:unit         # vitest
npm run test:e2e          # playwright (dev server)
npm run test:e2e:docker   # playwright (Docker, serial)
npm run test:all          # unit + e2e
npm run lint
```

Run a single unit test file:
```bash
cd frontend && npm run test:unit -- src/lib/kanban.test.ts
```

## Architecture

### Request flow

1. Browser hits FastAPI at `localhost:8000`
2. FastAPI serves the static Next.js export from `backend/app/frontend/` (copied in at Docker build time via Dockerfile)
3. User registers via `POST /api/auth/register` and logs in via `POST /api/auth/login`
4. After login, frontend stores the username in `sessionStorage` and sends `X-User: <username>` header on all API requests
5. Projects API (`GET/POST /api/projects`, `PUT/DELETE /api/projects/{id}`) manages user projects
6. Board API (`GET/PUT /api/projects/{id}/board`) reads/writes board state as JSON blob in SQLite
7. AI chat (`POST /api/projects/{id}/ai/chat`) sends current board JSON + chat history to OpenAI; response is `{assistant_response, board?}` -- if `board` is present and valid, it replaces the stored board
8. AI plan (`POST /api/projects/{id}/ai/plan`) generates structured project plan with macro-points, tasks, and tags
9. Tags API (`GET/POST /api/tags`, `PUT/DELETE /api/tags/{id}`) manages reusable tags per user

### Authentication

- `POST /api/auth/register` -- creates a new user with PBKDF2-hashed password (260k iterations, random salt)
- `POST /api/auth/login` -- verifies username/password against stored hash
- Board and AI endpoints use `X-User` header to identify the authenticated user
- Frontend stores auth state in `sessionStorage` (cleared on tab close)
- Users table has `username` (unique), `password_hash`, and `password_salt` columns
- New users get a default "My Project" created on registration

### Backend (`backend/app/`)

Modular FastAPI app using `create_app(db_path)` factory (enables test isolation via `tmp_path`).

- **`main.py`** -- App factory, route handlers (auth, projects, board, AI), auth dependency (`get_authenticated_user`), rate limiter
- **`models.py`** -- All Pydantic models (`AuthRequest`, `AuthResponse`, `ProjectPayload`, `BoardPayload`, etc.) and custom exceptions
- **`db.py`** -- SQLite connection (WAL mode), schema init, user auth CRUD, project CRUD, tag CRUD (`create_tag`, `list_tags`, `update_tag`, `delete_tag`, `get_or_create_tag`), board CRUD (`load_board_for_project`, `save_board_for_project`)
- **`board.py`** -- `DEFAULT_BOARD` data, `validate_board_integrity` (no duplicates, no orphans)
- **`ai.py`** -- OpenAI calls, prompt building (chat + plan modes), structured response parsing, fallback logic

Tests monkeypatch `app.ai.run_openai_connectivity_check` and `app.ai.run_openai_board_operation`.

### Frontend (`frontend/src/`)

Next.js 16 App Router with static export. After Docker build, the export is copied into the backend.

- **`hooks/useAuth.ts`** -- Auth state, async login/register via API, session persistence
- **`hooks/useProjects.ts`** -- Project list, selection (persisted in sessionStorage), CRUD operations
- **`hooks/useBoard.ts`** -- Board loading (with AbortController), persistence, change handling (project-scoped)
- **`hooks/useAiChat.ts`** -- Chat state with Plan/Chat mode toggle, send/cancel (120s timeout), board update handling (project-scoped)
- **`hooks/useTags.ts`** -- Tag list, CRUD operations, reloading after AI plan generation
- **`app/page.tsx`** -- Auth screens (login/register tabs), project loading, board view, loading/error states
- **`lib/kanban.ts`** -- Board types, `moveCard` logic, `createId` (crypto.randomUUID)
- **`lib/boardApi.ts`** -- API client (`loginUser`, `registerUser`, `listProjects`, `createProject`, `renameProject`, `deleteProject`, `listTags`, `createTag`, `updateTag`, `deleteTag`, `fetchBoard`, `saveBoard`, `sendAiChat`, `sendAiPlan`)
- **`components/`** -- KanbanBoard, KanbanColumn, KanbanCard, KanbanCardPreview, NewCardForm, AIChatSidebar, ProjectDropdown, CreateProjectModal, ErrorBoundary

`data-testid` attributes are used by e2e tests -- keep them stable.

### UI layout

- Full viewport height layout with compact top bar, board area, and AI sidebar
- AI chat is a fixed-width right panel on desktop (`lg:` breakpoint), toggleable slide-over drawer on mobile
- Board grid scrolls horizontally on narrow screens (`min-w-[900px]`)
- Auth screens have login/register tab switcher with form validation

### Docker

`docker-compose.yml` builds a single image exposing port 8000 with volume persistence (`pm_data`), health check, and resource limits. Runs as non-root `appuser`.

## Key conventions

- **No emojis** anywhere in code or docs
- AI model: `gpt-5.4-mini` (env var `OPENAI_MODEL` overrides; `OPENAI_API_KEY` is in `.env`)
- DB path: `backend/app/data/pm.db` by default; override with `PM_DB_PATH` env var
- Python managed by `uv` inside Docker; do not use pip
- Keep board logic in `src/lib/kanban.ts` and `KanbanBoard.tsx`; avoid scattering it into components
- Color scheme: Yellow `#ecad0a`, Blue `#209dd7`, Purple `#753991`, Navy `#0f1729`, Gray `#64748b`
- Design tokens defined as CSS variables in `globals.css` (shadows, radii, strokes, surfaces)
- Password hashing uses `hashlib.pbkdf2_hmac` with `sha256`, 260k iterations, and a random 32-byte salt (no external dependencies)
