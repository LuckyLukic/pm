from pathlib import Path
import sys

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import create_app


def test_board_requires_authenticated_user_header(tmp_path: Path) -> None:
    app = create_app(db_path=tmp_path / "test.db")
    with TestClient(app) as client:
        response = client.get("/api/board")
    assert response.status_code == 401


def test_database_is_created_and_default_board_is_returned(tmp_path: Path) -> None:
    db_path = tmp_path / "pm.db"
    assert not db_path.exists()

    app = create_app(db_path=db_path)
    with TestClient(app) as client:
        response = client.get("/api/board", headers={"X-User": "user"})
    assert response.status_code == 200
    assert db_path.exists()

    payload = response.json()
    assert "board" in payload
    assert "columns" in payload["board"]
    assert "cards" in payload["board"]


def test_board_update_persists_for_authenticated_user(tmp_path: Path) -> None:
    app = create_app(db_path=tmp_path / "persist.db")
    updated_board = {
        "columns": [
            {
                "id": "col-backlog",
                "title": "Backlog",
                "cardIds": ["card-99"],
            }
        ],
        "cards": {
            "card-99": {
                "id": "card-99",
                "title": "Persisted card",
                "details": "Stored in sqlite",
                "tagIds": [],
            }
        },
    }

    with TestClient(app) as client:
        put_response = client.put(
            "/api/board",
            headers={"X-User": "user"},
            json={"board": updated_board},
        )
        assert put_response.status_code == 200

        get_response = client.get("/api/board", headers={"X-User": "user"})
        assert get_response.status_code == 200
        assert get_response.json()["board"] == updated_board


def test_board_update_rejects_missing_card_reference(tmp_path: Path) -> None:
    app = create_app(db_path=tmp_path / "invalid-board.db")
    invalid_board = {
        "columns": [
            {
                "id": "col-backlog",
                "title": "Backlog",
                "cardIds": ["card-missing"],
            }
        ],
        "cards": {},
    }

    with TestClient(app) as client:
        response = client.put(
            "/api/board",
            headers={"X-User": "user"},
            json={"board": invalid_board},
        )

    assert response.status_code == 422
    assert "references missing card" in response.json()["detail"]
