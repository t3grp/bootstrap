"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type {
  TableCellValue,
  TableColumn,
  TableColumnType,
  TableRow,
  WorkspaceFile,
  WorkspaceTable,
} from "@bootstrap/core";
import {
  ArrowDownAZ,
  CheckSquare2,
  ChevronDown,
  Hash,
  Link2,
  ListFilter,
  Paperclip,
  Plus,
  Search,
  Table2,
  Trash2,
  Type,
  X,
  CalendarDays,
} from "lucide-react";
import { cellText, isSafeWebLink, parseCellValue } from "./table-utils";
import { useRowSelection } from "./use-row-selection";
import "./table.css";

export type TableGridProps = {
  table: WorkspaceTable;
  onChange: (table: WorkspaceTable) => void;
  readOnly?: boolean;
  compact?: boolean;
  files?: WorkspaceFile[];
  workspaceId?: string;
};

const columnTypes: {
  value: TableColumnType;
  label: string;
  icon: typeof Type;
}[] = [
  { value: "text", label: "Text", icon: Type },
  { value: "number", label: "Number", icon: Hash },
  { value: "date", label: "Date", icon: CalendarDays },
  { value: "checkbox", label: "Checkbox", icon: CheckSquare2 },
  { value: "select", label: "Single select", icon: ListFilter },
  { value: "url", label: "Link", icon: Link2 },
  { value: "file", label: "File", icon: Paperclip },
];

type CellProps = {
  value: TableCellValue | undefined;
  column: TableColumn;
  label: string;
  readOnly: boolean;
  files: WorkspaceFile[];
  workspaceId?: string;
  onCommit: (value: TableCellValue) => void;
};

