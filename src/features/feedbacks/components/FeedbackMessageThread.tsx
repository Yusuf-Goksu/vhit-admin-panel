"use client";

import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Textarea from "@/components/ui/Textarea";
import { FeedbackMessage } from "@/features/feedbacks/types/feedback";
import {
  formatFirestoreDate,
  formatFirestoreDateShort,
  toFirestoreDate,
} from "@/features/feedbacks/utils/feedbackLabels";

const ADMIN_NAME = "v-HIT Destek";

type FeedbackMessageThreadProps = {
  messages: FeedbackMessage[];
  replyMessage: string;
  isSendingMessage: boolean;
  userDisplayName: string;
  onReplyChange: (value: string) => void;
  onSendReply: () => void;
  onPreviewImage: (value: { src: string; alt: string }) => void;
  onDeleteMessage: (message: FeedbackMessage) => void;
};

function groupMessagesByDate(messages: FeedbackMessage[]) {
  const groups: { label: string; items: FeedbackMessage[] }[] = [];

  for (const message of messages) {
    const date = toFirestoreDate(message.createdAt);
    const label = date ? formatFirestoreDateShort(date) : "Tarih yok";
    const lastGroup = groups.at(-1);

    if (lastGroup?.label === label) {
      lastGroup.items.push(message);
    } else {
      groups.push({ label, items: [message] });
    }
  }

  return groups;
}

function MessageBubble({
  message,
  userDisplayName,
  onPreviewImage,
  onDelete,
}: {
  message: FeedbackMessage;
  userDisplayName: string;
  onPreviewImage: (value: { src: string; alt: string }) => void;
  onDelete: () => void;
}) {
  const isAdmin = message.senderRole === "admin";
  const isSystem = message.senderRole === "system";
  const senderName = isAdmin
    ? ADMIN_NAME
    : isSystem
      ? "Sistem"
      : message.senderName || userDisplayName || "Kullanıcı";

  if (isSystem) {
    return (
      <div className="flex justify-center py-1">
        <div className="rounded-full border border-slate-300 bg-white px-4 py-2 text-center text-xs font-medium text-slate-600 shadow-sm">
          {message.message || "Sistem mesajı"}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 ${isAdmin ? "flex-row-reverse" : "flex-row"}`}>
      {!isAdmin && <Avatar name={senderName} size="sm" />}

      <div className={`max-w-[min(100%,42rem)] ${isAdmin ? "items-end" : "items-start"} flex flex-col`}>
        <div className={`mb-1.5 flex items-center gap-2 ${isAdmin ? "flex-row-reverse" : "flex-row"}`}>
          <span
            className={`rounded-md px-2 py-0.5 text-xs font-bold ${
              isAdmin ? "bg-indigo-100 text-indigo-800" : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200"
            }`}
          >
            {senderName}
          </span>
          <span className="text-xs text-slate-500">{formatFirestoreDate(message.createdAt)}</span>
        </div>

        <div
          className={`rounded-2xl px-4 py-3 ${
            isAdmin
              ? "rounded-tr-md bg-indigo-600 text-white shadow-md ring-2 ring-indigo-700/20"
              : "rounded-tl-md border-2 border-slate-200 bg-white text-slate-900 shadow-sm"
          }`}
        >
          {message.message && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.message}</p>
          )}

          {message.attachmentUrl && (
            <button
              type="button"
              onClick={() =>
                onPreviewImage({
                  src: message.attachmentUrl!,
                  alt: message.attachmentFileName || "Mesaj eki",
                })
              }
              className={`mt-3 block overflow-hidden rounded-xl border-2 ${
                isAdmin ? "border-indigo-400/50" : "border-slate-200"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={message.attachmentUrl}
                alt={message.attachmentFileName || "Mesaj eki"}
                className="max-h-72 w-full object-cover"
              />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onDelete}
          className={`mt-1.5 rounded-md px-2 py-0.5 text-xs font-semibold text-red-700 hover:bg-red-50 ${isAdmin ? "self-end" : "self-start"}`}
        >
          Mesajı sil
        </button>
      </div>
    </div>
  );
}

export default function FeedbackMessageThread({
  messages,
  replyMessage,
  isSendingMessage,
  userDisplayName,
  onReplyChange,
  onSendReply,
  onPreviewImage,
  onDeleteMessage,
}: FeedbackMessageThreadProps) {
  const groupedMessages = groupMessagesByDate(messages);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-200/60">
      <div className="border-b border-slate-700 bg-slate-800 px-5 py-4 text-white">
        <h2 className="text-lg font-bold">Konuşma Geçmişi</h2>
        <p className="mt-1 text-sm text-slate-300">
          {messages.length} mesaj · kullanıcı ile destek ekibi arasındaki yazışma
        </p>
      </div>

      <div className="max-h-[620px] space-y-6 overflow-y-auto border-b border-slate-200 bg-slate-200/70 px-5 py-5">
        {messages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6">
            <EmptyState
              title="Henüz mesaj yok"
              description="Kullanıcıdan gelen ilk yanıt burada görünecek."
            />
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.label} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-400/50" />
                <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
                  {group.label}
                </span>
                <div className="h-px flex-1 bg-slate-400/50" />
              </div>

              {group.items.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  userDisplayName={userDisplayName}
                  onPreviewImage={onPreviewImage}
                  onDelete={() => onDeleteMessage(message)}
                />
              ))}
            </div>
          ))
        )}
      </div>

      <div className="border-t-2 border-indigo-100 bg-indigo-50/40 p-5">
        <label htmlFor="feedback-reply" className="text-sm font-bold text-slate-800">
          Kullanıcıya yanıt yaz
        </label>
        <p className="mt-1 text-xs text-slate-500">Gönderilen yanıt kullanıcının mobil uygulamasında görünür.</p>
        <Textarea
          id="feedback-reply"
          className="mt-3 border-slate-300 bg-white"
          value={replyMessage}
          onChange={(event) => onReplyChange(event.target.value)}
          placeholder="Destek yanıtınızı buraya yazın..."
          rows={4}
        />
        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={isSendingMessage || !replyMessage.trim()}
            onClick={onSendReply}
          >
            {isSendingMessage ? "Gönderiliyor..." : "Yanıt Gönder"}
          </Button>
        </div>
      </div>
    </section>
  );
}
