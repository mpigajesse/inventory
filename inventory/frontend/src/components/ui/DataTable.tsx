import { type ReactNode } from "react";

interface Column {
  key: string;
  label: string;
  className?: string;
}

interface DataTableProps<TRow> {
  columns: Column[];
  data: TRow[];
  renderRow: (row: TRow, index: number) => ReactNode;
  keyExtractor: (row: TRow, index: number) => string | number;
}

export function DataTable<TRow>({ columns, data, renderRow, keyExtractor }: DataTableProps<TRow>) {
  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.className}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={keyExtractor(row, index)}>
                {renderRow(row, index)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
