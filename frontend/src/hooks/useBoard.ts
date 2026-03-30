import { useEffect, useRef, useState } from "react";
import { fetchBoard, saveBoard } from "@/lib/boardApi";
import type { BoardData } from "@/lib/kanban";

export const useBoard = (isReady: boolean, username: string, projectId: number | null) => {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const latestSaveRequest = useRef(0);

  useEffect(() => {
    if (!isReady || projectId === null) {
      return;
    }

    const controller = new AbortController();
    const loadBoard = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const loadedBoard = await fetchBoard(username, projectId, controller.signal);
        if (controller.signal.aborted) return;
        setBoard(loadedBoard);
      } catch {
        if (controller.signal.aborted) return;
        setLoadError("Unable to load board. Check API and retry.");
        setBoard(null);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void loadBoard();
    return () => { controller.abort(); };
  }, [isReady, username, projectId, reloadKey]);

  const persistBoard = async (nextBoard: BoardData) => {
    if (projectId === null) return;
    const requestId = latestSaveRequest.current + 1;
    latestSaveRequest.current = requestId;
    setIsSaving(true);
    setSaveError("");

    try {
      await saveBoard(username, projectId, nextBoard);
    } catch {
      if (requestId !== latestSaveRequest.current) return;
      setSaveError("Could not save board changes. Edit again to retry.");
    } finally {
      if (requestId === latestSaveRequest.current) setIsSaving(false);
    }
  };

  const handleBoardChange = (nextBoard: BoardData) => {
    setBoard(nextBoard);
    void persistBoard(nextBoard);
  };

  const reload = () => setReloadKey((prev) => prev + 1);

  const reset = () => {
    setBoard(null);
    setLoadError("");
    setSaveError("");
    setIsSaving(false);
  };

  return {
    board,
    setBoard,
    isLoading,
    isSaving,
    loadError,
    saveError,
    handleBoardChange,
    reload,
    reset,
  };
};
