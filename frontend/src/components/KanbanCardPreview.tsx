import type { Card } from "@/lib/kanban";
import type { Tag } from "@/lib/boardApi";

type KanbanCardPreviewProps = {
  card: Card;
  tags?: Tag[];
};

export const KanbanCardPreview = ({ card, tags = [] }: KanbanCardPreviewProps) => {
  const cardTags = tags.filter((t) => (card.tagIds ?? []).includes(t.id));

  return (
    <article className="rounded-[var(--radius-md)] border border-[var(--stroke)] bg-white p-3 shadow-[var(--shadow-lg)]">
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
    </article>
  );
};
