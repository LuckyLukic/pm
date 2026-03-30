import { useEffect, useState } from "react";
import {
  type Tag,
  listTags,
  createTag as apiCreateTag,
  updateTag as apiUpdateTag,
  deleteTag as apiDeleteTag,
} from "@/lib/boardApi";

export const useTags = (isReady: boolean, username: string) => {
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    if (!isReady || !username) return;
    const load = async () => {
      try {
        const result = await listTags(username);
        setTags(result);
      } catch {
        // Silently fail; tags are supplementary
      }
    };
    void load();
  }, [isReady, username]);

  const reload = async () => {
    if (!username) return;
    try {
      const result = await listTags(username);
      setTags(result);
    } catch {
      // ignore
    }
  };

  const createTagFn = async (name: string, color: string) => {
    const tag = await apiCreateTag(username, name, color);
    setTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
    return tag;
  };

  const updateTagFn = async (tagId: number, data: { name?: string; color?: string }) => {
    const tag = await apiUpdateTag(username, tagId, data);
    setTags((prev) => prev.map((t) => (t.id === tagId ? tag : t)));
    return tag;
  };

  const deleteTagFn = async (tagId: number) => {
    await apiDeleteTag(username, tagId);
    setTags((prev) => prev.filter((t) => t.id !== tagId));
  };

  const reset = () => setTags([]);

  return {
    tags,
    createTag: createTagFn,
    updateTag: updateTagFn,
    deleteTag: deleteTagFn,
    reload,
    reset,
  };
};
