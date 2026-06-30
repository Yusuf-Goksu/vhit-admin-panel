import { adminDb } from "@/lib/firebase-admin";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";

export {
  parseOptionalBoolean,
  parseOptionalString,
  parsePageSize,
} from "@/lib/server-list-utils";

export type ListFilter = {
  field: string;
  op: FirebaseFirestore.WhereFilterOp;
  value: unknown;
};

export type AdminListQuery = {
  collection: string;
  orderBy: string;
  direction?: "asc" | "desc";
  pageSize?: number;
  cursor?: string | null;
  filters?: ListFilter[];
};

export type AdminListResult<T> = {
  items: T[];
  nextCursor: string | null;
  hasNext: boolean;
};

function serializeTimestamp(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  return value;
}

export function serializeFirestoreValue(value: unknown): unknown {
  const serialized = serializeTimestamp(value);

  if (Array.isArray(serialized)) {
    return serialized.map(serializeFirestoreValue);
  }

  if (serialized && typeof serialized === "object") {
    const result: Record<string, unknown> = {};

    for (const [key, nested] of Object.entries(serialized)) {
      result[key] = serializeFirestoreValue(nested);
    }

    return result;
  }

  return serialized;
}

export function serializeDocData(data: FirebaseFirestore.DocumentData) {
  const serialized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    serialized[key] = serializeFirestoreValue(value);
  }

  return serialized;
}

function compareSortValues(a: unknown, b: unknown, direction: "asc" | "desc") {
  const aTime =
    typeof a === "string" ? Date.parse(a) : a instanceof Date ? a.getTime() : Number(a ?? 0);
  const bTime =
    typeof b === "string" ? Date.parse(b) : b instanceof Date ? b.getTime() : Number(b ?? 0);
  const diff = aTime - bTime;

  if (Number.isNaN(diff)) {
    return String(a ?? "").localeCompare(String(b ?? ""), "tr");
  }

  return direction === "desc" ? -diff : diff;
}

export async function queryByFieldSorted<T extends Record<string, unknown> & { id: string }>(
  collection: string,
  field: string,
  value: unknown,
  options: {
    orderBy: string;
    direction?: "asc" | "desc";
    limit?: number;
    mapItem: (id: string, data: FirebaseFirestore.DocumentData) => T;
  }
): Promise<T[]> {
  const snapshot = await adminDb.collection(collection).where(field, "==", value).get();
  const direction = options.direction ?? "desc";

  const items = snapshot.docs
    .map((doc) => options.mapItem(doc.id, doc.data()))
    .sort((left, right) =>
      compareSortValues(left[options.orderBy], right[options.orderBy], direction)
    );

  if (options.limit !== undefined) {
    return items.slice(0, options.limit);
  }

  return items;
}

export async function queryAdminList<T extends { id: string }>(
  params: AdminListQuery,
  mapItem: (id: string, data: FirebaseFirestore.DocumentData) => T
): Promise<AdminListResult<T>> {
  const pageSize = Math.min(params.pageSize ?? DEFAULT_PAGE_SIZE, 50);

  let queryRef: FirebaseFirestore.Query = adminDb.collection(params.collection);

  for (const filter of params.filters ?? []) {
    queryRef = queryRef.where(filter.field, filter.op, filter.value);
  }

  queryRef = queryRef.orderBy(params.orderBy, params.direction ?? "desc").limit(pageSize);

  if (params.cursor) {
    const cursorDoc = await adminDb.collection(params.collection).doc(params.cursor).get();

    if (cursorDoc.exists) {
      let cursorQuery: FirebaseFirestore.Query = adminDb.collection(params.collection);

      for (const filter of params.filters ?? []) {
        cursorQuery = cursorQuery.where(filter.field, filter.op, filter.value);
      }

      queryRef = cursorQuery
        .orderBy(params.orderBy, params.direction ?? "desc")
        .startAfter(cursorDoc)
        .limit(pageSize);
    }
  }

  const snapshot = await queryRef.get();

  const items = snapshot.docs.map((doc) => mapItem(doc.id, doc.data()));

  return {
    items,
    nextCursor: snapshot.docs.at(-1)?.id ?? null,
    hasNext: items.length === pageSize,
  };
}
