import { useMemo, useState } from "react";
import { Button, Card, EmptyState, Field, Input, Select, StatusBadge } from "../components/common";
import { buildHash, filterLots, formatDateTime, formatDuration } from "../lib/utils";

export function HistoryView({ lots, recipes, users, profile }) {
  const [filters, setFilters] = useState({
    date: "",
    operatorId: "all",
    recipeId: "all",
    product: "",
    status: "all",
  });

  const filteredLots = useMemo(() => filterLots(lots, filters), [filters, lots]);
  const visibleUsers = profile.role === "admin" ? users : [profile];

  return (
    <div className="stack-xl">
      <Card>
        <div className="section-head">
          <div>
            <span className="eyebrow">Historial y trazabilidad</span>
            <h2>Lotes registrados</h2>
          </div>
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
              {visibleUsers.map((user) => (
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
              placeholder="Buscar producto"
            />
          </Field>

          <Field label="Estado">
            <Select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="all">Todos</option>
              <option value="in_progress">En proceso</option>
              <option value="ready_for_closure">Listo para cierre</option>
              <option value="approved">Aprobado</option>
              <option value="observed">Observado</option>
              <option value="rejected">Rechazado</option>
            </Select>
          </Field>
        </div>
      </Card>

      {filteredLots.length ? (
        <div className="list-stack">
          {filteredLots.map((lot) => (
            <Card key={lot.id} className="list-card">
              <div className="section-head">
                <div>
                  <h3>{lot.batchCode}</h3>
                  <p>
                    {lot.product} · {lot.flavor} · {lot.operatorName}
                  </p>
                </div>
                <StatusBadge status={lot.status} />
              </div>

              <div className="lot-meta-grid">
                <div>
                  <span>Receta</span>
                  <strong>{lot.recipeName}</strong>
                </div>
                <div>
                  <span>Inicio</span>
                  <strong>{formatDateTime(lot.startAt)}</strong>
                </div>
                <div>
                  <span>Tiempo total</span>
                  <strong>{formatDuration(lot.totalDurationMinutes)}</strong>
                </div>
                <div>
                  <span>Turno</span>
                  <strong>{lot.shift}</strong>
                </div>
              </div>

              <div className="section-actions">
                {["in_progress", "ready_for_closure"].includes(lot.status) ? (
                  <Button variant="secondary" onClick={() => buildHash(`/ejecucion/${lot.id}`)}>
                    Continuar producción
                  </Button>
                ) : null}
                <Button variant="ghost" onClick={() => buildHash(`/lote/${lot.id}`)}>
                  Ver detalle
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Sin resultados"
          description="No encontramos lotes para esos filtros. Probá ampliar la búsqueda."
        />
      )}
    </div>
  );
}
