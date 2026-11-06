CREATE TABLE table_views (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  id text NOT NULL,
  table_id text NOT NULL,
  name text NOT NULL,
  settings text NOT NULL,
  column_bindings text NOT NULL,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  validated_table_revision integer NOT NULL CHECK (validated_table_revision > 0),
  created_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  updated_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  PRIMARY KEY (workspace_id, id),
  CONSTRAINT table_views_table_workspace_fk FOREIGN KEY (workspace_id, table_id)
    REFERENCES business_tables(workspace_id, id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX table_views_table_idx ON table_views (workspace_id, table_id, created_at, id);
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_table_views_insert AFTER INSERT ON table_views
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_table_views_update AFTER UPDATE ON table_views
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_table_views_delete AFTER DELETE ON table_views
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
