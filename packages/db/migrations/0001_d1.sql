CREATE TABLE "user" (
  id text NOT NULL PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
  email_verified integer NOT NULL DEFAULT 0, image text,
  created_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)), updated_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer))
);
--> statement-breakpoint
CREATE TABLE session (
  id text NOT NULL PRIMARY KEY, expires_at integer NOT NULL, token text NOT NULL UNIQUE,
  created_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)), updated_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  ip_address text, user_agent text, user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX session_user_idx ON session(user_id);
--> statement-breakpoint
CREATE TABLE account (
  id text NOT NULL PRIMARY KEY, account_id text NOT NULL, provider_id text NOT NULL,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  access_token text, refresh_token text, id_token text, access_token_expires_at integer,
  refresh_token_expires_at integer, scope text, password text,
  created_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)), updated_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer))
);
--> statement-breakpoint
CREATE UNIQUE INDEX account_provider_identity_idx ON account(provider_id, account_id);
--> statement-breakpoint
CREATE TABLE verification (
  id text NOT NULL PRIMARY KEY, identifier text NOT NULL, value text NOT NULL, expires_at integer NOT NULL,
  created_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)), updated_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer))
);
--> statement-breakpoint
CREATE INDEX verification_identifier_idx ON verification(identifier);
--> statement-breakpoint
CREATE TABLE instance (
  id text NOT NULL PRIMARY KEY CHECK (id = 'primary'), owner_id text NOT NULL REFERENCES "user"(id),
  created_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer))
);
--> statement-breakpoint
CREATE TABLE workspaces (id text NOT NULL PRIMARY KEY, name text NOT NULL, created_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)));
--> statement-breakpoint
CREATE TABLE memberships (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'owner' CHECK (role = 'owner'), PRIMARY KEY (workspace_id, user_id)
);
--> statement-breakpoint
CREATE TABLE projects (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  id text NOT NULL, name text NOT NULL, description text NOT NULL DEFAULT '', color text NOT NULL DEFAULT '#71717a',
  created_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)), updated_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  PRIMARY KEY (workspace_id, id)
);
--> statement-breakpoint
CREATE TABLE documents (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, id text NOT NULL,
  source_run_id text,
  title text NOT NULL, icon text NOT NULL DEFAULT '', parent_id text, project_id text,
  kind text NOT NULL DEFAULT 'page' CHECK (kind IN ('page', 'note', 'scratchpad')),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0), favorite integer NOT NULL DEFAULT 0,
  full_width integer NOT NULL DEFAULT 0, sort_order integer NOT NULL DEFAULT 0,
  trashed_at integer, trash_batch_id text,
  created_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)), updated_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  PRIMARY KEY (workspace_id, id),
  CONSTRAINT documents_parent_workspace_fk FOREIGN KEY (workspace_id, parent_id) REFERENCES documents(workspace_id, id),
  CONSTRAINT documents_project_workspace_fk FOREIGN KEY (workspace_id, project_id) REFERENCES projects(workspace_id, id),
  CONSTRAINT documents_source_run_fk FOREIGN KEY (workspace_id, source_run_id) REFERENCES agent_runs(workspace_id, id)
);
--> statement-breakpoint
CREATE TABLE document_versions (
  workspace_id text NOT NULL, document_id text NOT NULL, revision integer NOT NULL CHECK (revision > 0),
  schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version = 1), content text NOT NULL,
  author_id text NOT NULL REFERENCES "user"(id), created_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  PRIMARY KEY (workspace_id, document_id, revision),
  CONSTRAINT versions_document_workspace_fk FOREIGN KEY (workspace_id, document_id) REFERENCES documents(workspace_id, id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE tasks (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, id text NOT NULL,
  title text NOT NULL, description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  assignee text NOT NULL DEFAULT 'me', project_id text, due_date text,
  created_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)), updated_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  PRIMARY KEY (workspace_id, id),
  CONSTRAINT tasks_project_workspace_fk FOREIGN KEY (workspace_id, project_id) REFERENCES projects(workspace_id, id)
);
--> statement-breakpoint
CREATE TABLE business_tables (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, id text NOT NULL,
  name text NOT NULL, description text NOT NULL DEFAULT '', revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  columns text NOT NULL, rows text NOT NULL,
  created_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)), updated_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  PRIMARY KEY (workspace_id, id)
);
--> statement-breakpoint
CREATE TABLE files (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, id text NOT NULL,
  name text NOT NULL, mime_type text NOT NULL, size integer NOT NULL CHECK (size >= 0 AND size <= 10485760),
  storage_key text NOT NULL UNIQUE, sha256 text NOT NULL,
  created_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)), updated_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  PRIMARY KEY (workspace_id, id)
);
--> statement-breakpoint
CREATE TABLE agents (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, id text NOT NULL,
  name text NOT NULL, role text NOT NULL DEFAULT '', description text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '#6366f1', instructions text NOT NULL DEFAULT '',
  skills text NOT NULL DEFAULT '[]', routines text NOT NULL DEFAULT '[]', memories text NOT NULL DEFAULT '[]',
  file_ids text NOT NULL DEFAULT '[]', table_ids text NOT NULL DEFAULT '[]', page_ids text NOT NULL DEFAULT '[]',
  created_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)), updated_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  PRIMARY KEY (workspace_id, id)
);
--> statement-breakpoint
CREATE TABLE agent_threads (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  id text NOT NULL, agent_id text NOT NULL, owner_id text NOT NULL REFERENCES "user"(id),
  title text NOT NULL, created_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)), updated_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  PRIMARY KEY (workspace_id, id)
);
--> statement-breakpoint
CREATE TABLE agent_assignments (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  id text NOT NULL, thread_id text NOT NULL, agent_id text NOT NULL, owner_id text NOT NULL REFERENCES "user"(id),
  operation_key text NOT NULL, payload_hash text NOT NULL, prompt text NOT NULL, output_title text NOT NULL,
  project_id text, status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','in_progress','needs_review','done','blocked','cancelled')),
  created_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)), updated_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  PRIMARY KEY (workspace_id, id),
  FOREIGN KEY (workspace_id, thread_id) REFERENCES agent_threads(workspace_id, id),
  FOREIGN KEY (workspace_id, project_id) REFERENCES projects(workspace_id, id)
);
--> statement-breakpoint
CREATE UNIQUE INDEX agent_assignment_operation_idx ON agent_assignments(workspace_id, owner_id, operation_key);
--> statement-breakpoint
CREATE TABLE agent_runs (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  id text NOT NULL, assignment_id text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','cancelled','failed','paused_budget','reconciling')),
  checkpoint text NOT NULL DEFAULT 'prepared' CHECK (checkpoint IN ('prepared','dispatching','generated')),
  agent_configuration text NOT NULL, sources text NOT NULL, context text NOT NULL,
  provider text NOT NULL CHECK (provider IN ('deterministic','openai-compatible')), model text NOT NULL,
  provider_fingerprint text NOT NULL, limits text NOT NULL, request_id text NOT NULL,
  steps integer NOT NULL DEFAULT 0, attempt integer NOT NULL DEFAULT 0, epoch integer NOT NULL DEFAULT 0,
  lease_owner text, lease_expires_at integer, deadline_at integer,
  event_sequence integer NOT NULL DEFAULT 0,
  input_token_upper_bound integer NOT NULL, input_tokens integer, output_tokens integer,
  output_text text NOT NULL DEFAULT '', error_code text, error_message text, result_document_id text,
  created_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)), updated_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)), finished_at integer,
  PRIMARY KEY (workspace_id, id),
  FOREIGN KEY (workspace_id, assignment_id) REFERENCES agent_assignments(workspace_id, id),
  FOREIGN KEY (workspace_id, result_document_id) REFERENCES documents(workspace_id, id)
);
--> statement-breakpoint
CREATE UNIQUE INDEX agent_run_assignment_idx ON agent_runs(workspace_id, assignment_id);
--> statement-breakpoint
CREATE INDEX agent_run_queue_idx ON agent_runs(status, lease_expires_at);
--> statement-breakpoint
CREATE TABLE agent_messages (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  id text NOT NULL, thread_id text NOT NULL, run_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant')), content text NOT NULL,
  created_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)), updated_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  PRIMARY KEY (workspace_id, id),
  FOREIGN KEY (workspace_id, thread_id) REFERENCES agent_threads(workspace_id, id),
  FOREIGN KEY (workspace_id, run_id) REFERENCES agent_runs(workspace_id, id)
);
--> statement-breakpoint
CREATE UNIQUE INDEX agent_message_role_idx ON agent_messages(workspace_id, run_id, role);
--> statement-breakpoint
CREATE TABLE agent_run_events (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, run_id text NOT NULL, sequence integer NOT NULL,
  type text NOT NULL, message text NOT NULL, created_at integer NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  PRIMARY KEY (workspace_id, run_id, sequence),
  FOREIGN KEY (workspace_id, run_id) REFERENCES agent_runs(workspace_id, id)
);
--> statement-breakpoint
-- Every application write invalidates an optimistic read snapshot, including
-- writes from another process or direct administration. This is intentionally
-- one revision per owner instance; no correctness depends on an in-memory lock.
CREATE TABLE bootstrap_database_revision (id integer PRIMARY KEY CHECK (id = 1), version integer NOT NULL);
--> statement-breakpoint
INSERT INTO bootstrap_database_revision (id, version) VALUES (1, 0);
--> statement-breakpoint
CREATE TABLE bootstrap_transaction_guard (
  id integer PRIMARY KEY CHECK (id = 1),
  valid integer NOT NULL CONSTRAINT bootstrap_revision_match CHECK (valid = 1)
);
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_user_insert AFTER INSERT ON "user"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_user_update AFTER UPDATE ON "user"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_user_delete AFTER DELETE ON "user"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_session_insert AFTER INSERT ON "session"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_session_update AFTER UPDATE ON "session"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_session_delete AFTER DELETE ON "session"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_account_insert AFTER INSERT ON "account"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_account_update AFTER UPDATE ON "account"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_account_delete AFTER DELETE ON "account"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_verification_insert AFTER INSERT ON "verification"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_verification_update AFTER UPDATE ON "verification"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_verification_delete AFTER DELETE ON "verification"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_instance_insert AFTER INSERT ON "instance"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_instance_update AFTER UPDATE ON "instance"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_instance_delete AFTER DELETE ON "instance"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_workspaces_insert AFTER INSERT ON "workspaces"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_workspaces_update AFTER UPDATE ON "workspaces"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_workspaces_delete AFTER DELETE ON "workspaces"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_memberships_insert AFTER INSERT ON "memberships"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_memberships_update AFTER UPDATE ON "memberships"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_memberships_delete AFTER DELETE ON "memberships"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_projects_insert AFTER INSERT ON "projects"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_projects_update AFTER UPDATE ON "projects"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_projects_delete AFTER DELETE ON "projects"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_documents_insert AFTER INSERT ON "documents"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_documents_update AFTER UPDATE ON "documents"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_documents_delete AFTER DELETE ON "documents"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_document_versions_insert AFTER INSERT ON "document_versions"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_document_versions_update AFTER UPDATE ON "document_versions"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_document_versions_delete AFTER DELETE ON "document_versions"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_tasks_insert AFTER INSERT ON "tasks"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_tasks_update AFTER UPDATE ON "tasks"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_tasks_delete AFTER DELETE ON "tasks"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_business_tables_insert AFTER INSERT ON "business_tables"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_business_tables_update AFTER UPDATE ON "business_tables"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_business_tables_delete AFTER DELETE ON "business_tables"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_files_insert AFTER INSERT ON "files"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_files_update AFTER UPDATE ON "files"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_files_delete AFTER DELETE ON "files"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_agents_insert AFTER INSERT ON "agents"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_agents_update AFTER UPDATE ON "agents"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_agents_delete AFTER DELETE ON "agents"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_agent_threads_insert AFTER INSERT ON "agent_threads"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_agent_threads_update AFTER UPDATE ON "agent_threads"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_agent_threads_delete AFTER DELETE ON "agent_threads"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_agent_assignments_insert AFTER INSERT ON "agent_assignments"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_agent_assignments_update AFTER UPDATE ON "agent_assignments"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_agent_assignments_delete AFTER DELETE ON "agent_assignments"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_agent_runs_insert AFTER INSERT ON "agent_runs"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_agent_runs_update AFTER UPDATE ON "agent_runs"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_agent_runs_delete AFTER DELETE ON "agent_runs"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_agent_messages_insert AFTER INSERT ON "agent_messages"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_agent_messages_update AFTER UPDATE ON "agent_messages"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_agent_messages_delete AFTER DELETE ON "agent_messages"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_agent_run_events_insert AFTER INSERT ON "agent_run_events"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_agent_run_events_update AFTER UPDATE ON "agent_run_events"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER bootstrap_revision_agent_run_events_delete AFTER DELETE ON "agent_run_events"
BEGIN UPDATE bootstrap_database_revision SET version = version + 1 WHERE id = 1; END;
