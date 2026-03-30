import { useRef, useState } from "react";
import { type ChatMessage, sendAiChat, sendAiPlan } from "@/lib/boardApi";
import type { BoardData } from "@/lib/kanban";
import type { AiMode } from "@/components/AIChatSidebar";

export const useAiChat = (
  username: string,
  projectId: number | null,
  board: BoardData | null,
  onBoardUpdate: (board: BoardData) => void,
  onTagsReload?: () => void,
) => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatPrompt, setChatPrompt] = useState("");
  const [chatError, setChatError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [lastBoardUpdated, setLastBoardUpdated] = useState<boolean | null>(null);
  const [mode, setMode] = useState<AiMode>("chat");
  const abortController = useRef<AbortController | null>(null);

  const handleSend = async () => {
    const prompt = chatPrompt.trim();
    if (!prompt || !board || isSending || projectId === null) return;

    const nextHistory: ChatMessage[] = [
      ...chatHistory,
      { role: "user", content: prompt },
    ];
    setChatHistory(nextHistory);
    setChatPrompt("");
    setChatError("");
    setIsSending(true);
    setLastBoardUpdated(null);

    const controller = new AbortController();
    abortController.current = controller;
    const timeout = setTimeout(() => controller.abort(), 120_000);

    try {
      let result;
      if (mode === "plan") {
        result = await sendAiPlan(username, projectId, {
          description: prompt,
          chat_history: nextHistory,
        }, controller.signal);
      } else {
        result = await sendAiChat(username, projectId, {
          prompt,
          chat_history: nextHistory,
        }, controller.signal);
      }
      const assistantMessage = result.assistant_response.trim() || "No response returned.";
      setChatHistory([
        ...nextHistory,
        { role: "assistant", content: assistantMessage },
      ]);
      onBoardUpdate(result.board);
      setLastBoardUpdated(result.board_updated);
      if (result.board_updated && onTagsReload) {
        onTagsReload();
      }
    } catch (error) {
      if (controller.signal.aborted) {
        setChatError("Request cancelled.");
      } else {
        const message =
          error instanceof Error
            ? error.message
            : "Could not reach AI assistant. Try again.";
        setChatError(message);
      }
    } finally {
      clearTimeout(timeout);
      abortController.current = null;
      setIsSending(false);
    }
  };

  const handleCancel = () => {
    abortController.current?.abort();
  };

  const reset = () => {
    setChatHistory([]);
    setChatPrompt("");
    setChatError("");
    setIsSending(false);
    setLastBoardUpdated(null);
  };

  return {
    chatHistory,
    chatPrompt,
    setChatPrompt,
    chatError,
    isSending,
    lastBoardUpdated,
    handleSend,
    handleCancel,
    reset,
    mode,
    setMode,
  };
};
