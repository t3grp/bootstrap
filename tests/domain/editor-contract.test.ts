import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { EditorNode, PageContent } from "@bootstrap/core";
// Resolve the web workspace's actual PM build, ensuring one schema/state dependency graph.
import { EditorState, TextSelection } from "../../apps/web/node_modules/@tiptap/pm/dist/state/index.js";
import { createPageEditorSchema } from "@/components/editor/extensions";
import { performBlockAction } from "@/components/editor/block-actions";
import { syncPageContent } from "@/components/editor/content-sync";
import { validatePageContent } from "@/lib/server/validation";
import { parseCellValue } from "@/components/tables/table-utils";

const schema = createPageEditorSchema();
const attrs = () => ({ id: randomUUID() });
const paragraph = (text: string) => schema.nodes.paragraph.create(attrs(), schema.text(text));
const ids = (node: EditorNode): string[] => [...(!["doc", "text", "hardBreak"].includes(node.type) ? [node.attrs?.id as string] : []), ...(node.content ?? []).flatMap(ids)];

function headlessState(content: PageContent, position: number) {
  const doc = schema.nodeFromJSON(content);
  doc.check();
  let state = EditorState.create({ schema, doc, selection: TextSelection.create(doc, position) });
  const focus = vi.fn();
  const setContent = vi.fn((next: PageContent) => {
    state = EditorState.create({ schema, doc: schema.nodeFromJSON(next) });
    return true;
  });
  const editor = {
    get state() { return state; }, schema,
    commands: { setContent },
    view: { dispatch: (transaction: Parameters<typeof state.apply>[0]) => { state = state.apply(transaction); }, focus },
  } as unknown as Parameters<typeof performBlockAction>[0];
  return { editor, getState: () => state, focus, setContent };
}

describe("page acknowledgement synchronization", () => {
  it("retains the checklist selection when JSONB reorders object keys", () => {
    const lead = paragraph("Opening paragraph");
    const list = schema.nodes.taskList.create(attrs(), schema.nodes.taskItem.create({ ...attrs(), checked: false }, paragraph("Keep the caret here")));
    const doc = schema.nodes.doc.create(null, [lead, list, schema.nodes.paragraph.create(attrs())]);
    const content = doc.toJSON() as PageContent;
    const state = headlessState(content, lead.nodeSize + 3);
    const before = state.getState();
    // Reproduce JSONB's canonical key order from the failing browser trace:
    // emitted {type,text} comes back as {text,type}, with equal document content.
    const saved = JSON.parse(JSON.stringify(content, (_key, value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return value;
      return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.length - right.length || left.localeCompare(right)));
    })) as PageContent;
    expect(saved).toEqual(content);
    expect(JSON.stringify(saved)).not.toBe(JSON.stringify(content));
    expect(syncPageContent(state.editor, saved)).toBe(false);
    expect(state.setContent).not.toHaveBeenCalled();
    expect(state.getState()).toBe(before);
    expect(state.getState().selection.$from.node(1).type.name).toBe("taskList");
  });

  it("still applies a genuinely different revision without emitting another save", () => {
    const doc = schema.nodes.doc.create(null, paragraph("The current draft"));
    const state = headlessState(doc.toJSON() as PageContent, 5);
    const latest = schema.nodes.doc.create(null, paragraph("The explicitly loaded revision")).toJSON() as PageContent;
    expect(syncPageContent(state.editor, latest)).toBe(true);
    expect(state.setContent).toHaveBeenCalledWith(latest, { emitUpdate: false });
    expect(state.getState().doc.textContent).toBe("The explicitly loaded revision");
  });
});

