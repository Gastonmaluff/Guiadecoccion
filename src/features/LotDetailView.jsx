import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, Field, ProgressBar, StatusBadge, Textarea } from "../components/common";
import { reviewLot, subscribeLotDetail } from "../lib/data";
import {
  CHECKLIST_ITEMS,
  formatDateTime,
  formatDuration,
  getStatusTone,
} from "../lib/utils";

export function LotDetailView({ lotId, profile }) {
  const [lot, setLot] = useState(null);
  const [steps, setSteps] = useState([]);
  const [review, setReview] = useState({
    status: "approved",
    verificationObservation: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return subscribeLotDetail(lotId, ({ lot: lotData, steps: stepData }) => {
      setLot(lotData);
      setSteps(stepData);
      setReview((current) => ({ ...current, status: lotData?.status || "approved" }));
    });
  }, [lotId]);

  const completedCount = useMemo(
    () => steps.filter((step) => ["completed", "observed"].includes(step.status)).length,
    [steps],
  );

  async function handleReviewSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await reviewLot({ lotId, payload: review, profile });
    } catch {
      setError("No se pudo guardar la observación de auditoría.");
    } finally {
      setSaving(false);
    }
  }

  if (!lot) {
    return <div className="splash">Cargando detalle del lote...</div>;
  }

  return (
    <div className="stack-xl">
      <Card>
        <div className="section-head">
          <div>
            <span className="eyebrow">Detalle de lote</span>
            <h2>
              {lot.batchCode} · {lot.recipeName}
            </h2>
            <p>
              {lot.product} · {lot.flavor} · {lot.operatorName}
            </p>
          </div>
          <StatusBadge status={lot.status} />
        </div>

        <div className="lot-meta-grid">
          <div>
            <span>Inicio</span>
            <strong>{formatDateTime(lot.startAt)}</strong>
          </div>
          <div>
            <span>Cierre</span>
            <strong>{formatDateTime(lot.closedAt)}</strong>
          </div>
          <div>
            <span>Tiempo total</span>
            <strong>{formatDuration(lot.totalDurationMinutes)}</strong>
          </div>
          <div>
            <span>Responsable</span>
            <strong>{lot.operatorName}</strong>
          </div>
        </div>

        <ProgressBar value={completedCount} max={steps.length} />
      </Card>

      <div className="content-grid">
        <Card>
          <div className="section-head">
            <h3>Checklist inicial</h3>
          </div>
          <div className="checklist-grid">
            {CHECKLIST_ITEMS.map((item) => (
              <div key={item.key} className="check-row check-row--static">
                <span>{item.label}</span>
                {lot.checklist?.[item.key] ? <Badge tone="success">OK</Badge> : <Badge tone="danger">Falta</Badge>}
              </div>
            ))}
          </div>

          {lot.observationsInitial ? (
            <div className="callout">
              <strong>Observaciones iniciales</strong>
              <p>{lot.observationsInitial}</p>
            </div>
          ) : null}
        </Card>

        <Card>
          <div className="section-head">
            <h3>Cierre y verificación</h3>
          </div>
          <div className="lot-meta-grid">
            <div>
              <span>Cantidad producida</span>
              <strong>{lot.finalQuantity ?? "Sin cargar"}</strong>
            </div>
            <div>
              <span>Merma</span>
              <strong>{lot.waste ?? "Sin cargar"}</strong>
            </div>
            <div>
              <span>Firma operario</span>
              <strong>{lot.operatorSignature || "Pendiente"}</strong>
            </div>
            <div>
              <span>Confirmación admin</span>
              <strong>{lot.adminConfirmation || "Pendiente"}</strong>
            </div>
          </div>

          {lot.finalObservations ? (
            <div className="callout">
              <strong>Observaciones finales</strong>
              <p>{lot.finalObservations}</p>
            </div>
          ) : null}

          {lot.verificationObservation ? (
            <div className="callout">
              <strong>Observación de verificación</strong>
              <p>{lot.verificationObservation}</p>
            </div>
          ) : null}
        </Card>
      </div>

      <Card>
        <div className="section-head">
          <div>
            <span className="eyebrow">Línea de tiempo</span>
            <h3>Secuencia completa del proceso</h3>
          </div>
        </div>

        {steps.length ? (
          <div className="timeline">
            {steps.map((step) => (
              <div key={step.id} className="timeline__item">
                <div className="timeline__dot" />
                <div className="timeline__content timeline__content--wide">
                  <div className="section-head">
                    <div>
                      <strong>
                        {step.order}. {step.title}
                      </strong>
                      <p>{step.description}</p>
                    </div>
                    <div className="badge-row">
                      <StatusBadge status={step.status} />
                      {step.numericWithinRange === false ? (
                        <Badge tone={getStatusTone("outside_range")}>Fuera de rango</Badge>
                      ) : null}
                      {step.overExpectedTime ? <Badge tone="warning">Excedió tiempo</Badge> : null}
                    </div>
                  </div>

                  <div className="lot-meta-grid">
                    <div>
                      <span>Inicio</span>
                      <strong>{formatDateTime(step.startedAt)}</strong>
                    </div>
                    <div>
                      <span>Fin</span>
                      <strong>{formatDateTime(step.completedAt)}</strong>
                    </div>
                    <div>
                      <span>Tiempo consumido</span>
                      <strong>{formatDuration(step.durationMinutes)}</strong>
                    </div>
                    <div>
                      <span>Valor cargado</span>
                      <strong>
                        {step.numericValue ?? "Sin dato"} {step.unit || ""}
                      </strong>
                    </div>
                  </div>

                  {step.observations ? (
                    <div className="callout">
                      <strong>Observaciones</strong>
                      <p>{step.observations}</p>
                    </div>
                  ) : null}

                  {step.photos?.length ? (
                    <div className="photo-grid photo-grid--audit">
                      {step.photos.map((photo) => (
                        <a key={photo.path} href={photo.downloadUrl} target="_blank" rel="noreferrer">
                          <img src={photo.downloadUrl} alt={photo.name} />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="muted-note">Sin fotos adjuntas en este paso.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Sin pasos" description="Todavía no hay eventos de trazabilidad para este lote." />
        )}
      </Card>

      {profile.role === "admin" ? (
        <Card>
          <div className="section-head">
            <div>
              <span className="eyebrow">Verificación / auditoría</span>
              <h3>Revisión del responsable</h3>
            </div>
          </div>

          <form className="stack-lg" onSubmit={handleReviewSubmit}>
            <Field label="Estado de auditoría">
              <select
                className="input"
                value={review.status}
                onChange={(event) => setReview((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="approved">Aprobado</option>
                <option value="observed">Observado</option>
                <option value="rejected">Rechazado</option>
              </select>
            </Field>

            <Field label="Observación de verificación">
              <Textarea
                value={review.verificationObservation}
                onChange={(event) =>
                  setReview((current) => ({ ...current, verificationObservation: event.target.value }))
                }
                placeholder="Ej. El paso 4 excedió tiempo esperado, requiere recalibrar olla."
              />
            </Field>

            {error ? <div className="error-banner">{error}</div> : null}

            <Button size="lg" block disabled={saving}>
              {saving ? "Guardando revisión..." : "Guardar revisión"}
            </Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
