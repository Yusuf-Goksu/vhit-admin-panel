import Button from "./Button";

type PaginationControlsProps = {
  page: number;
  itemCount: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
  isLoading?: boolean;
  onPrevious: () => void;
  onNext: () => void;
};

export default function PaginationControls({
  page,
  itemCount,
  pageSize,
  hasNext,
  hasPrevious,
  isLoading = false,
  onPrevious,
  onNext,
}: PaginationControlsProps) {
  if (itemCount === 0 && !hasPrevious) {
    return null;
  }

  const start = (page - 1) * pageSize + 1;
  const end = start + itemCount - 1;

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        Sayfa {page}
        {itemCount > 0 ? ` · ${start}-${end} arası gösteriliyor` : ""}
      </p>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!hasPrevious || isLoading}
          onClick={onPrevious}
        >
          Önceki
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!hasNext || isLoading}
          onClick={onNext}
        >
          Sonraki
        </Button>
      </div>
    </div>
  );
}
