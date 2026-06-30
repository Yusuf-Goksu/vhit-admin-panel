import { ReactNode } from "react";

type FeedbackPanelTone = "default" | "muted" | "dark" | "note";

type FeedbackPanelProps = {
  title: string;
  description?: string;
  tone?: FeedbackPanelTone;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

const headerToneClasses: Record<FeedbackPanelTone, string> = {
  default: "border-b border-slate-200 bg-slate-50 text-slate-900",
  muted: "border-b border-slate-200 bg-slate-100 text-slate-900",
  dark: "border-b border-slate-700 bg-slate-800 text-white",
  note: "border-b border-amber-200 bg-amber-50 text-amber-950",
};

export function FeedbackMetaItem({
  label,
  value,
  mono = false,
  highlight = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        highlight
          ? "border-indigo-200 bg-indigo-50/70"
          : "border-slate-200 bg-white shadow-sm"
      }`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`mt-1 text-sm font-semibold text-slate-900 ${mono ? "font-mono text-xs break-all" : ""}`}
      >
        {value || "-"}
      </p>
    </div>
  );
}

export default function FeedbackPanel({
  title,
  description,
  tone = "default",
  children,
  className = "",
  bodyClassName = "",
}: FeedbackPanelProps) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-200/60 ${className}`}
    >
      <div className={`px-5 py-3.5 ${headerToneClasses[tone]}`}>
        <h2 className="text-sm font-bold tracking-wide">{title}</h2>
        {description && (
          <p className={`mt-1 text-xs ${tone === "dark" ? "text-slate-300" : "text-slate-500"}`}>
            {description}
          </p>
        )}
      </div>
      <div className={`p-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
