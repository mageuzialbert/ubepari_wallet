import "server-only";

export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "number" ? String(value) : value;
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCell(c.header)).join(",");
  const body = rows
    .map((row) => columns.map((c) => escapeCell(c.value(row))).join(","))
    .join("\r\n");
  const csv = body ? `${header}\r\n${body}\r\n` : `${header}\r\n`;
  return `﻿${csv}`;
}

export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
      "cache-control": "no-store",
    },
  });
}

export function csvFilename(
  slug: string,
  date: Date = new Date(),
  rangeKey?: string,
): string {
  const stamp = date.toISOString().slice(0, 10);
  const suffix = rangeKey ? `-${rangeKey}` : "";
  return `ubepari-${slug}${suffix}-${stamp}.csv`;
}
