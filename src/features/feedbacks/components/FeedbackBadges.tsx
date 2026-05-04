import {
  feedbackPriorityLabel,
  feedbackStatusLabel,
  feedbackTypeLabel,
} from "../utils/feedbackLabels";

export function FeedbackStatusBadge({ status }: { status: string }) {
  const className =
    status === "open"
      ? "bg-blue-50 text-blue-700"
      : status === "reviewing"
      ? "bg-amber-50 text-amber-700"
      : status === "resolved"
      ? "bg-green-50 text-green-700"
      : "bg-slate-100 text-slate-600";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${className}`}>
      {feedbackStatusLabel(status)}
    </span>
  );
}

export function FeedbackPriorityBadge({ priority }: { priority: string }) {
  const className =
    priority === "high"
      ? "bg-red-50 text-red-700"
      : priority === "normal"
      ? "bg-indigo-50 text-indigo-700"
      : "bg-slate-100 text-slate-600";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${className}`}>
      {feedbackPriorityLabel(priority)}
    </span>
  );
}

export function FeedbackTypeBadge({ type }: { type: string }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
      {feedbackTypeLabel(type)}
    </span>
  );
}

export function FeedbackUnreadBadge() {
  return (
    <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
      Yeni mesaj
    </span>
  );
}