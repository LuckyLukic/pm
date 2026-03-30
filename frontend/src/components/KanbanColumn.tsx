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
  onRename: (columnId: string, title: string) => void;
  onAddCard: (columnId: string, title: string, details: string) => void;
  onDeleteCard: (columnId: string, cardId: string) => void;
  onUpdateCard: (cardId: string, title: string, details: string, tagIds: number[]) => void;
};

export const KanbanColumn = ({
  column,
  cards,
  tags,
  onRename,
  onAddCard,
  onDeleteCard,
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
        <span className="rounded-[var(--radius-full)] bg-white px-2 py-0.5 text-[11px] font-medium text-[var(--gray-text)] shadow-[var(--shadow-xs)]">
          {cards.length}
        </span>
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
