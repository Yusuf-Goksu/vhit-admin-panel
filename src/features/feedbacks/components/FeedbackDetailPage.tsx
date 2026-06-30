"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ImageLightbox from "@/components/ui/ImageLightbox";
import LoadingState from "@/components/ui/LoadingState";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useToast } from "@/contexts/ToastContext";
import {
  FeedbackPriorityBadge,
  FeedbackStatusBadge,
  FeedbackTypeBadge,
  FeedbackUnreadBadge,
} from "@/features/feedbacks/components/FeedbackBadges";
import FeedbackDetailSidebar from "@/features/feedbacks/components/FeedbackDetailSidebar";
import FeedbackMessageThread from "@/features/feedbacks/components/FeedbackMessageThread";
import FeedbackPanel from "@/features/feedbacks/components/FeedbackPanel";
import {
  deleteFeedback,
  deleteFeedbackMessage,
  FeedbackUserContact,
  getFeedbackById,
  getFeedbackUserContact,
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
  formatAppVersion,
  formatFirestoreDate,
  formatFirestoreDateShort,
  getFeedbackPhone,
  platformLabel,
} from "@/features/feedbacks/utils/feedbackLabels";
import { AdminApiError } from "@/lib/admin-api";

const ADMIN_NAME = "v-HIT Destek";

const statCardStyles = [
  "border-l-indigo-500 bg-indigo-50/80 ring-indigo-100",
  "border-l-sky-500 bg-sky-50/80 ring-sky-100",
  "border-l-violet-500 bg-violet-50/80 ring-violet-100",
  "border-l-emerald-500 bg-emerald-50/80 ring-emerald-100",
] as const;

