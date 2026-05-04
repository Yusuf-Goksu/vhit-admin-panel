"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { auth } from "@/lib/firebase";

import {
  getFeedbackById,
  markFeedbackAsReadByAdmin,
  sendAdminMessage,
  updateFeedbackAdminNote,
  updateFeedbackStatus,
  watchFeedbackMessages,
} from "@/features/feedbacks/services/feedbackService";

import {
  FeedbackItem,
  FeedbackMessage,
  FeedbackStatus,
} from "@/features/feedbacks/types/feedback";

import {
  FeedbackPriorityBadge,
  FeedbackStatusBadge,
  FeedbackTypeBadge,
  FeedbackUnreadBadge,
} from "@/features/feedbacks/components/FeedbackBadges";

import { formatFirestoreDate } from "@/features/feedbacks/utils/feedbackLabels";

export default function FeedbackDetailPage() {
  const params = useParams<{ id: string }>();
  const feedbackId = params.id;

  const [feedback, setFeedback] = useState<FeedbackItem | null>(null);
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [replyMessage, setReplyMessage] = useState("");
  const [adminNote, setAdminNote] = useState("");

  const adminUser = auth.currentUser;

  const adminName = "v-HIT Destek";

  async function loadFeedback() {
    setIsLoading(true);

    try {
      const item = await getFeedbackById(feedbackId);

      if (!item) {
        setFeedback(null);
        return;
      }

      setFeedback(item);
      setAdminNote(item.adminNote || "");

      await markFeedbackAsReadByAdmin(feedbackId);
    } catch (error) {
      console.error("Feedback detail load error:", error);
      alert("Geri bildirim detayı yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadFeedback();

    const unsubscribe = watchFeedbackMessages(feedbackId, (items) => {
      setMessages(items);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedbackId]);

  async function handleSendMessage() {
    const message = replyMessage.trim();

    if (!message) {
      alert("Mesaj boş olamaz.");
      return;
    }

    if (!adminUser) {
      alert("Admin oturumu bulunamadı.");
      return;
    }

    setIsSendingMessage(true);

    try {
      await sendAdminMessage({
        feedbackId,
        adminId: adminUser.uid,
        adminName,
        message,
      });

      setReplyMessage("");
      await loadFeedback();
    } catch (error) {
      console.error("Admin message send error:", error);
      alert("Mesaj gönderilemedi.");
    } finally {
      setIsSendingMessage(false);
    }
  }

  async function handleStatusChange(status: FeedbackStatus) {
    setIsUpdatingStatus(true);

    try {
      await updateFeedbackStatus(feedbackId, status);
      await loadFeedback();
    } catch (error) {
      console.error("Feedback status update error:", error);
      alert("Durum güncellenemedi.");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleSaveAdminNote() {
    setIsSavingNote(true);

    try {
      await updateFeedbackAdminNote(feedbackId, adminNote);
      await loadFeedback();
      alert("Admin notu kaydedildi.");
    } catch (error) {
      console.error("Admin note update error:", error);
      alert("Admin notu kaydedilemedi.");
    } finally {
      setIsSavingNote(false);
    }
  }

  if (isLoading) {
    return (
      <div className="text-slate-900">
        <p className="text-slate-500">Talep detayı yükleniyor...</p>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="text-slate-900">
        <Link
          href="/dashboard/feedbacks"
          className="text-sm font-semibold text-blue-600 hover:underline"
        >
          ← Geri Bildirimler
        </Link>

        <div className="mt-6 rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold">Talep bulunamadı</h1>
          <p className="mt-2 text-sm text-slate-500">
            Bu geri bildirim kaydı silinmiş veya erişilemiyor olabilir.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-slate-900">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/feedbacks"
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            ← Geri Bildirimler
          </Link>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <FeedbackStatusBadge status={feedback.status} />
            <FeedbackPriorityBadge priority={feedback.priority} />
            <FeedbackTypeBadge type={feedback.type} />
            {feedback.unreadForAdmin && <FeedbackUnreadBadge />}
          </div>

          <h1 className="mt-4 text-2xl font-bold">
            {feedback.subject || "Konu yok"}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {feedback.ticketCode} · Oluşturulma:{" "}
            {formatFirestoreDate(feedback.createdAt)}
          </p>
        </div>

        <button
          onClick={loadFeedback}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Yenile
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <TicketSummaryCard feedback={feedback} />

          <MessagePanel
            messages={messages}
            replyMessage={replyMessage}
            setReplyMessage={setReplyMessage}
            isSendingMessage={isSendingMessage}
            onSendMessage={handleSendMessage}
          />
        </div>

        <div className="space-y-6">
          <StatusCard
            feedback={feedback}
            isUpdatingStatus={isUpdatingStatus}
            onChangeStatus={handleStatusChange}
          />

          <UserCard feedback={feedback} />

          <DeviceCard feedback={feedback} />

          <AdminNoteCard
            adminNote={adminNote}
            setAdminNote={setAdminNote}
            isSavingNote={isSavingNote}
            onSave={handleSaveAdminNote}
          />
        </div>
      </div>
    </div>
  );
}

function TicketSummaryCard({ feedback }: { feedback: FeedbackItem }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">Talep Özeti</h2>

      <div className="mt-4 space-y-3 text-sm">
        <InfoRow label="Talep Kodu" value={feedback.ticketCode} />
        <InfoRow label="Konu" value={feedback.subject || "-"} />
        <InfoRow label="İlk Mesaj" value={feedback.message || "-"} />
        <InfoRow
          label="Son Mesaj"
          value={feedback.lastMessage || feedback.message || "-"}
        />
        <InfoRow
          label="Son Mesaj Tarihi"
          value={formatFirestoreDate(feedback.lastMessageAt)}
        />
        <InfoRow
          label="Mesaj Sayısı"
          value={String(feedback.messageCount || 0)}
        />
        <InfoRow
          label="İletişim İzni"
          value={feedback.allowContact ? "Var" : "Yok"}
        />
      </div>

      {feedback.attachmentUrl && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold text-slate-700">
            İlk görsel eki
          </p>

          <a
            href={feedback.attachmentUrl}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-xl border border-slate-200"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={feedback.attachmentUrl}
              alt={feedback.attachmentFileName || "Feedback attachment"}
              className="max-h-80 w-full object-cover"
            />
          </a>
        </div>
      )}
    </section>
  );
}

function MessagePanel({
  messages,
  replyMessage,
  setReplyMessage,
  isSendingMessage,
  onSendMessage,
}: {
  messages: FeedbackMessage[];
  replyMessage: string;
  setReplyMessage: (value: string) => void;
  isSendingMessage: boolean;
  onSendMessage: () => void;
}) {
  return (
    <section className="rounded-2xl bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-lg font-bold">Konuşma Geçmişi</h2>
        <p className="mt-1 text-sm text-slate-500">
          Kullanıcıyla aynı talep üzerinden yazışabilirsiniz.
        </p>
      </div>

      <div className="max-h-[560px] space-y-4 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500">Henüz mesaj yok.</p>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
      </div>

      <div className="border-t border-slate-200 p-5">
        <textarea
          value={replyMessage}
          onChange={(event) => setReplyMessage(event.target.value)}
          placeholder="Kullanıcıya cevap yazın..."
          rows={4}
          className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-slate-900"
        />

        <div className="mt-3 flex justify-end">
          <button
            onClick={onSendMessage}
            disabled={isSendingMessage}
            className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSendingMessage ? "Gönderiliyor..." : "Cevap Gönder"}
          </button>
        </div>
      </div>
    </section>
  );
}

function MessageBubble({ message }: { message: FeedbackMessage }) {
  const isAdmin = message.senderRole === "admin";

  return (
    <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] rounded-2xl p-4 ${
          isAdmin
            ? "bg-blue-600 text-white"
            : "border border-slate-200 bg-slate-50 text-slate-900"
        }`}
      >
        <div className="mb-2 flex items-center justify-between gap-4">
          <p
            className={`text-xs font-bold ${
              isAdmin ? "text-blue-100" : "text-slate-500"
            }`}
          >
            {isAdmin ? "Admin" : message.senderName || "Kullanıcı"}
          </p>

          <p
            className={`text-xs ${
              isAdmin ? "text-blue-100" : "text-slate-400"
            }`}
          >
            {formatFirestoreDate(message.createdAt)}
          </p>
        </div>

        {message.message && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.message}
          </p>
        )}

        {message.attachmentUrl && (
          <a
            href={message.attachmentUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block overflow-hidden rounded-xl"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.attachmentUrl}
              alt={message.attachmentFileName || "Mesaj eki"}
              className="max-h-72 w-full object-cover"
            />
          </a>
        )}
      </div>
    </div>
  );
}

function StatusCard({
  feedback,
  isUpdatingStatus,
  onChangeStatus,
}: {
  feedback: FeedbackItem;
  isUpdatingStatus: boolean;
  onChangeStatus: (status: FeedbackStatus) => void;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">Durum Yönetimi</h2>

      <select
        value={feedback.status}
        disabled={isUpdatingStatus}
        onChange={(event) =>
          onChangeStatus(event.target.value as FeedbackStatus)
        }
        className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
      >
        <option value="open">Yeni</option>
        <option value="reviewing">İnceleniyor</option>
        <option value="resolved">Çözüldü</option>
        <option value="closed">Kapatıldı</option>
      </select>

      <p className="mt-3 text-xs text-slate-500">
        Durum değişikliği mobil kullanıcı tarafında talep durumunu günceller.
      </p>
    </section>
  );
}

function UserCard({ feedback }: { feedback: FeedbackItem }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">Kullanıcı Bilgisi</h2>

      <div className="mt-4 space-y-3 text-sm">
        <InfoRow label="Ad Soyad" value={feedback.userFullName || "-"} />
        <InfoRow label="E-posta" value={feedback.userEmail || "-"} />
        <InfoRow label="User ID" value={feedback.userId || "-"} />
        <InfoRow label="Clinic ID" value={feedback.clinicId || "-"} />
      </div>
    </section>
  );
}

function DeviceCard({ feedback }: { feedback: FeedbackItem }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">Teknik Bilgiler</h2>

      <div className="mt-4 space-y-3 text-sm">
        <InfoRow label="Platform" value={feedback.platform || "-"} />
        <InfoRow label="Cihaz" value={feedback.deviceModel || "-"} />
        <InfoRow
          label="Üretici"
          value={feedback.deviceManufacturer || "-"}
        />
        <InfoRow label="OS" value={feedback.osVersion || "-"} />
        <InfoRow label="App Version" value={feedback.appVersion || "-"} />
        <InfoRow label="Build" value={feedback.buildNumber || "-"} />
        <InfoRow label="Kaynak" value={feedback.screenName || "-"} />
      </div>
    </section>
  );
}

function AdminNoteCard({
  adminNote,
  setAdminNote,
  isSavingNote,
  onSave,
}: {
  adminNote: string;
  setAdminNote: (value: string) => void;
  isSavingNote: boolean;
  onSave: () => void;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">Admin İç Notu</h2>

      <textarea
        value={adminNote}
        onChange={(event) => setAdminNote(event.target.value)}
        placeholder="Kullanıcıya görünmeyen iç not..."
        rows={5}
        className="mt-4 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-slate-900"
      />

      <button
        onClick={onSave}
        disabled={isSavingNote}
        className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSavingNote ? "Kaydediliyor..." : "Notu Kaydet"}
      </button>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-slate-800">{value}</p>
    </div>
  );
}