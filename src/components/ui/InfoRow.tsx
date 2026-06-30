type InfoRowProps = {
  label: string;
  value: string;
};

export default function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="w-28 shrink-0 font-semibold text-slate-500">{label}</span>
      <span className="break-all text-slate-900">{value}</span>
    </div>
  );
}
