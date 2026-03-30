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
import { addColumn, createId, deleteColumn, initialData, moveCard, type BoardData } from "@/lib/kanban";
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
  onCreateTag?: (name: string, color: string) => Promise<Tag>;
  onUpdateTag?: (tagId: number, data: { name?: string; color?: string }) => Promise<Tag>;
  onDeleteTag?: (tagId: number) => Promise<void>;
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
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
}: KanbanBoardProps) => {
  const [internalBoard, setInternalBoard] = useState<BoardData>(() => initialData);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarVisible, setDesktopSidebarVisible] = useState(true);
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

  const handleAddColumn = () => {
    setBoard((prev) => addColumn(prev));
  };

  const handleDeleteColumn = (columnId: string) => {
    setBoard((prev) => deleteColumn(prev, columnId));
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

          {onCreateTag ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setTagManagerOpen(!tagManagerOpen)}
                className="flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--stroke)] px-2.5 text-[var(--gray-text)] transition hover:border-[var(--stroke-strong)] hover:text-[var(--navy-dark)]"
                aria-label="Manage tags"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
                <span className="hidden text-xs font-medium sm:inline">Tags</span>
              </button>
              {tagManagerOpen ? (
                <TagManager
                  tags={tags}
                  onCreateTag={onCreateTag}
                  onUpdateTag={onUpdateTag}
                  onDeleteTag={onDeleteTag}
                  onClose={() => setTagManagerOpen(false)}
                />
              ) : null}
            </div>
          ) : null}

          {sidebar ? (
            <>
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
              <button
                type="button"
                onClick={() => setDesktopSidebarVisible(!desktopSidebarVisible)}
                className="hidden h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--stroke)] text-[var(--gray-text)] transition hover:border-[var(--stroke-strong)] hover:text-[var(--navy-dark)] lg:flex"
                aria-label={desktopSidebarVisible ? "Hide AI chat" : "Show AI chat"}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  {!desktopSidebarVisible && <line x1="9" y1="9" x2="15" y2="15" />}
                </svg>
              </button>
            </>
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
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${currentBoard.columns.length + 1}, minmax(250px, 1fr))`,
              }}
            >
              {currentBoard.columns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  cards={column.cardIds.map((cardId) => currentBoard.cards[cardId])}
                  tags={tags}
                  canDelete={currentBoard.columns.length > 1}
                  onRename={handleRenameColumn}
                  onAddCard={handleAddCard}
                  onDeleteCard={handleDeleteCard}
                  onDeleteColumn={handleDeleteColumn}
                  onUpdateCard={handleUpdateCard}
                />
              ))}
              <button
                type="button"
                onClick={handleAddColumn}
                className="flex min-h-[480px] flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--stroke-strong)] bg-transparent p-3 text-[var(--gray-text)] transition hover:border-[var(--secondary-purple)] hover:text-[var(--secondary-purple)]"
                data-testid="btn-add-col"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span className="text-sm font-medium">Add Column</span>
              </button>
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

        {sidebar && desktopSidebarVisible ? (
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

const TAG_COLORS = ["#753991", "#209dd7", "#ecad0a", "#e85d3a", "#2ecc71", "#e74c3c", "#3498db", "#9b59b6", "#1abc9c", "#f39c12"];

function TagManager({
  tags,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
  onClose,
}: {
  tags: Tag[];
  onCreateTag: (name: string, color: string) => Promise<Tag>;
  onUpdateTag?: (tagId: number, data: { name?: string; color?: string }) => Promise<Tag>;
  onDeleteTag?: (tagId: number) => Promise<void>;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    await onCreateTag(name, newColor);
    setNewName("");
    setNewColor(TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]);
  };

  const handleUpdate = async (tagId: number) => {
    const name = editName.trim();
    if (!name || !onUpdateTag) return;
    await onUpdateTag(tagId, { name, color: editColor });
    setEditingId(null);
  };

  const handleDelete = async (tagId: number) => {
    if (!onDeleteTag) return;
    await onDeleteTag(tagId);
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-[var(--radius-lg)] border border-[var(--stroke)] bg-white p-4 shadow-[var(--shadow-xl)]">
        <h3 className="mb-3 text-sm font-semibold text-[var(--navy-dark)]">Manage Tags</h3>

        {/* Existing tags */}
        <div className="mb-3 max-h-48 space-y-1.5 overflow-y-auto">
          {tags.length === 0 ? (
            <p className="text-xs text-[var(--gray-text)]">No tags yet. Create one below.</p>
          ) : (
            tags.map((tag) =>
              editingId === tag.id ? (
                <div key={tag.id} className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="h-6 w-6 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void handleUpdate(tag.id); }}
                    className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-[var(--stroke-strong)] px-2 py-1 text-xs outline-none focus:border-[var(--secondary-purple)]"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => void handleUpdate(tag.id)}
                    className="shrink-0 text-xs font-medium text-emerald-600 hover:underline"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="shrink-0 text-xs text-[var(--gray-text)] hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div key={tag.id} className="flex items-center gap-1.5">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-xs text-[var(--navy-dark)]">{tag.name}</span>
                  {onUpdateTag ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(tag.id);
                        setEditName(tag.name);
                        setEditColor(tag.color);
                      }}
                      className="shrink-0 text-[10px] text-[var(--gray-text)] hover:text-[var(--navy-dark)]"
                    >
                      Edit
                    </button>
                  ) : null}
                  {onDeleteTag ? (
                    <button
                      type="button"
                      onClick={() => void handleDelete(tag.id)}
                      className="shrink-0 text-[10px] text-[var(--gray-text)] hover:text-red-500"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              )
            )
          )}
        </div>

        {/* Create new tag */}
        <div className="border-t border-[var(--stroke)] pt-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--gray-light)]">New tag</p>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-6 w-6 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
            />
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleCreate(); }}
              placeholder="Tag name"
              className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-[var(--stroke-strong)] px-2 py-1 text-xs outline-none focus:border-[var(--secondary-purple)]"
            />
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={!newName.trim()}
              className="shrink-0 rounded-[var(--radius-sm)] bg-[var(--secondary-purple)] px-2.5 py-1 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
