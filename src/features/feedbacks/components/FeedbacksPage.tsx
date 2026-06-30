"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getCountFromServer,
  query,
  where,
} from "firebase/firestore";

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
  FeedbackPriorityBadge,
  FeedbackStatusBadge,
  FeedbackTypeBadge,
  FeedbackUnreadBadge,
} from "@/features/feedbacks/components/FeedbackBadges";
import { FeedbackItem } from "@/features/feedbacks/types/feedback";
import { formatFirestoreDate } from "@/features/feedbacks/utils/feedbackLabels";
import { useAdminListQuery } from "@/hooks/useAdminListQuery";
import { db } from "@/lib/firebase";

export default function FeedbacksPage() {
  const { showError } = useToast();
  const listQuery = useAdminListQuery<FeedbackItem>("/api/admin/feedbacks/list");
  const [initialLoading, setInitialLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, unread: 0, open: 0, reviewing: 0, resolved: 0 });

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  function buildFilters() {
    return {
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      type: typeFilter || undefined,
    };
  }

  async function loadStats() {
    const ref = collection(db, "feedbacks");
    const [total, unread, open, reviewing, resolved] = await Promise.all([
      getCountFromServer(ref),
      getCountFromServer(query(ref, where("unreadForAdmin", "==", true))),
      getCountFromServer(query(ref, where("status", "==", "open"))),
      getCountFromServer(query(ref, where("status", "==", "reviewing"))),
      getCountFromServer(query(ref, where("status", "==", "resolved"))),
    ]);

    setStats({
      total: total.data().count,
      unread: unread.data().count,
      open: open.data().count,
      reviewing: reviewing.data().count,
      resolved: resolved.data().count,
    });
  }

  async function reloadAll() {
    await Promise.all([listQuery.reload(buildFilters()), loadStats()]);
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve()
      .then(() => Promise.all([listQuery.reload(buildFilters()), loadStats()]))
      .catch(() => {
        if (!cancelled) showError("Geri bildirimler yüklenemedi.");
      })
      .finally(() => {
        if (!cancelled) setInitialLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve()
      .then(() => listQuery.reload(buildFilters()))
      .catch(() => {
        if (!cancelled) showError("Liste güncellenemedi.");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, priorityFilter, typeFilter]);

  const isLoading = initialLoading || listQuery.isLoading;
  const feedbacks = listQuery.items;

  const filteredFeedbacks = useMemo(() => {
    const term = debouncedSearch.toLowerCase();
    if (!term) return feedbacks;

    return feedbacks.filter(
      (item) =>
        item.ticketCode?.toLowerCase().includes(term) ||
        item.subject?.toLowerCase().includes(term) ||
        item.userFullName?.toLowerCase().includes(term) ||
        item.userEmail?.toLowerCase().includes(term)
    );
  }, [feedbacks, debouncedSearch]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Geri Bildirimler"
        description="Mobil uygulamadan gelen destek taleplerini yönetin."
        actions={
          <Button type="button" variant="outline" onClick={reloadAll}>
            Yenile
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SummaryCard title="Toplam Talep" value={stats.total} />
        <SummaryCard title="Yeni Mesaj" value={stats.unread} highlight />
        <SummaryCard title="Yeni" value={stats.open} />
        <SummaryCard title="İnceleniyor" value={stats.reviewing} />
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
          <Input
            className="xl:col-span-2"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Kod, konu, kullanıcı veya e-posta ara..."
          />
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Tüm Durumlar</option>
            <option value="open">Yeni</option>
            <option value="reviewing">İnceleniyor</option>
            <option value="resolved">Çözüldü</option>
            <option value="closed">Kapatıldı</option>
          </Select>
          <Select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
            <option value="">Tüm Öncelikler</option>
            <option value="low">Düşük</option>
            <option value="normal">Normal</option>
            <option value="high">Yüksek</option>
          </Select>
          <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="">Tüm Türler</option>
            <option value="bug">Hata</option>
            <option value="suggestion">Öneri</option>
            <option value="performance">Performans</option>
            <option value="test">Test / Analiz</option>
            <option value="appointment">Randevu</option>
            <option value="patient">Hasta</option>
            <option value="account">Hesap</option>
            <option value="other">Diğer</option>
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <LoadingState label="Geri bildirimler yükleniyor..." />
      ) : filteredFeedbacks.length === 0 ? (
        <EmptyState title="Geri bildirim bulunamadı" />
      ) : (
        <Card padding="sm" className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="p-4">Talep</th>
                  <th className="p-4">Kullanıcı</th>
                  <th className="p-4">Tür</th>
                  <th className="p-4">Öncelik</th>
                  <th className="p-4">Durum</th>
                  <th className="p-4">Son Mesaj</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {filteredFeedbacks.map((item) => (
                  <tr key={item.id} className="border-t align-top hover:bg-slate-50">
                    <td className="p-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <p className="font-bold">{item.ticketCode}</p>
                          {item.unreadForAdmin && <FeedbackUnreadBadge />}
                        </div>
                        <p className="max-w-xs font-semibold text-slate-800">
                          {item.subject || "Konu yok"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatFirestoreDate(item.createdAt)}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold">{item.userFullName || "-"}</p>
                      <p className="text-xs text-slate-500">{item.userEmail}</p>
                    </td>
                    <td className="p-4">
                      <FeedbackTypeBadge type={item.type} />
                    </td>
                    <td className="p-4">
                      <FeedbackPriorityBadge priority={item.priority} />
                    </td>
                    <td className="p-4">
                      <FeedbackStatusBadge status={item.status} />
                    </td>
                    <td className="p-4">
                      <p className="max-w-xs truncate text-slate-700">
                        {item.lastMessage || item.message || "-"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatFirestoreDate(item.lastMessageAt)}
                      </p>
                    </td>
                    <td className="p-4 text-right">
                      <Link href={`/dashboard/feedbacks/${item.id}`}>
                        <Button type="button" size="sm">
                          Aç
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <PaginationControls
        page={listQuery.page}
        itemCount={filteredFeedbacks.length}
        pageSize={listQuery.pageSize}
        hasNext={listQuery.hasNext}
        hasPrevious={listQuery.hasPrevious}
        isLoading={listQuery.isLoading}
        onPrevious={() => listQuery.previousPage()}
        onNext={() => listQuery.nextPage()}
      />
    </div>
  );
}

function SummaryCard({
  title,
  value,
  highlight = false,
}: {
  title: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-blue-600 bg-blue-600 text-white" : undefined}>
      <p className={highlight ? "text-sm text-blue-100" : "text-sm text-slate-500"}>{title}</p>
      <p className="mt-3 text-3xl font-bold">{value}</p>
    </Card>
  );
}
