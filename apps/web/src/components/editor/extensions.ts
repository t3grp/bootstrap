import { getSchema } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import UniqueID from "@tiptap/extension-unique-id";
import { Callout, ChildPage, FileReference, TableReference } from "./reference-nodes";

export const pageBlockTypes = ["paragraph", "heading", "bulletList", "orderedList", "listItem", "taskList", "taskItem", "blockquote", "codeBlock", "horizontalRule", "callout", "tableReference", "fileReference", "childPage"];

export function isSafePageLink(value: string) {
  try { return ["http:", "https:", "mailto:"].includes(new URL(value).protocol); } catch { return false; }
}

/** One editor schema for the UI and its compatibility checks. No demo content is embedded. */
export function createPageEditorExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        protocols: ["http", "https", "mailto"],
        isAllowedUri: url => isSafePageLink(url),
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      },
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Placeholder.configure({ placeholder: ({ node }) => node.type.name === "heading" ? "Heading" : "Write something, or type ‘/’ for blocks…", showOnlyCurrent: true }),
    UniqueID.configure({ types: pageBlockTypes, generateID: () => crypto.randomUUID() }),
    Callout, TableReference, FileReference, ChildPage,
  ];
}

export function createPageEditorSchema() {
  return getSchema(createPageEditorExtensions());
}
