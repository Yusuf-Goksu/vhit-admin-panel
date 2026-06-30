type EmptyStateProps = {
  title?: string;
  description?: string;
};

export default function EmptyState({
  title = "Kayıt bulunamadı",
  description,
}: EmptyStateProps) {
  return (
    <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
      <p className="font-semibold text-slate-700">{title}</p>
      {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
    </div>
  );
}
