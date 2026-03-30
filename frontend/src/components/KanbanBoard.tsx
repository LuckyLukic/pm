"use client";

import { ReactNode, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import { createId, initialData, moveCard, type BoardData } from "@/lib/kanban";
import type { Tag } from "@/lib/boardApi";

type KanbanBoardProps = {
  onLogout?: () => void;
  board?: BoardData;
  onBoardChange?: (board: BoardData) => void;
  saveState?: "idle" | "saving" | "error";
  saveErrorMessage?: string;
  sidebar?: ReactNode;
  projectControls?: ReactNode;
  tags?: Tag[];
};

export const KanbanBoard = ({
  onLogout,
  board,
  onBoardChange,
  saveState = "idle",
  saveErrorMessage,
  sidebar,
  projectControls,
  tags = [],
}: KanbanBoardProps) => {
  const [internalBoard, setInternalBoard] = useState<BoardData>(() => initialData);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const currentBoard = board ?? internalBoard;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    const intersections = rectIntersection(args);
    if (intersections.length > 0) return intersections;
    return closestCorners(args);
  };

  const cardsById = useMemo(() => currentBoard.cards, [currentBoard.cards]);

  const setBoard = (updater: (prev: BoardData) => BoardData) => {
    if (board) {
      const nextBoard = updater(board);
      onBoardChange?.(nextBoard);
      return;
    }
    setInternalBoard((prev) => {
      const nextBoard = updater(prev);
      onBoardChange?.(nextBoard);
      return nextBoard;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);
    if (!over || active.id === over.id) return;
    setBoard((prev) => ({
      ...prev,
      columns: moveCard(prev.columns, active.id as string, over.id as string),
    }));
  };

  const handleRenameColumn = (columnId: string, title: string) => {
    setBoard((prev) => ({
      ...prev,
      columns: prev.columns.map((column) =>
        column.id === columnId ? { ...column, title } : column
      ),
    }));
  };

  const handleAddCard = (columnId: string, title: string, details: string) => {
    const id = createId("card");
    setBoard((prev) => ({
      ...prev,
      cards: {
        ...prev.cards,
        [id]: { id, title, details: details || "No details yet.", tagIds: [] },
      },
      columns: prev.columns.map((column) =>
        column.id === columnId
          ? { ...column, cardIds: [...column.cardIds, id] }
          : column
      ),
    }));
  };

  const handleDeleteCard = (columnId: string, cardId: string) => {
    setBoard((prev) => ({
      ...prev,
      cards: Object.fromEntries(
        Object.entries(prev.cards).filter(([id]) => id !== cardId)
      ),
      columns: prev.columns.map((column) =>
        column.id === columnId
          ? { ...column, cardIds: column.cardIds.filter((id) => id !== cardId) }
          : column
      ),
    }));
  };

  const handleUpdateCard = (cardId: string, title: string, details: string, tagIds?: number[]) => {
    setBoard((prev) => ({
      ...prev,
      cards: {
        ...prev.cards,
        [cardId]: { ...prev.cards[cardId], title, details, tagIds: tagIds ?? prev.cards[cardId].tagIds ?? [] },
      },
    }));
  };

  const activeCard = activeCardId ? cardsById[activeCardId] : null;

  const saveIndicator =
    saveState === "saving" ? (
      <span className="flex items-center gap-1.5 text-xs text-[var(--gray-text)]">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent-yellow)]" />
        Saving...
      </span>
    ) : saveState === "error" ? (
      <span className="flex items-center gap-1.5 text-xs text-red-500" title={saveErrorMessage}>
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Save failed
      </span>
    ) : (
      <span className="flex items-center gap-1.5 text-xs text-[var(--gray-text)]">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Saved
      </span>
    );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--surface)]">
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--stroke)] bg-[var(--surface-overlay)] px-4 py-3 backdrop-blur-sm md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--secondary-purple)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <h1 className="font-display text-base font-semibold text-[var(--navy-dark)]">
            Replay Studio
          </h1>
          {projectControls ? (
            <div className="hidden md:block">{projectControls}</div>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {saveIndicator}

          {sidebar ? (
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--stroke)] text-[var(--gray-text)] transition hover:border-[var(--stroke-strong)] hover:text-[var(--navy-dark)] lg:hidden"
              aria-label="Toggle AI chat"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          ) : null}

          {onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              className="rounded-[var(--radius-sm)] border border-[var(--stroke)] px-3 py-1.5 text-xs font-medium text-[var(--gray-text)] transition hover:border-[var(--stroke-strong)] hover:text-[var(--navy-dark)]"
            >
              Log out
            </button>
          ) : null}
        </div>
      </header>

      {/* Mobile project selector */}
      {projectControls ? (
        <div className="border-b border-[var(--stroke)] bg-white px-4 py-2 md:hidden">
          {projectControls}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragCancel={() => setActiveCardId(null)}
            onDragEnd={handleDragEnd}
          >
            <div className="grid min-w-[900px] gap-4 lg:grid-cols-5">
              {currentBoard.columns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  cards={column.cardIds.map((cardId) => currentBoard.cards[cardId])}
                  tags={tags}
                  onRename={handleRenameColumn}
                  onAddCard={handleAddCard}
                  onDeleteCard={handleDeleteCard}
                  onUpdateCard={handleUpdateCard}
                />
              ))}
            </div>
            <DragOverlay>
              {activeCard ? (
                <div className="w-[240px]">
                  <KanbanCardPreview card={activeCard} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        {sidebar ? (
          <aside className="hidden w-[360px] shrink-0 border-l border-[var(--stroke)] bg-white lg:block">
            <div className="h-full overflow-y-auto">{sidebar}</div>
          </aside>
        ) : null}

        {sidebar && sidebarOpen ? (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-[400px] overflow-y-auto border-l border-[var(--stroke)] bg-white shadow-[var(--shadow-xl)] lg:hidden">
              <div className="sticky top-0 flex items-center justify-between border-b border-[var(--stroke)] bg-white px-4 py-3">
                <span className="text-sm font-medium text-[var(--navy-dark)]">AI Assistant</span>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--gray-text)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--navy-dark)]"
                  aria-label="Close sidebar"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              {sidebar}
            </aside>
          </>
        ) : null}
      </div>
    </div>
  );
};
