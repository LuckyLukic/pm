"use client";

import { useEffect, useRef, useState } from "react";
import type { Project } from "@/lib/boardApi";
import { CreateProjectModal } from "@/components/CreateProjectModal";

type ProjectDropdownProps = {
  projects: Project[];
  selectedProject: Project | null;
  onSelect: (id: number) => void;
  onCreate: (name: string) => Promise<void>;
  onRename: (projectId: number, name: string) => Promise<void>;
  onDelete: (projectId: number) => Promise<void>;
};

export const ProjectDropdown = ({
  projects,
  selectedProject,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: ProjectDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setEditingId(null);
        setConfirmDeleteId(null);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const startRename = (project: Project) => {
    setEditingId(project.id);
    setEditName(project.name);
    setConfirmDeleteId(null);
  };

  const submitRename = async (projectId: number) => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== projects.find((p) => p.id === projectId)?.name) {
      await onRename(projectId, trimmed);
    }
    setEditingId(null);
  };

  const handleCreateClick = () => {
    setIsOpen(false);
    setSearch("");
    setShowCreateModal(true);
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--stroke)] px-3 py-1.5 text-sm font-medium text-[var(--navy-dark)] transition hover:border-[var(--stroke-strong)]"
          data-testid="project-dropdown-trigger"
        >
          <span className="max-w-[180px] truncate">
            {selectedProject?.name || "No project"}
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition ${isOpen ? "rotate-180" : ""}`}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute left-0 top-full z-50 mt-1.5 w-72 rounded-[var(--radius-md)] border border-[var(--stroke)] bg-white shadow-[var(--shadow-xl)]">
            <div className="border-b border-[var(--stroke)] p-2">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                className="w-full rounded-[var(--radius-sm)] border border-[var(--stroke)] bg-[var(--surface-muted)] px-2.5 py-1.5 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--secondary-purple)] focus:ring-1 focus:ring-[var(--stroke-focus)]"
              />
            </div>

            <div className="max-h-[240px] overflow-y-auto p-1">
              {filtered.length === 0 && (
                <p className="px-3 py-2 text-xs text-[var(--gray-text)]">
                  No projects found.
                </p>
              )}
              {filtered.map((project) => (
                <div
                  key={project.id}
                  className={`group flex items-center justify-between rounded-[var(--radius-sm)] px-2.5 py-2 ${
                    project.id === selectedProject?.id
                      ? "bg-[var(--surface-muted)]"
                      : "hover:bg-[var(--surface-muted)]"
                  }`}
                >
                  {editingId === project.id ? (
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => { void submitRename(project.id); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { void submitRename(project.id); }
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="mr-2 flex-1 rounded-[var(--radius-sm)] border border-[var(--stroke-strong)] bg-white px-2 py-0.5 text-sm text-[var(--navy-dark)] outline-none focus:border-[var(--secondary-purple)]"
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(project.id);
                        setIsOpen(false);
                        setSearch("");
                      }}
                      className="flex-1 truncate text-left text-sm text-[var(--navy-dark)]"
                    >
                      {project.name}
                    </button>
                  )}

                  {editingId !== project.id && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(project);
                        }}
                        className="rounded p-1 text-[var(--gray-text)] hover:bg-white hover:text-[var(--navy-dark)]"
                        aria-label={`Rename ${project.name}`}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      {confirmDeleteId === project.id ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void onDelete(project.id);
                            setConfirmDeleteId(null);
                          }}
                          className="rounded px-1.5 py-0.5 text-[10px] font-medium text-red-600 hover:bg-red-50"
                        >
                          Confirm
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(project.id);
                          }}
                          className="rounded p-1 text-[var(--gray-text)] hover:bg-white hover:text-red-600"
                          aria-label={`Delete ${project.name}`}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-[var(--stroke)] p-1">
              <button
                type="button"
                onClick={handleCreateClick}
                className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm font-medium text-[var(--secondary-purple)] transition hover:bg-[var(--surface-muted)]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New project
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={onCreate}
      />
    </>
  );
};