describe("editor schema and server content contract", () => {
  it("accepts the installed schema's numbered-list and link defaults", () => {
    const item = schema.nodes.listItem.create(attrs(), paragraph("First item"));
    const list = schema.nodes.orderedList.create(attrs(), item);
    const link = schema.marks.link.create({ href: "https://example.com" });
    const linked = schema.nodes.paragraph.create(attrs(), schema.text("A source", [link]));
    const doc = schema.nodes.doc.create(null, [list, linked]);
    doc.check();
    const content = doc.toJSON();
    expect(content.content[0].attrs.type).toBe(null);
    expect(content.content[1].content[0].marks[0].attrs.title).toBe(null);
    expect(() => validatePageContent(content)).not.toThrow();
  });

  it("accepts each configured structural node with stable identifiers", () => {
    const doc = schema.nodes.doc.create(null, [
      paragraph("Text"),
      schema.nodes.heading.create({ ...attrs(), level: 2 }, schema.text("Heading")),
      schema.nodes.blockquote.create(attrs(), paragraph("Quoted text")),
      schema.nodes.callout.create(attrs(), paragraph("A note")),
      schema.nodes.bulletList.create(attrs(), schema.nodes.listItem.create(attrs(), paragraph("An idea"))),
      schema.nodes.taskList.create(attrs(), schema.nodes.taskItem.create({ ...attrs(), checked: false }, paragraph("A checklist item"))),
      schema.nodes.codeBlock.create(attrs(), schema.text("const ready = true;")),
      schema.nodes.horizontalRule.create(attrs()),
      schema.nodes.tableReference.create({ ...attrs(), tableId: randomUUID() }),
      schema.nodes.fileReference.create({ ...attrs(), fileId: randomUUID() }),
      schema.nodes.childPage.create({ ...attrs(), pageId: randomUUID() }),
    ]);
    doc.check();
    expect(() => validatePageContent(doc.toJSON())).not.toThrow();
    expect(new Set(ids(doc.toJSON())).size).toBe(ids(doc.toJSON()).length);
  });

  const invalidDocuments: [string, PageContent][] = [
    ["empty document", { type: "doc", content: [] }],
    ["empty quotation", { type: "doc", content: [{ type: "blockquote", attrs: attrs() }] }],
    ["empty callout", { type: "doc", content: [{ type: "callout", attrs: attrs() }] }],
    ["empty bulleted list", { type: "doc", content: [{ type: "bulletList", attrs: attrs() }] }],
    ["empty numbered list", { type: "doc", content: [{ type: "orderedList", attrs: { ...attrs(), start: 1, type: null } }] }],
    ["empty checklist", { type: "doc", content: [{ type: "taskList", attrs: attrs() }] }],
    ["list item starting with a heading", { type: "doc", content: [{ type: "bulletList", attrs: attrs(), content: [{ type: "listItem", attrs: attrs(), content: [{ type: "heading", attrs: { ...attrs(), level: 2 } }] }] }] }],
    ["checklist item starting with a heading", { type: "doc", content: [{ type: "taskList", attrs: attrs(), content: [{ type: "taskItem", attrs: { ...attrs(), checked: false }, content: [{ type: "heading", attrs: { ...attrs(), level: 2 } }] }] }] }],
    ["empty text", { type: "doc", content: [{ type: "paragraph", attrs: attrs(), content: [{ type: "text", text: "" }] }] }],
    ["formatted code text", { type: "doc", content: [{ type: "codeBlock", attrs: { ...attrs(), language: null }, content: [{ type: "text", text: "code", marks: [{ type: "bold" }] }] }] }],
  ];
  it.each(invalidDocuments)("rejects %s before an editor must normalize it", (_label, document) => {
    expect(() => schema.nodeFromJSON(document).check()).toThrow();
    expect(() => validatePageContent(document)).toThrow();
  });
});

describe("real ProseMirror block transactions", () => {
  it("moves a nested checklist intact and assigns fresh IDs when duplicating it", () => {
    const lead = paragraph("Opening paragraph");
    const list = schema.nodes.taskList.create(attrs(), [
      schema.nodes.taskItem.create({ ...attrs(), checked: false }, paragraph("First task")),
      schema.nodes.taskItem.create({ ...attrs(), checked: true }, paragraph("Second task")),
    ]);
    const doc = schema.nodes.doc.create(null, [lead, list, paragraph("Last paragraph")]);
    const initialIds = ids(doc.toJSON());
    const state = headlessState(doc.toJSON() as PageContent, lead.nodeSize + 3);
    expect(performBlockAction(state.editor, "up")).toBe(true);
    expect(state.getState().doc.firstChild?.type.name).toBe("taskList");
    expect(ids(state.getState().doc.toJSON()).sort()).toEqual([...initialIds].sort());
    expect(state.getState().doc.firstChild?.child(1).attrs.checked).toBe(true);
    expect(performBlockAction(state.editor, "duplicate")).toBe(true);
    const duplicated = state.getState().doc;
    duplicated.check();
    const afterIds = ids(duplicated.toJSON());
    expect(duplicated.child(0).type.name).toBe("taskList");
    expect(duplicated.child(1).type.name).toBe("taskList");
    expect(afterIds.length).toBe(initialIds.length + ids(list.toJSON()).length);
    expect(new Set(afterIds).size).toBe(afterIds.length);
    expect(initialIds.every(id => afterIds.includes(id))).toBe(true);
    expect(() => validatePageContent(duplicated.toJSON())).not.toThrow();
    expect(state.focus).toHaveBeenCalledTimes(2);
  });

  it("deleting the only block leaves a valid empty paragraph", () => {
    const doc = schema.nodes.doc.create(null, paragraph("Remove this"));
    const state = headlessState(doc.toJSON() as PageContent, 1);
    expect(performBlockAction(state.editor, "delete")).toBe(true);
    const result = state.getState().doc;
    result.check();
    expect(result.childCount).toBe(1);
    expect(result.firstChild?.type.name).toBe("paragraph");
    expect(result.textContent).toBe("");
    expect(() => validatePageContent(result.toJSON())).not.toThrow();
  });
});

describe("typed-cell draft validation", () => {
  it.each([
    ["number", "125.50", 125.5], ["number", "-2e3", -2000], ["number", "", null],
    ["date", "2024-02-29", "2024-02-29"], ["url", "https://example.com", "https://example.com"],
  ] as const)("parses %s input %s", (type, input, value) => {
    expect(parseCellValue({ id: randomUUID(), name: "Value", type }, input)).toEqual({ value });
  });
  it.each([
    ["number", "Infinity"], ["number", "0x10"], ["number", "not-a-number"],
    ["date", "2026-02-30"], ["url", "javascript:alert(1)"],
  ] as const)("rejects %s input %s without producing a persisted value", (type, input) => {
    const result = parseCellValue({ id: randomUUID(), name: "Value", type }, input);
    expect(result.error).toBeTruthy();
    expect(result.value).toBeUndefined();
  });
});
