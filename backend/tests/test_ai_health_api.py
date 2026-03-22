from pathlib import Path
import sys

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import AIConnectivityError, create_app


def test_ai_health_returns_error_when_api_key_missing(
    tmp_path: Path, monkeypatch
) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    app = create_app(db_path=tmp_path / "missing-key.db")
    with TestClient(app) as client:
        response = client.post("/api/ai/health", json={"prompt": "2+2"})

    assert response.status_code == 500
    assert response.json()["detail"] == "OPENAI_API_KEY is not configured."


def test_ai_health_returns_response_payload(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("OPENAI_MODEL", "gpt-5.4-mini")

    def fake_connectivity_check(api_key: str, model: str, prompt: str) -> str:
        assert api_key == "test-key"
        assert model == "gpt-5.4-mini"
        assert prompt == "2+2"
        return "4"

    monkeypatch.setattr("app.main.run_openai_connectivity_check", fake_connectivity_check)

    app = create_app(db_path=tmp_path / "success.db")
    with TestClient(app) as client:
        response = client.post("/api/ai/health", json={"prompt": "2+2"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["model"] == "gpt-5.4-mini"
    assert payload["prompt"] == "2+2"
    assert payload["response"] == "4"


def test_ai_health_surfaces_authentication_failure(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "invalid-key")

    def fake_connectivity_check(api_key: str, model: str, prompt: str) -> str:
        assert api_key == "invalid-key"
        assert model == "gpt-5.4-mini"
        assert prompt == "2+2"
        raise AIConnectivityError(
            "OpenAI authentication failed. Check OPENAI_API_KEY.",
            status_code=502,
        )

    monkeypatch.setattr("app.main.run_openai_connectivity_check", fake_connectivity_check)

    app = create_app(db_path=tmp_path / "invalid-key.db")
    with TestClient(app) as client:
        response = client.post("/api/ai/health", json={"prompt": "2+2"})

    assert response.status_code == 502
    assert "OpenAI authentication failed" in response.json()["detail"]
