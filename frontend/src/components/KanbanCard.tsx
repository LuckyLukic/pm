import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import type { Card } from "@/lib/kanban";
import type { Tag } from "@/lib/boardApi";

type KanbanCardProps = {
  card: Card;
  tags: Tag[];
  onDelete: (cardId: string) => void;
  onUpdate: (cardId: string, title: string, details: string, tagIds: number[]) => void;
};

export const KanbanCard = ({ card, tags, onDelete, onUpdate }: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDetails, setEditDetails] = useState("");
  const [editTagIds, setEditTagIds] = useState<number[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const cardTags = tags.filter((t) => (card.tagIds ?? []).includes(t.id));

  const startEditing = () => {
    setEditTitle(card.title);
    setEditDetails(card.details);
    setEditTagIds([...(card.tagIds ?? [])]);
    setIsEditing(true);
    setShowTagPicker(false);
  };

  const handleSubmit = () => {
    const nextTitle = editTitle.trim();
    if (!nextTitle) {
      return;
    }
    onUpdate(card.id, nextTitle, editDetails.trim() || "No details yet.", editTagIds);
    setIsEditing(false);
  };

  const toggleEditTag = (tagId: number) => {
    setEditTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const dragBindings = isEditing ? {} : { ...attributes, ...listeners };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={clsx(
        "group rounded-[var(--radius-md)] border border-[var(--stroke)] bg-white p-3 shadow-[var(--shadow-xs)] transition-all duration-150",
        "hover:shadow-[var(--shadow-sm)] hover:border-[var(--stroke-strong)]",
        isDragging && "opacity-50 shadow-[var(--shadow-md)]"
      )}
      {...dragBindings}
      data-testid={`card-${card.id}`}
    >
      {isEditing ? (
        <div className="space-y-2">
          <input
            value={editTitle}
            onChange={(event) => setEditTitle(event.target.value)}
            className="w-full rounded-[var(--radius-sm)] border border-[var(--stroke-strong)] px-2.5 py-1.5 text-sm font-medium text-[var(--navy-dark)] outline-none focus:border-[var(--secondary-purple)] focus:ring-1 focus:ring-[var(--stroke-focus)]"
            aria-label={`Edit title ${card.id}`}
          />
          <textarea
            value={editDetails}
            onChange={(event) => setEditDetails(event.target.value)}
            rows={3}
            className="w-full resize-none rounded-[var(--radius-sm)] border border-[var(--stroke-strong)] px-2.5 py-1.5 text-sm text-[var(--gray-text)] outline-none focus:border-[var(--secondary-purple)] focus:ring-1 focus:ring-[var(--stroke-focus)]"
            aria-label={`Edit details ${card.id}`}
          />
          {tags.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowTagPicker(!showTagPicker)}
                className="text-[11px] font-medium text-[var(--secondary-purple)] hover:underline"
              >
                {showTagPicker ? "Hide tags" : "Manage tags"}
              </button>
              {showTagPicker && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleEditTag(tag.id)}
                      className={clsx(
                        "rounded-[var(--radius-full)] px-2 py-0.5 text-[10px] font-medium transition",
                        editTagIds.includes(tag.id)
                          ? "ring-2 ring-offset-1 ring-[var(--secondary-purple)]"
                          : "opacity-60 hover:opacity-100"
                      )}
                      style={{
                        backgroundColor: tag.color + "1a",
                        color: tag.color,
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-[var(--radius-sm)] bg-[var(--secondary-purple)] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-[var(--radius-sm)] border border-[var(--stroke)] px-3 py-1.5 text-xs font-medium text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {cardTags.length > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1">
              {cardTags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-[var(--radius-full)] px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: tag.color + "1a",
                    color: tag.color,
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
          <h4 className="text-sm font-medium text-[var(--navy-dark)]">
            {card.title}
          </h4>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--gray-text)]">
            {card.details}
          </p>
          <div className="mt-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={startEditing}
              className="rounded-[var(--radius-sm)] px-2 py-1 text-[11px] font-medium text-[var(--gray-text)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--navy-dark)]"
              aria-label={`Edit ${card.title}`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(card.id)}
              className="rounded-[var(--radius-sm)] px-2 py-1 text-[11px] font-medium text-[var(--gray-text)] transition hover:bg-red-50 hover:text-red-600"
              aria-label={`Delete ${card.title}`}
            >
              Remove
            </button>
          </div>
        </>
      )}
    </article>
  );
};
