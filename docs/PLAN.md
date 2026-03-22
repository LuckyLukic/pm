# Project Plan (MVP)

## Locked decisions

- AI provider: OpenAI API (`OPENAI_API_KEY`)
- Model: `gpt-5.4-mini`
- Auth for MVP: hardcoded credentials `user` / `password`
- Data: one board per user, SQLite local DB auto-created if missing

## Working agreement

- Execute parts in order.
- After each part, stop and request explicit user approval before starting the next part.
- Sign-off message format: `Approved Part X`.
- Keep implementation simple and MVP-scoped only.

## Part 1: Plan

Checklist

- [x] Expand this plan with detailed substeps, tests, success criteria, and sign-off gates.
- [x] Create `frontend/AGENTS.md` documenting the existing frontend codebase.
- [x] User reviews and signs off on Part 1.

Tests

- [x] Documentation consistency check completed for provider/model alignment.
- [x] Confirm `frontend/AGENTS.md` exists in repository.

Success criteria

- [x] Every part includes concrete checklist items.
- [x] Every part includes explicit test commands or test actions.
- [x] Every part includes an explicit sign-off gate.

Sign-off gate

- [x] User message: `Approved Part 1`

## Part 2: Scaffolding

Checklist

- [x] Add Docker build/runtime setup for full app.
- [x] Scaffold FastAPI app in `backend/`.
- [x] Add basic health API route and static hello page route.
- [x] Add start/stop scripts in `scripts/` for macOS, Linux, and Windows.
- [x] Document run instructions in a minimal root README section.

Tests

- [x] Build image: `docker build -t pm-mvp .`
- [x] Run container and verify static page: `curl http://localhost:<port>/`
- [x] Verify API health: `curl http://localhost:<port>/api/health`
- [x] Verify start/stop scripts execute without errors on macOS shell.
- [x] Validate backend Python module syntax: `python3 -m py_compile backend/app/main.py`
- [x] Validate macOS/Linux script syntax: `bash -n scripts/start_mac.sh scripts/stop_mac.sh scripts/start_linux.sh scripts/stop_linux.sh`

Success criteria

- [x] Single Docker container runs backend and serves a page at `/`.
- [x] API responds successfully from inside running container.
- [x] Scripts start and stop app consistently.

Sign-off gate

- [x] User message: `Approved Part 2`

## Part 3: Serve Existing Frontend

Checklist

- [x] Build Next.js frontend assets for production.
- [x] Configure FastAPI to serve static frontend at `/`.
- [x] Keep Kanban demo behavior unchanged.
- [x] Ensure routing works when served from backend container.

Tests

- [x] Frontend unit tests: `cd frontend && npm run test:unit`
- [x] Frontend e2e tests: `cd frontend && npm run test:e2e`
- [x] Container smoke test: open `/` and confirm Kanban renders.

Success criteria

- [x] Visiting `/` shows the existing Kanban UI from the built frontend.
- [x] Existing unit and e2e frontend tests pass.
- [x] No frontend regression in drag/add/delete/rename flows.

Sign-off gate

- [x] User message: `Approved Part 3`

## Part 4: Fake Sign-In Experience

Checklist

- [x] Add login screen at app entry when not authenticated.
- [x] Validate only `user` / `password`.
- [x] Add logout flow.
- [x] Keep auth state simple and local for MVP.

Tests

- [x] Unit auth flow test: `cd frontend && npm run test:unit -- src/app/page.auth.test.tsx`
- [x] E2E auth flow test spec created: `cd frontend && npm run test:e2e -- tests/auth.spec.ts` (execution blocked in sandbox; accepted at sign-off)

Success criteria

- [x] Board access requires successful dummy login.
- [x] Logout reliably clears authenticated state.
- [x] No regression to Kanban interactions after login.

Sign-off gate

- [x] User message: `Approved Part 4`

## Part 5: Database Modeling

Checklist

- [x] Propose SQLite schema for users and one-board-per-user storage.
- [x] Store board state as JSON blob for MVP simplicity.
- [x] Document schema, migration approach, and tradeoffs in `docs/`.
- [x] Obtain user schema sign-off before coding backend persistence.

Tests

