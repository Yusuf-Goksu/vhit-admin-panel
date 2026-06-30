import {
  FeedbackItem,
  FeedbackPriority,
  FeedbackStatus,
  FeedbackType,
} from "../types/feedback";

export function feedbackStatusLabel(status: FeedbackStatus | string) {
  switch (status) {
    case "open":
      return "Yeni";
    case "reviewing":
      return "İnceleniyor";
    case "resolved":
      return "Çözüldü";
    case "closed":
      return "Kapatıldı";
    default:
      return status || "-";
  }
}

export function feedbackPriorityLabel(priority: FeedbackPriority | string) {
  switch (priority) {
    case "low":
      return "Düşük";
    case "normal":
      return "Normal";
    case "high":
      return "Yüksek";
    default:
      return priority || "-";
  }
}

export function feedbackTypeLabel(type: FeedbackType | string) {
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

export function formatFirestoreDate(value: unknown) {
  const date = toFirestoreDate(value);

  if (!date) return "-";

  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatFirestoreDateShort(value: unknown) {
  const date = toFirestoreDate(value);

  if (!date) return "-";

  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function toFirestoreDate(value: unknown) {
  if (!value) return null;

  if (value instanceof Date) return value;

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function platformLabel(platform: string) {
  const normalized = platform.trim().toLowerCase();

  if (normalized === "ios" || normalized === "iphone") return "iOS";
  if (normalized === "android") return "Android";
  if (normalized === "web") return "Web";

  return platform || "-";
}

export function getFeedbackPhone(
  feedback: Pick<FeedbackItem, "userPhone" | "phone">,
  userContact?: { phone?: string } | null
) {
  return (
    feedback.userPhone?.trim() ||
    feedback.phone?.trim() ||
    userContact?.phone?.trim() ||
    ""
  );
}

export function formatDeviceLabel(feedback: Pick<FeedbackItem, "deviceManufacturer" | "deviceModel">) {
  const manufacturer = feedback.deviceManufacturer?.trim();
  const model = feedback.deviceModel?.trim();

  if (manufacturer && model) return `${manufacturer} ${model}`;
  return model || manufacturer || "-";
}

export function formatAppVersion(feedback: Pick<FeedbackItem, "appVersion" | "buildNumber">) {
  const version = feedback.appVersion?.trim();
  const build = feedback.buildNumber?.trim();

  if (version && build) return `${version} (${build})`;
  return version || build || "-";
}