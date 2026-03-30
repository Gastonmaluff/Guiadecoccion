export const CHECKLIST_ITEMS = [
  { key: "scaleCalibrated", label: "Balanza calibrada" },
  { key: "kettleClean", label: "Olla limpia" },
  { key: "sanitizedArea", label: "Área sanitizada" },
  { key: "moldsReady", label: "Moldes listos" },
  { key: "ingredientsReady", label: "Insumos preparados" },
];

export function parseTimestamp(value) {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  if (typeof value === "string") return new Date(value);
  if (typeof value === "number") return new Date(value);
  if (value?.seconds) return new Date(value.seconds * 1000);
  return null;
}

export function formatDateTime(value) {
  const date = parseTimestamp(value);
  if (!date || Number.isNaN(date.getTime())) return "Sin dato";
  return new Intl.DateTimeFormat("es-PY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatDuration(minutes) {
  if (minutes == null || Number.isNaN(minutes)) return "Sin dato";
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remaining = safeMinutes % 60;
  return hours ? `${hours} h ${remaining} min` : `${remaining} min`;
}

export function getDurationMinutes(start, end = new Date()) {
  const startDate = parseTimestamp(start);
  const endDate = parseTimestamp(end);
  if (!startDate || !endDate) return null;
  return Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
}

export function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function toNumberOrNull(value) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function evaluateNumericValue(value, targetValue, tolerance) {
  const numericValue = toNumberOrNull(value);
  const target = toNumberOrNull(targetValue);
  const safeTolerance = toNumberOrNull(tolerance);

  if (numericValue == null || target == null || safeTolerance == null) {
    return {
      numericValue,
      withinRange: null,
      min: null,
      max: null,
    };
  }

  const min = target - safeTolerance;
  const max = target + safeTolerance;

  return {
    numericValue,
    withinRange: numericValue >= min && numericValue <= max,
    min,
    max,
  };
}

export function classNames(...items) {
  return items.filter(Boolean).join(" ");
}

export function getStatusTone(status) {
  switch (status) {
    case "approved":
    case "completed":
      return "success";
    case "observed":
      return "warning";
    case "rejected":
    case "outside_range":
      return "danger";
    case "in_progress":
    case "ready_for_closure":
      return "info";
    default:
      return "muted";
  }
}

export function buildHash(path = "") {
  const safePath = path.startsWith("/") ? path : `/${path}`;
  window.location.hash = safePath;
}

export function getInitials(name) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export function sortByOrder(items) {
  return [...items].sort((a, b) => (a.order || 0) - (b.order || 0));
}

export function createEmptyRecipeStep(order = 1) {
  return {
    title: "",
    description: "",
    order,
    requiresPhoto: false,
    evidenceText: "",
    referencePhotoUrl: "",
    referencePhotoPath: "",
    requiresNumeric: false,
    unit: "",
    targetValue: "",
    tolerance: "",
    critical: false,
    expectedMinutes: "",
    helpText: "",
    outOfRangePolicy: "block",
    expertSummary: "",
  };
}

export function calculateDashboardMetrics(lots) {
  const total = lots.length;
  const approved = lots.filter((lot) => lot.status === "approved").length;
  const observed = lots.filter((lot) => lot.status === "observed").length;
  const rejected = lots.filter((lot) => lot.status === "rejected").length;
  const inProgress = lots.filter((lot) =>
    ["in_progress", "ready_for_closure"].includes(lot.status),
  ).length;
  const completedWithTime = lots.filter((lot) => lot.totalDurationMinutes);
  const avgDuration = completedWithTime.length
    ? Math.round(
        completedWithTime.reduce((acc, lot) => acc + (lot.totalDurationMinutes || 0), 0) /
          completedWithTime.length,
      )
    : 0;

  return { total, approved, observed, rejected, inProgress, avgDuration };
}

export function filterLots(lots, filters = {}) {
  return lots.filter((lot) => {
    const operatorOk =
      !filters.operatorId || filters.operatorId === "all" || lot.operatorId === filters.operatorId;
    const recipeOk =
      !filters.recipeId || filters.recipeId === "all" || lot.recipeId === filters.recipeId;
    const productOk =
      !filters.product || lot.product?.toLowerCase().includes(filters.product.toLowerCase());
    const statusOk =
      !filters.status || filters.status === "all" || lot.status === filters.status;

    let dateOk = true;
    if (filters.date) {
      const start = parseTimestamp(lot.startAt);
      dateOk = start ? start.toISOString().slice(0, 10) === filters.date : false;
    }

    return operatorOk && recipeOk && productOk && statusOk && dateOk;
  });
}
