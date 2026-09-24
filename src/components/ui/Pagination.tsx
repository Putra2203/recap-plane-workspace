import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

// Built for design-system completeness (spec §4.9) — no table in this app
// paginates today, so this has no current consumer.
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="hidden text-xs text-fg-subtle sm:inline">
        Menampilkan {start}–{end} dari {total}
      </span>
      <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          className="sm:w-auto"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          leftIcon={<ChevronLeft className="size-4" />}
        >
          Sebelumnya
        </Button>
        <span className="text-xs text-fg-subtle sm:hidden">
          Halaman {page}/{totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          className="sm:w-auto"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          rightIcon={<ChevronRight className="size-4" />}
        >
          Berikutnya
        </Button>
      </div>
    </div>
  );
}
