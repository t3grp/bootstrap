import { z } from "zod";
import type {
  EditorNode,
  PageContent,
  TableColumn,
  TableRow,
  WorkspaceCommand,
} from "@bootstrap/core";
import { AppError } from "./errors";
import { MAX_FILE_BYTES } from "../../../../../packages/core/src/file-storage";

export const LIMITS = {
  documentBytes: 2 * 1024 * 1024,
  documentNodes: 2_000,
  documentDepth: 16,
  tableColumns: 50,
  tableRows: 500,
  fileBytes: MAX_FILE_BYTES,
  resources: 500,
} as const;
export const idSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid identifier");
const shortText = z.string().trim().min(1).max(200);
const description = z.string().max(20_000);
const color = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hexadecimal color");
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      Number.isFinite(date.valueOf()) && date.toISOString().startsWith(value)
    );
  }, "Use a real calendar date");
const nullableProject = idSchema.nullable();
const revision = z.number().int().min(1);
const pagePatch = z
  .object({
    title: z.string().max(200).optional(),
    icon: z.string().max(32).optional(),
    parentId: idSchema.nullable().optional(),
    projectId: nullableProject.optional(),
    kind: z.enum(["page", "note", "scratchpad"]).optional(),
    content: z.unknown().optional(),
    favorite: z.boolean().optional(),
    fullWidth: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(1_000_000).optional(),
  })
  .strict();
const taskPatch = z
  .object({
    title: shortText.optional(),
    description: description.optional(),
    status: z.enum(["todo", "in_progress", "done"]).optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    assignee: z.string().max(128).optional(),
    projectId: nullableProject.optional(),
    dueDate: dateOnly.nullable().optional(),
  })
  .strict();
const column = z
  .object({
    id: idSchema,
    name: shortText,
    type: z.enum([
      "text",
      "number",
      "date",
      "checkbox",
      "select",
      "url",
      "file",
    ]),
    options: z.array(z.string().min(1).max(100)).max(100).optional(),
  })
  .strict();
const row = z
  .object({
    id: idSchema,
    cells: z.record(
      z.string(),
      z.union([
        z.string().max(20_000),
        z.number().finite(),
        z.boolean(),
        z.null(),
      ]),
    ),
  })
  .strict();
const tablePatch = z
  .object({
    name: shortText.optional(),
    description: description.optional(),
    columns: z.array(column).min(1).max(LIMITS.tableColumns).optional(),
    rows: z.array(row).max(LIMITS.tableRows).optional(),
  })
  .strict();
const notes = z.array(z.string().max(20_000)).max(100);
const references = z.array(idSchema).max(100);
const agentPatch = z
  .object({
    name: shortText.optional(),
    role: z.string().max(200).optional(),
    description: description.optional(),
    color: color.optional(),
    instructions: z.string().max(100_000).optional(),
    skills: notes.optional(),
    routines: notes.optional(),
    memories: notes.optional(),
    fileIds: references.optional(),
    tableIds: references.optional(),
    pageIds: references.optional(),
  })
  .strict();

const commandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("workspace.create"), name: shortText }).strict(),
  z.object({ type: z.literal("workspace.rename"), name: shortText }).strict(),
  z
    .object({
      type: z.literal("project.create"),
      name: shortText,
      description: description.optional(),
      color: color.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("project.update"),
      id: idSchema,
      patch: z
        .object({
          name: shortText.optional(),
          description: description.optional(),
          color: color.optional(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("page.create"),
      title: z.string().max(200).optional(),
      parentId: idSchema.nullable().optional(),
      projectId: nullableProject.optional(),
      kind: z.enum(["page", "note", "scratchpad"]).optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("page.update"),
      id: idSchema,
      revision,
      patch: pagePatch,
    })
    .strict(),
  z.object({ type: z.literal("page.trash"), id: idSchema, revision }).strict(),
  z
    .object({ type: z.literal("page.restore"), id: idSchema, revision })
    .strict(),
  z
    .object({
      type: z.literal("task.create"),
      title: shortText,
      projectId: nullableProject.optional(),
      dueDate: dateOnly.nullable().optional(),
      assignee: z.string().max(128).optional(),
    })
    .strict(),
  z
    .object({ type: z.literal("task.update"), id: idSchema, patch: taskPatch })
    .strict(),
  z.object({ type: z.literal("task.delete"), id: idSchema }).strict(),
  z.object({ type: z.literal("table.create"), name: shortText }).strict(),
  z
    .object({
      type: z.literal("table.update"),
      id: idSchema,
      revision,
      patch: tablePatch,
    })
    .strict(),
  z
    .object({
      type: z.literal("agent.create"),
      name: shortText,
      role: z.string().max(200).optional(),
      description: description.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("agent.update"),
      id: idSchema,
      patch: agentPatch,
    })
    .strict(),
  z.object({ type: z.literal("agent.delete"), id: idSchema }).strict(),
  z.object({ type: z.literal("file.delete"), id: idSchema }).strict(),
]);

export function parseCommand(value: unknown): WorkspaceCommand {
  const parsed = commandSchema.parse(value);
  if (parsed.type === "page.update" && parsed.patch.content !== undefined)
    parsed.patch.content = validatePageContent(parsed.patch.content);
  return parsed as WorkspaceCommand;
}

export const setupSchema = z
  .object({
    name: shortText,
    email: z
      .string()
      .email()
      .max(254)
      .transform((value) => value.toLowerCase()),
    password: z.string().min(12, "Use at least 12 characters").max(128),
    workspaceName: shortText,
    setupToken: z.string().min(1).max(256),
  })
  .strict();

export function safeUrl(value: string) {
  try {
    return ["http:", "https:", "mailto:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

type Reference = { type: "table" | "file" | "page"; id: string };
const blocks = new Set([
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "taskList",
  "blockquote",
  "codeBlock",
  "horizontalRule",
  "callout",
  "tableReference",
  "fileReference",
  "childPage",
]);
const nodes = new Set([...blocks, "listItem", "taskItem", "text", "hardBreak"]);
const inline = new Set(["text", "hardBreak"]);
const leaf = new Set([
  "horizontalRule",
  "tableReference",
  "fileReference",
  "childPage",
  "hardBreak",
]);
const markTypes = new Set([
  "bold",
  "italic",
  "strike",
  "underline",
  "code",
  "link",
]);

function invalid(message: string): never {
  throw new AppError(400, message, "VALIDATION_ERROR");
}
function plainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function assertKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
) {
  if (Object.keys(value).some((key) => !allowed.includes(key)))
    invalid(`Unsupported ${label} property.`);
}

/** Validate the application-owned Tiptap JSON; HTML is never accepted as canonical data. */
export function validatePageContent(value: unknown): PageContent {
  if (
    !plainObject(value) ||
    value.type !== "doc" ||
    !Array.isArray(value.content)
  )
    invalid("Page content must be a structured document.");
  assertKeys(value, ["type", "content"], "document");
  if (value.content.length === 0) invalid("A page needs at least one block.");
  if (Buffer.byteLength(JSON.stringify(value)) > LIMITS.documentBytes)
    invalid("This page exceeds the 2 MB content limit.");
  const ids = new Set<string>();
  let count = 0;
  function visit(raw: unknown, parent: string, depth: number): void {
    if (++count > LIMITS.documentNodes || depth > LIMITS.documentDepth)
      invalid("This page has too many blocks or nesting levels.");
    if (
      !plainObject(raw) ||
      typeof raw.type !== "string" ||
      !nodes.has(raw.type)
    )
      invalid("Unsupported page block.");
    assertKeys(raw, ["type", "attrs", "content", "marks", "text"], "block");
    const type = raw.type;
    if (
      (parent === "doc" ||
        parent === "blockquote" ||
        parent === "callout" ||
        parent === "listItem" ||
        parent === "taskItem") &&
      !blocks.has(type)
    )
      invalid("A block is in an invalid position.");
    if (["paragraph", "heading"].includes(parent) && !inline.has(type))
      invalid("Text blocks can only contain inline content.");
    if (parent === "codeBlock" && type !== "text")
      invalid("Code blocks can only contain text.");
    if (["bulletList", "orderedList"].includes(parent) && type !== "listItem")
      invalid("Lists can only contain list items.");
    if (parent === "taskList" && type !== "taskItem")
      invalid("Checklists can only contain checklist items.");
    if (type === "text") {
      if (
        typeof raw.text !== "string" ||
        raw.text.length === 0 ||
        raw.text.length > 200_000 ||
        raw.content !== undefined ||
        raw.attrs !== undefined
      )
        invalid("Invalid text content.");
    } else {
      if (raw.text !== undefined) invalid("Only a text node can hold text.");
      const attrs = raw.attrs === undefined ? {} : raw.attrs;
      if (!plainObject(attrs)) invalid("Invalid block attributes.");
      const allowed = ["id"];
      if (type === "heading") allowed.push("level");
      if (type === "orderedList") allowed.push("start", "type");
      if (type === "taskItem") allowed.push("checked");
      if (type === "codeBlock") allowed.push("language");
      if (type === "tableReference") allowed.push("tableId");
      if (type === "fileReference") allowed.push("fileId");
      if (type === "childPage") allowed.push("pageId");
      assertKeys(attrs, allowed, "block attribute");
      if (type !== "hardBreak") {
        const result = idSchema.safeParse(attrs.id);
        if (!result.success || ids.has(result.data))
          invalid("Every block needs a unique stable identifier.");
        ids.add(result.data);
      }
      if (
        type === "heading" &&
        (typeof attrs.level !== "number" || ![1, 2, 3].includes(attrs.level))
      )
        invalid("Headings must use level 1, 2, or 3.");
      if (
        type === "orderedList" &&
        attrs.start !== undefined &&
        (!Number.isInteger(attrs.start) ||
          Number(attrs.start) < 1 ||
          Number(attrs.start) > 10_000)
      )
        invalid("Invalid numbered list start.");
      if (
        type === "orderedList" &&
        attrs.type !== undefined &&
        attrs.type !== null &&
        !["1", "a", "A", "i", "I"].includes(String(attrs.type))
      )
        invalid("Invalid numbered list style.");
      if (type === "taskItem" && typeof attrs.checked !== "boolean")
        invalid("Checklist items need a checked state.");
      if (
        type === "codeBlock" &&
        attrs.language !== undefined &&
        attrs.language !== null &&
        (typeof attrs.language !== "string" || attrs.language.length > 64)
      )
        invalid("Invalid code language.");
      for (const key of ["tableId", "fileId", "pageId"])
        if (attrs[key] !== undefined) idSchema.parse(attrs[key]);
      if (
        (type === "tableReference" && !attrs.tableId) ||
        (type === "fileReference" && !attrs.fileId) ||
        (type === "childPage" && !attrs.pageId)
      )
        invalid("A resource block must identify its resource.");
    }
    if (raw.marks !== undefined) {
      if (
        !inline.has(type) ||
        !Array.isArray(raw.marks) ||
        raw.marks.length > 8
      )
        invalid("Invalid inline formatting.");
      if (parent === "codeBlock" && raw.marks.length > 0)
        invalid("Code blocks do not support inline formatting.");
      const seenMarks = new Set<string>();
      for (const mark of raw.marks) {
        if (
          !plainObject(mark) ||
          typeof mark.type !== "string" ||
          !markTypes.has(mark.type)
        )
          invalid("Unsupported inline formatting.");
        if (seenMarks.has(mark.type))
          invalid("Inline formatting must not repeat.");
        seenMarks.add(mark.type);
        if (mark.type === "code" && raw.marks.length > 1)
          invalid("Inline code cannot be combined with other formatting.");
        assertKeys(mark, ["type", "attrs"], "formatting");
        if (mark.type === "link") {
          if (
            !plainObject(mark.attrs) ||
            typeof mark.attrs.href !== "string" ||
            mark.attrs.href.length > 4_096 ||
            !safeUrl(mark.attrs.href)
          )
            invalid("Links must use http, https, or mailto.");
          assertKeys(
            mark.attrs,
            ["href", "target", "rel", "class", "title"],
            "link",
          );
          if (
            mark.attrs.title !== undefined &&
            mark.attrs.title !== null &&
            (typeof mark.attrs.title !== "string" ||
              mark.attrs.title.length > 500)
          )
            invalid("Invalid link title.");
          if (
            mark.attrs.target !== undefined &&
            mark.attrs.target !== null &&
            !["_blank", "_self"].includes(String(mark.attrs.target))
          )
            invalid("Invalid link target.");
          if (
            mark.attrs.class !== undefined &&
            mark.attrs.class !== null &&
            (typeof mark.attrs.class !== "string" ||
              mark.attrs.class.length > 200)
          )
            invalid("Invalid link class.");
          if (
            mark.attrs.rel !== undefined &&
            mark.attrs.rel !== null &&
            (typeof mark.attrs.rel !== "string" || mark.attrs.rel.length > 200)
          )
            invalid("Invalid link relationship.");
        } else if (mark.attrs !== undefined)
          invalid("Unsupported formatting attributes.");
      }
    }
    if (
      [
        "bulletList",
        "orderedList",
        "taskList",
        "blockquote",
        "callout",
        "listItem",
        "taskItem",
      ].includes(type)
    ) {
      if (!Array.isArray(raw.content) || raw.content.length === 0)
        invalid("This block needs content.");
      if (
        ["listItem", "taskItem"].includes(type) &&
        (!plainObject(raw.content[0]) || raw.content[0].type !== "paragraph")
      )
        invalid("List items must start with a paragraph.");
    }
    if (raw.content !== undefined) {
      if (!Array.isArray(raw.content) || leaf.has(type) || type === "text")
        invalid("This block cannot contain children.");
      raw.content.forEach((child) => visit(child, type, depth + 1));
    }
  }
  value.content.forEach((node) => visit(node, "doc", 1));
  return value as PageContent;
}

export function pageReferences(content: PageContent): Reference[] {
  const references: Reference[] = [];
  function visit(node: EditorNode) {
    if (node.type === "tableReference")
      references.push({ type: "table", id: String(node.attrs?.tableId) });
    if (node.type === "fileReference")
      references.push({ type: "file", id: String(node.attrs?.fileId) });
    if (node.type === "childPage")
      references.push({ type: "page", id: String(node.attrs?.pageId) });
    node.content?.forEach(visit);
  }
  content.content.forEach(visit);
  return references;
}

export function validateTable(columns: TableColumn[], rows: TableRow[]) {
  z.array(column).min(1).max(LIMITS.tableColumns).parse(columns);
  z.array(row).max(LIMITS.tableRows).parse(rows);
  if (
    new Set(columns.map((item) => item.id)).size !== columns.length ||
    new Set(rows.map((item) => item.id)).size !== rows.length
  )
    invalid("Table column and row identifiers must be unique.");
  const columnMap = new Map(columns.map((item) => [item.id, item]));
  const fileIds = new Set<string>();
  for (const item of columns) {
    if (item.options && new Set(item.options).size !== item.options.length)
      invalid("Select options must be unique.");
    if (item.type !== "select" && item.options?.length)
      invalid("Only select fields can define options.");
  }
  for (const row of rows)
    for (const [key, value] of Object.entries(row.cells)) {
      const field = columnMap.get(key);
      if (!field) invalid("A row contains an unknown field.");
      if (value === null || value === "") continue;
      switch (field.type) {
        case "text":
          if (typeof value !== "string") invalid(`${field.name} must be text.`);
          break;
        case "number":
          if (typeof value !== "number" || !Number.isFinite(value))
            invalid(`${field.name} must be a number.`);
          break;
        case "checkbox":
          if (typeof value !== "boolean")
            invalid(`${field.name} must be checked or unchecked.`);
          break;
        case "date":
          if (!dateOnly.safeParse(value).success)
            invalid(`${field.name} must be a real date.`);
          break;
        case "url":
          if (typeof value !== "string" || !safeUrl(value))
            invalid(`${field.name} must be a safe URL.`);
          break;
        case "select":
          if (typeof value !== "string" || !field.options?.includes(value))
            invalid(`${field.name} must use an existing option.`);
          break;
        case "file":
          if (typeof value !== "string" || !idSchema.safeParse(value).success)
            invalid(`${field.name} must reference a file.`);
          else fileIds.add(value);
          break;
      }
    }
  if (Buffer.byteLength(JSON.stringify({ columns, rows })) > 4 * 1024 * 1024)
    invalid("This table exceeds the 4 MB size limit.");
  return [...fileIds];
}
