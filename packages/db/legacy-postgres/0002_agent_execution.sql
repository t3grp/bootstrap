ALTER TABLE documents ADD COLUMN source_run_id text;
--> statement-breakpoint
CREATE TABLE agent_threads (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  id text NOT NULL, agent_id text NOT NULL, owner_id text NOT NULL REFERENCES "user"(id),
  title text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id)
);
--> statement-breakpoint
CREATE TABLE agent_assignments (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  id text NOT NULL, thread_id text NOT NULL, agent_id text NOT NULL, owner_id text NOT NULL REFERENCES "user"(id),
  operation_key text NOT NULL, payload_hash text NOT NULL, prompt text NOT NULL, output_title text NOT NULL,
  project_id text, status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','in_progress','needs_review','done','blocked','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
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
  agent_configuration jsonb NOT NULL, sources jsonb NOT NULL, context text NOT NULL,
  provider text NOT NULL CHECK (provider IN ('deterministic','openai-compatible')), model text NOT NULL,
  provider_fingerprint text NOT NULL, limits jsonb NOT NULL, request_id text NOT NULL,
  steps integer NOT NULL DEFAULT 0, attempt integer NOT NULL DEFAULT 0, epoch integer NOT NULL DEFAULT 0,
  lease_owner text, lease_expires_at timestamptz, deadline_at timestamptz,
  event_sequence integer NOT NULL DEFAULT 0,
  input_token_upper_bound integer NOT NULL, input_tokens integer, output_tokens integer,
  output_text text NOT NULL DEFAULT '', error_code text, error_message text, result_document_id text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz,
  PRIMARY KEY (workspace_id, id),
  FOREIGN KEY (workspace_id, assignment_id) REFERENCES agent_assignments(workspace_id, id),
  FOREIGN KEY (workspace_id, result_document_id) REFERENCES documents(workspace_id, id)
);
--> statement-breakpoint
CREATE UNIQUE INDEX agent_run_assignment_idx ON agent_runs(workspace_id, assignment_id);
--> statement-breakpoint
CREATE INDEX agent_run_queue_idx ON agent_runs(status, lease_expires_at);
--> statement-breakpoint
ALTER TABLE documents ADD CONSTRAINT documents_source_run_fk FOREIGN KEY (workspace_id, source_run_id) REFERENCES agent_runs(workspace_id, id);
--> statement-breakpoint
CREATE TABLE agent_messages (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  id text NOT NULL, thread_id text NOT NULL, run_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant')), content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  FOREIGN KEY (workspace_id, thread_id) REFERENCES agent_threads(workspace_id, id),
  FOREIGN KEY (workspace_id, run_id) REFERENCES agent_runs(workspace_id, id)
);
--> statement-breakpoint
CREATE UNIQUE INDEX agent_message_role_idx ON agent_messages(workspace_id, run_id, role);
--> statement-breakpoint
CREATE TABLE agent_run_events (
  workspace_id text NOT NULL, run_id text NOT NULL, sequence integer NOT NULL,
  type text NOT NULL, message text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, run_id, sequence),
  FOREIGN KEY (workspace_id, run_id) REFERENCES agent_runs(workspace_id, id)
);