function EditableCell({
  value,
  column,
  label,
  readOnly,
  files,
  workspaceId,
  onCommit,
}: CellProps) {
  const [draft, setDraft] = useState(cellText(value));
  const [error, setError] = useState("");
  const focused = useRef(false);
  const errorId = useId();

  // A save acknowledgement or another cell edit must not erase an in-progress value.
  useEffect(() => {
    if (!focused.current) setDraft(cellText(value));
  }, [value]);

  const commit = () => {
    const parsed = parseCellValue(column, draft);
    if (parsed.error !== undefined) {
      setError(parsed.error);
      return;
    }
    setError("");
    if (parsed.value !== (value ?? null)) onCommit(parsed.value);
  };

  if (column.type === "checkbox") {
    return (
      <div className="bt-cell-checkbox">
        <input
          type="checkbox"
          aria-label={label}
          checked={Boolean(value)}
          disabled={readOnly}
          onChange={(event) => onCommit(event.target.checked)}
        />
      </div>
    );
  }

  if (readOnly) {
    if (
      column.type === "url" &&
      typeof value === "string" &&
      isSafeWebLink(value)
    ) {
      return (
        <a
          className="bt-cell-readonly bt-cell-link"
          href={value}
          target="_blank"
          rel="noopener noreferrer"
        >
          {value}
        </a>
      );
    }
    if (column.type === "file" && typeof value === "string") {
      const file = files.find((item) => item.id === value);
      return file && workspaceId ? (
        <a
          className="bt-cell-readonly bt-cell-link"
          href={`/api/files/${encodeURIComponent(file.id)}?workspaceId=${encodeURIComponent(workspaceId)}`}
          download
        >
          {file.name}
        </a>
      ) : (
        <span className="bt-cell-readonly bt-muted">Unavailable file</span>
      );
    }
    return (
      <span className="bt-cell-readonly">
        {cellText(value) || <span className="bt-muted">—</span>}
      </span>
    );
  }

  if (column.type === "select" || column.type === "file") {
    const options =
      column.type === "file"
        ? files.map((file) => ({ value: file.id, label: file.name }))
        : (column.options ?? []).map((option) => ({
            value: option,
            label: option,
          }));
    return (
      <select
        className="bt-cell-input bt-cell-select"
        aria-label={label}
        value={cellText(value)}
        onChange={(event) => onCommit(event.target.value || null)}
      >
        <option value="">—</option>
        {value && !options.some((option) => option.value === value) && (
          <option value={String(value)} disabled>
            Unavailable {column.type === "file" ? "file" : "option"}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="bt-cell-field">
      <input
        className="bt-cell-input"
        aria-label={label}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        type={column.type === "date" ? "date" : "text"}
        inputMode={
          column.type === "number"
            ? "decimal"
            : column.type === "url"
              ? "url"
              : "text"
        }
        value={draft}
        placeholder="—"
        maxLength={10000}
        onFocus={() => {
          focused.current = true;
        }}
        onChange={(event) => {
          setDraft(event.target.value);
          setError("");
        }}
        onBlur={() => {
          focused.current = false;
          commit();
        }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setDraft(cellText(value));
            setError("");
            // Do not blur here: its stale closure would commit the cancelled draft.
          }
        }}
      />
      {error && (
        <span id={errorId} className="bt-cell-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export function TableGrid({
  table,
  onChange,
  readOnly = false,
  compact = false,
  files = [],
  workspaceId,
}: TableGridProps) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showColumnForm, setShowColumnForm] = useState(false);
  const [columnName, setColumnName] = useState("");
  const [columnType, setColumnType] = useState<TableColumnType>("text");
  const [columnOptions, setColumnOptions] = useState("");
  const [columnError, setColumnError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<
    { kind: "rows"; ids: string[] } | { kind: "column"; id: string } | null
  >(null);
  const [notice, setNotice] = useState("");
  const [rowDetails, setRowDetails] = useState<string | null>(null);
  const [activeColumn, setActiveColumn] = useState<string | null>(null);
  const columnFormRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const detailsCloseRef = useRef<HTMLButtonElement>(null);
  const propertyButtonRef = useRef<HTMLButtonElement>(null);
  const tableId = useId();

  const filteredRows = useMemo(() => {
    const term = search.toLocaleLowerCase();
    const rows = table.rows.filter(
      (row) =>
        !term ||
        table.columns.some((column) => {
          const value = row.cells[column.id];
          if (column.type === "file")
            return (files.find((file) => file.id === value)?.name ?? "")
              .toLocaleLowerCase()
              .includes(term);
          return cellText(value).toLocaleLowerCase().includes(term);
        }),
    );
    if (!sort) return rows;
    const direction = sort.endsWith(":desc") ? -1 : 1;
    const columnId = sort.slice(0, sort.lastIndexOf(":"));
    return [...rows].sort((a, b) => {
      const left = a.cells[columnId];
      const right = b.cells[columnId];
      if (left == null) return right == null ? 0 : 1;
      if (right == null) return -1;
      if (typeof left === "number" && typeof right === "number")
        return (left - right) * direction;
      return (
        cellText(left).localeCompare(cellText(right), undefined, {
          numeric: true,
        }) * direction
      );
    });
  }, [table, search, sort, files]);

  const selection = useRowSelection({
    sortedRows: filteredRows,
    selectedRowIds: [...selected],
    onSelectionChange: (ids) => setSelected(new Set(ids)),
  });

  useEffect(() => {
    setSelected(
      (current) =>
        new Set(
          [...current].filter((id) => table.rows.some((row) => row.id === id)),
        ),
    );
  }, [table.rows]);

  useEffect(() => {
    if (showColumnForm)
      columnFormRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [showColumnForm]);

  useEffect(() => {
    if (rowDetails) detailsCloseRef.current?.focus();
  }, [rowDetails]);

  const commitRows = (rows: TableRow[]) => onChange({ ...table, rows });
  const updateCell = (
    rowId: string,
    columnId: string,
    value: TableCellValue,
  ) => {
    commitRows(
      table.rows.map((row) =>
        row.id === rowId
          ? { ...row, cells: { ...row.cells, [columnId]: value } }
          : row,
      ),
    );
  };
  const addRow = () => {
    if (table.rows.length >= 500) {
      setNotice("This table has reached its 500-row limit.");
      return;
    }
    const id = crypto.randomUUID();
    const cells = Object.fromEntries(
      table.columns.map((column) => [
        column.id,
        column.type === "checkbox" ? false : null,
      ]),
    );
    commitRows([...table.rows, { id, cells }]);
    setSearch("");
    setNotice("Row added.");
    requestAnimationFrame(() =>
      tableRef.current
        ?.querySelector<HTMLInputElement>(
          `[data-row-id="${id}"] .bt-cell-input`,
        )
        ?.focus(),
    );
  };
  const addColumn = () => {
    const name = columnName.trim();
    const options = [
      ...new Set(
        columnOptions
          .split(",")
          .map((option) => option.trim())
          .filter(Boolean),
      ),
    ];
    if (!name) {
      setColumnError("Give this property a name.");
      return;
    }
    if (
      table.columns.some(
        (column) =>
          column.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
    ) {
      setColumnError("A property already has this name.");
      return;
    }
    if (columnType === "select" && options.length === 0) {
      setColumnError("Add at least one option, separated by commas.");
      return;
    }
    if (options.length > 50 || options.some((option) => option.length > 100)) {
      setColumnError("Use up to 50 options, each under 100 characters.");
      return;
    }
    if (table.columns.length >= 50) {
      setColumnError("This table has reached its 50-property limit.");
      return;
    }
    const id = crypto.randomUUID();
    const column: TableColumn = {
      id,
      name,
      type: columnType,
      ...(columnType === "select" ? { options } : {}),
    };
    onChange({
      ...table,
      columns: [...table.columns, column],
      rows: table.rows.map((row) => ({
        ...row,
        cells: { ...row.cells, [id]: columnType === "checkbox" ? false : null },
      })),
    });
    setShowColumnForm(false);
    setColumnName("");
    setColumnOptions("");
    setColumnError("");
    setNotice(`Property ${name} added.`);
    propertyButtonRef.current?.focus();
  };
  const renameColumn = (column: TableColumn, input: HTMLInputElement) => {
    const name = input.value.trim();
    if (name === column.name) return;
    if (
      !name ||
      table.columns.some(
        (item) =>
          item.id !== column.id &&
          item.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
    ) {
      input.value = column.name;
      setNotice("Property names must be nonempty and unique.");
      return;
    }
    onChange({
      ...table,
      columns: table.columns.map((item) =>
        item.id === column.id ? { ...item, name } : item,
      ),
    });
    setNotice("Property renamed.");
  };
  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === "rows") {
      const ids = new Set(deleteTarget.ids);
      commitRows(table.rows.filter((row) => !ids.has(row.id)));
      setSelected(new Set());
      setNotice(`${ids.size} ${ids.size === 1 ? "row" : "rows"} removed.`);
      if (rowDetails && ids.has(rowDetails)) setRowDetails(null);
    } else {
      const columnId = deleteTarget.id;
      onChange({
        ...table,
        columns: table.columns.filter((column) => column.id !== columnId),
        rows: table.rows.map((row) => {
          const cells = { ...row.cells };
          delete cells[columnId];
          return { ...row, cells };
        }),
      });
      setNotice("Property removed.");
      setActiveColumn(null);
      if (sort.startsWith(`${columnId}:`)) setSort("");
    }
    setDeleteTarget(null);
  };
  const selectedVisible = selection.allSelected;
  const detailRow = table.rows.find((row) => row.id === rowDetails);

  return (
    <div
      className={`bt-table${compact ? " bt-table-compact" : ""}`}
      ref={tableRef}
    >
      <div className="bt-table-toolbar">
        <span className="bt-table-view">
          <Table2 size={15} aria-hidden="true" /> All records{" "}
          <span className="bt-table-count">{table.rows.length}</span>
        </span>
        <div className="bt-table-tools">
          <label className="bt-table-search">
            <Search size={14} aria-hidden="true" />
            <input
              aria-label={`Search ${table.name}`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search records…"
            />
          </label>
          <label
            className={`bt-table-sort${sort ? " bt-table-sort-active" : ""}`}
            title="Sort records"
          >
            <ArrowDownAZ size={15} aria-hidden="true" />
            <select
              aria-label={`Sort ${table.name}`}
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="">Sort</option>
              {table.columns.flatMap((column) => [
                <option key={`${column.id}:asc`} value={`${column.id}:asc`}>
                  {column.name} ↑
                </option>,
                <option key={`${column.id}:desc`} value={`${column.id}:desc`}>
                  {column.name} ↓
                </option>,
              ])}
            </select>
          </label>
          {!readOnly && (
            <button
              type="button"
              className="bt-table-new"
              onClick={addRow}
              disabled={table.rows.length >= 500}
            >
              <Plus size={14} aria-hidden="true" /> New row
            </button>
          )}
        </div>
      </div>
      {selected.size > 0 && !readOnly && (
        <div className="bt-table-selection">
          <span>{selected.size} selected</span>
          <button
            type="button"
            onClick={() =>
              setDeleteTarget({ kind: "rows", ids: [...selected] })
            }
          >
            <Trash2 size={13} aria-hidden="true" /> Delete rows
          </button>
          <button
            type="button"
            aria-label="Clear selection"
            onClick={() => setSelected(new Set())}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}
      {deleteTarget && (
        <div className="bt-table-confirm" role="alert">
          <span>
            {deleteTarget.kind === "column"
              ? "Remove this property and its values?"
              : `Delete ${deleteTarget.ids.length} ${deleteTarget.ids.length === 1 ? "row" : "rows"}?`}
          </span>
          <button
            type="button"
            className="bt-table-danger"
            onClick={confirmDelete}
          >
            Delete
          </button>
          <button type="button" onClick={() => setDeleteTarget(null)}>
            Cancel
          </button>
        </div>
      )}
      <div
        className="bt-table-scroll"
        tabIndex={0}
        role="region"
        aria-label={`${table.name} records`}
      >
        <table className="bt-data-table">
          <caption className="bt-sr-only">
            {table.name}.{" "}
            {readOnly
              ? "Read-only table."
              : "Edit cells and press Enter or Tab to save."}
          </caption>
          <thead>
            <tr>
              {!readOnly && (
                <th className="bt-selection-cell" scope="col">
                  <input
                    type="checkbox"
                    aria-label="Select visible rows"
                    ref={(input) => {
                      if (input)
                        input.indeterminate =
                          selection.someSelected && !selectedVisible;
                    }}
                    checked={selectedVisible}
                    onChange={selection.toggleAll}
                  />
                </th>
              )}
              {table.columns.map((column) => {
                const Icon =
                  columnTypes.find((type) => type.value === column.type)
                    ?.icon ?? Type;
                return (
                  <th key={column.id} scope="col">
                    <div className="bt-column-head">
                      <Icon size={14} aria-hidden="true" />
                      <span>{column.name}</span>
                      {!readOnly && (
                        <button
                          type="button"
                          className="bt-column-action"
                          aria-label={`Actions for ${column.name}`}
                          aria-expanded={activeColumn === column.id}
                          onClick={() =>
                            setActiveColumn(
                              activeColumn === column.id ? null : column.id,
                            )
                          }
                        >
                          <ChevronDown size={13} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    {activeColumn === column.id && !readOnly && (
                      <div className="bt-column-menu">
                        <input
                          aria-label={`Rename ${column.name}`}
                          defaultValue={column.name}
                          maxLength={80}
                          onBlur={(event) =>
                            renameColumn(column, event.currentTarget)
                          }
                          onKeyDown={(event) => {
                            if (
                              event.key === "Enter" &&
                              !event.nativeEvent.isComposing
                            )
                              event.currentTarget.blur();
                            if (event.key === "Escape") {
                              event.currentTarget.value = column.name;
                              setActiveColumn(null);
                            }
                          }}
                        />
                        <span>
                          {
                            columnTypes.find(
                              (type) => type.value === column.type,
                            )?.label
                          }{" "}
                          property
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSort(`${column.id}:asc`);
                            setActiveColumn(null);
                          }}
                        >
                          Sort ascending
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSort(`${column.id}:desc`);
                            setActiveColumn(null);
                          }}
                        >
                          Sort descending
                        </button>
                        <button
                          type="button"
                          disabled={table.columns.length <= 1}
                          onClick={() => {
                            setDeleteTarget({ kind: "column", id: column.id });
                            setActiveColumn(null);
                          }}
                        >
                          <Trash2 size={12} aria-hidden="true" /> Delete
                          property
                        </button>
                      </div>
                    )}
                  </th>
                );
              })}
              {!readOnly && (
                <th className="bt-add-column" scope="col">
                  <button
                    type="button"
                    ref={propertyButtonRef}
                    aria-label="Add property"
                    aria-expanded={showColumnForm}
                    onClick={() => {
                      setShowColumnForm(!showColumnForm);
                      setColumnError("");
                    }}
                    disabled={table.columns.length >= 50}
                  >
                    <Plus size={16} aria-hidden="true" />
                  </button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, rowIndex) => (
              <tr
                key={row.id}
                data-row-id={row.id}
                data-selected={selected.has(row.id)}
              >
                {!readOnly && (
                  <td className="bt-selection-cell">
                    <input
                      type="checkbox"
                      aria-label={`Select row ${rowIndex + 1}`}
                      checked={selected.has(row.id)}
                      onChange={() => selection.toggleRow(row.id)}
                    />
                  </td>
                )}
                {table.columns.map((column) => (
                  <td key={column.id}>
                    <EditableCell
                      value={row.cells[column.id]}
                      column={column}
                      label={`${column.name}, row ${rowIndex + 1}`}
                      readOnly={readOnly}
                      files={files}
                      workspaceId={workspaceId}
                      onCommit={(value) => updateCell(row.id, column.id, value)}
                    />
                  </td>
                ))}
                {!readOnly && (
                  <td className="bt-row-action">
                    <button
                      type="button"
                      aria-label={`Open row ${rowIndex + 1}`}
                      onClick={() => setRowDetails(row.id)}
                    >
                      ↗
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td
                  className="bt-table-empty"
                  colSpan={table.columns.length + (readOnly ? 0 : 2)}
                >
                  {search
                    ? "No records match your search."
                    : "Your table is ready. Add a row to start collecting the details."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <button
          type="button"
          className="bt-add-row"
          onClick={addRow}
          disabled={table.rows.length >= 500}
        >
          <Plus size={14} aria-hidden="true" /> New row
        </button>
      )}
      {showColumnForm && !readOnly && (
        <div
          ref={columnFormRef}
          className="bt-column-form"
          role="group"
          aria-label="New property"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setShowColumnForm(false);
              propertyButtonRef.current?.focus();
            }
          }}
        >
          <div className="bt-column-form-heading">
            <strong>New property</strong>
            <button
              type="button"
              aria-label="Close property editor"
              onClick={() => {
                setShowColumnForm(false);
                propertyButtonRef.current?.focus();
              }}
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
          <label htmlFor={`${tableId}-property-name`}>
            Name
            <input
              id={`${tableId}-property-name`}
              maxLength={80}
              placeholder="e.g. Company"
              value={columnName}
              onChange={(event) => {
                setColumnName(event.target.value);
                setColumnError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  addColumn();
                }
              }}
            />
          </label>
          <label htmlFor={`${tableId}-property-type`}>
            Type
            <select
              id={`${tableId}-property-type`}
              value={columnType}
              onChange={(event) =>
                setColumnType(event.target.value as TableColumnType)
              }
            >
              {columnTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          {columnType === "select" && (
            <label htmlFor={`${tableId}-property-options`}>
              Options
              <input
                id={`${tableId}-property-options`}
                value={columnOptions}
                placeholder="New, In progress, Done"
                onChange={(event) => setColumnOptions(event.target.value)}
              />
              <small>Separate options with commas.</small>
            </label>
          )}
          {columnError && (
            <p className="bt-form-error" role="alert">
              {columnError}
            </p>
          )}
          <button type="button" className="bt-table-new" onClick={addColumn}>
            <Plus size={14} aria-hidden="true" /> Add property
          </button>
        </div>
      )}
      {detailRow && (
        <section className="bt-row-detail" aria-label="Row properties">
          <header>
            <strong>Row properties</strong>
            <button
              type="button"
              ref={detailsCloseRef}
              aria-label="Close row properties"
              onClick={() => {
                setRowDetails(null);
                tableRef.current
                  ?.querySelector<HTMLButtonElement>(
                    `[data-row-id="${detailRow.id}"] .bt-row-action button`,
                  )
                  ?.focus();
              }}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </header>
          {table.columns.map((column) => (
            <div className="bt-row-property" key={column.id}>
              <span>{column.name}</span>
              <EditableCell
                value={detailRow.cells[column.id]}
                column={column}
                label={`${column.name}, row properties`}
                readOnly={readOnly}
                files={files}
                workspaceId={workspaceId}
                onCommit={(value) => updateCell(detailRow.id, column.id, value)}
              />
            </div>
          ))}
        </section>
      )}
      <div className="bt-table-footer">
        <span>
          {search
            ? `${filteredRows.length} of ${table.rows.length}`
            : table.rows.length}{" "}
          {table.rows.length === 1 ? "record" : "records"}
        </span>
        <span>
          {table.columns.length}{" "}
          {table.columns.length === 1 ? "property" : "properties"}
        </span>
      </div>
      {notice && (
        <span role="status" className="bt-grid-notice">
          {notice}
        </span>
      )}
    </div>
  );
}
