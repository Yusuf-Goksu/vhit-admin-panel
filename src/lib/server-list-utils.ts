import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";

export function parsePageSize(value: string | null, fallback = DEFAULT_PAGE_SIZE) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 50);
}

export function parseOptionalBoolean(value: string | null) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export function parseOptionalString(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
