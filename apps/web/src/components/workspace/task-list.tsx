"use client";

import { useState, type FormEvent } from "react";
import { Check, Circle, CircleDot, Plus, Trash2 } from "lucide-react";
import type {
  Agent,
  Project,
  Task,
  WorkspaceCommand,
  WorkspaceSnapshot,
} from "@bootstrap/core";
import {
  Button,
  Dialog,
  FormError,
  IconButton,
  StatusBadge,
  dateLabel,
} from "./ui";

type Mutate = (command: WorkspaceCommand) => Promise<WorkspaceSnapshot>;

export function TaskList({
  tasks,
  agents,
  projects,
  mutate,
  compact = false,
  projectId = null,
  title = "Tasks",
  today = false,
}: {
  tasks: Task[];
  agents: Agent[];
  projects: Project[];
  mutate: Mutate;
  compact?: boolean;
  projectId?: string | null;
  title?: string;
  today?: boolean;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Task | null>(null);
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const openTasks = tasks.filter((task) => task.status !== "done");
  const completed = tasks.filter((task) => task.status === "done");
  const visible = [...openTasks, ...(showCompleted ? completed : [])];
  async function add(event: FormEvent) {
    event.preventDefault();
    if (!newTitle.trim() || adding) return;
    setAdding(true);
    setError(null);
    try {
      await mutate({
        type: "task.create",
        title: newTitle.trim(),
        projectId,
        assignee: "me",
        ...(today ? { dueDate: todayKey() } : {}),
      });
      setNewTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create task.");
    } finally {
      setAdding(false);
    }
  }
  async function toggle(task: Task) {
    setBusyIds((value) => [...value, task.id]);
    setError(null);
    try {
      await mutate({
        type: "task.update",
        id: task.id,
        patch: { status: task.status === "done" ? "todo" : "done" },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update task.");
    } finally {
      setBusyIds((value) => value.filter((id) => id !== task.id));
    }
  }
  return (
    <section
      className={`task-list ${compact ? "task-list-compact" : ""}`}
      aria-label={title}
    >
      <form onSubmit={add} className="task-capture">
        <Plus size={16} />
        <input
          aria-label={`Add a task${projectId ? " to this project" : ""}`}
          placeholder="What needs to get done?"
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          maxLength={200}
        />
        <button
          type="submit"
          disabled={adding || !newTitle.trim()}
          aria-label="Create task"
        >
          {adding ? "Adding…" : "Add"}
        </button>
      </form>
      <FormError message={error} />
      <div className="task-rows">
        {visible.map((task) => (
          <div
            key={task.id}
            className={`task-row ${task.status === "done" ? "task-done" : ""}`}
          >
            <button
              type="button"
              className="task-check"
              aria-label={`${task.status === "done" ? "Reopen" : "Complete"} ${task.title}`}
              disabled={busyIds.includes(task.id)}
              onClick={() => void toggle(task)}
            >
              {task.status === "done" ? (
                <Check size={13} />
              ) : task.status === "in_progress" ? (
                <CircleDot size={17} />
              ) : (
                <Circle size={17} />
              )}
            </button>
            <button
              type="button"
              className="task-title"
              onClick={() => setSelected(task)}
            >
              <span>{task.title}</span>
              {!compact && task.description && (
                <small>{task.description}</small>
              )}
            </button>
            {task.dueDate && (
              <span
                className={`task-date ${task.status !== "done" && task.dueDate < todayKey() ? "overdue" : ""}`}
              >
                {dateLabel(task.dueDate)}
              </span>
            )}
            {!compact && (
              <span className="task-assignee">
                {task.assignee === "me"
                  ? "Me"
                  : agents.find((agent) => agent.id === task.assignee)?.name ||
                    "Unassigned"}
              </span>
            )}
            {!compact && task.priority === "high" && (
              <StatusBadge tone="amber">High</StatusBadge>
            )}
          </div>
        ))}
      </div>
      {visible.length === 0 && (
        <div className="task-empty">
          {completed.length
            ? "All caught up."
            : "A little clarity for your next step."}
          <span>
            {completed.length
              ? "Your completed tasks are saved below."
              : "Add a task above. You can assign it and set a due date."}
          </span>
        </div>
      )}
      {completed.length > 0 && (
        <button
          type="button"
          className="text-button completed-toggle"
          aria-expanded={showCompleted}
          onClick={() => setShowCompleted(!showCompleted)}
        >
          {showCompleted ? "Hide" : "Show"} {completed.length} completed
        </button>
      )}
      <TaskDialog
        task={selected}
        agents={agents}
        projects={projects}
        mutate={mutate}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}

function TaskDialog({
  task,
  agents,
  projects,
  mutate,
  onClose,
}: {
  task: Task | null;
  agents: Agent[];
  projects: Project[];
  mutate: Mutate;
  onClose(): void;
}) {
  return (
    <Dialog open={Boolean(task)} title="Task details" onClose={onClose}>
      {task && (
        <TaskForm
          key={task.id}
          task={task}
          agents={agents}
          projects={projects}
          mutate={mutate}
          onClose={onClose}
        />
      )}
    </Dialog>
  );
}

function TaskForm({
  task,
  agents,
  projects,
  mutate,
  onClose,
}: {
  task: Task;
  agents: Agent[];
  projects: Project[];
  mutate: Mutate;
  onClose(): void;
}) {
  const [draft, setDraft] = useState(task);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await mutate({
        type: "task.update",
        id: task.id,
        patch: {
          title: draft.title.trim(),
          description: draft.description,
          status: draft.status,
          priority: draft.priority,
          assignee: draft.assignee,
          projectId: draft.projectId,
          dueDate: draft.dueDate || null,
        },
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save task.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (
      !window.confirm(`Delete “${task.title}”? This task cannot be restored.`)
    )
      return;
    setBusy(true);
    setError(null);
    try {
      await mutate({ type: "task.delete", id: task.id });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete task.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form-layout" onSubmit={save}>
      <label>
        Task
        <input
          autoFocus
          required
          maxLength={200}
          value={draft.title}
          onChange={(event) =>
            setDraft({ ...draft, title: event.target.value })
          }
        />
      </label>
      <label>
        Description
        <textarea
          rows={3}
          value={draft.description}
          onChange={(event) =>
            setDraft({ ...draft, description: event.target.value })
          }
        />
      </label>
      <div className="form-columns">
        <label>
          Status
          <select
            value={draft.status}
            onChange={(event) =>
              setDraft({
                ...draft,
                status: event.target.value as Task["status"],
              })
            }
          >
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </select>
        </label>
        <label>
          Priority
          <select
            value={draft.priority}
            onChange={(event) =>
              setDraft({
                ...draft,
                priority: event.target.value as Task["priority"],
              })
            }
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
      </div>
      <div className="form-columns">
        <label>
          Assigned to
          <select
            value={draft.assignee}
            onChange={(event) =>
              setDraft({ ...draft, assignee: event.target.value })
            }
          >
            <option value="me">Me</option>
            <option value="unassigned">Unassigned</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} · configured
              </option>
            ))}
          </select>
        </label>
        <label>
          Due date
          <input
            type="date"
            value={draft.dueDate || ""}
            onChange={(event) =>
              setDraft({ ...draft, dueDate: event.target.value || null })
            }
          />
        </label>
      </div>
      <label>
        Project
        <select
          value={draft.projectId || ""}
          onChange={(event) =>
            setDraft({ ...draft, projectId: event.target.value || null })
          }
        >
          <option value="">No project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      {agents.some((agent) => agent.id === draft.assignee) && (
        <p className="form-hint">
          Agent assignments are recorded. Execution will be available when the
          agent runtime is connected.
        </p>
      )}
      <FormError message={error} />
      <footer className="form-footer">
        <IconButton
          label="Delete task"
          disabled={busy}
          className="danger-text"
          onClick={() => void remove()}
        >
          <Trash2 size={16} />
        </IconButton>
        <div className="form-footer-actions">
          <Button disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={busy || !draft.title.trim()}
          >
            {busy ? "Saving…" : "Save task"}
          </Button>
        </div>
      </footer>
    </form>
  );
}

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
