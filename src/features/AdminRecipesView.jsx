import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Select,
  Textarea,
} from "../components/common";
import {
  deleteRecipeStep,
  fetchRecipeSteps,
  saveRecipe,
  saveRecipeStep,
} from "../lib/data";
import { createEmptyRecipeStep, sortByOrder } from "../lib/utils";
import { uploadRecipeReferencePhoto } from "../lib/storage";

const emptyRecipe = {
  id: "",
  name: "",
  product: "",
  version: "1.0",
  active: true,
  description: "",
};

export function AdminRecipesView({ recipes, profile }) {
  const [selectedRecipeId, setSelectedRecipeId] = useState(recipes[0]?.id || "");
  const [recipeForm, setRecipeForm] = useState(emptyRecipe);
  const [steps, setSteps] = useState([]);
  const [stepForm, setStepForm] = useState(createEmptyRecipeStep(1));
  const [editingStepId, setEditingStepId] = useState("");
  const [referenceFile, setReferenceFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selectedRecipe = useMemo(
    () => recipes.find((recipe) => recipe.id === selectedRecipeId) || null,
    [recipes, selectedRecipeId],
  );

  useEffect(() => {
    if (selectedRecipe) {
      setRecipeForm({
        id: selectedRecipe.id,
        name: selectedRecipe.name,
        product: selectedRecipe.product,
        version: selectedRecipe.version,
        active: selectedRecipe.active,
        description: selectedRecipe.description || "",
      });

      fetchRecipeSteps(selectedRecipe.id).then((loadedSteps) => {
        setSteps(loadedSteps);
        setStepForm(createEmptyRecipeStep((loadedSteps.at(-1)?.order || 0) + 1));
      });
    } else {
      setRecipeForm(emptyRecipe);
      setSteps([]);
      setStepForm(createEmptyRecipeStep(1));
    }
  }, [selectedRecipe]);

  async function handleSaveRecipe(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const recipeId = await saveRecipe(recipeForm.id, recipeForm, profile);
      setSelectedRecipeId(recipeId);
    } catch {
      setError("No se pudo guardar la receta.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveStep(event) {
    event.preventDefault();
    if (!selectedRecipeId) {
      setError("Guardá primero la receta para poder agregar pasos.");
      return;
    }

    try {
      setBusy(true);
      setError("");

      const effectiveStepId =
        editingStepId || `step-${Number(stepForm.order || steps.length + 1).toString().padStart(2, "0")}`;
      let referenceMeta = {
        referencePhotoUrl: stepForm.referencePhotoUrl || "",
        referencePhotoPath: stepForm.referencePhotoPath || "",
      };

      if (referenceFile) {
        const uploaded = await uploadRecipeReferencePhoto({
          recipeId: selectedRecipeId,
          stepId: effectiveStepId,
          file: referenceFile,
        });
        referenceMeta = {
          referencePhotoUrl: uploaded.downloadUrl,
          referencePhotoPath: uploaded.path,
        };
      }

      await saveRecipeStep(
        selectedRecipeId,
        editingStepId || effectiveStepId,
        {
          ...stepForm,
          ...referenceMeta,
        },
        profile,
      );

      const refreshed = await fetchRecipeSteps(selectedRecipeId);
      setSteps(refreshed);
      setEditingStepId("");
      setReferenceFile(null);
      setStepForm(createEmptyRecipeStep((refreshed.at(-1)?.order || 0) + 1));
    } catch {
      setError("No se pudo guardar el paso.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteStep(stepId) {
    try {
      setBusy(true);
      await deleteRecipeStep(selectedRecipeId, stepId, profile);
      const refreshed = await fetchRecipeSteps(selectedRecipeId);
      setSteps(refreshed);
      setEditingStepId("");
      setStepForm(createEmptyRecipeStep((refreshed.at(-1)?.order || 0) + 1));
    } catch {
      setError("No se pudo eliminar el paso.");
    } finally {
      setBusy(false);
    }
  }

  function startNewRecipe() {
    setSelectedRecipeId("");
    setRecipeForm(emptyRecipe);
    setSteps([]);
    setStepForm(createEmptyRecipeStep(1));
    setEditingStepId("");
    setReferenceFile(null);
  }

  function editStep(step) {
    setEditingStepId(step.id);
    setStepForm({
      ...createEmptyRecipeStep(step.order),
      ...step,
      targetValue: step.targetValue ?? "",
      tolerance: step.tolerance ?? "",
      expectedMinutes: step.expectedMinutes ?? "",
    });
  }

  return (
    <div className="stack-xl">
      <Card>
        <div className="section-head">
          <div>
            <span className="eyebrow">Módulo de configuración</span>
            <h2>Recetas y pasos</h2>
          </div>
          <Button variant="secondary" onClick={startNewRecipe}>
            Nueva receta
          </Button>
        </div>

        <div className="recipes-shell">
          <aside className="recipe-list">
            {recipes.length ? (
              recipes.map((recipe) => (
                <button
                  key={recipe.id}
                  className={`recipe-list__item ${selectedRecipeId === recipe.id ? "is-active" : ""}`}
                  onClick={() => setSelectedRecipeId(recipe.id)}
                >
                  <strong>{recipe.name}</strong>
                  <span>
                    {recipe.product} · v{recipe.version}
                  </span>
                </button>
              ))
            ) : (
              <EmptyState title="Sin recetas" description="Creá la primera receta para empezar." />
            )}
          </aside>

          <div className="stack-xl">
            <form className="stack-lg" onSubmit={handleSaveRecipe}>
              <div className="form-grid">
                <Field label="Nombre de receta">
                  <Input
                    value={recipeForm.name}
                    onChange={(event) =>
                      setRecipeForm((current) => ({ ...current, name: event.target.value }))
                    }
                    required
                  />
                </Field>

                <Field label="Producto">
                  <Input
                    value={recipeForm.product}
                    onChange={(event) =>
                      setRecipeForm((current) => ({ ...current, product: event.target.value }))
                    }
                    required
                  />
                </Field>

                <Field label="Versión">
                  <Input
                    value={recipeForm.version}
                    onChange={(event) =>
                      setRecipeForm((current) => ({ ...current, version: event.target.value }))
                    }
                    required
                  />
                </Field>

                <Field label="Estado">
                  <Select
                    value={recipeForm.active ? "active" : "inactive"}
                    onChange={(event) =>
                      setRecipeForm((current) => ({
                        ...current,
                        active: event.target.value === "active",
                      }))
                    }
                  >
                    <option value="active">Activa</option>
                    <option value="inactive">Inactiva</option>
                  </Select>
                </Field>
              </div>

              <Field label="Descripción">
                <Textarea
                  value={recipeForm.description}
                  onChange={(event) =>
                    setRecipeForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </Field>

              <Button disabled={busy}>{busy ? "Guardando..." : "Guardar receta"}</Button>
            </form>

            <Card className="inner-card">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Paso de receta</span>
                  <h3>{editingStepId ? "Editar paso" : "Agregar paso"}</h3>
                </div>
              </div>

              <form className="stack-lg" onSubmit={handleSaveStep}>
                <div className="form-grid">
                  <Field label="Título">
                    <Input
                      value={stepForm.title}
                      onChange={(event) => setStepForm((current) => ({ ...current, title: event.target.value }))}
                      required
                    />
                  </Field>

                  <Field label="Orden">
                    <Input
                      type="number"
                      value={stepForm.order}
                      onChange={(event) => setStepForm((current) => ({ ...current, order: event.target.value }))}
                      required
                    />
                  </Field>

                  <Field label="Tiempo esperado (min)">
                    <Input
                      type="number"
                      value={stepForm.expectedMinutes}
                      onChange={(event) =>
                        setStepForm((current) => ({ ...current, expectedMinutes: event.target.value }))
                      }
                    />
                  </Field>

                  <Field label="Resumen experto">
                    <Input
                      value={stepForm.expertSummary}
                      onChange={(event) =>
                        setStepForm((current) => ({ ...current, expertSummary: event.target.value }))
                      }
                      placeholder="Texto breve para modo experto"
                    />
                  </Field>
                </div>

                <Field label="Descripción">
                  <Textarea
                    value={stepForm.description}
                    onChange={(event) =>
                      setStepForm((current) => ({ ...current, description: event.target.value }))
                    }
                  />
                </Field>

                <Field label="Texto exacto de evidencia requerida">
                  <Textarea
                    value={stepForm.evidenceText}
                    onChange={(event) =>
                      setStepForm((current) => ({ ...current, evidenceText: event.target.value }))
                    }
                    placeholder="Ej. subir foto de la balanza mostrando 2.100 kg"
                  />
                </Field>

                <Field label="Observaciones / ayuda para operario">
                  <Textarea
                    value={stepForm.helpText}
                    onChange={(event) =>
                      setStepForm((current) => ({ ...current, helpText: event.target.value }))
                    }
                  />
                </Field>

                <div className="form-grid">
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={stepForm.requiresPhoto}
                      onChange={(event) =>
                        setStepForm((current) => ({ ...current, requiresPhoto: event.target.checked }))
                      }
                    />
                    <span>Foto obligatoria</span>
                  </label>

                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={stepForm.requiresNumeric}
                      onChange={(event) =>
                        setStepForm((current) => ({ ...current, requiresNumeric: event.target.checked }))
                      }
                    />
                    <span>Dato numérico obligatorio</span>
                  </label>

                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={stepForm.critical}
                      onChange={(event) =>
                        setStepForm((current) => ({ ...current, critical: event.target.checked }))
                      }
                    />
                    <span>Paso crítico</span>
                  </label>
                </div>

                {stepForm.requiresNumeric ? (
                  <div className="form-grid">
                    <Field label="Unidad">
                      <Input
                        value={stepForm.unit}
                        onChange={(event) =>
                          setStepForm((current) => ({ ...current, unit: event.target.value }))
                        }
                      />
                    </Field>

                    <Field label="Valor objetivo">
                      <Input
                        type="number"
                        step="0.01"
                        value={stepForm.targetValue}
                        onChange={(event) =>
                          setStepForm((current) => ({ ...current, targetValue: event.target.value }))
                        }
                      />
                    </Field>

                    <Field label="Tolerancia">
                      <Input
                        type="number"
                        step="0.01"
                        value={stepForm.tolerance}
                        onChange={(event) =>
                          setStepForm((current) => ({ ...current, tolerance: event.target.value }))
                        }
                      />
                    </Field>

                    <Field label="Política fuera de rango">
                      <Select
                        value={stepForm.outOfRangePolicy}
                        onChange={(event) =>
                          setStepForm((current) => ({
                            ...current,
                            outOfRangePolicy: event.target.value,
                          }))
                        }
                      >
                        <option value="block">Bloquear avance</option>
                        <option value="observe">Permitir con observación</option>
                      </Select>
                    </Field>
                  </div>
                ) : null}

                <Field label="Foto de referencia">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setReferenceFile(event.target.files?.[0] || null)}
                  />
                </Field>

                <div className="section-actions">
                  <Button disabled={busy}>{busy ? "Guardando..." : "Guardar paso"}</Button>
                  {editingStepId ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setEditingStepId("");
                        setReferenceFile(null);
                        setStepForm(createEmptyRecipeStep((steps.at(-1)?.order || 0) + 1));
                      }}
                    >
                      Cancelar edición
                    </Button>
                  ) : null}
                </div>
              </form>
            </Card>

            <Card>
              <div className="section-head">
                <h3>Pasos de la receta</h3>
                <Badge tone="info">{steps.length} pasos</Badge>
              </div>

              {steps.length ? (
                <div className="list-stack">
                  {sortByOrder(steps).map((step) => (
                    <div key={step.id} className="list-item list-item--static">
                      <div>
                        <strong>
                          {step.order}. {step.title}
                        </strong>
                        <p>{step.description || "Sin descripción"}</p>
                        <div className="badge-row">
                          {step.critical ? <Badge tone="warning">Crítico</Badge> : null}
                          {step.requiresPhoto ? <Badge tone="info">Foto</Badge> : null}
                          {step.requiresNumeric ? <Badge tone="info">Dato</Badge> : null}
                        </div>
                      </div>

                      <div className="section-actions">
                        <Button variant="ghost" size="sm" onClick={() => editStep(step)}>
                          Editar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteStep(step.id)}>
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Sin pasos todavía"
                  description="Agregá al menos un paso para que la receta pueda usarse en producción."
                />
              )}
            </Card>
          </div>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}
      </Card>
    </div>
  );
}
