import React from 'react';
import { cn } from '@/lib/utils';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  className?: string;
}

export function DataTable<T extends { id: string | number }>({
  data,
  columns,
  onRowClick,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("rounded-xl border bg-card shadow-card overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground font-bold sticky top-0 z-10 backdrop-blur-sm">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={cn(
                    "px-6 py-4",
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/5">
            {data.map((item) => (
              <tr
                key={item.id}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  "transition-colors group",
                  onRowClick ? "hover:bg-muted/30 cursor-pointer" : ""
                )}
              >
                {columns.map((col, idx) => {
                  const content = typeof col.accessor === 'function' 
                    ? col.accessor(item) 
                    : (item[col.accessor] as React.ReactNode);
                  
                  return (
                    <td
                      key={idx}
                      className={cn(
                        "px-6 py-4",
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                        col.className
                      )}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
