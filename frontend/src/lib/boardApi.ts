import type { BoardData } from "@/lib/kanban";

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

export const fetchBoard = async (username: string) => {
  return requestBoard("/api/board", {
    headers: {
      "X-User": username,
    },
  });
};

export const saveBoard = async (username: string, board: BoardData) => {
  return requestBoard("/api/board", {
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
  payload: AIChatRequest
) => {
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User": username,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as AIChatResponse;
};
