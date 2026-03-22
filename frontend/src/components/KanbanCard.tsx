import { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import type { Card } from "@/lib/kanban";

type KanbanCardProps = {
  card: Card;
  onDelete: (cardId: string) => void;
  onUpdate: (cardId: string, title: string, details: string) => void;
};

export const KanbanCard = ({ card, onDelete, onUpdate }: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [details, setDetails] = useState(card.details);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (isEditing) {
      return;
    }
    setTitle(card.title);
    setDetails(card.details);
  }, [card.title, card.details, isEditing]);

  const handleSubmit = () => {
    const nextTitle = title.trim();
    if (!nextTitle) {
      return;
    }
    onUpdate(card.id, nextTitle, details.trim() || "No details yet.");
    setIsEditing(false);
  };

  const dragBindings = isEditing ? {} : { ...attributes, ...listeners };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={clsx(
        "rounded-2xl border border-transparent bg-white px-4 py-4 shadow-[0_12px_24px_rgba(3,33,71,0.08)]",
        "transition-all duration-150",
        isDragging && "opacity-60 shadow-[0_18px_32px_rgba(3,33,71,0.16)]"
      )}
      {...dragBindings}
      data-testid={`card-${card.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        {isEditing ? (
          <div className="w-full space-y-2">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-lg border border-[var(--stroke)] px-2 py-1 text-sm font-semibold text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)]"
              aria-label={`Edit title ${card.id}`}
            />
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-[var(--stroke)] px-2 py-1 text-sm text-[var(--gray-text)] outline-none focus:border-[var(--primary-blue)]"
              aria-label={`Edit details ${card.id}`}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSubmit}
                className="rounded-full bg-[var(--secondary-purple)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setTitle(card.title);
                  setDetails(card.details);
                  setIsEditing(false);
                }}
                className="rounded-full border border-[var(--stroke)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <h4 className="font-display text-base font-semibold text-[var(--navy-dark)]">
                {card.title}
              </h4>
              <p className="mt-2 text-sm leading-6 text-[var(--gray-text)]">
                {card.details}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-full border border-transparent px-2 py-1 text-xs font-semibold text-[var(--gray-text)] transition hover:border-[var(--stroke)] hover:text-[var(--navy-dark)]"
                aria-label={`Edit ${card.title}`}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(card.id)}
                className="rounded-full border border-transparent px-2 py-1 text-xs font-semibold text-[var(--gray-text)] transition hover:border-[var(--stroke)] hover:text-[var(--navy-dark)]"
                aria-label={`Delete ${card.title}`}
              >
                Remove
              </button>
            </div>
          </>
        )}
      </div>
    </article>
  );
};
