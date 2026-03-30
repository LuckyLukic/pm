import { useState, type FormEvent } from "react";

const initialFormState = { title: "", details: "" };

type NewCardFormProps = {
  onAdd: (title: string, details: string) => void;
};

export const NewCardForm = ({ onAdd }: NewCardFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formState, setFormState] = useState(initialFormState);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.title.trim()) {
      return;
    }
    onAdd(formState.title.trim(), formState.details.trim());
    setFormState(initialFormState);
    setIsOpen(false);
  };

  return (
    <div className="mt-3">
      {isOpen ? (
        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            value={formState.title}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder="Card title"
            className="w-full rounded-[var(--radius-sm)] border border-[var(--stroke-strong)] bg-white px-2.5 py-2 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--secondary-purple)] focus:ring-1 focus:ring-[var(--stroke-focus)]"
            required
          />
          <textarea
            value={formState.details}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, details: event.target.value }))
            }
            placeholder="Details (optional)"
            rows={2}
            className="w-full resize-none rounded-[var(--radius-sm)] border border-[var(--stroke-strong)] bg-white px-2.5 py-2 text-sm text-[var(--gray-text)] outline-none transition focus:border-[var(--secondary-purple)] focus:ring-1 focus:ring-[var(--stroke-focus)]"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="rounded-[var(--radius-sm)] bg-[var(--secondary-purple)] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
            >
              Add card
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setFormState(initialFormState);
              }}
              className="rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full rounded-[var(--radius-sm)] border border-dashed border-[var(--stroke-strong)] px-3 py-2 text-xs font-medium text-[var(--gray-text)] transition hover:border-[var(--secondary-purple)] hover:text-[var(--secondary-purple)]"
        >
          + Add a card
        </button>
      )}
    </div>
  );
};
