import type { TableCellValue, TableColumn } from "@bootstrap/core";

export type ParsedCell =
  { value: TableCellValue; error?: never } | { error: string; value?: never };

export function parseCellValue(column: TableColumn, input: string): ParsedCell {
  const value = input.trim();
  if (!value) return { value: null };
  if (input.length > 10000)
    return { error: "Keep this value under 10,000 characters." };
  if (column.type === "number") {
    const number = Number(value);
    if (
      !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value) ||
      !Number.isFinite(number)
    ) {
      return { error: "Enter a valid number." };
    }
    return { value: number };
  }
  if (column.type === "date") {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      return { error: "Use a real date in YYYY-MM-DD format." };
    }
    return { value };
  }
  if (column.type === "url") {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" && url.protocol !== "http:")
        return { error: "Use a link starting with https:// or http://." };
    } catch {
      return { error: "Enter a complete web address." };
    }
    return { value };
  }
  if (column.type === "select" && !(column.options ?? []).includes(value))
    return { error: "Choose an available option." };
  return { value: input };
}

export function cellText(value: TableCellValue | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function isSafeWebLink(value: string): boolean {
  try {
    return ["https:", "http:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
