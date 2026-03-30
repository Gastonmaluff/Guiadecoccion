import { classNames, getInitials, getStatusTone } from "../lib/utils";

export function Button({
  children,
  variant = "primary",
  size = "md",
  block = false,
  className = "",
  ...props
}) {
  return (
    <button
      className={classNames(
        "button",
        `button--${variant}`,
        `button--${size}`,
        block && "button--block",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "" }) {
  return <section className={classNames("card", className)}>{children}</section>;
}

export function Badge({ children, tone }) {
  return <span className={classNames("badge", `badge--${tone || "muted"}`)}>{children}</span>;
}

export function StatusBadge({ status }) {
  const labels = {
    in_progress: "En proceso",
    ready_for_closure: "Listo para cierre",
    approved: "Aprobado",
    observed: "Observado",
    rejected: "Rechazado",
    completed: "Completo",
    pending: "Pendiente",
  };

  return <Badge tone={getStatusTone(status)}>{labels[status] || status}</Badge>;
}

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {hint ? <span className="field__hint">{hint}</span> : null}
      {children}
    </label>
  );
}

export function Input(props) {
  return <input className="input" {...props} />;
}

export function Select(props) {
  return <select className="input" {...props} />;
}

export function Textarea(props) {
  return <textarea className="input textarea" {...props} />;
}

export function ProgressBar({ value, max }) {
  const safeValue = Math.min(max || 0, value || 0);
  const width = max ? `${(safeValue / max) * 100}%` : "0%";

  return (
    <div className="progress">
      <div className="progress__fill" style={{ width }} />
    </div>
  );
}

export function StatCard({ label, value, tone = "default" }) {
  return (
    <Card className={classNames("stat-card", tone !== "default" && `stat-card--${tone}`)}>
      <span className="stat-card__label">{label}</span>
      <strong className="stat-card__value">{value}</strong>
    </Card>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <Card className="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </Card>
  );
}

export function Avatar({ name }) {
  return <span className="avatar">{getInitials(name)}</span>;
}
