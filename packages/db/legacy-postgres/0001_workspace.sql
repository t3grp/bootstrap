CREATE TABLE "user" (
  id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
  email_verified boolean NOT NULL DEFAULT false, image text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE session (
  id text PRIMARY KEY, expires_at timestamptz NOT NULL, token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  ip_address text, user_agent text, user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX session_user_idx ON session(user_id);
--> statement-breakpoint
CREATE TABLE account (
  id text PRIMARY KEY, account_id text NOT NULL, provider_id text NOT NULL,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  access_token text, refresh_token text, id_token text, access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz, scope text, password text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX account_provider_identity_idx ON account(provider_id, account_id);
--> statement-breakpoint
CREATE TABLE verification (
  id text PRIMARY KEY, identifier text NOT NULL, value text NOT NULL, expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX verification_identifier_idx ON verification(identifier);
--> statement-breakpoint
CREATE TABLE instance (
  id text PRIMARY KEY CHECK (id = 'primary'), owner_id text NOT NULL REFERENCES "user"(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE workspaces (id text PRIMARY KEY, name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
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
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id)
);
--> statement-breakpoint
CREATE TABLE documents (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, id text NOT NULL,
  title text NOT NULL, icon text NOT NULL DEFAULT '', parent_id text, project_id text,
  kind text NOT NULL DEFAULT 'page' CHECK (kind IN ('page', 'note', 'scratchpad')),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0), favorite boolean NOT NULL DEFAULT false,
  full_width boolean NOT NULL DEFAULT false, sort_order integer NOT NULL DEFAULT 0,
  trashed_at timestamptz, trash_batch_id text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  CONSTRAINT documents_parent_workspace_fk FOREIGN KEY (workspace_id, parent_id) REFERENCES documents(workspace_id, id),
  CONSTRAINT documents_project_workspace_fk FOREIGN KEY (workspace_id, project_id) REFERENCES projects(workspace_id, id)
);
--> statement-breakpoint
CREATE TABLE document_versions (
  workspace_id text NOT NULL, document_id text NOT NULL, revision integer NOT NULL CHECK (revision > 0),
  schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version = 1), content jsonb NOT NULL,
  author_id text NOT NULL REFERENCES "user"(id), created_at timestamptz NOT NULL DEFAULT now(),
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
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  CONSTRAINT tasks_project_workspace_fk FOREIGN KEY (workspace_id, project_id) REFERENCES projects(workspace_id, id)
);
--> statement-breakpoint
CREATE TABLE business_tables (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, id text NOT NULL,
  name text NOT NULL, description text NOT NULL DEFAULT '', revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  columns jsonb NOT NULL, rows jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id)
);
--> statement-breakpoint
CREATE TABLE files (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, id text NOT NULL,
  name text NOT NULL, mime_type text NOT NULL, size integer NOT NULL CHECK (size >= 0 AND size <= 10485760),
  storage_key text NOT NULL UNIQUE, sha256 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id)
);
--> statement-breakpoint
CREATE TABLE agents (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, id text NOT NULL,
  name text NOT NULL, role text NOT NULL DEFAULT '', description text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '#6366f1', instructions text NOT NULL DEFAULT '',
  skills jsonb NOT NULL DEFAULT '[]', routines jsonb NOT NULL DEFAULT '[]', memories jsonb NOT NULL DEFAULT '[]',
  file_ids jsonb NOT NULL DEFAULT '[]', table_ids jsonb NOT NULL DEFAULT '[]', page_ids jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id)
);
