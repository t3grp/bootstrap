import type { WorkspaceTable } from "@bootstrap/core";
import { ApiError } from "@/lib/api";

/** A post-commit snapshot is not necessarily the revision this write created. */
export function confirmedSaveRevision(
  submittedRevision: number,
  snapshotRevision: number,
): number {
  const acknowledgedRevision = submittedRevision + 1;
  if (snapshotRevision !== acknowledgedRevision) {
    throw new ApiError(409, {
      error:
        "This item changed after it was saved. Keep your draft and load the latest revision.",
      code: "REVISION_CONFLICT",
      currentRevision: snapshotRevision,
    });
  }
  return acknowledgedRevision;
}

type TableRevision = Pick<WorkspaceTable, "id" | "revision">;

/**
 * A save can finish before React replaces the DOM's previous table props. Keep
 * that local acknowledgement so the next cell edit cannot move its base back.
 * Only successful writes from this client belong here: using the latest fetched
 * snapshot would silently bypass genuine conflicts with another session.
 */
export class AcknowledgedTableRevisions {
  private readonly revisions = new Map<string, number>();

  forDraft(workspaceId: string, table: TableRevision): number {
    return Math.max(
      table.revision,
      this.revisions.get(this.key(workspaceId, table.id)) ?? table.revision,
    );
  }

  recordSuccessfulWrite(
    workspaceId: string,
    tableId: string,
    submittedRevision: number,
  ): void {
    // The command increments exactly once. Its returned snapshot is read after
    // commit, so it may already include a later write from another session.
    const acknowledged = { id: tableId, revision: submittedRevision + 1 };
    this.revisions.set(
      this.key(workspaceId, tableId),
      this.forDraft(workspaceId, acknowledged),
    );
  }

  private key(workspaceId: string, tableId: string): string {
    return JSON.stringify([workspaceId, tableId]);
  }
}
