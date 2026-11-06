import type {
  Id,
  TableCellValue,
  TableColumn,
  TableColumnType,
  TableRow,
  WorkspaceTable,
} from "./types";

export const TABLE_VIEW_LIMITS = {
  viewsPerTable: 50,
  columns: 50,
  sorts: 3,
  filters: 20,
  name: 100,
  filterText: 1000,
  requestBytes: 32_768,
} as const;

export type TableViewFilter =
  | { columnId: Id; operator: "is_empty" | "is_not_empty" }
  | {
      columnId: Id;
      operator: "eq" | "neq";
      value: string | number | boolean;
    }
  | {
      columnId: Id;
      operator: "contains" | "not_contains";
      value: string;
    }
  | {
      columnId: Id;
      operator: "gt" | "gte" | "lt" | "lte";
      value: string | number;
    };
export type TableViewSettings = {
  layout: "table";
  density: "comfortable" | "compact";
  wrapCells: boolean;
  /** null follows all current columns; an explicit list also defines their order. */
  visibleColumnIds: Id[] | null;
  sorts: { columnId: Id; direction: "asc" | "desc" }[];
  /** All filters must match (AND). Views are presentation, never access grants. */
  filters: TableViewFilter[];
};
export type TableViewColumnBinding = { columnId: Id; type: TableColumnType };
export type TableViewIssue = {
  code:
    | "missing_column"
    | "changed_column_type"
    | "invalid_columns"
    | "invalid_sort"
    | "invalid_filter";
  columnId?: Id;
  message: string;
};
export type NamedTableView = {
  id: Id;
  workspaceId: Id;
  tableId: Id;
  name: string;
  settings: TableViewSettings;
  /** Server-captured types for explicitly referenced columns. */
  columnBindings: TableViewColumnBinding[];
  revision: number;
  validatedTableRevision: number;
  createdAt: string;
  updatedAt: string;
  status: "ready" | "needs_attention";
  issues: TableViewIssue[];
};
export type TableViewCollection = {
  table: WorkspaceTable;
  views: NamedTableView[];
};
export type TableViewDetail = { table: WorkspaceTable; view: NamedTableView };
export type CreateTableViewInput = {
  /** Generate once per creation attempt; reuse after an uncertain response. */
  id: Id;
  tableId: Id;
  tableRevision: number;
  name: string;
  settings: TableViewSettings;
};
export type UpdateTableViewInput = {
  revision: number;
  tableRevision: number;
  patch: { name?: string; settings?: TableViewSettings };
};
export type DeleteTableViewInput = { revision: number };
export type DeleteTableViewResult = { id: Id; deleted: true };

export function defaultTableViewSettings(): TableViewSettings {
  return {
    layout: "table",
    density: "comfortable",
    wrapCells: false,
    visibleColumnIds: null,
    sorts: [],
    filters: [],
  };
}

function referencedColumns(settings: TableViewSettings): Set<string> {
  return new Set([
    ...(settings.visibleColumnIds ?? []),
    ...settings.sorts.map((sort) => sort.columnId),
    ...settings.filters.map((filter) => filter.columnId),
  ]);
}

export function tableViewColumnBindings(
  settings: TableViewSettings,
  columns: TableColumn[],
): TableViewColumnBinding[] {
  const ids = referencedColumns(settings);
  return columns
    .filter((column) => ids.has(column.id))
    .map((column) => ({ columnId: column.id, type: column.type }));
}

function validDate(value: unknown): boolean {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(date.valueOf()) && date.toISOString().startsWith(value)
  );
}

function validFilter(filter: TableViewFilter, column: TableColumn): boolean {
  if (!("value" in filter)) return true;
  const { value, operator } = filter;
  if (column.type === "file") return false;
  if (operator === "contains" || operator === "not_contains")
    return column.type === "text" || column.type === "url";
  if (operator !== "eq" && operator !== "neq")
    return (
      (column.type === "number" &&
        typeof value === "number" &&
        Number.isFinite(value)) ||
      (column.type === "date" && validDate(value))
    );
  switch (column.type) {
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "checkbox":
      return typeof value === "boolean";
    case "date":
      return validDate(value);
    case "select":
      return typeof value === "string" && !!column.options?.includes(value);
    default:
      return typeof value === "string";
  }
}

