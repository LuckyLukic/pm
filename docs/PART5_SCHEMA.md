# Part 5: SQLite Schema (MVP)

## Goal

Model data for:

- Multiple users (future-ready)
- Exactly one board per user for MVP
- Board stored as a JSON blob for simplicity

## Proposed schema

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS boards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  board_json TEXT NOT NULL CHECK (json_valid(board_json)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

Notes:

- `user_id` is `UNIQUE` in `boards` to enforce one board per user.
- `board_json` stores the whole board state payload.
- `json_valid(...)` prevents invalid JSON from being saved.

## Board JSON payload shape

```json
{
  "columns": [
    {
      "id": "col-backlog",
      "title": "Backlog",
      "cardIds": ["card-1", "card-2"]
    }
  ],
  "cards": {
    "card-1": {
      "id": "card-1",
      "title": "Task title",
      "details": "Task details"
    }
  }
}
```

Rules:

- Top-level object with `columns` and `cards`
- `columns`: ordered array
- `cards`: object keyed by `card.id`
- `cardIds` values reference keys in `cards`

## Sample rows (2 users)

```sql
INSERT INTO users (id, username) VALUES
  (1, 'user'),
  (2, 'alice');

INSERT INTO boards (user_id, board_json) VALUES
  (
    1,
    '{"columns":[{"id":"col-backlog","title":"Backlog","cardIds":["card-1"]}],"cards":{"card-1":{"id":"card-1","title":"Align roadmap themes","details":"Draft quarterly themes."}}}'
  ),
  (
    2,
    '{"columns":[{"id":"col-backlog","title":"Backlog","cardIds":["card-a"]}],"cards":{"card-a":{"id":"card-a","title":"Plan launch checklist","details":"Collect open items."}}}'
  );
```

## CRUD walkthrough against schema

- Create board:
  - Insert user row, then insert one `boards` row for that `user_id`.
- Read board:
  - `SELECT board_json FROM boards WHERE user_id = ?`.
- Update board:
  - `UPDATE boards SET board_json = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`.
- Delete user:
  - `DELETE FROM users WHERE id = ?` cascades and removes board.

## Migration approach (MVP)

- Part 6 startup will execute `CREATE TABLE IF NOT EXISTS` statements.
- No migration tool required in MVP.
- If schema changes later, add simple versioned SQL files in `backend/` and run them in order at startup.

## Tradeoffs

- Pros:
  - Fastest implementation path for MVP.
  - Keeps backend API simple (`get board`, `update board`).
  - Easy to evolve from current frontend in-memory shape.
- Cons:
  - Limited queryability inside board content.
  - Whole-board update writes more data than normalized tables.
  - Concurrent edits are coarse-grained (single JSON blob).

## Future scale path

- Keep `users` as-is.
- Allow multiple boards by removing `UNIQUE` on `boards.user_id` and adding board metadata (`name`, `position`).
- If needed, normalize into `boards`, `columns`, `cards` tables while keeping a compatibility adapter for API shape.
