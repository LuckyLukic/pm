# Code Review and Refactoring Report

Date: 2026-03-25

## Objective

Full codebase review focused on: removing unnecessary files, simplifying logic, splitting monolith files into smaller modules for scalability and maintainability.

---

## 1. Files and Folders Removed

| Path | Reason |
|------|--------|
| `.DS_Store` (root, backend, frontend) | OS artifacts, not source code |
| `frontend/public/file.svg, globe.svg, next.svg, vercel.svg, window.svg` | Unused Next.js boilerplate assets |
| `backend/app/static/` (entire directory) | Scaffolding fallback page, dead code in Docker production |
| `docs/PLAN.md` | Completed build plan, no longer relevant |
| `docs/PART5_SCHEMA.md` | Completed schema docs, schema is self-documenting in code |
| `docs/code_review.md` (previous) | Superseded by this report |
| `docs/review.md` (previous) | Superseded by this report |
| `backend/AGENTS.md` | Scaffolding instructions, not operational docs |
| `frontend/AGENTS.md` | Scaffolding instructions, not operational docs |
| `scripts/AGENTS.md` | Scaffolding instructions, not operational docs |
| `frontend/README.md` | Next.js boilerplate, not project-specific |
| `scripts/start_mac.sh, start_linux.sh` | Identical to each other, consolidated into `start.sh` |
| `scripts/stop_mac.sh, stop_linux.sh` | Identical to each other, consolidated into `stop.sh` |

`.gitignore` was trimmed from 150+ lines (Django, Flask, Scrapy, Jupyter, etc.) to 20 lines covering only Python, Node, SQLite, and OS artifacts.

The static fallback route (`FALLBACK_INDEX_PATH`, `index()`) was removed from `main.py`. FastAPI now only mounts the frontend if `backend/app/frontend/` exists.

---

## 2. Backend Refactoring: Module Split

`backend/app/main.py` (560+ lines) was split into 5 focused modules:

| Module | Responsibility | Key exports |
|--------|---------------|-------------|
| `models.py` | Pydantic models, custom exceptions | `BoardPayload`, `AIChatRequest`, `AIConnectivityError`, etc. |
| `db.py` | SQLite connection (WAL mode), schema init, CRUD | `get_connection`, `initialize_database`, `ensure_user`, `load_or_create_board`, `save_board` |
| `board.py` | Default board data, integrity validation | `DEFAULT_BOARD`, `validate_board_integrity` |
| `ai.py` | OpenAI integration, prompt building, response parsing | `run_openai_connectivity_check`, `run_openai_board_operation`, `parse_structured_board_output` |
| `main.py` | App factory, routes, auth, rate limiter | `create_app`, `get_authenticated_user`, `RateLimiter` |

Backend tests were updated to import from the correct modules (e.g., `app.models.AIConnectivityError`, `app.ai.parse_structured_board_output`). Monkeypatch targets updated from `app.main.*` to `app.ai.*`.

---

## 3. Frontend Refactoring: Custom Hooks

`frontend/src/app/page.tsx` (320+ lines) was decomposed into 3 custom hooks:

| Hook | Responsibility |
|------|---------------|
| `hooks/useAuth.ts` | Auth state (sessionStorage), login/logout handlers, credential validation |
| `hooks/useBoard.ts` | Board loading (AbortController), persistence (debounced save), error states |
| `hooks/useAiChat.ts` | Chat history, send/cancel (60s timeout), board update from AI response |

`page.tsx` is now ~140 lines of clean composition. A `CenteredCard` layout component was extracted to eliminate repeated wrapper markup.

---

## 4. Lint Fix: KanbanCard.tsx

Replaced the `useEffect` that synced `card.title`/`card.details` props into local state with a simpler pattern: local edit state (`editTitle`/`editDetails`) is populated on-demand when the user clicks Edit, and the card always reads from props when not editing. This eliminated the `react-hooks/set-state-in-effect` lint error.

---

## 5. Auth Hook: Lint-Clean Initialization

The auth hook originally used `useEffect` to read `sessionStorage` on mount, which triggered `react-hooks/set-state-in-effect`. Since the app uses `output: "export"` (no SSR), the fix was to use a lazy `useState` initializer that reads `sessionStorage` directly, removing the effect entirely.

---

## Test Results

All tests pass after refactoring:

```
Backend tests:  14/14 passed
Frontend unit:  15/15 passed
Frontend e2e:    7/7 passed
Frontend lint:   0 errors
```

### Backend (14 tests)
- test_board_api.py: 4 passed (auth, default board, persist, integrity rejection)
- test_ai_health_api.py: 3 passed (missing key, success, auth failure)
- test_ai_board_ops_api.py: 7 passed (parse, history isolation, no-update, update, schema fallback, integrity fallback)

### Frontend Unit (15 tests)
- kanban.test.ts: 8 passed (reorder, move, drop, MVP columns, edge cases)
- page.auth.test.tsx: 1 passed (login/logout flow)
- page.integration.test.tsx: 1 passed (board API integration)
- page.ai-sidebar.test.tsx: 1 passed (AI chat flow)
- KanbanBoard.test.tsx: 4 passed (rendering, interactions)

### Frontend E2E (7 tests)
- auth.spec.ts: 1 passed (sign-in/logout)
- kanban.spec.ts: 3 passed (load, add card, drag-and-drop)
- ai-sidebar.spec.ts: 1 passed (AI reply + board update)
- ai-sidebar.live.spec.ts: 1 passed (live OpenAI connectivity)
- persistence.spec.ts: 1 passed (reload persistence)

---

## Files Modified

| File | Changes |
|------|---------|
| `backend/app/main.py` | Reduced from 560+ to ~180 lines. Routes + auth + rate limiter only |
| `backend/app/models.py` | New. All Pydantic models and exceptions |
| `backend/app/db.py` | New. Database connection and CRUD |
| `backend/app/board.py` | New. Default board data and integrity validation |
| `backend/app/ai.py` | New. OpenAI integration |
| `backend/tests/test_ai_health_api.py` | Updated imports and monkeypatch targets |
| `backend/tests/test_ai_board_ops_api.py` | Updated imports and monkeypatch targets |
| `frontend/src/app/page.tsx` | Reduced from 320+ to ~140 lines using custom hooks |
| `frontend/src/hooks/useAuth.ts` | New. Auth state management |
| `frontend/src/hooks/useBoard.ts` | New. Board loading and persistence |
| `frontend/src/hooks/useAiChat.ts` | New. AI chat state management |
| `frontend/src/components/KanbanCard.tsx` | Fixed lint error (removed useEffect for prop sync) |
| `.gitignore` | Trimmed from 150+ to 20 relevant lines |
| `CLAUDE.md` | Updated architecture docs to reflect new module structure |
