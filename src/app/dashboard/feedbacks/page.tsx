"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { FeedbackItem } from "@/features/feedbacks/types/feedback";
import { getFeedbacks } from "@/features/feedbacks/services/feedbackService";
import {
  FeedbackPriorityBadge,
  FeedbackStatusBadge,
  FeedbackTypeBadge,
  FeedbackUnreadBadge,
} from "@/features/feedbacks/components/FeedbackBadges";
import { formatFirestoreDate } from "@/features/feedbacks/utils/feedbackLabels";

export default function FeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  async function loadFeedbacks() {
    setIsLoading(true);

    try {
      const list = await getFeedbacks();
      setFeedbacks(list);
    } catch (error) {
      console.error("Feedback load error:", error);
      alert("Geri bildirimler yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const filteredFeedbacks = useMemo(() => {
    const term = search.trim().toLowerCase();

    return feedbacks.filter((item) => {
      const matchesSearch =
        !term ||
        item.ticketCode?.toLowerCase().includes(term) ||
        item.subject?.toLowerCase().includes(term) ||
        item.userFullName?.toLowerCase().includes(term) ||
        item.userEmail?.toLowerCase().includes(term);

      const matchesStatus = !statusFilter || item.status === statusFilter;
      const matchesPriority =
        !priorityFilter || item.priority === priorityFilter;
      const matchesType = !typeFilter || item.type === typeFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesType;
    });
  }, [feedbacks, search, statusFilter, priorityFilter, typeFilter]);

  const counts = useMemo(() => {
    return {
      total: feedbacks.length,
      unread: feedbacks.filter((item) => item.unreadForAdmin).length,
      open: feedbacks.filter((item) => item.status === "open").length,
      reviewing: feedbacks.filter((item) => item.status === "reviewing").length,
      resolved: feedbacks.filter((item) => item.status === "resolved").length,
    };
  }, [feedbacks]);

  return (
    <div className="text-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Geri Bildirimler</h1>
          <p className="mt-2 text-sm text-slate-500">
            Mobil uygulamadan gelen destek taleplerini yönetin ve kullanıcılarla
            aynı talep üzerinden mesajlaşın.
          </p>
        </div>

        <button
          onClick={loadFeedbacks}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Yenile
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <SummaryCard title="Toplam Talep" value={counts.total} />
        <SummaryCard title="Yeni Mesaj" value={counts.unread} highlight />
        <SummaryCard title="Yeni" value={counts.open} />
        <SummaryCard title="İnceleniyor" value={counts.reviewing} />
      </div>

      <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Kod, konu, kullanıcı veya e-posta ara..."
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900 xl:col-span-2"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none"
          >
            <option value="">Tüm Durumlar</option>
            <option value="open">Yeni</option>
            <option value="reviewing">İnceleniyor</option>
            <option value="resolved">Çözüldü</option>
            <option value="closed">Kapatıldı</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none"
          >
            <option value="">Tüm Öncelikler</option>
            <option value="low">Düşük</option>
            <option value="normal">Normal</option>
            <option value="high">Yüksek</option>
          </select>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none"
          >
            <option value="">Tüm Türler</option>
            <option value="bug">Hata</option>
            <option value="suggestion">Öneri</option>
            <option value="performance">Performans</option>
            <option value="test">Test / Analiz</option>
            <option value="appointment">Randevu</option>
            <option value="patient">Hasta</option>
            <option value="account">Hesap</option>
            <option value="other">Diğer</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-8 text-slate-500">Geri bildirimler yükleniyor...</p>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="mt-8 rounded-2xl bg-white p-8 text-slate-500 shadow-sm">
          Geri bildirim bulunamadı.
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">
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
                    <Link
                      href={`/dashboard/feedbacks/${item.id}`}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      Aç
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
    <div
      className={`rounded-2xl p-5 shadow-sm ${
        highlight ? "bg-blue-600 text-white" : "bg-white text-slate-900"
      }`}
    >
      <p className={highlight ? "text-sm text-blue-100" : "text-sm text-slate-500"}>
        {title}
      </p>
      <p className="mt-3 text-3xl font-bold">{value}</p>
    </div>
  );
}