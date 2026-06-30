"use client";

import { ReactNode } from "react";

import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import FeedbackPanel, { FeedbackMetaItem } from "@/features/feedbacks/components/FeedbackPanel";
import {
  FeedbackPriorityBadge,
  FeedbackStatusBadge,
  FeedbackTypeBadge,
} from "@/features/feedbacks/components/FeedbackBadges";
import { FeedbackUserContact } from "@/features/feedbacks/services/feedbackService";
import { FeedbackItem, FeedbackStatus } from "@/features/feedbacks/types/feedback";
import {
  feedbackTypeLabel,
  formatAppVersion,
  formatDeviceLabel,
  formatFirestoreDate,
  getFeedbackPhone,
  platformLabel,
} from "@/features/feedbacks/utils/feedbackLabels";

type FeedbackDetailSidebarProps = {
  feedback: FeedbackItem;
  userContact: FeedbackUserContact | null;
  adminNote: string;
  isSavingNote: boolean;
  isUpdatingStatus: boolean;
  onAdminNoteChange: (value: string) => void;
  onSaveAdminNote: () => void;
  onStatusChange: (status: FeedbackStatus) => void;
};

function SidebarSection({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`border-b border-slate-200 last:border-b-0 ${className}`}>
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">{title}</h3>
      </div>
      <div className="space-y-4 bg-slate-50/40 p-5">{children}</div>
    </div>
  );
}

export default function FeedbackDetailSidebar({
  feedback,
  userContact,
  adminNote,
  isSavingNote,
  isUpdatingStatus,
  onAdminNoteChange,
  onSaveAdminNote,
  onStatusChange,
}: FeedbackDetailSidebarProps) {
  const phone = getFeedbackPhone(feedback, userContact);
  const displayName = feedback.userFullName || userContact?.fullName || "Kullanıcı";
  const displayEmail = feedback.userEmail || userContact?.email || "-";

  return (
    <div className="xl:sticky xl:top-6">
      <FeedbackPanel title="Talep Detayları" description="Durum, kullanıcı ve teknik bilgiler" tone="dark" bodyClassName="p-0">
        <SidebarSection title="Durum Yönetimi">
          <div className="flex flex-wrap gap-2">
            <FeedbackStatusBadge status={feedback.status} />
            <FeedbackPriorityBadge priority={feedback.priority} />
            <FeedbackTypeBadge type={feedback.type} />
          </div>
          <Select
            value={feedback.status}
            disabled={isUpdatingStatus}
            onChange={(event) => onStatusChange(event.target.value as FeedbackStatus)}
          >
            <option value="open">Yeni</option>
            <option value="reviewing">İnceleniyor</option>
            <option value="resolved">Çözüldü</option>
            <option value="closed">Kapatıldı</option>
          </Select>
        </SidebarSection>

        <SidebarSection title="Kullanıcı Bilgileri">
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <Avatar name={displayName} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold text-slate-900">{displayName}</p>
              <p className="mt-0.5 truncate text-sm text-slate-600">{displayEmail}</p>
              <span
                className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  feedback.allowContact
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-slate-100 text-slate-600"
                }`}
              >
                {feedback.allowContact ? "İletişime izin verildi" : "İletişim izni yok"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <FeedbackMetaItem label="Telefon" value={phone || "Belirtilmemiş"} highlight />
            <FeedbackMetaItem label="Kullanıcı ID" value={feedback.userId || "-"} mono />
            {feedback.clinicId && (
              <FeedbackMetaItem label="Klinik ID" value={feedback.clinicId} mono />
            )}
          </div>
        </SidebarSection>

        <SidebarSection title="Cihaz & Uygulama">
          <div className="grid grid-cols-1 gap-2">
            <FeedbackMetaItem label="Platform" value={platformLabel(feedback.platform)} />
            <FeedbackMetaItem label="Sürüm" value={formatAppVersion(feedback)} mono highlight />
            <FeedbackMetaItem label="Cihaz" value={formatDeviceLabel(feedback)} />
            <FeedbackMetaItem label="İşletim Sistemi" value={feedback.osVersion?.trim() || "-"} />
            <FeedbackMetaItem label="Kaynak" value={feedback.source?.trim() || "-"} />
            <FeedbackMetaItem label="Ekran" value={feedback.screenName?.trim() || "-"} />
          </div>
        </SidebarSection>

        <SidebarSection title="Talep Kaydı">
          <div className="grid grid-cols-1 gap-2">
            <FeedbackMetaItem label="Tür" value={feedbackTypeLabel(feedback.type)} />
            <FeedbackMetaItem label="Talep Kodu" value={feedback.ticketCode} mono highlight />
            <FeedbackMetaItem label="Oluşturulma" value={formatFirestoreDate(feedback.createdAt)} />
            <FeedbackMetaItem label="Son Güncelleme" value={formatFirestoreDate(feedback.updatedAt)} />
            <FeedbackMetaItem label="Son Mesaj" value={formatFirestoreDate(feedback.lastMessageAt)} />
          </div>
        </SidebarSection>
      </FeedbackPanel>

      <div className="mt-5">
        <FeedbackPanel
          title="Admin İç Notu"
          description="Kullanıcıya görünmez"
          tone="note"
        >
          <Textarea
            value={adminNote}
            onChange={(event) => onAdminNoteChange(event.target.value)}
            placeholder="İç not, teşhis veya takip bilgisi..."
            rows={5}
            className="border-amber-200 bg-white"
          />
          <Button
            type="button"
            className="mt-3 w-full"
            disabled={isSavingNote}
            onClick={onSaveAdminNote}
          >
            {isSavingNote ? "Kaydediliyor..." : "Notu Kaydet"}
          </Button>
        </FeedbackPanel>
      </div>
    </div>
  );
}
