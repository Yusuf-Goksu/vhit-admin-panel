import { adminFetch } from "@/lib/admin-api";

export type AuditLogItem = {
  id: string;
  adminId: string;
  adminEmail: string;
  adminName: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string | null;
};

type AuditLogsResponse = {
  items: AuditLogItem[];
  nextCursor: string | null;
  hasNext: boolean;
};

export async function fetchAuditLogs(params?: {
  pageSize?: number;
  cursor?: string | null;
  resourceType?: string;
  action?: string;
  search?: string;
}) {
  const searchParams = new URLSearchParams();

  if (params?.pageSize) {
    searchParams.set("pageSize", String(params.pageSize));
  }

  if (params?.cursor) {
    searchParams.set("cursor", params.cursor);
  }

  if (params?.resourceType) {
    searchParams.set("resourceType", params.resourceType);
  }

  if (params?.action) {
    searchParams.set("action", params.action);
  }

  if (params?.search) {
    searchParams.set("search", params.search);
  }

  const query = searchParams.toString();
  const path = query ? `/api/admin/audit-logs?${query}` : "/api/admin/audit-logs";

  return adminFetch<AuditLogsResponse>(path, { method: "GET" });
}
