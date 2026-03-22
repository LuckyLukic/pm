import type { BoardData } from "@/lib/kanban";

type BoardEnvelope = {
  board: BoardData;
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