- [x] Schema walkthrough with sample rows for at least 2 users.
- [x] Validate CRUD scenarios against schema design (read/write/update board JSON).
- [x] Confirm schema supports future multi-user scale path.

Success criteria

- [x] Schema is documented and unambiguous.
- [x] JSON board payload shape is explicitly defined.
- [x] User approves schema document before implementation.

Sign-off gate

- [x] User message: `Approved Part 5`

## Part 6: Backend Kanban API

Checklist

- [x] Implement DB initialization on startup if DB file is missing.
- [x] Add API routes to fetch and update board by authenticated user.
- [x] Add API route tests for success and failure cases.
- [x] Keep endpoints minimal and aligned with frontend needs.

Tests

- [x] Backend tests: `docker compose run --rm app sh -lc "uv sync --dev && uv run pytest tests/test_board_api.py"`
- [x] API smoke tests via `curl` for read and update flows.
- [x] DB creation test from empty filesystem state.

Success criteria

- [x] Backend can persist and return board state per user.
- [x] API tests pass and cover happy/error paths.
- [x] DB auto-creation works with no manual setup.

Sign-off gate

- [x] User message: `Approved Part 6`

## Part 7: Frontend + Backend Integration

Checklist

- [x] Replace in-memory frontend board state with backend API calls.
- [x] Persist edits/moves/adds/deletes through backend.
- [x] Keep UX responsive with clear loading/error handling.

Tests

- [x] Frontend unit tests for API client/state integration: `cd frontend && npm run test:unit -- src/app/page.integration.test.tsx src/app/page.auth.test.tsx`
- [x] Backend tests remain green: `docker compose run --rm app sh -lc "uv sync --dev && uv run pytest tests/test_board_api.py"`
- [x] E2E persistence test: `cd frontend && npx playwright test tests/persistence.spec.ts --config=playwright.docker.config.ts`

Success criteria

- [x] Board changes persist across refreshes.
- [x] Integration does not break login flow.
- [x] Unit + integration + e2e coverage passes for core board flows.

Sign-off gate

- [x] User message: `Approved Part 7`

## Part 8: OpenAI Connectivity

Checklist

- [x] Add backend OpenAI client integration using `OPENAI_API_KEY`.
- [x] Configure model to `gpt-5.4-mini`.
- [x] Add a minimal backend test endpoint or internal check for AI call health.

Tests

- [x] Connectivity test prompt: `2+2`.
- [x] Verify response is returned through backend endpoint/service.
- [x] Verify behavior for missing/invalid API key.

Success criteria

- [x] Backend successfully reaches OpenAI with configured model.
- [x] Errors are surfaced clearly when key/model call fails.
- [x] Connectivity test is repeatable from local environment.

Sign-off gate

- [x] User message: `Approved Part 8`

## Part 9: Structured AI Board Operations

Checklist

- [x] Define structured output schema with an `assistant_response` field.
- [x] Add optional board update payload shape to the same schema.
- [x] Send current board JSON, user prompt, and chat history to model.
- [x] Apply validated board updates from AI output.
- [x] Add server-side validation and fallback on invalid outputs.

Tests

- [x] Unit tests for structured output parser/validator.
- [x] Integration tests for AI responses with and without board updates.
- [x] Regression tests for invalid schema payload handling.

Success criteria

- [x] AI responses are schema-conformant before use.
- [x] Optional board updates are applied safely and persist correctly.
- [x] Invalid AI outputs do not corrupt board data.

Sign-off gate

- [x] User message: `Approved Part 9`

## Part 10: AI Sidebar in UI

Checklist

- [x] Add sidebar chat UI to frontend.
- [x] Connect chat UI to backend AI endpoint.
- [x] Render conversation history.
- [x] Auto-refresh board state when AI returns board updates.
- [x] Keep visual style aligned with project color scheme.

Tests

- [x] Component tests for chat sidebar rendering and input behavior.
- [x] E2E: user sends message and receives assistant response.
- [x] E2E: AI-triggered board update appears in UI without manual refresh.
- [x] Full smoke test in Docker container.

Success criteria

- [x] Chat works end-to-end from UI to OpenAI and back.
- [x] AI-initiated board updates appear correctly in Kanban.
- [x] Existing Kanban and auth flows remain stable.

Sign-off gate

- [x] User message: `Approved Part 10`
