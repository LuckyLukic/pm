"use client";

import { useEffect, useRef, useState } from "react";

type CreateProjectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
};

export const CreateProjectModal = ({ isOpen, onClose, onCreate }: CreateProjectModalProps) => {
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setIsCreating(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || isCreating) return;
    setIsCreating(true);
    try {
      await onCreate(trimmed);
      onClose();
    } catch {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-[var(--radius-xl)] border border-[var(--stroke)] bg-white p-6 shadow-[var(--shadow-xl)]">
        <h2 className="font-display text-lg font-semibold text-[var(--navy-dark)]">
          New Project
        </h2>
        <p className="mt-1 text-sm text-[var(--gray-text)]">
          Give your project a name to get started.
        </p>
        <form onSubmit={(e) => { void handleSubmit(e); }} className="mt-4">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            className="w-full rounded-[var(--radius-md)] border border-[var(--stroke-strong)] bg-white px-3.5 py-2.5 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--secondary-purple)] focus:ring-2 focus:ring-[var(--stroke-focus)]"
            required
          />
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[var(--radius-sm)] border border-[var(--stroke)] px-4 py-2 text-sm font-medium text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isCreating}
              className="rounded-[var(--radius-sm)] bg-[var(--secondary-purple)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {isCreating ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
