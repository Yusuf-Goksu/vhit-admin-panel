import { logger } from "firebase-functions";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { FieldValue } from "firebase-admin/firestore";
import {
  sendWhatsAppToAdmins,
  WHATSAPP_ACCESS_TOKEN,
} from "./whatsapp";

initializeApp();

type FeedbackData = {
  ticketCode?: string;
  userFullName?: string;
  userEmail?: string;
  clinicId?: string;
  clinicName?: string;
  clinicTitle?: string;
  type?: string;
  subject?: string;
  message?: string;
  priority?: string;
  platform?: string;
  deviceModel?: string;
  appVersion?: string;
  whatsappAdminNotifiedAt?: unknown;
};

function oneLine(value: unknown, fallback = "-") {
  const text = String(value ?? "").trim();

  if (!text) return fallback;

  return text
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function shortText(value: unknown, maxLength = 90) {
  const text = oneLine(value);

  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength - 3)}...`;
}

function priorityLabel(value: unknown) {
  switch (String(value ?? "").toLowerCase()) {
    case "high":
      return "Yüksek";
    case "normal":
      return "Normal";
    case "low":
      return "Düşük";
    default:
      return "Belirtilmemiş";
  }
}

function typeLabel(value: unknown) {
  switch (String(value ?? "").toLowerCase()) {
    case "bug":
      return "Hata";
    case "suggestion":
      return "Öneri";
    case "performance":
      return "Performans";
    case "test":
      return "Test / Analiz";
    case "appointment":
      return "Randevu";
    case "patient":
      return "Hasta";
    case "account":
      return "Hesap";
    case "other":
      return "Diğer";
    default:
      return "Geri bildirim";
  }
}

function buildFeedbackUrl(feedbackId: string) {
  const baseUrl =
    process.env.ADMIN_PANEL_BASE_URL ||
    "https://vhit-admin-panel.vercel.app";

  return `${baseUrl.replace(/\/$/, "")}/dashboard/feedbacks/${feedbackId}`;
}

function buildFeedbackMessage(feedbackId: string, data: FeedbackData) {
  const panelUrl = buildFeedbackUrl(feedbackId);

  const ticketCode = oneLine(data.ticketCode, feedbackId);
  const priority = priorityLabel(data.priority);
  const type = typeLabel(data.type);

  const doctorName =
    oneLine(data.userFullName) !== "-"
      ? oneLine(data.userFullName)
      : oneLine(data.userEmail, "Bilinmiyor");

  const clinicName =
    oneLine(data.clinicName) !== "-"
      ? oneLine(data.clinicName)
      : oneLine(data.clinicTitle) !== "-"
      ? oneLine(data.clinicTitle)
      : oneLine(data.clinicId, "Belirtilmemiş");

  const subject = shortText(data.subject || data.message || "Konu belirtilmemiş", 80);

  return [
    `Ticket: ${ticketCode}`,
    `Öncelik: ${priority}`,
    `Tür: ${type}`,
    `Doktor: ${doctorName}`,
    `Klinik: ${clinicName}`,
    `Konu: ${subject}`,
    `Panel: ${panelUrl}`,
  ].join(" | ");
}

export const notifyAdminOnFeedbackCreated = onDocumentCreated(
  {
    region: "europe-west1",
    document: "feedbacks/{feedbackId}",
    secrets: [WHATSAPP_ACCESS_TOKEN],
    maxInstances: 3,
  },
  async (event) => {
    const feedbackId = event.params.feedbackId;
    const snapshot = event.data;

    if (!snapshot) {
      logger.warn("Feedback snapshot bulunamadı.", { feedbackId });
      return;
    }

    const feedback = snapshot.data() as FeedbackData;

    if (feedback.whatsappAdminNotifiedAt) {
      logger.info("WhatsApp bildirimi daha önce gönderilmiş, atlandı.", {
        feedbackId,
      });
      return;
    }

    const message = buildFeedbackMessage(feedbackId, feedback);
    const whatsappResult = await sendWhatsAppToAdmins(message);
    const successCount = whatsappResult.results.filter((item) => item.ok).length;

    const status = !whatsappResult.enabled
      ? "skipped"
      : successCount > 0
      ? "sent"
      : "failed";

    const updatePayload: Record<string, unknown> = {
      whatsappAdminNotifyStatus: status,
      whatsappAdminNotifyAttemptedAt: FieldValue.serverTimestamp(),
      whatsappAdminNotifyResults: whatsappResult.results.map((item) => ({
        to: item.to,
        ok: item.ok,
        status: item.status ?? null,
        error: item.error ?? null,
      })),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (successCount > 0) {
      updatePayload.whatsappAdminNotifiedAt = FieldValue.serverTimestamp();
    }

    await snapshot.ref.update(updatePayload);

    if (!whatsappResult.enabled) {
      logger.warn("WhatsApp env değerleri eksik olduğu için bildirim atlandı.", {
        feedbackId,
      });
      return;
    }

    if (successCount === 0) {
      logger.error("WhatsApp bildirimi gönderilemedi.", {
        feedbackId,
        results: whatsappResult.results,
      });
      return;
    }

    logger.info("WhatsApp bildirimi gönderildi.", {
      feedbackId,
      successCount,
    });
  }
);