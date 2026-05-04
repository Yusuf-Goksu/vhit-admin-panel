import {
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

export function formatFirestoreDate(value: any) {
  const date = value?.toDate?.();

  if (!date) return "-";

  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}