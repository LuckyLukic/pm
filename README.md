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

## Part 4 Auth (MVP)

- Login is frontend-only and local to the browser session (`sessionStorage`).
- Valid credentials are exactly `user` / `password`.
- Use the `Log out` button in the board header to clear session auth and return to login.
