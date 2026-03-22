# Frontend Code Guide

## Scope

This directory contains a frontend-only Kanban MVP built with Next.js App Router. It currently runs without backend persistence, login, or AI integration.

## Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS v4
- `@dnd-kit` for drag-and-drop
- Vitest + React Testing Library for unit/component tests
- Playwright for e2e tests

## Main structure

- `src/app/page.tsx`: renders `KanbanBoard`.
- `src/components/KanbanBoard.tsx`: main client state and drag/drop orchestration.
- `src/components/KanbanColumn.tsx`: column container, title rename input, list drop zone.
- `src/components/KanbanCard.tsx`: sortable card UI and remove action.
- `src/components/NewCardForm.tsx`: add-card UI/form.
- `src/components/KanbanCardPreview.tsx`: drag overlay preview.
- `src/lib/kanban.ts`: board types, initial demo data, card move logic, id generation.
- `src/app/globals.css`: theme variables and global styling.
- `src/app/layout.tsx`: root layout and font setup.

## Current behavior

- Fixed five-column board is loaded from in-memory `initialData`.
- Column titles can be renamed inline.
- Cards can be added and removed.
- Cards can be reordered in a column or moved across columns by drag-and-drop.
- State resets on page reload because persistence is not implemented yet.

## Testing

- Unit/component tests include `src/lib/kanban.test.ts`.
- Unit/component tests include `src/components/KanbanBoard.test.tsx`.
- E2E tests include `tests/kanban.spec.ts`.

## Commands

- Install: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`
- Unit tests: `npm run test:unit`
- E2E tests: `npm run test:e2e`
- All tests: `npm run test:all`

## Notes for future changes

- Keep existing `data-testid` patterns stable where possible to avoid breaking tests.
- Keep board logic centralized in `src/lib/kanban.ts` and `KanbanBoard.tsx`.
- Avoid introducing backend assumptions here until API integration phase.
