from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Project Management MVP Backend")

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "frontend"
FALLBACK_INDEX_PATH = BASE_DIR / "static" / "index.html"


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
else:
    @app.get("/", response_class=FileResponse)
    async def index() -> FileResponse:
        return FileResponse(FALLBACK_INDEX_PATH)
