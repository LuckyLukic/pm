import copy
import json
from pathlib import Path
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.ai import AI_OUTPUT_FALLBACK_MESSAGE, parse_structured_board_output
from app.main import create_app
from app.models import AIResponseValidationError


def test_parse_structured_board_output_accepts_valid_payload() -> None:
    parsed = parse_structured_board_output('{"assistant_response":"No changes needed."}')
    assert parsed.assistant_response == "No changes needed."
    assert parsed.board is None


def test_parse_structured_board_output_rejects_invalid_json() -> None:
    with pytest.raises(AIResponseValidationError):
        parse_structured_board_output("not-json")


def test_ai_chat_request_history_default_is_not_shared() -> None:
    from app.models import AIChatRequest, ChatMessagePayload

    first = AIChatRequest(prompt="a")
    second = AIChatRequest(prompt="b")
    first.chat_history.append(ChatMessagePayload(role="user", content="hello"))

    assert first.chat_history != second.chat_history
    assert second.chat_history == []


def test_ai_chat_returns_response_without_board_update(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("OPENAI_MODEL", "gpt-5.4-mini")

    def fake_board_operation(
        api_key: str,
        model: str,
        prompt: str,
        chat_history: list[object],
        board: dict[str, object],
    ) -> str:
        assert api_key == "test-key"
        assert model == "gpt-5.4-mini"
        assert prompt == "Give me a short summary"
        assert len(chat_history) == 1
        assert "columns" in board
        return json.dumps({"assistant_response": "Board looks good as-is."})

    monkeypatch.setattr("app.ai.run_openai_board_operation", fake_board_operation)

    app = create_app(db_path=tmp_path / "ai-chat-no-update.db")
    with TestClient(app) as client:
        baseline = client.get("/api/board", headers={"X-User": "user"}).json()["board"]

        response = client.post(
            "/api/ai/chat",
            headers={"X-User": "user"},
            json={
                "prompt": "Give me a short summary",
                "chat_history": [{"role": "user", "content": "What is the status?"}],
            },
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["assistant_response"] == "Board looks good as-is."
        assert payload["board_updated"] is False
        assert payload["used_fallback"] is False
        assert payload["board"] == baseline

        persisted = client.get("/api/board", headers={"X-User": "user"}).json()["board"]
        assert persisted == baseline


def test_ai_chat_persists_valid_board_update(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("OPENAI_MODEL", "gpt-5.4-mini")

    def fake_board_operation(
        api_key: str,
        model: str,
        prompt: str,
        chat_history: list[object],
        board: dict[str, object],
    ) -> str:
        updated_board = copy.deepcopy(board)
        updated_board["cards"]["card-1"]["title"] = "AI Updated Card Title"
        return json.dumps(
            {
                "assistant_response": "I updated card-1 title.",
                "board": updated_board,
            }
        )

    monkeypatch.setattr("app.ai.run_openai_board_operation", fake_board_operation)

    app = create_app(db_path=tmp_path / "ai-chat-update.db")
    with TestClient(app) as client:
        response = client.post(
            "/api/ai/chat",
            headers={"X-User": "user"},
            json={"prompt": "Rename card-1 title", "chat_history": []},
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["assistant_response"] == "I updated card-1 title."
        assert payload["board_updated"] is True
        assert payload["used_fallback"] is False
        assert payload["board"]["cards"]["card-1"]["title"] == "AI Updated Card Title"

        persisted = client.get("/api/board", headers={"X-User": "user"}).json()["board"]
        assert persisted["cards"]["card-1"]["title"] == "AI Updated Card Title"


def test_ai_chat_uses_fallback_on_invalid_board_schema(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    def fake_board_operation(
        api_key: str,
        model: str,
        prompt: str,
        chat_history: list[object],
        board: dict[str, object],
    ) -> str:
        return json.dumps(
            {
                "assistant_response": "This would break schema.",
                "board": {"columns": [], "cards": []},
            }
        )

    monkeypatch.setattr("app.ai.run_openai_board_operation", fake_board_operation)

    app = create_app(db_path=tmp_path / "ai-chat-invalid.db")
    with TestClient(app) as client:
        baseline = client.get("/api/board", headers={"X-User": "user"}).json()["board"]

        response = client.post(
            "/api/ai/chat",
            headers={"X-User": "user"},
            json={"prompt": "Do anything", "chat_history": []},
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["assistant_response"] == AI_OUTPUT_FALLBACK_MESSAGE
        assert payload["board_updated"] is False
        assert payload["used_fallback"] is True
        assert payload["board"] == baseline

        persisted = client.get("/api/board", headers={"X-User": "user"}).json()["board"]
        assert persisted == baseline


def test_ai_chat_uses_fallback_on_board_integrity_violation(
    tmp_path: Path, monkeypatch
) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    def fake_board_operation(
        api_key: str,
        model: str,
        prompt: str,
        chat_history: list[object],
        board: dict[str, object],
    ) -> str:
        return json.dumps(
            {
                "assistant_response": "Moving card to backlog.",
                "board": {
                    "columns": [
                        {"id": "col-backlog", "title": "Backlog", "cardIds": ["card-404"]}
                    ],
                    "cards": {},
                },
            }
        )

    monkeypatch.setattr("app.ai.run_openai_board_operation", fake_board_operation)

    app = create_app(db_path=tmp_path / "ai-chat-integrity-invalid.db")
    with TestClient(app) as client:
        baseline = client.get("/api/board", headers={"X-User": "user"}).json()["board"]

        response = client.post(
            "/api/ai/chat",
            headers={"X-User": "user"},
            json={"prompt": "Do anything", "chat_history": []},
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["assistant_response"] == AI_OUTPUT_FALLBACK_MESSAGE
        assert payload["board_updated"] is False
        assert payload["used_fallback"] is True
        assert payload["board"] == baseline

        persisted = client.get("/api/board", headers={"X-User": "user"}).json()["board"]
        assert persisted == baseline
