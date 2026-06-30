"use client";

import { useState } from "react";
import {
  DocumentData,
  QueryConstraint,
  QueryDocumentSnapshot,
  getDocs,
  limit,
  query,
  startAfter,
} from "firebase/firestore";

import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";

type PageCacheEntry<T> = {
  items: T[];
  hasNext: boolean;
};

export function usePagedQuery<T>(pageSize = DEFAULT_PAGE_SIZE) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [cursors, setCursors] = useState<
    (QueryDocumentSnapshot<unknown, DocumentData> | null)[]
  >([null]);
  const [cache, setCache] = useState<Map<number, PageCacheEntry<T>>>(new Map());

  async function fetchPage(
    targetPage: number,
    collectionRef: Parameters<typeof query>[0],
    constraints: QueryConstraint[],
    mapDoc: (doc: QueryDocumentSnapshot<unknown, DocumentData>) => T
  ) {
    const cached = cache.get(targetPage);
    if (cached) {
      setItems(cached.items);
      setHasNext(cached.hasNext);
      setPage(targetPage);
      return;
    }

    setIsLoading(true);

    try {
      const cursor = cursors[targetPage - 1] ?? null;
      const queryConstraints = [...constraints];

      if (cursor) {
        queryConstraints.push(startAfter(cursor));
      }

      queryConstraints.push(limit(pageSize));

      const snapshot = await getDocs(query(collectionRef, ...queryConstraints));
      const nextItems = snapshot.docs.map(mapDoc);
      const lastDoc = snapshot.docs.at(-1) ?? null;
      const nextHasNext = nextItems.length === pageSize;

      setItems(nextItems);
      setHasNext(nextHasNext);
      setPage(targetPage);

      setCache((prev) => {
        const map = new Map(prev);
        map.set(targetPage, { items: nextItems, hasNext: nextHasNext });
        return map;
      });

      if (lastDoc) {
        setCursors((prev) => {
          const next = [...prev];
          next[targetPage] = lastDoc;
          return next;
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  function reset() {
    setItems([]);
    setPage(1);
    setHasNext(false);
    setCursors([null]);
    setCache(new Map());
  }

  async function nextPage(
    collectionRef: Parameters<typeof query>[0],
    constraints: QueryConstraint[],
    mapDoc: (doc: QueryDocumentSnapshot<unknown, DocumentData>) => T
  ) {
    if (!hasNext || isLoading) return;
    await fetchPage(page + 1, collectionRef, constraints, mapDoc);
  }

  async function previousPage(
    collectionRef: Parameters<typeof query>[0],
    constraints: QueryConstraint[],
    mapDoc: (doc: QueryDocumentSnapshot<unknown, DocumentData>) => T
  ) {
    if (page <= 1 || isLoading) return;
    await fetchPage(page - 1, collectionRef, constraints, mapDoc);
  }

  return {
    items,
    page,
    pageSize,
    isLoading,
    hasNext,
    hasPrevious: page > 1,
    fetchPage,
    nextPage,
    previousPage,
    reset,
    setItems,
  };
}
