type LoadingStateProps = {
  label?: string;
  rows?: number;
};

export function LoadingSpinner({ label = "Yükleniyor..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-slate-500">
      <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export default function LoadingState({ label = "Yükleniyor...", rows = 0 }: LoadingStateProps) {
  if (rows > 0) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-2xl bg-white shadow-sm" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm">
      <LoadingSpinner label={label} />
    </div>
  );
}
