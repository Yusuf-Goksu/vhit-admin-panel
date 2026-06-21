type WhatsAppSendResult = {
  to: string;
  ok: boolean;
  status?: number;
  response?: unknown;
  error?: string;
};

type WhatsAppAdminSendResult = {
  enabled: boolean;
  results: WhatsAppSendResult[];
};

function getRecipients() {
  return String(process.env.WHATSAPP_ADMIN_RECIPIENTS ?? "")
    .split(",")
    .map((item) => normalizePhoneNumber(item))
    .filter(Boolean);
}

function normalizePhoneNumber(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return "";

  return trimmed.replace(/[^\d]/g, "");
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;

  return `${value.slice(0, maxLength - 3)}...`;
}

function sanitizeTemplateText(value: string) {
  return value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function getWhatsAppConfig() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const graphApiVersion = process.env.WHATSAPP_GRAPH_API_VERSION ?? "v23.0";
  const recipients = getRecipients();

  return {
    accessToken,
    phoneNumberId,
    graphApiVersion,
    recipients,
    enabled: Boolean(accessToken && phoneNumberId && recipients.length > 0),
  };
}

function buildPayload(to: string, body: string) {
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME?.trim();
  const templateLanguage =
    process.env.WHATSAPP_TEMPLATE_LANGUAGE_CODE?.trim() || "tr";

  /**
   * Production'da daha stabil kullanım için Meta tarafında tek değişkenli
   * bir template oluşturabilirsin:
   *
   * Template adı örnek: admin_feedback_alert
   * Body örnek: {{1}}
   *
   * WHATSAPP_TEMPLATE_NAME doluysa otomatik template mesaj gönderilir.
   */
  if (templateName) {
  const template: {
    name: string;
    language: {
      code: string;
    };
    components?: {
      type: "body";
      parameters: {
        type: "text";
        text: string;
      }[];
    }[];
  } = {
    name: templateName,
    language: {
      code: templateLanguage,
    },
  };

  if (templateName !== "hello_world") {
    template.components = [
      {
        type: "body",
        parameters: [
          {
            type: "text",
            text: truncate(sanitizeTemplateText(body), 950),
          },
        ],
      },
    ];
  }

  return {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template,
  };
}

  return {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: {
      preview_url: true,
      body: truncate(body, 4096),
    },
  };
}

export async function sendWhatsAppText(
  to: string,
  body: string
): Promise<WhatsAppSendResult> {
  const config = getWhatsAppConfig();

  if (!config.accessToken || !config.phoneNumberId) {
    return {
      to,
      ok: false,
      error: "WhatsApp env değerleri eksik.",
    };
  }

  const response = await fetch(
    `https://graph.facebook.com/${config.graphApiVersion}/${config.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildPayload(to, body)),
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      to,
      ok: false,
      status: response.status,
      response: data,
      error:
        data?.error?.message ??
        `WhatsApp mesajı gönderilemedi. HTTP ${response.status}`,
    };
  }

  return {
    to,
    ok: true,
    status: response.status,
    response: data,
  };
}

export async function sendWhatsAppToAdmins(
  body: string
): Promise<WhatsAppAdminSendResult> {
  const config = getWhatsAppConfig();

  if (!config.enabled) {
    return {
      enabled: false,
      results: [],
    };
  }

  const results = await Promise.all(
    config.recipients.map((recipient) => sendWhatsAppText(recipient, body))
  );

  return {
    enabled: true,
    results,
  };
}