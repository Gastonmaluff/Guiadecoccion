import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  ProgressBar,
  StatusBadge,
  Textarea,
} from "../components/common";
import {
  closeLot,
  completeLotStep,
  ensureActiveStepStarted,
  subscribeLotDetail,
} from "../lib/data";
import {
  evaluateNumericValue,
  formatDateTime,
  formatDuration,
  getStatusTone,
  toNumberOrNull,
} from "../lib/utils";
import { uploadLotStepPhotos } from "../lib/storage";

const closureInitialState = {
  finalQuantity: "",
  waste: "",
  finalObservations: "",
  status: "approved",
  operatorSignature: "",
  adminConfirmation: "",
};

export function ProductionRunView({ lotId, profile }) {
  const [lot, setLot] = useState(null);
  const [steps, setSteps] = useState([]);
  const [numericValue, setNumericValue] = useState("");
  const [observations, setObservations] = useState("");
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [closure, setClosure] = useState({
    ...closureInitialState,
    operatorSignature: profile.fullName,
    adminConfirmation: profile.role === "admin" ? profile.fullName : "",
  });

  useEffect(() => {
    return subscribeLotDetail(lotId, ({ lot: lotData, steps: stepData }) => {
      setLot(lotData);
      setSteps(stepData);
    });
  }, [lotId]);

  const activeStep = useMemo(
    () => steps.find((step) => ["in_progress", "pending"].includes(step.status)) || null,
    [steps],
  );
  const nextStep = useMemo(() => {
    if (!activeStep) return null;
    return steps.find((step) => step.order === activeStep.order + 1) || null;
  }, [activeStep, steps]);
  const completedCount = steps.filter((step) => ["completed", "observed"].includes(step.status)).length;

  useEffect(() => {
    if (lot && activeStep) {
      ensureActiveStepStarted(lot.id, activeStep).catch(() => {});
    }
  }, [activeStep, lot]);

  useEffect(() => {
    setNumericValue("");
    setObservations("");
    setPhotos([]);
    setError("");
  }, [activeStep?.id]);

  const numericEvaluation = activeStep
    ? evaluateNumericValue(numericValue, activeStep.targetValue, activeStep.tolerance)
    : { withinRange: null, min: null, max: null };

  async function handlePhotoUpload(event) {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length || !activeStep || !lot) return;

    if (!navigator.onLine) {
      setError("Sin conexión: la foto no puede subirse ahora. Reintentá cuando vuelva internet.");
      return;
    }

    try {
      setUploading(true);
      setError("");
      const uploaded = await uploadLotStepPhotos({
        lotId: lot.id,
        stepId: activeStep.id,
        files: selectedFiles,
        userId: profile.id,
      });

      setPhotos((current) => [...current, ...uploaded]);
    } catch {
      setError("No se pudieron subir las fotos. Probá nuevamente.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handleCompleteStep() {
    if (!lot || !activeStep) return;

    if (activeStep.requiresPhoto && !photos.length) {
      setError("Este paso exige evidencia fotográfica.");
      return;
    }

    if (activeStep.requiresNumeric && toNumberOrNull(numericValue) == null) {
      setError("Este paso exige un dato numérico.");
      return;
    }

    if (numericEvaluation.withinRange === false && activeStep.outOfRangePolicy === "block") {
      setError("El valor está fuera de rango y este paso bloquea el avance.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await completeLotStep({
        lot,
        step: activeStep,
        nextStep,
        profile,
        payload: {
          numericValue,
          observations,
          photos,
        },
      });
    } catch {
      setError("No se pudo completar el paso. Si estás offline, la app reintentará al volver internet.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCloseLot(event) {
    event.preventDefault();
    if (!lot) return;

    try {
      setSaving(true);
      setError("");
      await closeLot({ lot, payload: closure, profile });
    } catch {
      setError("No se pudo cerrar el lote.");
    } finally {
      setSaving(false);
    }
  }

  if (!lot) {
    return <div className="splash">Cargando lote...</div>;
  }

  if (!steps.length) {
    return <EmptyState title="Lote sin pasos" description="La receta de este lote no tiene pasos disponibles." />;
  }

  const allStepsCompleted = !activeStep;

  return (
    <div className="stack-xl">
      <Card>
        <div className="section-head">
          <div>
            <span className="eyebrow">Ejecución guiada</span>
            <h2>
              {lot.batchCode} · {lot.product}
            </h2>
            <p>
              {lot.recipeName} · {lot.flavor} · {lot.operatorName} · {lot.mode === "learning"
                ? "Modo aprendizaje"
                : "Modo experto"}
            </p>
          </div>
          <StatusBadge status={lot.status} />
        </div>

        <div className="lot-summary">
          <div>
            <span>Inicio</span>
            <strong>{formatDateTime(lot.startAt)}</strong>
          </div>
          <div>
            <span>Progreso</span>
            <strong>
              {completedCount}/{steps.length} pasos
            </strong>
          </div>
          <div>
            <span>Tiempo total</span>
            <strong>{formatDuration(lot.totalDurationMinutes)}</strong>
          </div>
        </div>

        <ProgressBar value={completedCount} max={steps.length} />
      </Card>

      {!allStepsCompleted ? (
        <div className="content-grid">
          <Card className="step-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Paso actual</span>
                <h3>
                  {activeStep.order}. {activeStep.title}
                </h3>
              </div>
              <div className="badge-row">
                {activeStep.critical ? <Badge tone="warning">Crítico</Badge> : null}
                {activeStep.requiresPhoto ? <Badge tone="info">Foto obligatoria</Badge> : null}
                {activeStep.requiresNumeric ? <Badge tone="info">Dato requerido</Badge> : null}
              </div>
            </div>

            <p>{lot.mode === "expert" && activeStep.expertSummary ? activeStep.expertSummary : activeStep.description}</p>

            {activeStep.helpText && lot.mode === "learning" ? (
              <div className="info-banner">{activeStep.helpText}</div>
            ) : null}

            {activeStep.referencePhotoUrl ? (
              <div className="reference-box">
                <span>Foto de referencia</span>
                <img src={activeStep.referencePhotoUrl} alt={activeStep.title} />
              </div>
            ) : null}

            {activeStep.evidenceText ? (
              <div className="callout">
                <strong>Evidencia requerida</strong>
                <p>{activeStep.evidenceText}</p>
              </div>
            ) : null}

            {activeStep.requiresNumeric ? (
              <Field
                label={`Valor medido${activeStep.unit ? ` (${activeStep.unit})` : ""}`}
                hint={
                  activeStep.targetValue != null && activeStep.tolerance != null
                    ? `Objetivo ${activeStep.targetValue} ± ${activeStep.tolerance}`
                    : "Ingresá el valor medido por el operario"
                }
              >
                <Input
                  type="number"
                  step="0.01"
                  value={numericValue}
                  onChange={(event) => setNumericValue(event.target.value)}
                />
              </Field>
            ) : null}

            {activeStep.requiresNumeric && numericEvaluation.withinRange != null ? (
              <div
                className={`range-indicator ${
                  numericEvaluation.withinRange ? "is-success" : "is-danger"
                }`}
              >
                {numericEvaluation.withinRange ? "Dentro de rango" : "Fuera de rango"}
              </div>
            ) : null}

            <Field label="Observaciones del paso">
              <Textarea
                value={observations}
                onChange={(event) => setObservations(event.target.value)}
                placeholder="Anotar desvíos, observaciones o contexto del operario."
              />
            </Field>

            <Field label="Evidencia fotográfica" hint="Podés sacar foto o seleccionar desde galería.">
              <Input
                type="file"
                accept="image/*"
                capture="environment"
                multiple={activeStep.critical}
                onChange={handlePhotoUpload}
              />
            </Field>

            {photos.length ? (
              <div className="photo-grid">
                {photos.map((photo) => (
                  <a key={photo.path} href={photo.downloadUrl} target="_blank" rel="noreferrer">
                    <img src={photo.downloadUrl} alt={photo.name} />
                  </a>
                ))}
              </div>
            ) : null}

            {error ? <div className="error-banner">{error}</div> : null}

            <Button size="lg" block onClick={handleCompleteStep} disabled={uploading || saving}>
              {uploading ? "Subiendo evidencia..." : saving ? "Guardando paso..." : "Completar paso"}
            </Button>
          </Card>

          <Card>
            <div className="section-head">
              <h3>Secuencia del lote</h3>
            </div>
            <div className="timeline">
              {steps.map((step) => (
                <div key={step.id} className="timeline__item">
                  <div className="timeline__dot" />
                  <div className="timeline__content">
                    <strong>
                      {step.order}. {step.title}
                    </strong>
                    <div className="badge-row">
                      <StatusBadge status={step.status} />
                      {step.numericWithinRange === false ? (
                        <Badge tone={getStatusTone("outside_range")}>Fuera de rango</Badge>
                      ) : null}
                    </div>
                    <small>
                      {step.completedAt
                        ? `Completado: ${formatDateTime(step.completedAt)}`
                        : "Pendiente o en proceso"}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <Card>
          <div className="section-head">
            <div>
              <span className="eyebrow">Cierre de lote</span>
              <h3>Registrar resultado final</h3>
            </div>
            <StatusBadge status={lot.status} />
          </div>

          <form className="stack-lg" onSubmit={handleCloseLot}>
            <div className="form-grid">
              <Field label="Cantidad producida">
                <Input
                  type="number"
                  step="0.01"
                  value={closure.finalQuantity}
                  onChange={(event) =>
                    setClosure((current) => ({ ...current, finalQuantity: event.target.value }))
                  }
                  required
                />
              </Field>

              <Field label="Merma">
                <Input
                  type="number"
                  step="0.01"
                  value={closure.waste}
                  onChange={(event) => setClosure((current) => ({ ...current, waste: event.target.value }))}
                  required
                />
              </Field>

              <Field label="Estado final">
                <select
                  className="input"
                  value={closure.status}
                  onChange={(event) => setClosure((current) => ({ ...current, status: event.target.value }))}
                >
                  <option value="approved">Aprobado</option>
                  <option value="observed">Observado</option>
                  <option value="rejected">Rechazado</option>
                </select>
              </Field>

              <Field label="Firma simple del operario">
                <Input
                  value={closure.operatorSignature}
                  onChange={(event) =>
                    setClosure((current) => ({ ...current, operatorSignature: event.target.value }))
                  }
                  required
                />
              </Field>
            </div>

            {profile.role === "admin" ? (
              <Field label="Confirmación final del responsable">
                <Input
                  value={closure.adminConfirmation}
                  onChange={(event) =>
                    setClosure((current) => ({ ...current, adminConfirmation: event.target.value }))
                  }
                />
              </Field>
            ) : null}

            <Field label="Observaciones finales">
              <Textarea
                value={closure.finalObservations}
                onChange={(event) =>
                  setClosure((current) => ({ ...current, finalObservations: event.target.value }))
                }
              />
            </Field>

            {error ? <div className="error-banner">{error}</div> : null}

            <Button size="lg" block disabled={saving}>
              {saving ? "Cerrando lote..." : "Cerrar lote"}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
