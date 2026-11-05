import { getDatabase } from "@bootstrap/db";
import { requireActor } from "@/lib/server/auth";
import { AppError, errorResponse, notFound } from "@/lib/server/errors";
import {
  nativeWorkspaceExport,
  pageMarkdown,
  tableCsv,
} from "@/lib/server/export";
import { privateHeaders } from "@/lib/server/http";
import { attachmentDisposition } from "@/lib/server/storage";
import { idSchema } from "@/lib/server/validation";
import { getSnapshot } from "@/lib/server/workspace";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const actor = await requireActor(request);
    const params = new URL(request.url).searchParams;
    const workspaceId = idSchema.parse(params.get("workspaceId"));
    const snapshot = await getSnapshot(await getDatabase(), actor, workspaceId);
    const type = params.get("type") || "workspace";
    const format = params.get("format") || "json";
    const id = params.get("id");
    const download = (content: string, name: string, mime: string) =>
      new Response(content, {
        headers: {
          ...privateHeaders,
          "Content-Type": mime,
          "Content-Disposition": attachmentDisposition(name),
        },
      });
    if (type === "workspace" && format === "json")
      return download(
        JSON.stringify(nativeWorkspaceExport(snapshot), null, 2),
        `${snapshot.workspace.name}.json`,
        "application/json; charset=utf-8",
      );
    if (type === "page") {
      const page = snapshot.pages.find((item) => item.id === id);
      if (!page) throw notFound();
      if (format === "markdown")
        return download(
          pageMarkdown(page),
          `${page.title}.md`,
          "text/markdown; charset=utf-8",
        );
      if (format === "json")
        return download(
          JSON.stringify(
            { format: "bootstrap.page", schemaVersion: 1, page },
            null,
            2,
          ),
          `${page.title}.json`,
          "application/json; charset=utf-8",
        );
    }
    if (type === "table") {
      const table = snapshot.tables.find((item) => item.id === id);
      if (!table) throw notFound();
      if (format === "csv")
        return download(
          tableCsv(table),
          `${table.name}.csv`,
          "text/csv; charset=utf-8",
        );
      if (format === "json")
        return download(
          JSON.stringify(
            { format: "bootstrap.table", schemaVersion: 1, table },
            null,
            2,
          ),
          `${table.name}.json`,
          "application/json; charset=utf-8",
        );
    }
    throw new AppError(
      400,
      "Choose JSON for a workspace, JSON/Markdown for a page, or JSON/CSV for a table.",
    );
  } catch (error) {
    return errorResponse(error);
  }
}
