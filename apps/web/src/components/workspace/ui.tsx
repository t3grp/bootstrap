"use client";

import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { ArrowRight, X, type LucideIcon } from "lucide-react";

export function Button({
  children,
  className = "",
  variant = "secondary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet" | "danger";
}) {
  return (
    <button
      type="button"
      className={`button button-${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconButton({
  label,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`icon-button ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Dialog({
  open,
  title,
  description,
  children,
  onClose,
  wide = false,
  busy = false,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose(): void;
  wide?: boolean;
  busy?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className={`dialog ${wide ? "dialog-wide" : ""}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClose={() => {
        if (open) onClose();
      }}
    >
      <header className="dialog-heading">
        <div>
          <h2 id={titleId}>{title}</h2>
          {description && <p id={descriptionId}>{description}</p>}
        </div>
        <IconButton label="Close dialog" disabled={busy} onClick={onClose}>
          <X size={18} />
        </IconButton>
      </header>
      {children}
    </dialog>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: string;
  onAction?(): void;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">
        <Icon size={23} strokeWidth={1.5} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && onAction && (
        <Button onClick={onAction}>
          {action}
          <ArrowRight size={14} />
        </Button>
      )}
    </div>
  );
}

export function SectionHeading({
  title,
  children,
  subtitle,
}: {
  title: string;
  children?: ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "violet" | "amber";
}) {
  return <span className={`status-badge status-${tone}`}>{children}</span>;
}

export function FormError({ message }: { message: string | null }) {
  return message ? (
    <p className="form-error" role="alert">
      {message}
    </p>
  ) : null;
}

export function Tabs<T extends string>({
  items,
  active,
  onChange,
  label,
}: {
  items: readonly T[];
  active: T;
  onChange(value: T): void;
  label: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  return (
    <div ref={root} className="tabs" role="tablist" aria-label={label}>
      {items.map((item, index) => (
        <button
          key={item}
          type="button"
          role="tab"
          aria-selected={item === active}
          tabIndex={item === active ? 0 : -1}
          onClick={() => onChange(item)}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
              return;
            event.preventDefault();
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? items.length - 1
                  : (index +
                      (event.key === "ArrowRight" ? 1 : -1) +
                      items.length) %
                    items.length;
            onChange(items[next]);
            root.current
              ?.querySelectorAll<HTMLButtonElement>("[role=tab]")
              [next]?.focus();
          }}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

export function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "B"
  );
}

export function dateLabel(value: string | null | undefined) {
  if (!value) return "No date";
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
        date,
      );
}

export function fileSize(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
