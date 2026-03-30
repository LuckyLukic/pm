# Replay Studio

## Runbook

### Start

- macOS: `./scripts/start_mac.sh`
- Linux: `./scripts/start_linux.sh`
- Windows (PowerShell): `.\scripts\start_windows.ps1`

### Stop

- macOS: `./scripts/stop_mac.sh`
- Linux: `./scripts/stop_linux.sh`
- Windows (PowerShell): `.\scripts\stop_windows.ps1`

### Restart

- macOS/Linux: run stop script, then start script.
- Windows (PowerShell): run stop script, then start script.

### Smoke checks

- Kanban frontend via backend static serving: `http://localhost:8000/`
- Health API: `http://localhost:8000/api/health`
- Register a new user: `curl -X POST -H "Content-Type: application/json" http://localhost:8000/api/auth/register -d '{"username":"user","password":"password"}'`
- Login: `curl -X POST -H "Content-Type: application/json" http://localhost:8000/api/auth/login -d '{"username":"user","password":"password"}'`
- List projects: `curl -H "X-User: user" http://localhost:8000/api/projects`
- Create project: `curl -X POST -H "Content-Type: application/json" -H "X-User: user" http://localhost:8000/api/projects -d '{"name":"New Project"}'`
- Board read API (project-scoped): `curl -H "X-User: user" http://localhost:8000/api/projects/1/board`
- Board update API:
  `curl -X PUT -H "Content-Type: application/json" -H "X-User: user" http://localhost:8000/api/projects/1/board -d '{"board":{"columns":[{"id":"col-backlog","title":"Backlog","cardIds":["card-1"]}],"cards":{"card-1":{"id":"card-1","title":"Task","details":"Notes"}}}}'`

## Authentication

- Users register and log in through real API endpoints backed by SQLite.
- Passwords are hashed with PBKDF2 (SHA-256, 260k iterations) and a random salt per user.
- `POST /api/auth/register` creates a new account (username must be unique, password min 6 chars).
- `POST /api/auth/login` verifies credentials and returns the username on success.
- After login, the frontend stores the username in `sessionStorage` and sends it as the `X-User` header on subsequent API calls.
- Use the `Log out` button in the board header to clear session auth and return to login.

## Part 7 Integration (MVP)

- Frontend board state loads from backend `GET /api/projects/{id}/board`.
- All board edits persist through backend `PUT /api/projects/{id}/board`.
- API auth header is `X-User: <username>` (set automatically after login).
- Persistence e2e command: `cd frontend && npx playwright test tests/persistence.spec.ts --config=playwright.docker.config.ts`

## Part 8 OpenAI Connectivity (MVP)

- Backend connectivity endpoint: `POST /api/ai/health` with body `{"prompt":"2+2"}`.
- Model default is `gpt-5.4-mini` (override with `OPENAI_MODEL`).
- Missing/invalid API key is returned as a clear backend error message.

## Part 9 Structured AI Board Operations (MVP)

- Backend chat endpoint: `POST /api/projects/{id}/ai/chat` (requires `X-User` header).
- Request includes `prompt` and `chat_history`; backend also sends current board JSON to the model.
- Model output must match schema: `assistant_response` plus optional `board` payload update.
- Invalid schema output is safely rejected and board state remains unchanged.

## Part 10 AI Sidebar (MVP)

- Frontend includes an AI sidebar chat panel alongside the Kanban board.
- On desktop, the sidebar is a fixed right panel. On mobile, it is a toggleable slide-over drawer.
- Sidebar has two modes: Chat (free-form board operations) and Plan (structured project planning).
- Chat mode sends prompts to `POST /api/projects/{id}/ai/chat` and renders conversation history.
- Plan mode sends project description to `POST /api/projects/{id}/ai/plan`, which generates macro-points with tasks and tags.
- If backend returns a `board` update, Kanban state refreshes immediately in UI.

## Tags

- Tags are reusable across all projects for a user.
- Tags API: `GET/POST /api/tags`, `PUT/DELETE /api/tags/{id}`.
- Each tag has a name and color (hex).
- Cards can have multiple tags (stored as `tagIds` array in card data).
- Tags appear as colored badges on cards in the Kanban view.
- AI Plan mode auto-creates tags for macro-points and assigns them to generated tasks.
- Users can add/remove tags on any card through the card edit interface.
