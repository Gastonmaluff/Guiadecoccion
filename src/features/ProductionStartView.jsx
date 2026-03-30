import { useMemo, useState } from "react";
import { Button, Card, EmptyState, Field, Input, Select, Textarea } from "../components/common";
import { createLot, fetchRecipeSteps } from "../lib/data";
import { CHECKLIST_ITEMS } from "../lib/utils";

const initialForm = {
  product: "",
  recipeId: "",
  flavor: "",
  batchCode: "",
  shift: "Mañana",
  operatorId: "",
  operatorName: "",
  observationsInitial: "",
  mode: "learning",
};

export function ProductionStartView({ profile, recipes, users, onCreated }) {
  const [form, setForm] = useState({
    ...initialForm,
    operatorId: profile.id,
    operatorName: profile.fullName,
  });
  const [checklist, setChecklist] = useState(
    Object.fromEntries(CHECKLIST_ITEMS.map((item) => [item.key, false])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const activeRecipes = useMemo(() => recipes.filter((recipe) => recipe.active), [recipes]);
  const selectedRecipe = activeRecipes.find((recipe) => recipe.id === form.recipeId) || null;
  const operatorOptions = profile.role === "admin" ? users.filter((user) => user.active) : [profile];
  const checklistComplete = Object.values(checklist).every(Boolean);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!selectedRecipe) {
      setError("Seleccioná una receta activa.");
      return;
    }

    if (!checklistComplete) {
      setError("Completá el checklist obligatorio antes de iniciar el lote.");
      return;
    }

    try {
      setBusy(true);
      const recipeSteps = await fetchRecipeSteps(selectedRecipe.id);

      if (!recipeSteps.length) {
        setError("La receta seleccionada no tiene pasos configurados.");
        return;
      }

      const lotId = await createLot({
        payload: {
          ...form,
          product: form.product || selectedRecipe.product,
          checklist,
        },
        recipe: selectedRecipe,
        recipeSteps,
        profile,
      });

      onCreated(lotId);
    } catch {
      setError("No se pudo crear el lote. Revisá tu conexión e intentá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  if (!activeRecipes.length) {
    return (
      <EmptyState
        title="No hay recetas activas"
        description="Primero cargá una receta demo o configurá una nueva receta desde el panel admin."
      />
    );
  }

  return (
    <div className="stack-xl">
      <Card>
        <div className="section-head">
          <div>
            <span className="eyebrow">Módulo de ejecución</span>
            <h2>Arrancar nuevo lote</h2>
          </div>
        </div>

        <form className="stack-xl" onSubmit={handleSubmit}>
          <div className="form-grid">
            <Field label="Producto">
              <Input
                value={form.product}
                onChange={(event) => setForm((current) => ({ ...current, product: event.target.value }))}
                placeholder={selectedRecipe?.product || "Gomitas premium"}
                required
              />
            </Field>

            <Field label="Receta">
              <Select
                value={form.recipeId}
                onChange={(event) => {
                  const recipe = activeRecipes.find((item) => item.id === event.target.value);
                  setForm((current) => ({
                    ...current,
                    recipeId: event.target.value,
                    product: recipe?.product || current.product,
                  }));
                }}
                required
              >
                <option value="">Seleccionar receta</option>
                {activeRecipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name} · v{recipe.version}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Sabor">
              <Input
                value={form.flavor}
                onChange={(event) => setForm((current) => ({ ...current, flavor: event.target.value }))}
                placeholder="Frutilla"
                required
              />
            </Field>

            <Field label="Código de lote">
              <Input
                value={form.batchCode}
                onChange={(event) => setForm((current) => ({ ...current, batchCode: event.target.value }))}
                placeholder="GOM-2026-001"
                required
              />
            </Field>

            <Field label="Turno">
              <Select
                value={form.shift}
                onChange={(event) => setForm((current) => ({ ...current, shift: event.target.value }))}
              >
                <option>Mañana</option>
                <option>Tarde</option>
                <option>Noche</option>
              </Select>
            </Field>

            <Field label="Operario">
              <Select
                value={form.operatorId}
                onChange={(event) => {
                  const user = operatorOptions.find((item) => item.id === event.target.value);
                  setForm((current) => ({
                    ...current,
                    operatorId: event.target.value,
                    operatorName: user?.fullName || "",
                  }));
                }}
              >
                {operatorOptions.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Modo de uso">
              <Select
                value={form.mode}
                onChange={(event) => setForm((current) => ({ ...current, mode: event.target.value }))}
              >
                <option value="learning">Aprendizaje</option>
                <option value="expert">Experto</option>
              </Select>
            </Field>

            <Field label="Inicio">
              <Input value={new Date().toLocaleString("es-PY")} disabled />
            </Field>
          </div>

          <Field label="Observaciones iniciales">
            <Textarea
              value={form.observationsInitial}
              onChange={(event) =>
                setForm((current) => ({ ...current, observationsInitial: event.target.value }))
              }
              placeholder="Ej. Lote urgente para reposición de stock."
            />
          </Field>

          <Card className="inner-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Checklist previo</span>
                <h3>Obligatorio antes de iniciar</h3>
              </div>
            </div>

            <div className="checklist-grid">
              {CHECKLIST_ITEMS.map((item) => (
                <label key={item.key} className="check-row">
                  <input
                    type="checkbox"
                    checked={Boolean(checklist[item.key])}
                    onChange={(event) =>
                      setChecklist((current) => ({ ...current, [item.key]: event.target.checked }))
                    }
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </Card>

          {error ? <div className="error-banner">{error}</div> : null}

          <Button size="lg" block disabled={busy}>
            {busy ? "Creando lote..." : "Iniciar lote"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
