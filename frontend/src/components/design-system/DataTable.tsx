import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { EmptyState } from "./EmptyState";

export type DataTableColumn<TData> = {
  key: string;
  header: ReactNode;
  cell: (row: TData) => ReactNode;
  className?: string;
  headerClassName?: string;
};

type DataTableProps<TData> = {
  columns: DataTableColumn<TData>[];
  data: TData[];
  getRowKey: (row: TData) => string | number;
  emptyState?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export const DataTable = <TData,>({
  columns,
  data,
  getRowKey,
  emptyState,
  footer,
  className,
}: DataTableProps<TData>) => (
  <div className={cn("overflow-hidden", className)}>
    {data.length === 0 ? (
      emptyState ?? (
        <EmptyState
          title="Nenhum registro encontrado"
          description="Ajuste os filtros ou cadastre um novo item para continuar."
        />
      )
    ) : (
      <>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn("px-5 py-3 text-left font-medium", column.headerClassName)}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr
                  key={getRowKey(row)}
                  className="border-b border-border/40 transition-colors hover:bg-secondary/30"
                >
                  {columns.map((column) => (
                    <td key={column.key} className={cn("px-5 py-3", column.className)}>
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {footer && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
            {footer}
          </div>
        )}
      </>
    )}
  </div>
);

type DataTablePaginationProps = {
  currentPage: number;
  totalPages: number;
  isPreviousDisabled?: boolean;
  isNextDisabled?: boolean;
};

export const DataTablePagination = ({
  currentPage,
  totalPages,
  isPreviousDisabled = true,
  isNextDisabled = true,
}: DataTablePaginationProps) => (
  <div className="flex gap-1">
    <Button variant="ghost" size="sm" disabled={isPreviousDisabled}>
      Anterior
    </Button>
    <Button variant="outline" size="sm">
      {currentPage}
      <span className="sr-only"> de {totalPages}</span>
    </Button>
    <Button variant="ghost" size="sm" disabled={isNextDisabled}>
      Proxima
    </Button>
  </div>
);