function StatCard({ label, value, styleIndex }: { label: string; value: string; styleIndex: number }) {
  const style = statCardStyles[styleIndex % statCardStyles.length];

  return (
    <div className={`rounded-2xl border border-slate-200 border-l-4 p-4 shadow-sm ring-1 ${style}`}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">{label}</p>
      <p className="mt-2 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

export default function FeedbackDetailPage({ feedbackId }: { feedbackId: string }) {
  const router = useRouter();
  const { confirm } = useConfirm();
  const { showSuccess, showError } = useToast();

  const [feedback, setFeedback] = useState<FeedbackItem | null>(null);
  const [userContact, setUserContact] = useState<FeedbackUserContact | null>(null);
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null);

  async function loadFeedback() {
    setIsLoading(true);

    try {
      const item = await getFeedbackById(feedbackId);

      if (!item) {
        setFeedback(null);
        setUserContact(null);
        return;
      }

      const contact = item.userId ? await getFeedbackUserContact(item.userId) : null;

      setFeedback(item);
      setUserContact(contact);
      setAdminNote(item.adminNote || "");
      await markFeedbackAsReadByAdmin(feedbackId);
    } catch {
      showError("Geri bildirim detayı yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadFeedback();
    const unsubscribe = watchFeedbackMessages(feedbackId, setMessages);
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedbackId]);

  async function handleSendMessage() {
    const message = replyMessage.trim();
    if (!message) {
      showError("Mesaj boş olamaz.");
      return;
    }

    setIsSendingMessage(true);

    try {
      await sendAdminMessage({
        feedbackId,
        adminId: "admin",
        adminName: ADMIN_NAME,
        message,
      });
      setReplyMessage("");
      showSuccess("Mesaj gönderildi.");
      await loadFeedback();
    } catch (error) {
      showError(error instanceof AdminApiError ? error.message : "Mesaj gönderilemedi.");
    } finally {
      setIsSendingMessage(false);
    }
  }

  async function handleStatusChange(status: FeedbackStatus) {
    setIsUpdatingStatus(true);

    try {
      await updateFeedbackStatus(feedbackId, status);
      showSuccess("Durum güncellendi.");
      await loadFeedback();
    } catch (error) {
      showError(error instanceof AdminApiError ? error.message : "Durum güncellenemedi.");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleSaveAdminNote() {
    setIsSavingNote(true);

    try {
      await updateFeedbackAdminNote(feedbackId, adminNote);
      showSuccess("Admin notu kaydedildi.");
      await loadFeedback();
    } catch (error) {
      showError(error instanceof AdminApiError ? error.message : "Not kaydedilemedi.");
    } finally {
      setIsSavingNote(false);
    }
  }

  async function handleDeleteMessage(message: FeedbackMessage) {
    const approved = await confirm({
      title: "Mesajı sil",
      description: "Bu mesaj kalıcı olarak silinecek.",
      confirmLabel: "Sil",
      variant: "danger",
    });

    if (!approved) return;

    try {
      await deleteFeedbackMessage(feedbackId, message.id);
      showSuccess("Mesaj silindi.");
      await loadFeedback();
    } catch (error) {
      showError(error instanceof AdminApiError ? error.message : "Mesaj silinemedi.");
    }
  }

  async function handleDeleteFeedback() {
    const approved = await confirm({
      title: "Talebi kalıcı sil",
      description: "Tüm sohbet geçmişi ile birlikte geri bildirim kalıcı olarak silinecek.",
      confirmLabel: "Kalıcı Sil",
      variant: "danger",
      requireText: "SİL",
    });

    if (!approved) return;

    try {
      await deleteFeedback(feedbackId);
      showSuccess("Geri bildirim silindi.");
      router.push("/dashboard/feedbacks");
    } catch (error) {
      showError(error instanceof AdminApiError ? error.message : "Silme başarısız.");
    }
  }

  if (isLoading) {
    return <LoadingState label="Talep detayı yükleniyor..." />;
  }

  if (!feedback) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/feedbacks"
          className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-slate-50"
        >
          ← Geri Bildirimler
        </Link>
        <EmptyState
          title="Talep bulunamadı"
          description="Bu geri bildirim kaydı silinmiş veya erişilemiyor olabilir."
        />
      </div>
    );
  }

  const displayName = feedback.userFullName || userContact?.fullName || "Kullanıcı";
  const phone = getFeedbackPhone(feedback, userContact);

  return (
    <div className="space-y-5">
      <Link
        href="/dashboard/feedbacks"
        className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-slate-50"
      >
        ← Geri Bildirimler
      </Link>

      <section className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-md ring-1 ring-slate-200">
        <div className="border-b border-slate-700 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-5 text-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <FeedbackStatusBadge status={feedback.status} />
                <FeedbackPriorityBadge priority={feedback.priority} />
                <FeedbackTypeBadge type={feedback.type} />
                {feedback.unreadForAdmin && <FeedbackUnreadBadge />}
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight">
                {feedback.subject || "Konu belirtilmemiş"}
              </h1>
              <p className="mt-2 font-mono text-sm text-slate-300">
                {feedback.ticketCode} · {formatFirestoreDate(feedback.createdAt)}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <Button type="button" variant="outline" className="border-slate-500 bg-white/10 text-white hover:bg-white/20" onClick={loadFeedback}>
                Yenile
              </Button>
              <Button type="button" variant="danger" onClick={handleDeleteFeedback}>
                Talebi Sil
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-b border-slate-200 bg-slate-100/80 p-4 lg:grid-cols-4">
          <StatCard
            label="Mesaj Sayısı"
            value={String(feedback.messageCount || messages.length || 0)}
            styleIndex={0}
          />
          <StatCard label="Platform" value={platformLabel(feedback.platform)} styleIndex={1} />
          <StatCard label="Uygulama Sürümü" value={formatAppVersion(feedback)} styleIndex={2} />
          <StatCard
            label="Son Aktivite"
            value={
              feedback.lastMessageAt
                ? formatFirestoreDateShort(feedback.lastMessageAt)
                : formatFirestoreDateShort(feedback.createdAt)
            }
            styleIndex={3}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-8">
          <FeedbackPanel
            title="İlk Mesaj"
            description="Kullanıcının gönderdiği talep özeti"
            tone="muted"
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_240px]">
              <div className="rounded-xl border-2 border-slate-200 bg-white p-4 shadow-inner">
                <p className="whitespace-pre-wrap text-base leading-7 text-slate-800">
                  {feedback.message?.trim() || "Mesaj içeriği bulunmuyor."}
                </p>
              </div>

              <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                  Gönderen
                </p>
                <p className="mt-2 text-base font-bold text-slate-900">{displayName}</p>
                <div className="mt-3 space-y-2 border-t border-indigo-200 pt-3 text-sm">
                  <p>
                    <span className="font-semibold text-slate-600">E-posta: </span>
                    <span className="text-slate-800">{feedback.userEmail || userContact?.email || "-"}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-slate-600">Telefon: </span>
                    <span className="text-slate-800">{phone || "Belirtilmemiş"}</span>
                  </p>
                </div>
              </div>
            </div>

            {feedback.attachmentUrl && (
              <button
                type="button"
                onClick={() =>
                  setPreviewImage({
                    src: feedback.attachmentUrl!,
                    alt: feedback.attachmentFileName || "Geri bildirim eki",
                  })
                }
                className="mt-4 block overflow-hidden rounded-xl border-2 border-slate-300 bg-slate-100 shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={feedback.attachmentUrl}
                  alt={feedback.attachmentFileName || "Geri bildirim eki"}
                  className="max-h-96 w-full object-cover"
                />
              </button>
            )}
          </FeedbackPanel>

          <FeedbackMessageThread
            messages={messages}
            replyMessage={replyMessage}
            isSendingMessage={isSendingMessage}
            userDisplayName={displayName}
            onReplyChange={setReplyMessage}
            onSendReply={handleSendMessage}
            onPreviewImage={setPreviewImage}
            onDeleteMessage={handleDeleteMessage}
          />
        </div>

        <div className="xl:col-span-4">
          <FeedbackDetailSidebar
            feedback={feedback}
            userContact={userContact}
            adminNote={adminNote}
            isSavingNote={isSavingNote}
            isUpdatingStatus={isUpdatingStatus}
            onAdminNoteChange={setAdminNote}
            onSaveAdminNote={handleSaveAdminNote}
            onStatusChange={handleStatusChange}
          />
        </div>
      </div>

      <ImageLightbox
        open={!!previewImage}
        onClose={() => setPreviewImage(null)}
        src={previewImage?.src ?? ""}
        alt={previewImage?.alt ?? ""}
      />
    </div>
  );
}
