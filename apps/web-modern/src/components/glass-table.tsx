"use client";

import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  TableProps,
  Selection,
  SortDescriptor,
} from "@heroui/react";
import { ReactNode } from "react";

export interface GlassTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "start" | "center" | "end";
  width?: number;
  render?: (item: T) => ReactNode;
}

export interface GlassTableProps<T> extends Omit<TableProps, "children"> {
  columns: GlassTableColumn<T>[];
  data: T[];
  keyField: keyof T;
  emptyContent?: ReactNode;
  isStriped?: boolean;
  isCompact?: boolean;
  selectionMode?: "none" | "single" | "multiple";
  selectedKeys?: Selection;
  onSelectionChange?: (keys: Selection) => void;
  sortDescriptor?: SortDescriptor;
  onSortChange?: (descriptor: SortDescriptor) => void;
}

export function GlassTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  emptyContent = "No data available",
  isStriped = false,
  isCompact = false,
  selectionMode = "none",
  selectedKeys,
  onSelectionChange,
  sortDescriptor,
  onSortChange,
  ...props
}: GlassTableProps<T>) {
  return (
    <Table
      isStriped={isStriped}
      isCompact={isCompact}
      selectionMode={selectionMode}
      selectedKeys={selectedKeys}
      onSelectionChange={onSelectionChange}
      sortDescriptor={sortDescriptor}
      onSortChange={onSortChange}
      classNames={{
        wrapper: "bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl",
        table: "min-w-full",
        thead: "bg-white/5",
        th: "text-white/70 font-medium text-sm bg-transparent border-b border-white/10",
        tr: "hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0",
        td: "text-white/80 py-3",
        emptyWrapper: "text-white/50",
      }}
      {...props}
    >
      <TableHeader columns={columns}>
        {(column) => (
          <TableColumn
            key={column.key}
            align={column.align}
            allowsSorting={column.sortable}
            width={column.width}
          >
            {column.label}
          </TableColumn>
        )}
      </TableHeader>
      <TableBody items={data} emptyContent={emptyContent}>
        {(item) => (
          <TableRow key={String(item[keyField])}>
            {columns.map((column) => (
              <TableCell key={column.key}>
                {column.render
                  ? column.render(item)
                  : (item[column.key] as ReactNode)}
              </TableCell>
            ))}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

// Simple table for basic use cases
export interface SimpleTableProps {
  headers: string[];
  rows: (string | ReactNode)[][];
  isStriped?: boolean;
}

export function SimpleGlassTable({ headers, rows, isStriped = false }: SimpleTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
      <table className="min-w-full">
        <thead className="bg-white/5">
          <tr>
            {headers.map((header, i) => (
              <th
                key={i}
                className="px-4 py-3 text-left text-sm font-medium text-white/70 border-b border-white/10"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={`hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0 ${
                isStriped && rowIndex % 2 === 1 ? "bg-white/[0.02]" : ""
              }`}
            >
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3 text-white/80">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="px-4 py-8 text-center text-white/50">No data available</div>
      )}
    </div>
  );
}

export { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell };
