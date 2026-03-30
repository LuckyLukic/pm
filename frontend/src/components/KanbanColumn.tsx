import clsx from "clsx";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Card, Column } from "@/lib/kanban";
import type { Tag } from "@/lib/boardApi";
import { KanbanCard } from "@/components/KanbanCard";
import { NewCardForm } from "@/components/NewCardForm";

type KanbanColumnProps = {
  column: Column;
  cards: Card[];
  tags: Tag[];
  canDelete: boolean;
  onRename: (columnId: string, title: string) => void;
  onAddCard: (columnId: string, title: string, details: string) => void;
  onDeleteCard: (columnId: string, cardId: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onUpdateCard: (cardId: string, title: string, details: string, tagIds: number[]) => void;
};

export const KanbanColumn = ({
  column,
  cards,
  tags,
  canDelete,
  onRename,
  onAddCard,
  onDeleteCard,
  onDeleteColumn,
  onUpdateCard,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <section
      ref={setNodeRef}
      className={clsx(
        "flex min-h-[480px] flex-col rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-3 transition",
        isOver && "ring-2 ring-[var(--accent-yellow)] ring-offset-1"
      )}
      data-testid={`column-${column.id}`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[var(--secondary-purple)]" />
          <input
            value={column.title}
            onChange={(event) => onRename(column.id, event.target.value)}
            className="bg-transparent text-sm font-semibold text-[var(--navy-dark)] outline-none"
            aria-label="Column title"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-[var(--radius-full)] bg-white px-2 py-0.5 text-[11px] font-medium text-[var(--gray-text)] shadow-[var(--shadow-xs)]">
            {cards.length}
          </span>
          {canDelete && (
            <button
              type="button"
              onClick={() => {
                if (
                  cards.length > 0 &&
                  !window.confirm(
                    `Move ${cards.length} card${cards.length > 1 ? "s" : ""} to the first column and delete "${column.title}"?`
                  )
                )
                  return;
                onDeleteColumn(column.id);
              }}
              className="flex h-5 w-5 items-center justify-center rounded text-[var(--gray-light)] transition hover:text-red-500"
              aria-label={`Delete column ${column.title}`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <SortableContext items={column.cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              tags={tags}
              onDelete={(cardId) => onDeleteCard(column.id, cardId)}
              onUpdate={onUpdateCard}
            />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--stroke-strong)] px-3 py-8 text-center text-xs text-[var(--gray-light)]">
            Drop a card here
          </div>
        )}
      </div>

      <NewCardForm
        onAdd={(title, details) => onAddCard(column.id, title, details)}
      />
    </section>
  );
};
