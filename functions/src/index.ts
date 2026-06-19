import { logger } from "firebase-functions";
import { defineSecret, defineString } from "firebase-functions/params";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

const ADMIN_PANEL_BASE_URL = defineString("ADMIN_PANEL_BASE_URL");
const VHIT_WEBHOOK_SECRET = defineSecret("VHIT_WEBHOOK_SECRET");

export const notifyAdminOnFeedbackCreated = onDocumentCreated(
  {
    document: "feedbacks/{feedbackId}",
    secrets: [VHIT_WEBHOOK_SECRET],
  },
  async (event) => {
    const feedbackId = event.params.feedbackId;

    const baseUrl = ADMIN_PANEL_BASE_URL.value().replace(/\/$/, "");
    const webhookSecret = VHIT_WEBHOOK_SECRET.value();

    if (!baseUrl || !webhookSecret) {
      logger.error("ADMIN_PANEL_BASE_URL veya VHIT_WEBHOOK_SECRET eksik.");
      return;
    }

    const response = await fetch(
      `${baseUrl}/api/admin/feedbacks/notify-whatsapp`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vhit-webhook-secret": webhookSecret,
        },
        body: JSON.stringify({
          feedbackId,
        }),
      }
    );

    if (!response.ok) {
      logger.error("WhatsApp bildirim API hatası", {
        feedbackId,
        status: response.status,
        body: await response.text().catch(() => ""),
      });
      return;
    }

    logger.info("WhatsApp bildirimi tetiklendi.", {
      feedbackId,
    });
  }
);