/** Semantic validation shared by the API and UI. The API also validates shape/size. */
export function validateTableViewSettings(
  settings: TableViewSettings,
  columns: TableColumn[],
  bindings: TableViewColumnBinding[] = [],
): TableViewIssue[] {
  const issues: TableViewIssue[] = [];
  const byId = new Map(columns.map((column) => [column.id, column]));
  for (const id of referencedColumns(settings)) {
    if (!byId.has(id))
      issues.push({
        code: "missing_column",
        columnId: id,
        message: "A referenced column no longer exists.",
      });
  }
  for (const binding of bindings) {
    const column = byId.get(binding.columnId);
    if (column && column.type !== binding.type)
      issues.push({
        code: "changed_column_type",
        columnId: column.id,
        message:
          "A referenced column changed type. Review and save the view settings.",
      });
  }
  if (
    settings.visibleColumnIds &&
    (!settings.visibleColumnIds.length ||
      new Set(settings.visibleColumnIds).size !==
        settings.visibleColumnIds.length)
  )
    issues.push({
      code: "invalid_columns",
      message: "Choose at least one visible column, without duplicates.",
    });
  if (
    new Set(settings.sorts.map((sort) => sort.columnId)).size !==
    settings.sorts.length
  )
    issues.push({
      code: "invalid_sort",
      message: "Each column can appear in the sort order only once.",
    });
  for (const sort of settings.sorts) {
    if (byId.get(sort.columnId)?.type === "file")
      issues.push({
        code: "invalid_sort",
        columnId: sort.columnId,
        message: "File references cannot be sorted.",
      });
  }
  for (const filter of settings.filters) {
    const column = byId.get(filter.columnId);
    if (column && !validFilter(filter, column))
      issues.push({
        code: "invalid_filter",
        columnId: column.id,
        message:
          "A filter is incompatible with the current column type or options.",
      });
  }
  return issues;
}

function empty(value: TableCellValue | undefined): boolean {
  return value === null || value === undefined || value === "";
}

function cell(row: TableRow, columnId: string): TableCellValue | undefined {
  return Object.hasOwn(row.cells, columnId) ? row.cells[columnId] : undefined;
}

function matches(row: TableRow, filter: TableViewFilter): boolean {
  const value = cell(row, filter.columnId);
  if (filter.operator === "is_empty") return empty(value);
  if (filter.operator === "is_not_empty") return !empty(value);
  // Even negative comparisons exclude empty cells. Use an explicit emptiness filter.
  if (empty(value) || !("value" in filter)) return false;
  switch (filter.operator) {
    case "eq":
      return value === filter.value;
    case "neq":
      return value !== filter.value;
    case "contains":
      return String(value).toLowerCase().includes(filter.value.toLowerCase());
    case "not_contains":
      return !String(value).toLowerCase().includes(filter.value.toLowerCase());
    default: {
      const comparison = compare(value!, filter.value);
      if (filter.operator === "gt") return comparison > 0;
      if (filter.operator === "gte") return comparison >= 0;
      if (filter.operator === "lt") return comparison < 0;
      return comparison <= 0;
    }
  }
}

function compare(
  a: Exclude<TableCellValue, null>,
  b: Exclude<TableCellValue, null>,
): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean")
    return Number(a) - Number(b);
  const left = String(a),
    right = String(b);
  return left < right ? -1 : left > right ? 1 : 0;
}

export type ResolvedTableView =
  | { status: "ready"; columns: TableColumn[]; rows: TableRow[] }
  | { status: "needs_attention"; issues: TableViewIssue[] };

/** Never mutate canonical rows, or fall back to unfiltered rows for an invalid view. */
export function resolveTableView(
  table: WorkspaceTable,
  view: Pick<NamedTableView, "settings" | "columnBindings">,
): ResolvedTableView {
  const { settings } = view;
  const issues = validateTableViewSettings(
    settings,
    table.columns,
    view.columnBindings,
  );
  if (issues.length) return { status: "needs_attention", issues };
  const byId = new Map(table.columns.map((column) => [column.id, column]));
  const columns = settings.visibleColumnIds
    ? settings.visibleColumnIds.map((id) => byId.get(id)!)
    : [...table.columns];
  const rows = table.rows.filter((row) =>
    settings.filters.every((filter) => matches(row, filter)),
  );
  rows.sort((left, right) => {
    for (const sort of settings.sorts) {
      const a = cell(left, sort.columnId),
        b = cell(right, sort.columnId);
      if (empty(a) && empty(b)) continue;
      if (empty(a)) return 1;
      if (empty(b)) return -1;
      const result = compare(a!, b!);
      if (result) return sort.direction === "asc" ? result : -result;
    }
    return 0; // Stable ties retain canonical row order.
  });
  return { status: "ready", columns, rows };
}
