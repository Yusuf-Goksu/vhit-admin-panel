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

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;

  return `${value.slice(0, maxLength - 3)}...`;
}

function priorityLabel(priority?: string) {
  switch (priority) {
    case "high":
      return "Yüksek";
    case "normal":
      return "Normal";
    case "low":
      return "Düşük";
    default:
      return priority || "-";
  }
}

function typeLabel(type?: string) {
  switch (type) {
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
      return type || "-";
  }
}

function buildFeedbackUrl(feedbackId: string) {
  const baseUrl =
    process.env.ADMIN_PANEL_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "";

  if (!baseUrl) return "";

  return `${baseUrl.replace(/\/$/, "")}/dashboard/feedbacks/${feedbackId}`;
}

function buildFeedbackMessage(feedbackId: string, data: FeedbackData) {
  const panelUrl = buildFeedbackUrl(feedbackId);

  return [
    "🔔 Yeni destek talebi geldi",
    "",
    `Kod: ${data.ticketCode || feedbackId}`,
    `Konu: ${data.subject || "Konu yok"}`,
    `Tür: ${typeLabel(data.type)}`,
    `Öncelik: ${priorityLabel(data.priority)}`,
    "",
    `Kullanıcı: ${data.userFullName || "-"}`,
    `E-posta: ${data.userEmail || "-"}`,
    `Klinik ID: ${data.clinicId || "-"}`,
    "",
    `Platform: ${data.platform || "-"}`,
    `Cihaz: ${data.deviceModel || "-"}`,
    `App: ${data.appVersion || "-"}`,
    "",
    `Mesaj: ${truncate(data.message || "-", 500)}`,
    panelUrl ? "" : null,
    panelUrl ? `Panel: ${panelUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");
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