import { useRef, useState } from "react";
import { type ChatMessage, type PendingTag, sendAiChat, sendAiPlan, confirmAiPlan } from "@/lib/boardApi";
import type { BoardData } from "@/lib/kanban";
import type { AiMode } from "@/components/AIChatSidebar";

export type PendingPlan = {
  board: BoardData;
  response: string;
  tags: PendingTag[];
};

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
  const [pendingPlan, setPendingPlan] = useState<PendingPlan | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
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
          dry_run: true,
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

      if (mode === "plan" && !result.used_fallback) {
        setPendingPlan({
          board: result.board,
          response: assistantMessage,
          tags: result.pending_tags ?? [],
        });
        setLastBoardUpdated(null);
      } else {
        onBoardUpdate(result.board);
        setLastBoardUpdated(result.board_updated);
        if (result.board_updated && onTagsReload) {
          onTagsReload();
        }
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

  const handleConfirmPlan = async () => {
    if (!pendingPlan || projectId === null || isConfirming) return;
    setIsConfirming(true);
    try {
      const confirmedBoard = await confirmAiPlan(username, projectId, {
        board: pendingPlan.board,
        tags: pendingPlan.tags,
      });
      onBoardUpdate(confirmedBoard);
      setPendingPlan(null);
      setLastBoardUpdated(true);
      if (onTagsReload) onTagsReload();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to confirm plan. Try again.";
      setChatError(message);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDiscardPlan = () => {
    setPendingPlan(null);
    setChatHistory((prev) => [
      ...prev,
      { role: "assistant", content: "Plan discarded." },
    ]);
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
    setPendingPlan(null);
    setIsConfirming(false);
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
    pendingPlan,
    isConfirming,
    handleConfirmPlan,
    handleDiscardPlan,
  };
};
