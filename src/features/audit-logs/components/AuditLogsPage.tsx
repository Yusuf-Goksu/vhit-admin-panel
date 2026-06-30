"use client";

import { useEffect, useState } from "react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import LoadingState from "@/components/ui/LoadingState";
import PageHeader from "@/components/ui/PageHeader";
import PaginationControls from "@/components/ui/PaginationControls";
import Select from "@/components/ui/Select";
import { useToast } from "@/contexts/ToastContext";
import {
  AuditLogItem,
  fetchAuditLogs,
} from "@/features/audit-logs/services/auditLogService";
import { AdminApiError } from "@/lib/admin-api";
import { getAuditActionLabel } from "@/lib/audit-labels";
import { formatDateTime } from "@/lib/format";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";

export default function AuditLogsPage() {
  const { showError } = useToast();

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [hasNext, setHasNext] = useState(false);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  async function fetchPageData(targetPage: number, cursor: string | null) {
    try {
      const response = await fetchAuditLogs({
        pageSize: DEFAULT_PAGE_SIZE,
        cursor,
        resourceType: actionFilter || undefined,
        search: search.trim() || undefined,
      });

      setLogs(response.items);
      setHasNext(response.hasNext);
      setPage(targetPage);

      setCursorStack((prev) => {
        const next = [...prev];
        next[targetPage] = response.nextCursor;
        return next;
      });
    } catch (error) {
      showError(error instanceof AdminApiError ? error.message : "Kayıtlar yüklenemedi.");
    }
  }

  async function loadPage(targetPage: number, cursor: string | null) {
    setIsLoading(true);
    try {
      await fetchPageData(targetPage, cursor);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve()
      .then(() => fetchPageData(1, null))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredLogs = logs.filter((log) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      log.adminName.toLowerCase().includes(term) ||
      log.adminEmail.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      (log.resourceId ?? "").toLowerCase().includes(term);

    const matchesAction = !actionFilter || log.action.startsWith(actionFilter);

    return matchesSearch && matchesAction;
  });

  const actionOptions = Array.from(new Set(logs.map((log) => log.resourceType)));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Admin panelinde yapılan tüm kritik işlemlerin iz kaydı."
        actions={
          <Button type="button" variant="outline" onClick={() => loadPage(1, null)}>
            Yenile
          </Button>
        }
      />

      <Card>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Admin, e-posta, aksiyon veya kaynak ID ara..."
          />
          <Select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
            <option value="">Tüm kaynak türleri</option>
            {actionOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <LoadingState label="Audit log kayıtları yükleniyor..." />
      ) : filteredLogs.length === 0 ? (
        <EmptyState title="Audit log kaydı bulunamadı" />
      ) : (
        <Card padding="sm" className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="p-4 font-medium">Tarih</th>
                  <th className="p-4 font-medium">Admin</th>
                  <th className="p-4 font-medium">İşlem</th>
                  <th className="p-4 font-medium">Kaynak</th>
                  <th className="p-4 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-t border-slate-100 align-top">
                    <td className="p-4 whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="p-4">
                      <p className="font-semibold">{log.adminName || "-"}</p>
                      <p className="text-xs text-slate-500">{log.adminEmail}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium">{getAuditActionLabel(log.action)}</p>
                      <p className="text-xs text-slate-500">{log.action}</p>
                    </td>
                    <td className="p-4">
                      <p>{log.resourceType}</p>
                      <p className="text-xs text-slate-500">{log.resourceId ?? "-"}</p>
                    </td>
                    <td className="p-4 text-xs text-slate-500">{log.ipAddress ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <PaginationControls
        page={page}
        itemCount={filteredLogs.length}
        pageSize={DEFAULT_PAGE_SIZE}
        hasNext={hasNext}
        hasPrevious={page > 1}
        isLoading={isLoading}
        onPrevious={() => loadPage(page - 1, cursorStack[page - 2] ?? null)}
        onNext={() => loadPage(page + 1, cursorStack[page] ?? null)}
      />
    </div>
  );
}
