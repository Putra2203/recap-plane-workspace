// Deliberately NOT "use client" — this has no hooks/state of its own, so it
// works as a plain Server Component when used from Overview/Project Detail
// (columns/cell functions pass fine Server-to-Server) and as an ordinary
// client function when used from Members/Reports, which are already inside
// a "use client" boundary. Adding "use client" here would break the first
// case: functions can't cross a Server->Client boundary as props.
import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { EmptyState } from "./EmptyState";
import { Skeleton } from "./Skeleton";

export type Align = "left" | "right" | "center";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: Align;
  width?: string;
  nowrap?: boolean;
  mobile?: "title" | "subtitle" | "badge" | "field" | "hidden";
};

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  rowHref?: (row: T) => string;
  empty?: ReactNode;
  loading?: boolean;
  footer?: ReactNode;
  caption?: string;
}

const ALIGN_CLASS: Record<Align, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

function DesktopSkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-line last:border-b-0">
          <td className="px-4 py-2.5" colSpan={100}>
            <Skeleton className="h-4 w-full max-w-xs" />
          </td>
        </tr>
      ))}
    </>
  );
}

function MobileSkeletonCards() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-card border border-line bg-surface p-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-2 h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  rowHref,
  empty,
  loading,
  footer,
  caption,
}: DataTableProps<T>) {
  const emptyNode = empty ?? <EmptyState title="Tidak ada data" />;
  // `clickable` is purely a CSS affordance and safe to apply regardless of
  // caller (Server or Client Component). `interactive` gates the actual
  // onClick/onKeyDown/tabIndex attributes — those can only be attached when
  // this renders inside a Client Component boundary, which is only
  // guaranteed when the caller passed onRowClick (Members, always inside
  // "use client" MembersClient). rowHref-only callers (Overview, a Server
  // Component) navigate via the real <Link> in the title cell instead.
  const clickable = Boolean(onRowClick || rowHref);
  const interactive = Boolean(onRowClick);

  const titleColKey = columns.find((c) => c.mobile === "title")?.key ?? columns[0]?.key;
  const subtitleCols = columns.filter((c) => c.mobile === "subtitle");
  const badgeCols = columns.filter((c) => c.mobile === "badge");
  const fieldCols = columns.filter((c) => c.mobile !== "title" && c.mobile !== "subtitle" && c.mobile !== "badge" && c.mobile !== "hidden");
  const titleCol = columns.find((c) => c.key === titleColKey);

  return (
    <div>
      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-card border border-line bg-surface md:block">
        <table className="w-full text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="bg-surface-muted">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn("border-b border-line px-4 py-2 text-xs font-medium whitespace-nowrap text-fg-subtle", ALIGN_CLASS[col.align ?? "left"])}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <DesktopSkeletonRows />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8">
                  {emptyNode}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const key = getRowKey(row);
                return (
                  <tr
                    key={key}
                    className={cn("border-b border-line last:border-b-0 align-middle", clickable && "cursor-pointer hover:bg-surface-hover")}
                    tabIndex={interactive ? 0 : undefined}
                    onClick={interactive ? () => onRowClick?.(row) : undefined}
                    onKeyDown={
                      interactive
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onRowClick?.(row);
                            }
                          }
                        : undefined
                    }
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-2.5",
                          ALIGN_CLASS[col.align ?? "left"],
                          col.align === "right" && "tabular-nums whitespace-nowrap",
                          col.nowrap && "whitespace-nowrap",
                          !col.nowrap && col.align !== "right" && "max-w-[280px] truncate",
                        )}
                      >
                        {col.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden">
        {loading ? (
          <MobileSkeletonCards />
        ) : rows.length === 0 ? (
          <div className="rounded-card border border-line bg-surface">{emptyNode}</div>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((row) => {
              const key = getRowKey(row);
              const visibleFields = fieldCols.slice(0, 6);
              const overflowFields = fieldCols.slice(6);
              const cardInner = (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {titleCol && <p className="min-w-0 line-clamp-2 break-words font-medium text-fg">{titleCol.cell(row)}</p>}
                      {subtitleCols.map((col) => (
                        <p key={col.key} className="mt-0.5 truncate text-xs text-fg-subtle">
                          {col.cell(row)}
                        </p>
                      ))}
                    </div>
                    {badgeCols.length > 0 && (
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {badgeCols.map((col) => (
                          <span key={col.key}>{col.cell(row)}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {visibleFields.length > 0 && (
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-line pt-2">
                      {visibleFields.map((col) => (
                        <div key={col.key} className="contents">
                          <dt className="text-xs text-fg-subtle">{col.header}</dt>
                          <dd className="text-right text-sm tabular-nums break-words">{col.cell(row)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {overflowFields.length > 0 && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-fg-subtle">Lihat detail</summary>
                      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                        {overflowFields.map((col) => (
                          <div key={col.key} className="contents">
                            <dt className="text-xs text-fg-subtle">{col.header}</dt>
                            <dd className="text-right text-sm tabular-nums break-words">{col.cell(row)}</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  )}
                </>
              );

              if (rowHref) {
                return (
                  <Link key={key} href={rowHref(row)} className="rounded-card border border-line bg-surface p-3 active:bg-surface-hover">
                    {cardInner}
                  </Link>
                );
              }
              return (
                <div
                  key={key}
                  className={cn("rounded-card border border-line bg-surface p-3", onRowClick && "cursor-pointer active:bg-surface-hover")}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {cardInner}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {footer && (
        <div className="mt-2 rounded-card border border-line bg-surface p-3 sm:px-4">{footer}</div>
      )}
    </div>
  );
}
