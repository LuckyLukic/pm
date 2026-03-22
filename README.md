# Project Management MVP

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
- Board read API (authenticated header required): `curl -H "X-User: user" http://localhost:8000/api/board`
- Board update API:
  `curl -X PUT -H "Content-Type: application/json" -H "X-User: user" http://localhost:8000/api/board -d '{"board":{"columns":[{"id":"col-backlog","title":"Backlog","cardIds":["card-1"]}],"cards":{"card-1":{"id":"card-1","title":"Task","details":"Notes"}}}}'`

## Part 4 Auth (MVP)

- Login is frontend-only and local to the browser session (`sessionStorage`).
- Valid credentials are exactly `user` / `password`.
- Use the `Log out` button in the board header to clear session auth and return to login.

## Part 7 Integration (MVP)

- Frontend board state loads from backend `GET /api/board`.
- All board edits persist through backend `PUT /api/board`.
- API auth header for MVP is `X-User: user`.
- Persistence e2e command: `cd frontend && npx playwright test tests/persistence.spec.ts --config=playwright.docker.config.ts`

## Part 8 OpenAI Connectivity (MVP)

- Backend connectivity endpoint: `POST /api/ai/health` with body `{"prompt":"2+2"}`.
- Model default is `gpt-5.4-mini` (override with `OPENAI_MODEL`).
- Missing/invalid API key is returned as a clear backend error message.

## Part 9 Structured AI Board Operations (MVP)

- Backend chat endpoint: `POST /api/ai/chat` (requires `X-User` header).
- Request includes `prompt` and `chat_history`; backend also sends current board JSON to the model.
- Model output must match schema: `assistant_response` plus optional `board` payload update.
- Invalid schema output is safely rejected and board state remains unchanged.

## Part 10 AI Sidebar (MVP)

- Frontend includes an AI sidebar chat panel alongside the Kanban board.
- Sidebar sends prompts to `POST /api/ai/chat` and renders conversation history.
- If backend returns a `board` update, Kanban state refreshes immediately in UI.
