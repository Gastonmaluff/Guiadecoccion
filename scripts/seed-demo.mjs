import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

function parseEnv(content) {
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const [key, ...rest] = line.split("=");
        return [key, rest.join("=")];
      }),
  );
}

async function loadEnv() {
  for (const fileName of [".env.local", ".env"]) {
    try {
      const content = await readFile(path.join(root, fileName), "utf8");
      return parseEnv(content);
    } catch {}
  }

  return {};
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }

  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }

  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((item) => toFirestoreValue(item)),
      },
    };
  }

  if (typeof value === "string") {
    return { stringValue: value };
  }

  if (typeof value === "boolean") {
    return { booleanValue: value };
  }

  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }

  if (typeof value === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value).map(([key, innerValue]) => [key, toFirestoreValue(innerValue)]),
        ),
      },
    };
  }

  return { stringValue: String(value) };
}

function docBody(fields) {
  return {
    fields: Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [key, toFirestoreValue(value)]),
    ),
  };
}

async function authRequest(apiKey, method, body) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:${method}?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error?.message || "Auth request failed");
    error.code = data.error?.message;
    throw error;
  }

  return data;
}

async function upsertDocument({ projectId, docPath, data, idToken }) {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${docPath}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(docBody(data)),
    },
  );

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message || `No se pudo escribir ${docPath}`);
  }

  return payload;
}

async function ensureAuthUser({ apiKey, email, password }) {
  try {
    return await authRequest(apiKey, "signUp", {
      email,
      password,
      returnSecureToken: true,
    });
  } catch (error) {
    if (error.code !== "EMAIL_EXISTS") {
      throw error;
    }

    return authRequest(apiKey, "signInWithPassword", {
      email,
      password,
      returnSecureToken: true,
    });
  }
}

