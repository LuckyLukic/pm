## Backend folder

This folder contains the FastAPI backend scaffold for Part 2.

- `pyproject.toml`: Python dependencies managed by `uv`.
- `app/main.py`: FastAPI app with:
- `GET /api/health` returning `{ "status": "ok" }`
- `/` serving static frontend files from `app/frontend` when present
- fallback `GET /` serving `app/static/index.html` when frontend build output is absent
- `app/static/index.html`: static hello page that calls `/api/health` with client-side fetch.
- `app/frontend/`: copied at Docker build time from Next static export output.
