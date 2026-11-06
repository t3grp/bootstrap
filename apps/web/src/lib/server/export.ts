import type {
  EditorNode,
  Page,
  WorkspaceSnapshot,
  WorkspaceTable,
} from "@bootstrap/core";

function escapeMarkdown(text: string) {
  return text
    .replace(/([\\`*_{}\[\]()#+.!|>~-])/g, "\\$1")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function inline(node: EditorNode): string {
  if (node.type === "hardBreak") return "  \n";
  let text =
    node.type === "text"
      ? escapeMarkdown(node.text || "")
      : (node.content || []).map(inline).join("");
  for (const mark of node.marks || []) {
    if (mark.type === "bold") text = `**${text}**`;
    if (mark.type === "italic") text = `_${text}_`;
    if (mark.type === "strike") text = `~~${text}~~`;
    if (mark.type === "code") {
      const raw = node.text || "";
      const fence = "`".repeat(
        Math.max(
          0,
          ...Array.from(raw.matchAll(/`+/g), (match) => match[0].length),
        ) + 1,
      );
      text = `${fence} ${raw} ${fence}`;
    }
    if (mark.type === "link")
      text = `[${text}](${String(mark.attrs?.href).replace(/[()\s]/g, (char) => encodeURIComponent(char))})`;
  }
  return text;
}
function block(node: EditorNode, depth = 0): string {
  const content = node.content || [];
  switch (node.type) {
    case "paragraph":
      return inline(node);
    case "heading":
      return `${"#".repeat(Number(node.attrs?.level) || 2)} ${inline(node)}`;
    case "blockquote":
      return content
        .map((child) => block(child, depth))
        .join("\n\n")
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    case "callout":
      return content
        .map((child) => block(child, depth))
        .join("\n\n")
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    case "horizontalRule":
      return "---";
    case "codeBlock": {
      const code = content.map((child) => child.text || "").join("");
      const fence = "`".repeat(
        Math.max(
          2,
          ...Array.from(code.matchAll(/`+/g), (match) => match[0].length),
        ) + 1,
      );
      const language = String(node.attrs?.language || "").replace(
        /[^\w+-]/g,
        "",
      );
      return `${fence}${language}\n${code}\n${fence}`;
    }
    case "bulletList":
    case "orderedList":
    case "taskList":
      return content
        .map((child, index) => {
          const marker =
            node.type === "orderedList"
              ? `${Number(node.attrs?.start || 1) + index}.`
              : node.type === "taskList"
                ? `- [${child.attrs?.checked ? "x" : " "}]`
                : "-";
          const body = (child.content || [])
            .map((part) => block(part, depth + 1))
            .join("\n\n");
          const lines = body.split("\n");
          return `${marker} ${lines[0]}${
            lines.length > 1
              ? "\n" +
                lines
                  .slice(1)
                  .map((line) => "  " + line)
                  .join("\n")
              : ""
          }`;
        })
        .join("\n");
    case "tableReference":
      return `> Linked table: ${String(node.attrs?.tableId)} (export this table separately as CSV).`;
    case "fileReference":
      return `> Attached file: ${String(node.attrs?.fileId)} (download the file separately).`;
    case "childPage":
      return `> Linked page: ${String(node.attrs?.pageId)}.`;
    default:
      return content.map((child) => block(child, depth)).join("\n\n");
  }
}

export function pageMarkdown(page: Page) {
  return `# ${escapeMarkdown(page.title)}\n\n${page.content.content.map((node) => block(node)).join("\n\n")}\n\n<!-- Bootstrap export: page ${page.id}, revision ${page.revision}. Resource links are textual references; callouts become quotes; underline formatting is omitted. Native JSON retains block IDs and exact structured content. -->\n`;
}

function csvCell(value: string | number | boolean | null | undefined) {
  let text = value === null || value === undefined ? "" : String(value);
  // Avoid executing spreadsheet formulas when exported text is opened in common spreadsheet apps.
  if (typeof value === "string" && /^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
export function tableCsv(table: WorkspaceTable) {
  return (
    [
      table.columns.map((column) => csvCell(column.name)).join(","),
      ...table.rows.map((row) =>
        table.columns.map((column) => csvCell(row.cells[column.id])).join(","),
      ),
    ].join("\r\n") + "\r\n"
  );
}
export function nativeWorkspaceExport(snapshot: WorkspaceSnapshot) {
  return {
    format: "bootstrap.workspace",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    notes: [
      "Current resource versions only; this is not a database backup.",
      "File entries contain metadata; download original files separately. Credentials and auth sessions are never exported.",
    ],
    workspace: snapshot.workspace,
    projects: snapshot.projects,
    pages: snapshot.pages,
    tasks: snapshot.tasks,
    tables: snapshot.tables,
    agents: snapshot.agents,
    files: snapshot.files,
  };
}
