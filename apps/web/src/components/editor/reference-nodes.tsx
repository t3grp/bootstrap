"use client";

import { createContext, useContext } from "react";
import {
  Node,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  mergeAttributes,
  type NodeViewProps,
} from "@tiptap/react";
import type { Page, WorkspaceFile, WorkspaceTable } from "@bootstrap/core";
import {
  ArrowUpRight,
  FileText,
  Paperclip,
  Table2,
  Unlink,
} from "lucide-react";
import { TableGrid } from "../tables/table-grid";

export type ReferenceContext = {
  tables: WorkspaceTable[];
  files: WorkspaceFile[];
  pages: Page[];
  workspaceId?: string;
  readOnly?: boolean;
  onOpenPage?: (id: string) => void;
  onOpenTable?: (id: string) => void;
  onTableChange?: (table: WorkspaceTable) => void;
};

export const WorkspaceReferences = createContext<ReferenceContext>({
  tables: [],
  files: [],
  pages: [],
});

function UnavailableReference() {
  return (
    <span className="be-reference-unavailable">
      <Unlink size={15} aria-hidden="true" /> Unavailable reference
    </span>
  );
}

function TableReferenceView({ node, deleteNode }: NodeViewProps) {
  const references = useContext(WorkspaceReferences);
  const table = references.tables.find(
    (item) => item.id === node.attrs.tableId,
  );
  return (
    <NodeViewWrapper
      className="be-reference be-table-reference"
      contentEditable={false}
    >
      {table ? (
        <>
          <header className="be-reference-heading">
            <span>
              <Table2 size={16} aria-hidden="true" />
              <strong>{table.name}</strong>
              <small>Linked table</small>
            </span>
            <div>
              {references.onOpenTable && (
                <button
                  type="button"
                  aria-label={`Open ${table.name} as full table`}
                  onClick={() => references.onOpenTable?.(table.id)}
                >
                  <ArrowUpRight size={15} aria-hidden="true" />
                </button>
              )}
              {!references.readOnly && (
                <button
                  type="button"
                  aria-label="Remove table reference"
                  title="Remove this reference. The table stays in your workspace."
                  onClick={deleteNode}
                >
                  <Unlink size={14} aria-hidden="true" />
                </button>
              )}
            </div>
          </header>
          <TableGrid
            table={table}
            onChange={(next) => references.onTableChange?.(next)}
            compact
            readOnly={references.readOnly || !references.onTableChange}
            files={references.files}
            workspaceId={references.workspaceId}
          />
        </>
      ) : (
        <UnavailableReference />
      )}
    </NodeViewWrapper>
  );
}

function FileReferenceView({ node, deleteNode }: NodeViewProps) {
  const references = useContext(WorkspaceReferences);
  const file = references.files.find((item) => item.id === node.attrs.fileId);
  const size = file
    ? file.size < 1024
      ? `${file.size} B`
      : file.size < 1048576
        ? `${(file.size / 1024).toFixed(1)} KB`
        : `${(file.size / 1048576).toFixed(1)} MB`
    : "";
  return (
    <NodeViewWrapper
      className="be-reference be-file-reference"
      contentEditable={false}
    >
      {file ? (
        <>
          <span className="be-reference-symbol">
            <Paperclip size={19} aria-hidden="true" />
          </span>
          <span className="be-reference-file-info">
            {references.workspaceId ? (
              <a
                href={`/api/files/${encodeURIComponent(file.id)}?workspaceId=${encodeURIComponent(references.workspaceId)}`}
                download
              >
                {file.name}
              </a>
            ) : (
              <strong>{file.name}</strong>
            )}
            <small>{size} · Workspace file</small>
          </span>
          {!references.readOnly && (
            <button
              className="be-reference-remove"
              type="button"
              aria-label="Remove file reference"
              title="Remove this reference. The file stays in your workspace."
              onClick={deleteNode}
            >
              <Unlink size={14} aria-hidden="true" />
            </button>
          )}
        </>
      ) : (
        <UnavailableReference />
      )}
    </NodeViewWrapper>
  );
}

function ChildPageView({ node, deleteNode }: NodeViewProps) {
  const references = useContext(WorkspaceReferences);
  const page = references.pages.find(
    (item) => item.id === node.attrs.pageId && !item.trashedAt,
  );
  return (
    <NodeViewWrapper
      className="be-reference be-child-reference"
      contentEditable={false}
    >
      {page ? (
        <>
          <button
            type="button"
            className="be-child-link"
            onClick={() => references.onOpenPage?.(page.id)}
            disabled={!references.onOpenPage}
          >
            <FileText size={17} aria-hidden="true" />
            <span>{page.title || "Untitled"}</span>
            <ArrowUpRight size={13} aria-hidden="true" />
          </button>
          {!references.readOnly && (
            <button
              type="button"
              className="be-reference-remove"
              aria-label="Remove page reference"
              title="Remove this reference. The page stays in your workspace."
              onClick={deleteNode}
            >
              <Unlink size={14} aria-hidden="true" />
            </button>
          )}
        </>
      ) : (
        <UnavailableReference />
      )}
    </NodeViewWrapper>
  );
}

export const TableReference = Node.create({
  name: "tableReference",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes: () => ({
    tableId: {
      default: null,
      rendered: false,
      parseHTML: (element) => element.getAttribute("data-table-id"),
    },
  }),
  parseHTML: () => [{ tag: "div[data-table-reference]" }],
  renderHTML: ({ node, HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, {
      "data-table-reference": "",
      "data-table-id": node.attrs.tableId,
    }),
    "Linked table",
  ],
  addNodeView: () => ReactNodeViewRenderer(TableReferenceView),
});

export const FileReference = Node.create({
  name: "fileReference",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes: () => ({
    fileId: {
      default: null,
      rendered: false,
      parseHTML: (element) => element.getAttribute("data-file-id"),
    },
  }),
  parseHTML: () => [{ tag: "div[data-file-reference]" }],
  renderHTML: ({ node, HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, {
      "data-file-reference": "",
      "data-file-id": node.attrs.fileId,
    }),
    "Workspace file",
  ],
  addNodeView: () => ReactNodeViewRenderer(FileReferenceView),
});

export const ChildPage = Node.create({
  name: "childPage",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes: () => ({
    pageId: {
      default: null,
      rendered: false,
      parseHTML: (element) => element.getAttribute("data-page-id"),
    },
  }),
  parseHTML: () => [{ tag: "div[data-child-page]" }],
  renderHTML: ({ node, HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, {
      "data-child-page": "",
      "data-page-id": node.attrs.pageId,
    }),
    "Workspace page",
  ],
  addNodeView: () => ReactNodeViewRenderer(ChildPageView),
});

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  parseHTML: () => [{ tag: "aside[data-callout]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "aside",
    mergeAttributes(HTMLAttributes, { "data-callout": "" }),
    0,
  ],
});
