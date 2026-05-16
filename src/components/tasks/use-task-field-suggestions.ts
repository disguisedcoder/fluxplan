"use client";

import { useEffect, useState } from "react";

import { studyApiFetch } from "@/lib/http/study-api-fetch";

export function useTaskFieldSuggestions(load: boolean) {
  const [topListNames, setTopListNames] = useState<string[]>([]);
  const [topTags, setTopTags] = useState<string[]>([]);

  useEffect(() => {
    if (!load) return;
    let cancelled = false;
    studyApiFetch("/api/tasks/field-suggestions", { cache: "no-store" })
      .then(async (res) => {
        if (cancelled || !res.ok) return;
        const data = (await res.json()) as { listNames?: string[]; tags?: string[] };
        setTopListNames(Array.isArray(data.listNames) ? data.listNames : []);
        setTopTags(Array.isArray(data.tags) ? data.tags : []);
      })
      .catch(() => {
        if (!cancelled) {
          setTopListNames([]);
          setTopTags([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  return { topListNames, topTags };
}
