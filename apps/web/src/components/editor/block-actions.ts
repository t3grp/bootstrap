import type { Editor, JSONContent } from "@tiptap/react";
import { Selection } from "@tiptap/pm/state";

export type BlockAction = "up" | "down" | "duplicate" | "delete";

export function selectedTopLevelBlock(editor: Editor) {
  const { doc, selection } = editor.state;
  const index = Math.min(selection.$from.index(0), doc.childCount - 1);
  if (index < 0) return null;
  let from = 0;
  for (let current = 0; current < index; current += 1)
    from += doc.child(current).nodeSize;
  return { node: doc.child(index), index, from, count: doc.childCount };
}

export function withFreshBlockIds(node: JSONContent): JSONContent {
  const block = !["doc", "text", "hardBreak"].includes(node.type ?? "");
  return {
    ...node,
    ...(block ? { attrs: { ...node.attrs, id: crypto.randomUUID() } } : {}),
    ...(node.content ? { content: node.content.map(withFreshBlockIds) } : {}),
  };
}

/** Top-level blocks remain whole when reordered, including nested list items and reference nodes. */
export function performBlockAction(
  editor: Editor,
  action: BlockAction,
): boolean {
  const block = selectedTopLevelBlock(editor);
  if (!block) return false;
  const { node, index, from, count } = block;
  if (
    (action === "up" && index === 0) ||
    (action === "down" && index === count - 1)
  )
    return false;
  let tr = editor.state.tr;
  let destination = from;
  if (action === "up") {
    destination = from - editor.state.doc.child(index - 1).nodeSize;
    tr = tr.delete(from, from + node.nodeSize).insert(destination, node);
  } else if (action === "down") {
    destination = from + editor.state.doc.child(index + 1).nodeSize;
    tr = tr.delete(from, from + node.nodeSize).insert(destination, node);
  } else if (action === "duplicate") {
    destination = from + node.nodeSize;
    tr = tr.insert(
      destination,
      editor.schema.nodeFromJSON(withFreshBlockIds(node.toJSON())),
    );
  } else if (count === 1) {
    const paragraph = editor.schema.nodes.paragraph.create({
      id: crypto.randomUUID(),
    });
    tr = tr.replaceWith(from, from + node.nodeSize, paragraph);
  } else {
    tr = tr.delete(from, from + node.nodeSize);
  }
  const target = Math.min(Math.max(0, destination + 1), tr.doc.content.size);
  tr = tr.setSelection(Selection.near(tr.doc.resolve(target))).scrollIntoView();
  editor.view.dispatch(tr);
  editor.view.focus();
  return true;
}
