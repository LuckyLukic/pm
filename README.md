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
