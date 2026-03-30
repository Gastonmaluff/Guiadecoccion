import { Button, Card, EmptyState, StatCard, StatusBadge } from "../components/common";
import { formatDateTime, formatDuration } from "../lib/utils";

export function DashboardView({ profile, lots, metrics, activeLots, onNavigate }) {
  const lastLots = lots.slice(0, 4);

  return (
    <div className="stack-xl">
      <section className="hero-panel hero-panel--compact">
        <div>
          <span className="eyebrow">
            {profile.role === "admin" ? "Centro de control" : "Operación en línea"}
          </span>
          <h2>
            {profile.role === "admin"
              ? "Visión completa de producción, recetas y auditoría."
              : "Tus lotes activos, historial y producción guiada en una sola vista."}
          </h2>
          <p>
            El sistema registra checklist inicial, tiempo por paso, fotos de evidencia y desvíos
            contra objetivo.
          </p>
        </div>
        <div className="hero-actions hero-actions--inline">
          <Button size="lg" onClick={() => onNavigate("/produccion/nuevo")}>
            Arrancar producción
          </Button>
          {profile.role === "admin" ? (
            <Button variant="secondary" size="lg" onClick={() => onNavigate("/admin/recetas")}>
              Configurar recetas
            </Button>
          ) : null}
        </div>
      </section>

      <div className="stats-grid">
        <StatCard label="Lotes creados" value={metrics.total} />
        <StatCard label="En proceso" value={metrics.inProgress} tone="info" />
        <StatCard label="Aprobados" value={metrics.approved} tone="success" />
        <StatCard label="Observados" value={metrics.observed} tone="warning" />
        <StatCard label="Rechazados" value={metrics.rejected} tone="danger" />
        <StatCard label="Tiempo promedio" value={formatDuration(metrics.avgDuration)} />
      </div>

      <div className="content-grid">
        <Card>
          <div className="section-head">
            <h3>Lotes activos</h3>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("/historial")}>
              Ver historial
            </Button>
          </div>

          {activeLots.length ? (
            <div className="list-stack">
              {activeLots.map((lot) => (
                <button
                  key={lot.id}
                  className="list-item"
                  onClick={() => onNavigate(`/ejecucion/${lot.id}`)}
                >
                  <div>
                    <strong>{lot.batchCode}</strong>
                    <p>
                      {lot.product} · {lot.flavor} · {lot.operatorName}
                    </p>
                    <small>Inicio: {formatDateTime(lot.startAt)}</small>
                  </div>
                  <StatusBadge status={lot.status} />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sin lotes activos"
              description="Cuando arranques una producción, acá vas a ver el progreso en tiempo real."
            />
          )}
        </Card>

        <Card>
          <div className="section-head">
            <h3>Últimos lotes</h3>
          </div>

          {lastLots.length ? (
            <div className="list-stack">
              {lastLots.map((lot) => (
                <button
                  key={lot.id}
                  className="list-item"
                  onClick={() => onNavigate(`/lote/${lot.id}`)}
                >
                  <div>
                    <strong>{lot.batchCode}</strong>
                    <p>
                      {lot.recipeName} · {lot.shift}
                    </p>
                  </div>
                  <StatusBadge status={lot.status} />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Todavía no hay lotes"
              description="Creá el primer lote para empezar a capturar trazabilidad."
            />
          )}
        </Card>
      </div>
    </div>
  );
}
