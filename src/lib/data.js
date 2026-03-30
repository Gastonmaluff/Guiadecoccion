import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db, serverTimestamp } from "./firebase";
import { evaluateNumericValue, getDurationMinutes, sortByOrder } from "./utils";

const USERS = "users";
const RECIPES = "recipes";
const LOTS = "lots";
const AUDIT_LOGS = "auditLogs";
const SETTINGS = "settings";

function mapSnapshot(snapshot) {
  return { id: snapshot.id, ...snapshot.data() };
}

async function createAuditLog(entry) {
  await addDoc(collection(db, AUDIT_LOGS), {
    ...entry,
    createdAt: serverTimestamp(),
  });
}

export function subscribeCurrentUserProfile(uid, onData) {
  return onSnapshot(doc(db, USERS, uid), (snapshot) => {
    onData(snapshot.exists() ? mapSnapshot(snapshot) : null);
  });
}

export async function registerUserProfile(user, fullName) {
  await setDoc(doc(db, USERS, user.uid), {
    fullName,
    email: user.email,
    role: "operario",
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function subscribeUsers(onData) {
  return onSnapshot(collection(db, USERS), (snapshot) => {
    const items = snapshot.docs.map(mapSnapshot).sort((a, b) =>
      String(a.fullName || "").localeCompare(String(b.fullName || "")),
    );
    onData(items);
  });
}

export async function updateUserRecord(userId, payload, currentUser) {
  await updateDoc(doc(db, USERS, userId), {
    ...payload,
    updatedAt: serverTimestamp(),
  });

  await createAuditLog({
    entityType: "user",
    entityId: userId,
    action: "user_updated",
    userId: currentUser.id,
    userName: currentUser.fullName,
    summary: `Actualizó usuario ${userId}`,
    metadata: payload,
  });
}

export async function ensureSettingsDoc(profile) {
  const settingsRef = doc(db, SETTINGS, "app");
  const snapshot = await getDoc(settingsRef);
  if (snapshot.exists()) return;

  await setDoc(settingsRef, {
    allowOperatorsSeeAllLots: false,
    bootstrapAdminUid: profile?.id || "",
    bootstrapCompleted: true,
    createdAt: serverTimestamp(),
  });
}

export function subscribeRecipes(onData) {
  return onSnapshot(collection(db, RECIPES), (snapshot) => {
    const items = snapshot.docs
      .map(mapSnapshot)
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    onData(items);
  });
}

export async function fetchRecipeSteps(recipeId) {
  const snapshot = await getDocs(collection(db, RECIPES, recipeId, "steps"));
  return sortByOrder(snapshot.docs.map(mapSnapshot));
}

export async function saveRecipe(recipeId, payload, currentUser) {
  const recipeRef = recipeId ? doc(db, RECIPES, recipeId) : doc(collection(db, RECIPES));
  const existing = recipeId ? await getDoc(recipeRef) : null;

  await setDoc(
    recipeRef,
    {
      name: payload.name,
      product: payload.product,
      version: payload.version,
      active: Boolean(payload.active),
      description: payload.description || "",
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.id,
      createdAt: existing?.exists() ? existing.data().createdAt : serverTimestamp(),
      createdBy: existing?.exists() ? existing.data().createdBy : currentUser.id,
    },
    { merge: true },
  );

  await createAuditLog({
    entityType: "recipe",
    entityId: recipeRef.id,
    action: existing?.exists() ? "recipe_updated" : "recipe_created",
    userId: currentUser.id,
    userName: currentUser.fullName,
    summary: `Receta ${payload.name}`,
  });

  return recipeRef.id;
}

export async function saveRecipeStep(recipeId, stepId, payload, currentUser) {
  const recipeStepRef = stepId
    ? doc(db, RECIPES, recipeId, "steps", stepId)
    : doc(collection(db, RECIPES, recipeId, "steps"));

  await setDoc(
    recipeStepRef,
    {
      title: payload.title,
      description: payload.description || "",
      order: Number(payload.order) || 1,
      requiresPhoto: Boolean(payload.requiresPhoto),
      evidenceText: payload.evidenceText || "",
      referencePhotoUrl: payload.referencePhotoUrl || "",
      referencePhotoPath: payload.referencePhotoPath || "",
      requiresNumeric: Boolean(payload.requiresNumeric),
      unit: payload.unit || "",
      targetValue: payload.targetValue === "" ? null : Number(payload.targetValue),
      tolerance: payload.tolerance === "" ? null : Number(payload.tolerance),
      critical: Boolean(payload.critical),
      expectedMinutes: payload.expectedMinutes === "" ? null : Number(payload.expectedMinutes),
      helpText: payload.helpText || "",
      outOfRangePolicy: payload.outOfRangePolicy || "block",
      expertSummary: payload.expertSummary || "",
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.id,
    },
    { merge: true },
  );

  await createAuditLog({
    entityType: "recipeStep",
    entityId: recipeStepRef.id,
    action: stepId ? "recipe_step_updated" : "recipe_step_created",
    userId: currentUser.id,
    userName: currentUser.fullName,
    summary: `Paso ${payload.title}`,
    metadata: { recipeId },
  });
}

export async function deleteRecipeStep(recipeId, stepId, currentUser) {
  await deleteDoc(doc(db, RECIPES, recipeId, "steps", stepId));
  await createAuditLog({
    entityType: "recipeStep",
    entityId: stepId,
    action: "recipe_step_deleted",
    userId: currentUser.id,
    userName: currentUser.fullName,
    summary: `Eliminó paso ${stepId}`,
    metadata: { recipeId },
  });
}

export function subscribeLots(profile, onData) {
  return onSnapshot(collection(db, LOTS), (snapshot) => {
    let items = snapshot.docs.map(mapSnapshot);

    if (profile.role !== "admin") {
      items = items.filter((item) => item.participantIds?.includes(profile.id));
    }

    items.sort((a, b) => {
      const left = a.startAt?.seconds || 0;
      const right = b.startAt?.seconds || 0;
      return right - left;
    });

    onData(items);
  });
}

export function subscribeLotDetail(lotId, onData) {
  let latestLot = null;
  let latestSteps = [];

  const emit = () => onData({ lot: latestLot, steps: latestSteps });

  const unsubscribeLot = onSnapshot(doc(db, LOTS, lotId), (snapshot) => {
    latestLot = snapshot.exists() ? mapSnapshot(snapshot) : null;
    emit();
  });

  const unsubscribeSteps = onSnapshot(collection(db, LOTS, lotId, "steps"), (snapshot) => {
    latestSteps = sortByOrder(snapshot.docs.map(mapSnapshot));
    emit();
  });

  return () => {
    unsubscribeLot();
    unsubscribeSteps();
  };
}

export async function createLot({ payload, recipe, recipeSteps, profile }) {
  const lotRef = doc(collection(db, LOTS));
  const batch = writeBatch(db);
  const participantIds = [...new Set([profile.id, payload.operatorId].filter(Boolean))];

  batch.set(lotRef, {
    product: payload.product,
    recipeId: recipe.id,
    recipeName: recipe.name,
    recipeVersion: recipe.version,
    flavor: payload.flavor,
    batchCode: payload.batchCode,
    shift: payload.shift,
    operatorId: payload.operatorId,
    operatorName: payload.operatorName,
    createdBy: profile.id,
    createdByName: profile.fullName,
    participantIds,
    mode: payload.mode,
    observationsInitial: payload.observationsInitial || "",
    checklist: payload.checklist,
    checklistCompletedAt: serverTimestamp(),
    checklistCompletedBy: profile.id,
    currentStepOrder: 1,
    completedSteps: 0,
    totalSteps: recipeSteps.length,
    status: "in_progress",
    startAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  recipeSteps.forEach((step, index) => {
    batch.set(doc(db, LOTS, lotRef.id, "steps", step.id), {
      recipeStepId: step.id,
      title: step.title,
      description: step.description || "",
      order: step.order || index + 1,
      requiresPhoto: Boolean(step.requiresPhoto),
      evidenceText: step.evidenceText || "",
      referencePhotoUrl: step.referencePhotoUrl || "",
      requiresNumeric: Boolean(step.requiresNumeric),
      unit: step.unit || "",
      targetValue: step.targetValue ?? null,
      tolerance: step.tolerance ?? null,
      critical: Boolean(step.critical),
      expectedMinutes: step.expectedMinutes ?? null,
      helpText: step.helpText || "",
      outOfRangePolicy: step.outOfRangePolicy || "block",
      expertSummary: step.expertSummary || "",
      status: index === 0 ? "in_progress" : "pending",
      startedAt: index === 0 ? serverTimestamp() : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      photos: [],
      observations: "",
      numericValue: null,
      numericWithinRange: null,
      overExpectedTime: null,
    });
  });

  batch.set(doc(collection(db, AUDIT_LOGS)), {
    entityType: "lot",
    entityId: lotRef.id,
    lotId: lotRef.id,
    action: "lot_created",
    userId: profile.id,
    userName: profile.fullName,
    summary: `Creó lote ${payload.batchCode}`,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
  return lotRef.id;
}

export async function ensureActiveStepStarted(lotId, step) {
  if (!step || step.startedAt) return;

  await updateDoc(doc(db, LOTS, lotId, "steps", step.id), {
    startedAt: serverTimestamp(),
    status: "in_progress",
    updatedAt: serverTimestamp(),
  });
}

export async function completeLotStep({ lot, step, payload, nextStep, profile }) {
  const batch = writeBatch(db);
  const stepRef = doc(db, LOTS, lot.id, "steps", step.id);
  const lotRef = doc(db, LOTS, lot.id);
  const evaluation = evaluateNumericValue(
    payload.numericValue,
    step.targetValue,
    step.tolerance,
  );
  const durationMinutes = getDurationMinutes(step.startedAt);
  const overExpectedTime =
    step.expectedMinutes != null && durationMinutes != null
      ? durationMinutes > step.expectedMinutes
      : null;
  const stepStatus =
    evaluation.withinRange === false && step.outOfRangePolicy === "observe"
      ? "observed"
      : "completed";

  batch.update(stepRef, {
    completedAt: serverTimestamp(),
    durationMinutes,
    numericValue: evaluation.numericValue,
    numericWithinRange: evaluation.withinRange,
    rangeMin: evaluation.min,
    rangeMax: evaluation.max,
    observations: payload.observations || "",
    photos: payload.photos || [],
    status: stepStatus,
    completedBy: profile.id,
    completedByName: profile.fullName,
    overExpectedTime,
    updatedAt: serverTimestamp(),
  });

  if (nextStep) {
    batch.update(doc(db, LOTS, lot.id, "steps", nextStep.id), {
      status: "in_progress",
      startedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  batch.update(lotRef, {
    completedSteps: increment(1),
    currentStepOrder: nextStep ? nextStep.order : step.order,
    status: nextStep ? "in_progress" : "ready_for_closure",
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(collection(db, AUDIT_LOGS)), {
    entityType: "lotStep",
    entityId: step.id,
    lotId: lot.id,
    action: "lot_step_completed",
    userId: profile.id,
    userName: profile.fullName,
    summary: `Completó paso ${step.title}`,
    metadata: {
      numericValue: evaluation.numericValue,
      numericWithinRange: evaluation.withinRange,
      stepStatus,
    },
    createdAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function closeLot({ lot, payload, profile }) {
  const totalDurationMinutes = getDurationMinutes(lot.startAt);

  await updateDoc(doc(db, LOTS, lot.id), {
    finalQuantity: payload.finalQuantity === "" ? null : Number(payload.finalQuantity),
    waste: payload.waste === "" ? null : Number(payload.waste),
    finalObservations: payload.finalObservations || "",
    status: payload.status,
    closedAt: serverTimestamp(),
    operatorSignature: payload.operatorSignature,
    adminConfirmation:
      profile.role === "admin" ? payload.adminConfirmation || profile.fullName : "",
    adminConfirmedAt: profile.role === "admin" ? serverTimestamp() : null,
    totalDurationMinutes,
    updatedAt: serverTimestamp(),
  });

  await createAuditLog({
    entityType: "lot",
    entityId: lot.id,
    lotId: lot.id,
    action: "lot_closed",
    userId: profile.id,
    userName: profile.fullName,
    summary: `Cerró lote ${lot.batchCode}`,
    metadata: payload,
  });
}

export async function reviewLot({ lotId, payload, profile }) {
  await updateDoc(doc(db, LOTS, lotId), {
    status: payload.status,
    verificationObservation: payload.verificationObservation || "",
    verifiedBy: profile.id,
    verifiedByName: profile.fullName,
    verifiedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await createAuditLog({
    entityType: "lot",
    entityId: lotId,
    lotId,
    action: "lot_reviewed",
    userId: profile.id,
    userName: profile.fullName,
    summary: `Auditó lote ${lotId}`,
    metadata: payload,
  });
}