async function main() {
  const env = await loadEnv();
  const apiKey = env.VITE_FIREBASE_API_KEY;
  const projectId = env.VITE_FIREBASE_PROJECT_ID;

  if (!apiKey || !projectId) {
    throw new Error("Faltan VITE_FIREBASE_API_KEY o VITE_FIREBASE_PROJECT_ID en .env.local");
  }

  const now = new Date();
  const admin = await ensureAuthUser({
    apiKey,
    email: env.SEED_ADMIN_EMAIL || "admin@gomitas-demo.local",
    password: env.SEED_ADMIN_PASSWORD || "DemoAdmin123!",
  });

  await upsertDocument({
    projectId,
    docPath: "settings/app",
    idToken: admin.idToken,
    data: {
      bootstrapAdminUid: admin.localId,
      bootstrapCompleted: true,
      allowOperatorsSeeAllLots: false,
      seededAt: now,
    },
  });

  await upsertDocument({
    projectId,
    docPath: `users/${admin.localId}`,
    idToken: admin.idToken,
    data: {
      fullName: env.SEED_ADMIN_NAME || "Administrador Demo",
      email: env.SEED_ADMIN_EMAIL || "admin@gomitas-demo.local",
      role: "admin",
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  });

  const operator = await ensureAuthUser({
    apiKey,
    email: env.SEED_OPERATOR_EMAIL || "operario@gomitas-demo.local",
    password: env.SEED_OPERATOR_PASSWORD || "DemoOperario123!",
  });

  await upsertDocument({
    projectId,
    docPath: `users/${operator.localId}`,
    idToken: operator.idToken,
    data: {
      fullName: env.SEED_OPERATOR_NAME || "Operario Demo",
      email: env.SEED_OPERATOR_EMAIL || "operario@gomitas-demo.local",
      role: "operario",
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  });

  const recipeId = "demo-gomitas-clasicas-v1";
  const recipeData = {
    name: "Gomitas clásicas azucaradas",
    product: "Gomitas premium",
    version: "1.0",
    active: true,
    description: "Receta demo de cocción y moldeo con control de temperatura y pesada.",
    createdAt: now,
    updatedAt: now,
    createdBy: admin.localId,
    updatedBy: admin.localId,
  };

  await upsertDocument({
    projectId,
    docPath: `recipes/${recipeId}`,
    idToken: admin.idToken,
    data: recipeData,
  });

  const steps = [
    {
      id: "step-01",
      order: 1,
      title: "Pesar azúcar",
      description: "Pesar 2.100 kg de azúcar y volcar en la olla.",
      requiresPhoto: true,
      evidenceText: "Subir foto de la balanza mostrando 2.100 kg de azúcar.",
      requiresNumeric: true,
      unit: "kg",
      targetValue: 2.1,
      tolerance: 0.03,
      critical: true,
      expectedMinutes: 6,
      helpText: "Verificar tara correcta y que el recipiente esté seco.",
      outOfRangePolicy: "block",
      expertSummary: "Azúcar 2.100 kg.",
    },
    {
      id: "step-02",
      order: 2,
      title: "Pesar glucosa",
      description: "Pesar 2.000 kg de glucosa.",
      requiresPhoto: true,
      evidenceText: "Foto de evidencia de la balanza con glucosa pesada.",
      requiresNumeric: true,
      unit: "kg",
      targetValue: 2,
      tolerance: 0.03,
      critical: true,
      expectedMinutes: 6,
      helpText: "Usar espátula limpia y controlar derrames.",
      outOfRangePolicy: "block",
      expertSummary: "Glucosa 2.000 kg.",
    },
    {
      id: "step-03",
      order: 3,
      title: "Agregar agua",
      description: "Agregar el volumen de agua indicado por receta antes de encender la olla.",
      requiresPhoto: false,
      evidenceText: "",
      requiresNumeric: true,
      unit: "L",
      targetValue: 0.8,
      tolerance: 0.05,
      critical: false,
      expectedMinutes: 4,
      helpText: "Agregar lentamente para evitar apelmazado inicial.",
      outOfRangePolicy: "observe",
      expertSummary: "Agua 0.8 L.",
    },
    {
      id: "step-04",
      order: 4,
      title: "Encender olla",
      description: "Encender la olla y confirmar visualmente el arranque del calentamiento.",
      requiresPhoto: false,
      evidenceText: "",
      requiresNumeric: false,
      unit: "",
      targetValue: null,
      tolerance: null,
      critical: true,
      expectedMinutes: 2,
      helpText: "Verificar panel sin alarmas antes de continuar.",
      outOfRangePolicy: "block",
      expertSummary: "Encender olla.",
    },
    {
      id: "step-05",
      order: 5,
      title: "Llevar a temperatura objetivo",
      description: "Llevar la mezcla a temperatura de proceso.",
      requiresPhoto: true,
      evidenceText: "Subir foto del visor de temperatura alcanzando objetivo.",
      requiresNumeric: true,
      unit: "°C",
      targetValue: 118,
      tolerance: 2,
      critical: true,
      expectedMinutes: 18,
      helpText: "No sobrepasar el objetivo para evitar degradación del producto.",
      outOfRangePolicy: "block",
      expertSummary: "Temperatura 118 °C.",
    },
    {
      id: "step-06",
      order: 6,
      title: "Agregar insumos posteriores",
      description: "Agregar color, sabor y ácido según la formulación definida.",
      requiresPhoto: true,
      evidenceText: "Foto del agregado final antes de homogenizar.",
      requiresNumeric: false,
      unit: "",
      targetValue: null,
      tolerance: null,
      critical: true,
      expectedMinutes: 8,
      helpText: "Agregar fuera del pico máximo de temperatura.",
      outOfRangePolicy: "observe",
      expertSummary: "Agregar insumos post-cocción.",
    },
    {
      id: "step-07",
      order: 7,
      title: "Llenar moldes",
      description: "Transferir mezcla a moldes limpios y nivelados.",
      requiresPhoto: true,
      evidenceText: "Subir foto del primer molde completo.",
      requiresNumeric: false,
      unit: "",
      targetValue: null,
      tolerance: null,
      critical: true,
      expectedMinutes: 12,
      helpText: "Controlar nivel uniforme y ausencia de burbujas visibles.",
      outOfRangePolicy: "observe",
      expertSummary: "Llenado de moldes.",
    },
    {
      id: "step-08",
      order: 8,
      title: "Observación final del lote",
      description: "Registrar inspección visual final del lote antes del cierre.",
      requiresPhoto: true,
      evidenceText: "Subir foto final del lote o bandejas terminadas.",
      requiresNumeric: false,
      unit: "",
      targetValue: null,
      tolerance: null,
      critical: false,
      expectedMinutes: 5,
      helpText: "Anotar color, brillo, forma y cualquier desviación visible.",
      outOfRangePolicy: "observe",
      expertSummary: "Inspección visual final.",
    },
  ];

  for (const step of steps) {
    await upsertDocument({
      projectId,
      docPath: `recipes/${recipeId}/steps/${step.id}`,
      idToken: admin.idToken,
      data: {
        ...step,
        updatedAt: now,
        updatedBy: admin.localId,
      },
    });
  }

  console.log("Seed completado.");
  console.log(`Admin: ${env.SEED_ADMIN_EMAIL || "admin@gomitas-demo.local"} / ${env.SEED_ADMIN_PASSWORD || "DemoAdmin123!"}`);
  console.log(
    `Operario: ${env.SEED_OPERATOR_EMAIL || "operario@gomitas-demo.local"} / ${env.SEED_OPERATOR_PASSWORD || "DemoOperario123!"}`,
  );
  console.log(`Receta demo: ${recipeId}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
