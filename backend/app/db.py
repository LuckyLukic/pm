from __future__ import annotations

import copy
import hashlib
import json
import os
import sqlite3
from typing import Any

from app.board import DEFAULT_BOARD

EMPTY_BOARD: dict[str, Any] = {
    "columns": [
        {"id": "col-backlog", "title": "Backlog", "cardIds": []},
        {"id": "col-progress", "title": "In Progress", "cardIds": []},
        {"id": "col-review", "title": "Review", "cardIds": []},
        {"id": "col-done", "title": "Done", "cardIds": []},
    ],
    "cards": {},
}


def get_connection(db_path) -> sqlite3.Connection:
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    return connection


def initialize_database(db_path) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with get_connection(db_path) as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              username TEXT NOT NULL UNIQUE,
              password_hash TEXT,
              password_salt TEXT,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS projects (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              name TEXT NOT NULL,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS tags (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              name TEXT NOT NULL,
              color TEXT NOT NULL DEFAULT '#753991',
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
              UNIQUE(user_id, name)
            );

            CREATE TABLE IF NOT EXISTS boards (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              project_id INTEGER UNIQUE,
              board_json TEXT NOT NULL CHECK (json_valid(board_json)),
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
              FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            );
            """
        )

        # Migrate: add auth columns if missing
        columns = {
            row[1]
            for row in connection.execute("PRAGMA table_info(users)").fetchall()
        }
        if "password_hash" not in columns:
            connection.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")
        if "password_salt" not in columns:
            connection.execute("ALTER TABLE users ADD COLUMN password_salt TEXT")

        # Migrate: add project_id to boards if missing
        board_columns = {
            row[1]
            for row in connection.execute("PRAGMA table_info(boards)").fetchall()
        }
        if "project_id" not in board_columns:
            connection.execute("ALTER TABLE boards ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE")

        # Migrate: remove UNIQUE constraint on user_id in boards (legacy schema had one board per user)
        board_schema = connection.execute(
            "SELECT sql FROM sqlite_master WHERE name='boards'"
        ).fetchone()
        if board_schema and "user_id INTEGER NOT NULL UNIQUE" in str(board_schema[0]):
            connection.executescript(
                """
                CREATE TABLE boards_new (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER NOT NULL,
                  project_id INTEGER UNIQUE,
                  board_json TEXT NOT NULL CHECK (json_valid(board_json)),
                  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
                );
                INSERT INTO boards_new SELECT id, user_id, project_id, board_json, created_at, updated_at FROM boards;
                DROP TABLE boards;
                ALTER TABLE boards_new RENAME TO boards;
                """
            )

        # Migrate: create projects table if it didn't exist (handled by CREATE IF NOT EXISTS above)
        # Migrate existing boards without project_id: create a project for each
        orphan_boards = connection.execute(
            "SELECT b.id, b.user_id FROM boards b WHERE b.project_id IS NULL"
        ).fetchall()
        for board_row in orphan_boards:
            connection.execute(
                "INSERT INTO projects (user_id, name) VALUES (?, ?)",
                (board_row["user_id"], "My Project"),
            )
            project_id = connection.execute("SELECT last_insert_rowid()").fetchone()[0]
            connection.execute(
                "UPDATE boards SET project_id = ? WHERE id = ?",
                (project_id, board_row["id"]),
            )

        connection.commit()


# ---------- Password hashing ----------

def _hash_password(password: str, salt: bytes) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, iterations=260_000
    ).hex()


def create_user(connection: sqlite3.Connection, username: str, password: str) -> int:
    salt = os.urandom(32)
    password_hash = _hash_password(password, salt)
    connection.execute(
        "INSERT INTO users (username, password_hash, password_salt) VALUES (?, ?, ?)",
        (username, password_hash, salt.hex()),
    )
    row = connection.execute(
        "SELECT id FROM users WHERE username = ?",
        (username,),
    ).fetchone()
    return int(row["id"])


def verify_user(connection: sqlite3.Connection, username: str, password: str) -> int | None:
    row = connection.execute(
        "SELECT id, password_hash, password_salt FROM users WHERE username = ?",
        (username,),
    ).fetchone()
    if not row:
        return None
    stored_hash = row["password_hash"]
    stored_salt = row["password_salt"]
    if stored_hash is None or stored_salt is None:
        return None
    computed_hash = _hash_password(password, bytes.fromhex(stored_salt))
    if computed_hash != stored_hash:
        return None
    return int(row["id"])


def user_exists(connection: sqlite3.Connection, username: str) -> bool:
    row = connection.execute(
        "SELECT 1 FROM users WHERE username = ?",
        (username,),
    ).fetchone()
    return row is not None


def ensure_user(connection: sqlite3.Connection, username: str) -> int:
    connection.execute(
        "INSERT OR IGNORE INTO users (username) VALUES (?)",
        (username,),
    )
    row = connection.execute(
        "SELECT id FROM users WHERE username = ?",
        (username,),
    ).fetchone()
    return int(row["id"])


# ---------- Projects ----------

def create_project(connection: sqlite3.Connection, user_id: int, name: str) -> dict[str, Any]:
    connection.execute(
        "INSERT INTO projects (user_id, name) VALUES (?, ?)",
        (user_id, name),
    )
    project_id = connection.execute("SELECT last_insert_rowid()").fetchone()[0]
    board_data = copy.deepcopy(EMPTY_BOARD)
    connection.execute(
        "INSERT INTO boards (user_id, project_id, board_json) VALUES (?, ?, ?)",
        (user_id, project_id, json.dumps(board_data)),
    )
    return {"id": project_id, "name": name}


def list_projects(connection: sqlite3.Connection, user_id: int) -> list[dict[str, Any]]:
    rows = connection.execute(
        "SELECT id, name FROM projects WHERE user_id = ? ORDER BY created_at ASC",
        (user_id,),
    ).fetchall()
    return [{"id": row["id"], "name": row["name"]} for row in rows]


def rename_project(connection: sqlite3.Connection, user_id: int, project_id: int, name: str) -> bool:
    cursor = connection.execute(
        "UPDATE projects SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
        (name, project_id, user_id),
    )
    return cursor.rowcount > 0


def delete_project(connection: sqlite3.Connection, user_id: int, project_id: int) -> bool:
    cursor = connection.execute(
        "DELETE FROM projects WHERE id = ? AND user_id = ?",
        (project_id, user_id),
    )
    return cursor.rowcount > 0


def get_project(connection: sqlite3.Connection, user_id: int, project_id: int) -> dict[str, Any] | None:
    row = connection.execute(
        "SELECT id, name FROM projects WHERE id = ? AND user_id = ?",
        (project_id, user_id),
    ).fetchone()
    if not row:
        return None
    return {"id": row["id"], "name": row["name"]}


# ---------- Boards (project-scoped) ----------

def load_board_for_project(connection: sqlite3.Connection, user_id: int, project_id: int) -> dict[str, Any] | None:
    row = connection.execute(
        "SELECT board_json FROM boards WHERE project_id = ? AND user_id = ?",
        (project_id, user_id),
    ).fetchone()
    if row:
        return json.loads(str(row["board_json"]))
    return None


def save_board_for_project(connection: sqlite3.Connection, user_id: int, project_id: int, board: dict[str, Any]) -> None:
    serialized_board = json.dumps(board)
    row = connection.execute(
        "SELECT id FROM boards WHERE project_id = ? AND user_id = ?",
        (project_id, user_id),
    ).fetchone()

    if row:
        connection.execute(
            "UPDATE boards SET board_json = ?, updated_at = CURRENT_TIMESTAMP WHERE project_id = ? AND user_id = ?",
            (serialized_board, project_id, user_id),
        )
        return

    connection.execute(
        "INSERT INTO boards (user_id, project_id, board_json) VALUES (?, ?, ?)",
        (user_id, project_id, serialized_board),
    )


# ---------- Tags ----------

def create_tag(connection: sqlite3.Connection, user_id: int, name: str, color: str) -> dict[str, Any]:
    connection.execute(
        "INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?)",
        (user_id, name, color),
    )
    tag_id = connection.execute("SELECT last_insert_rowid()").fetchone()[0]
    return {"id": tag_id, "name": name, "color": color}


def list_tags(connection: sqlite3.Connection, user_id: int) -> list[dict[str, Any]]:
    rows = connection.execute(
        "SELECT id, name, color FROM tags WHERE user_id = ? ORDER BY name ASC",
        (user_id,),
    ).fetchall()
    return [{"id": row["id"], "name": row["name"], "color": row["color"]} for row in rows]


def update_tag(connection: sqlite3.Connection, user_id: int, tag_id: int, name: str | None, color: str | None) -> bool:
    updates: list[str] = []
    params: list[Any] = []
    if name is not None:
        updates.append("name = ?")
        params.append(name)
    if color is not None:
        updates.append("color = ?")
        params.append(color)
    if not updates:
        return True
    params.extend([tag_id, user_id])
    cursor = connection.execute(
        f"UPDATE tags SET {', '.join(updates)} WHERE id = ? AND user_id = ?",
        params,
    )
    return cursor.rowcount > 0


def delete_tag(connection: sqlite3.Connection, user_id: int, tag_id: int) -> bool:
    cursor = connection.execute(
        "DELETE FROM tags WHERE id = ? AND user_id = ?",
        (tag_id, user_id),
    )
    return cursor.rowcount > 0


def get_or_create_tag(connection: sqlite3.Connection, user_id: int, name: str, color: str) -> dict[str, Any]:
    row = connection.execute(
        "SELECT id, name, color FROM tags WHERE user_id = ? AND name = ?",
        (user_id, name),
    ).fetchone()
    if row:
        return {"id": row["id"], "name": row["name"], "color": row["color"]}
    return create_tag(connection, user_id, name, color)


# ---------- Legacy (kept for backward compat in tests) ----------

def load_or_create_board(connection: sqlite3.Connection, user_id: int) -> dict[str, Any]:
    row = connection.execute(
        "SELECT board_json FROM boards WHERE user_id = ?",
        (user_id,),
    ).fetchone()
    if row:
        return json.loads(str(row["board_json"]))

    board_data = copy.deepcopy(DEFAULT_BOARD)
    try:
        connection.execute(
            "INSERT INTO boards (user_id, board_json) VALUES (?, ?)",
            (user_id, json.dumps(board_data)),
        )
    except sqlite3.IntegrityError:
        row = connection.execute(
            "SELECT board_json FROM boards WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        if row:
            return json.loads(str(row["board_json"]))
    return board_data


def save_board(connection: sqlite3.Connection, user_id: int, board: dict[str, Any]) -> None:
    serialized_board = json.dumps(board)
    row = connection.execute(
        "SELECT id FROM boards WHERE user_id = ?",
        (user_id,),
    ).fetchone()

    if row:
        connection.execute(
            """
            UPDATE boards
            SET board_json = ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
            """,
            (serialized_board, user_id),
        )
        return

    connection.execute(
        "INSERT INTO boards (user_id, board_json) VALUES (?, ?)",
        (user_id, serialized_board),
    )
