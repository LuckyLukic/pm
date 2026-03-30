import type { BoardData } from "@/lib/kanban";

// ---------- Auth ----------

type AuthPayload = {
  username: string;
  password: string;
};

type AuthResponse = {
  username: string;
  message: string;
};

export const loginUser = async (payload: AuthPayload): Promise<AuthResponse> => {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
  return (await response.json()) as AuthResponse;
};

export const registerUser = async (payload: AuthPayload): Promise<AuthResponse> => {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
  return (await response.json()) as AuthResponse;
};

// ---------- Projects ----------

export type Project = {
  id: number;
  name: string;
};

export const listProjects = async (username: string): Promise<Project[]> => {
  const response = await fetch("/api/projects", {
    headers: { "X-User": username },
  });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
  return (await response.json()) as Project[];
};

export const createProject = async (username: string, name: string): Promise<Project> => {
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User": username },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
  return (await response.json()) as Project;
};

export const renameProject = async (username: string, projectId: number, name: string): Promise<Project> => {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-User": username },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
  return (await response.json()) as Project;
};

export const deleteProject = async (username: string, projectId: number): Promise<void> => {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: "DELETE",
    headers: { "X-User": username },
  });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
};

// ---------- Tags ----------

export type Tag = {
  id: number;
  name: string;
  color: string;
};

export const listTags = async (username: string): Promise<Tag[]> => {
  const response = await fetch("/api/tags", {
    headers: { "X-User": username },
  });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
  return (await response.json()) as Tag[];
};

export const createTag = async (username: string, name: string, color: string): Promise<Tag> => {
  const response = await fetch("/api/tags", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User": username },
    body: JSON.stringify({ name, color }),
  });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
  return (await response.json()) as Tag;
};

export const updateTag = async (username: string, tagId: number, data: { name?: string; color?: string }): Promise<Tag> => {
  const response = await fetch(`/api/tags/${tagId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-User": username },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
  return (await response.json()) as Tag;
};

export const deleteTag = async (username: string, tagId: number): Promise<void> => {
  const response = await fetch(`/api/tags/${tagId}`, {
    method: "DELETE",
    headers: { "X-User": username },
  });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
};

export const sendAiPlan = async (
  username: string,
  projectId: number,
  payload: { description: string; chat_history: ChatMessage[] },
  signal?: AbortSignal
) => {
  const response = await fetch(`/api/projects/${projectId}/ai/plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User": username,
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as AIChatResponse;
};

// ---------- Board (project-scoped) ----------

type BoardEnvelope = {
  board: BoardData;
};

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

type AIChatRequest = {
  prompt: string;
  chat_history: ChatMessage[];
};

export type AIChatResponse = {
  assistant_response: string;
  board: BoardData;
  board_updated: boolean;
  used_fallback: boolean;
  model: string;
};

const parseErrorMessage = async (response: Response) => {
  try {
    const payload = (await response.json()) as { detail?: string };
    if (payload?.detail) {
      return payload.detail;
    }
  } catch {
    // Ignore JSON parse errors for non-JSON responses.
  }
  return `Request failed with status ${response.status}.`;
};

const requestBoard = async (input: RequestInfo, init: RequestInit = {}) => {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  const payload = (await response.json()) as BoardEnvelope;
  return payload.board;
};

export const fetchBoard = async (username: string, projectId: number, signal?: AbortSignal) => {
  return requestBoard(`/api/projects/${projectId}/board`, {
    headers: { "X-User": username },
    signal,
  });
};

export const saveBoard = async (username: string, projectId: number, board: BoardData) => {
  return requestBoard(`/api/projects/${projectId}/board`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-User": username,
    },
    body: JSON.stringify({ board }),
  });
};

export const sendAiChat = async (
  username: string,
  projectId: number,
  payload: AIChatRequest,
  signal?: AbortSignal
) => {
  const response = await fetch(`/api/projects/${projectId}/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User": username,
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as AIChatResponse;
};
