import { useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, Field, Input, Select, StatusBadge } from "../components/common";
import { buildHash, filterLots, formatDateTime } from "../lib/utils";

export function AdminAuditView({ lots, recipes, users }) {
  const [filters, setFilters] = useState({
    date: "",
    operatorId: "all",
    recipeId: "all",
    product: "",
    status: "all",
  });

  const filteredLots = useMemo(() => filterLots(lots, filters), [filters, lots]);
  const flaggedLots = filteredLots.filter((lot) => ["observed", "rejected"].includes(lot.status));
  const visibleLots = flaggedLots.length ? flaggedLots : filteredLots;

  return (
    <div className="stack-xl">
      <Card>
        <div className="section-head">
          <div>
            <span className="eyebrow">Módulo de verificación</span>
            <h2>Auditoría de lotes</h2>
          </div>
          <Badge tone="warning">{flaggedLots.length} con atención</Badge>
        </div>

        <div className="filters-grid">
          <Field label="Fecha">
            <Input
              type="date"
              value={filters.date}
              onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))}
            />
          </Field>

          <Field label="Operario">
            <Select
              value={filters.operatorId}
              onChange={(event) =>
                setFilters((current) => ({ ...current, operatorId: event.target.value }))
              }
            >
              <option value="all">Todos</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Receta">
            <Select
              value={filters.recipeId}
              onChange={(event) => setFilters((current) => ({ ...current, recipeId: event.target.value }))}
            >
              <option value="all">Todas</option>
              {recipes.map((recipe) => (
                <option key={recipe.id} value={recipe.id}>
                  {recipe.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Producto">
            <Input
              value={filters.product}
              onChange={(event) => setFilters((current) => ({ ...current, product: event.target.value }))}
              placeholder="Filtrar producto"
            />
          </Field>

          <Field label="Estado">
            <Select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="all">Todos</option>
              <option value="approved">Aprobado</option>
              <option value="observed">Observado</option>
              <option value="rejected">Rechazado</option>
              <option value="in_progress">En proceso</option>
              <option value="ready_for_closure">Listo para cierre</option>
            </Select>
          </Field>
        </div>
      </Card>

      {visibleLots.length ? (
        <div className="list-stack">
          {visibleLots.map((lot) => (
            <Card key={lot.id} className="list-card">
              <div className="section-head">
                <div>
                  <h3>{lot.batchCode}</h3>
                  <p>
                    {lot.recipeName} · {lot.operatorName}
                  </p>
                </div>
                <StatusBadge status={lot.status} />
              </div>

              <div className="lot-meta-grid">
                <div>
                  <span>Producto</span>
                  <strong>{lot.product}</strong>
                </div>
                <div>
                  <span>Inicio</span>
                  <strong>{formatDateTime(lot.startAt)}</strong>
                </div>
                <div>
                  <span>Verificado por</span>
                  <strong>{lot.verifiedByName || "Pendiente"}</strong>
                </div>
                <div>
                  <span>Estado</span>
                  <strong>{lot.status}</strong>
                </div>
              </div>

              <div className="section-actions">
                <Button variant="secondary" onClick={() => buildHash(`/lote/${lot.id}`)}>
                  Abrir auditoría
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Sin lotes para auditar"
          description="Cuando existan lotes cerrados o con observaciones, aparecerán acá."
        />
      )}
    </div>
  );
}
