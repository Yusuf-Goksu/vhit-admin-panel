import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdminOrWebhookSecret } from "@/lib/server-admin-auth";
import { sendWhatsAppToAdmins } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  status?: string;
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
    process.env.ADMIN_PANEL_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
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

  const subject = shortText(data.subject, 80);
  const message = shortText(data.message, 120);

  return [
    `Ticket: ${ticketCode}`,
    `Öncelik: ${priority}`,
    `Tür: ${type}`,
    `Doktor: ${doctorName}`,
    `Klinik: ${clinicName}`,
    `Konu: ${subject}`,
    `Mesaj: ${message}`,
    `Panel: ${panelUrl}`,
  ].join(" | ");
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdminOrWebhookSecret(request);

  if (!authResult.ok) {
    return NextResponse.json(
      { message: authResult.message },
      { status: authResult.status }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const feedbackId = String(body.feedbackId ?? "").trim();
    const force = Boolean(body.force);

    if (!feedbackId) {
      return NextResponse.json(
        { message: "feedbackId zorunludur." },
        { status: 400 }
      );
    }

    const feedbackRef = adminDb.collection("feedbacks").doc(feedbackId);
    const feedbackSnap = await feedbackRef.get();

    if (!feedbackSnap.exists) {
      return NextResponse.json(
        { message: "Geri bildirim bulunamadı." },
        { status: 404 }
      );
    }

    const feedback = feedbackSnap.data() as FeedbackData;

    if (feedback.whatsappAdminNotifiedAt && !force) {
      return NextResponse.json({
        message: "Bu talep için WhatsApp bildirimi daha önce gönderilmiş.",
        skipped: true,
      });
    }

    const message = buildFeedbackMessage(feedbackId, feedback);
    const whatsappResult = await sendWhatsAppToAdmins(message);

    const successCount = whatsappResult.results.filter((item) => item.ok).length;

    const status = !whatsappResult.enabled
      ? "skipped"
      : successCount > 0
      ? "sent"
      : "failed";

    await feedbackRef.update({
      whatsappAdminNotifyStatus: status,
      whatsappAdminNotifiedAt: new Date(),
      whatsappAdminNotifyResults: whatsappResult.results.map((item) => ({
        to: item.to,
        ok: item.ok,
        status: item.status ?? null,
        error: item.error ?? null,
      })),
      updatedAt: new Date(),
    });

    if (!whatsappResult.enabled) {
      return NextResponse.json({
        message: "WhatsApp env değerleri tanımlı olmadığı için bildirim atlandı.",
        skipped: true,
      });
    }

    if (successCount === 0) {
      return NextResponse.json(
        {
          message: "WhatsApp bildirimi gönderilemedi.",
          results: whatsappResult.results,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      message: "WhatsApp bildirimi gönderildi.",
      results: whatsappResult.results,
    });
  } catch (error) {
    console.error("Feedback WhatsApp notification error:", error);

    return NextResponse.json(
      { message: "WhatsApp bildirimi işlenemedi." },
      { status: 500 }
    );
  }
}

