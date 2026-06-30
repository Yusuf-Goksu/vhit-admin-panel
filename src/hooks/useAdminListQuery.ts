"use client";

import { useCallback, useRef, useState } from "react";

import { AdminListParams, AdminListResponse, fetchAdminList } from "@/lib/admin-list-api";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";

type PageCacheEntry<T> = AdminListResponse<T>;

export function useAdminListQuery<T>(path: string, pageSize = DEFAULT_PAGE_SIZE) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [cache, setCache] = useState<Map<string, PageCacheEntry<T>>>(new Map());
  const filtersRef = useRef<AdminListParams>({});

  const cacheKey = (targetPage: number, filters: AdminListParams) =>
    `${targetPage}:${JSON.stringify(filters)}`;

  const fetchPage = useCallback(
    async (targetPage: number, filters: AdminListParams = filtersRef.current) => {
      filtersRef.current = filters;
      const key = cacheKey(targetPage, filters);
      const cached = cache.get(key);

      if (cached) {
        setItems(cached.items);
        setHasNext(cached.hasNext);
        setPage(targetPage);
        return;
      }

      setIsLoading(true);

      try {
        const cursor = cursors[targetPage - 1] ?? null;
        const response = await fetchAdminList<T>(path, {
          ...filters,
          pageSize,
          cursor,
        });

        setItems(response.items);
        setHasNext(response.hasNext);
        setPage(targetPage);

        setCache((prev) => {
          const map = new Map(prev);
          map.set(key, response);
          return map;
        });

        setCursors((prev) => {
          const next = [...prev];
          next[targetPage] = response.nextCursor;
          return next;
        });
      } finally {
        setIsLoading(false);
      }
    },
    [cache, cursors, pageSize, path]
  );

  const reset = useCallback(() => {
    setItems([]);
    setPage(1);
    setHasNext(false);
    setCursors([null]);
    setCache(new Map());
    filtersRef.current = {};
  }, []);

  const reload = useCallback(
    async (filters: AdminListParams = filtersRef.current) => {
      setCache(new Map());
      setCursors([null]);
      setPage(1);
      await fetchPage(1, filters);
    },
    [fetchPage]
  );

  const nextPage = useCallback(async () => {
    if (!hasNext || isLoading) return;
    await fetchPage(page + 1, filtersRef.current);
  }, [fetchPage, hasNext, isLoading, page]);

  const previousPage = useCallback(async () => {
    if (page <= 1 || isLoading) return;
    await fetchPage(page - 1, filtersRef.current);
  }, [fetchPage, isLoading, page]);

  return {
    items,
    page,
    pageSize,
    isLoading,
    hasNext,
    hasPrevious: page > 1,
    fetchPage,
    reload,
    nextPage,
    previousPage,
    reset,
    setItems,
  };
}
