import type { Editor } from "@tiptap/react";
import type { PageContent } from "@bootstrap/core";

/**
 * JSONB changes object-key order on a save round trip. Compare document models
 * so an acknowledgement never replaces identical content and resets selection.
 * An explicit load of different content still updates the editor.
 */
export function syncPageContent(editor: Editor, content: PageContent): boolean {
  const incoming = editor.schema.nodeFromJSON(content);
  if (editor.state.doc.eq(incoming)) return false;
  editor.commands.setContent(content, { emitUpdate: false });
  return true;
}
