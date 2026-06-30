type StatusBadgeProps = {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
};

export default function StatusBadge({
  active,
  activeLabel = "Aktif",
  inactiveLabel = "Pasif",
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}
