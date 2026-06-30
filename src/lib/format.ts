export function formatDateTime(value: unknown) {
  const date = toDate(value);
  return date?.toLocaleString("tr-TR") ?? "-";
}

export function formatDate(value: unknown) {
  const date = toDate(value);
  return date?.toLocaleDateString("tr-TR") ?? "-";
}

export function toDate(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) return value;

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getInitials(value: string) {
  const parts = value.trim().split(" ").filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function maskTcKimlikNo(value: string) {
  const trimmed = value.trim();
  if (trimmed.length < 5) return trimmed;
  return `${trimmed.slice(0, 3)}***${trimmed.slice(-2)}`;
}
