import { useEffect, useState } from "react";
import {
  type Project,
  listProjects,
  createProject as apiCreateProject,
  renameProject as apiRenameProject,
  deleteProject as apiDeleteProject,
} from "@/lib/boardApi";

const SELECTED_PROJECT_KEY = "pm.selectedProject";

const readSelectedProjectId = (): number | null => {
  try {
    const raw = window.sessionStorage.getItem(SELECTED_PROJECT_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
};

const writeSelectedProjectId = (id: number | null) => {
  try {
    if (id !== null) {
      window.sessionStorage.setItem(SELECTED_PROJECT_KEY, String(id));
    } else {
      window.sessionStorage.removeItem(SELECTED_PROJECT_KEY);
    }
  } catch {
    // Ignore
  }
};

export const useProjects = (isReady: boolean, username: string) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(readSelectedProjectId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isReady || !username) return;

    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        let result = await listProjects(username);
        // Auto-create a project if user has none
        if (result.length === 0) {
          const newProject = await apiCreateProject(username, "My Project");
          result = [newProject];
        }
        setProjects(result);
        // Auto-select: restore from session, fallback to first project
        const stored = readSelectedProjectId();
        if (stored !== null && result.some((p) => p.id === stored)) {
          setSelectedProjectId(stored);
        } else if (result.length > 0) {
          setSelectedProjectId(result[0].id);
          writeSelectedProjectId(result[0].id);
        } else {
          setSelectedProjectId(null);
          writeSelectedProjectId(null);
        }
      } catch {
        setError("Could not load projects.");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [isReady, username]);

  const selectProject = (id: number) => {
    setSelectedProjectId(id);
    writeSelectedProjectId(id);
  };

  const createProject = async (name: string) => {
    try {
      const project = await apiCreateProject(username, name);
      setProjects((prev) => [...prev, project]);
      selectProject(project.id);
      return project;
    } catch (err) {
      throw err;
    }
  };

  const renameProject = async (projectId: number, name: string) => {
    try {
      const updated = await apiRenameProject(username, projectId, name);
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? updated : p))
      );
      return updated;
    } catch (err) {
      throw err;
    }
  };

  const deleteProjectById = async (projectId: number) => {
    await apiDeleteProject(username, projectId);
    const remaining = projects.filter((p) => p.id !== projectId);
    if (remaining.length === 0) {
      // Auto-create a new project when last one is deleted
      const newProject = await apiCreateProject(username, "My Project");
      setProjects([newProject]);
      setSelectedProjectId(newProject.id);
      writeSelectedProjectId(newProject.id);
    } else {
      setProjects(remaining);
      if (selectedProjectId === projectId) {
        setSelectedProjectId(remaining[0].id);
        writeSelectedProjectId(remaining[0].id);
      }
    }
  };

  const reset = () => {
    setProjects([]);
    setSelectedProjectId(null);
    writeSelectedProjectId(null);
    setError("");
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  return {
    projects,
    selectedProject,
    selectedProjectId,
    isLoading,
    error,
    selectProject,
    createProject,
    renameProject,
    deleteProject: deleteProjectById,
    reset,
  };
};
