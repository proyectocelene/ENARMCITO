// src/firebase/firestoreService.js
// Servicio unificado de datos (Firestore en la nube con fallback reactivo a LocalStorage)

import { db, isFirebaseConfigured } from "./firebaseConfig";
import { DEFAULT_TOPIC } from "./defaultData";
import { 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  deleteDoc,
  collection, 
  onSnapshot, 
  serverTimestamp 
} from "firebase/firestore";

const STORAGE_KEY_TOPIC = "enarmcito_topic_d01";
const STORAGE_KEY_USERS = "enarmcito_users_state";
const STORAGE_KEY_ATTEMPTS = "enarmcito_attempts";
const STORAGE_KEY_FLASHCARDS = "enarmcito_flashcards";

// Estado inicial limpio para los dos usuarios (con sus respectivas zonas horarias)
export const INITIAL_USERS_STATE = {
  donato: {
    id: "donato",
    name: "Donato",
    avatar: "👨‍⚕️",
    streak: 0,
    xp: 0,
    city: "Tijuana, B.C.",
    timezone: "America/Tijuana",
    today_status: {
      phase0_done: false,
      phase0_score: 0,
      phase1_done: false,
      phase2_done: false,
      phase2_cards_reviewed: 0,
      phase3_done: false,
      phase3_score: 0
    },
    last_active: new Date().toISOString()
  },
  sonia: {
    id: "sonia",
    name: "Sonia",
    avatar: "👩‍⚕️",
    streak: 0,
    xp: 0,
    city: "Hermosillo, Son.",
    timezone: "America/Hermosillo",
    today_status: {
      phase0_done: false,
      phase0_score: 0,
      phase1_done: false,
      phase2_done: false,
      phase2_cards_reviewed: 0,
      phase3_done: false,
      phase3_score: 0
    },
    last_active: new Date().toISOString()
  }
};

import { PRESEASON_SCHEDULE, getScheduleDay, generateTopicFromSchedule } from "../data/preseasonSchedule";

function mergeWithCleanTopic(cleanData, incomingData) {
  if (!incomingData) return cleanData;
  const merged = {
    ...cleanData,
    ...incomingData
  };

  // Preservar siempre el Pre-Test empaquetado si el de Firestore/LocalStorage viene vacío o sin preguntas
  const hasIncomingPretest = Array.isArray(incomingData.pretest?.questions) && incomingData.pretest.questions.length > 0;
  if (!hasIncomingPretest && cleanData.pretest?.questions?.length > 0) {
    merged.pretest = cleanData.pretest;
  }

  // Preservar siempre el Simulador empaquetado si el de Firestore/LocalStorage viene vacío o sin preguntas
  const hasIncomingSim = Array.isArray(incomingData.simulation?.questions) && incomingData.simulation.questions.length > 0;
  if (!hasIncomingSim && cleanData.simulation?.questions?.length > 0) {
    merged.simulation = cleanData.simulation;
  }

  return merged;
}

/**
 * Obtiene el tema del día (por código ej. 'D01' o por topicId)
 */
export async function getTopic(topicId = "D01_MI_Diabetes_Mellitus_CAD_EHH") {
  const scheduleItem = getScheduleDay(topicId);
  const resolvedId = scheduleItem ? scheduleItem.topicId : topicId;
  const storageKey = `enarmcito_topic_${scheduleItem ? scheduleItem.code : resolvedId}`;

  // Generar estructura base limpia correspondiente al tema
  const cleanData = scheduleItem.code === "D01"
    ? DEFAULT_TOPIC
    : generateTopicFromSchedule(scheduleItem, DEFAULT_TOPIC);

  // 1. Intentar leer desde Firestore en la nube
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, "curriculum", resolvedId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const firestoreTopic = snap.data();
        const merged = mergeWithCleanTopic(cleanData, firestoreTopic);
        localStorage.setItem(storageKey, JSON.stringify(merged));
        return merged;
      }
    } catch (err) {
      console.warn("Error leyendo tema de Firestore, revisando caché local:", err);
    }
  }

  // 2. Fallback a caché local si ya se cargó material previamente
  const localSaved = localStorage.getItem(storageKey);
  if (localSaved) {
    try {
      const parsed = JSON.parse(localSaved);
      const merged = mergeWithCleanTopic(cleanData, parsed);
      localStorage.setItem(storageKey, JSON.stringify(merged));
      return merged;
    } catch (e) {}
  }

  // 3. Guardar versión limpia por defecto
  localStorage.setItem(storageKey, JSON.stringify(cleanData));
  return cleanData;
}

/**
 * Obtiene el estado de los dos usuarios (Donato y Sonia)
 */
export async function getUsersState() {
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, "meta", "duo_status");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data();
      }
    } catch (err) {
      console.warn("Error obteniendo usuarios de Firestore:", err);
    }
  }

  const local = localStorage.getItem(STORAGE_KEY_USERS);
  if (local) {
    try {
      return JSON.parse(local);
    } catch (e) {}
  }

  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(INITIAL_USERS_STATE));
  return INITIAL_USERS_STATE;
}

/**
 * Guarda o actualiza el progreso de un usuario
 */
export async function updateUserData(userId, partialData) {
  const allUsers = await getUsersState();
  const current = allUsers[userId] || INITIAL_USERS_STATE[userId];

  const updatedUser = {
    ...current,
    ...partialData,
    today_status: {
      ...current.today_status,
      ...(partialData.today_status || {})
    },
    last_active: new Date().toISOString()
  };

  const newUsersState = {
    ...allUsers,
    [userId]: updatedUser
  };

  // Guardar localmente siempre
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(newUsersState));
  window.dispatchEvent(new CustomEvent("enarmcito_user_sync", { detail: newUsersState }));

  // Si Firebase está activo, sincronizar en la nube
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, "meta", "duo_status"), newUsersState, { merge: true });
    } catch (err) {
      console.error("Error sincronizando usuario a Firestore:", err);
    }
  }

  return newUsersState;
}

/**
 * Guarda el intento completo del Pre-Test con telemetría
 */
export async function savePretestAttempt(userId, topicId, stats) {
  const scheduleItem = getScheduleDay(topicId);
  const dayCode = scheduleItem ? scheduleItem.code : topicId;

  const attempt = {
    id: `attempt_${userId}_${Date.now()}`,
    userId,
    topicId,
    dayCode,
    timestamp: new Date().toISOString(),
    stats
  };

  // Guardar en histórico local
  try {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY_ATTEMPTS) || "[]");
    history.unshift(attempt);
    localStorage.setItem(STORAGE_KEY_ATTEMPTS, JSON.stringify(history.slice(0, 50)));
  } catch (e) {}

  const allUsers = await getUsersState();
  const current = allUsers[userId] || INITIAL_USERS_STATE[userId];
  const dayProgress = current.day_progress || {};
  const newDayStatus = {
    ...(dayProgress[dayCode] || {}),
    phase0_done: true,
    phase0_score: stats.grossScorePercent
  };

  const isToday = dayCode === "D01";

  // Actualizar estado del usuario (+100 XP por completar el Pre-test)
  await updateUserData(userId, {
    xp: (current.xp || 0) + 100,
    day_progress: {
      ...dayProgress,
      [dayCode]: newDayStatus
    },
    today_status: isToday ? newDayStatus : (current.today_status || {})
  });

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, "attempts", attempt.id), {
        ...attempt,
        serverTime: serverTimestamp()
      });
    } catch (e) {
      console.warn("No se pudo guardar intento en Firestore:", e);
    }
  }

  return attempt;
}

/**
 * Agrega un nuevo recurso a la biblioteca compartida del tema
 */
export async function addSharedResource(topicId, newResource) {
  const scheduleItem = getScheduleDay(topicId);
  const resolvedId = scheduleItem ? scheduleItem.topicId : topicId;
  const storageKey = `enarmcito_topic_${scheduleItem ? scheduleItem.code : resolvedId}`;

  const topic = await getTopic(topicId);
  const resources = topic.resources || [];
  const updatedResources = [
    {
      id: `res_${Date.now()}`,
      ...newResource,
      date: new Date().toLocaleDateString("es-MX")
    },
    ...resources
  ];

  const updatedTopic = {
    ...topic,
    resources: updatedResources
  };

  localStorage.setItem(storageKey, JSON.stringify(updatedTopic));
  window.dispatchEvent(new CustomEvent("enarmcito_topic_sync", { detail: updatedTopic }));

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, "curriculum", resolvedId), updatedTopic, { merge: true });
    } catch (e) {
      console.warn("Error guardando recurso en Firestore:", e);
    }
  }

  return updatedTopic;
}

/**
 * Elimina un recurso compartido de la biblioteca
 */
export async function deleteSharedResource(topicId, resourceId) {
  const scheduleItem = getScheduleDay(topicId);
  const resolvedId = scheduleItem ? scheduleItem.topicId : topicId;
  const storageKey = `enarmcito_topic_${scheduleItem ? scheduleItem.code : resolvedId}`;

  const topic = await getTopic(topicId);
  const resources = (topic.resources || []).filter(r => r.id !== resourceId);

  const updatedTopic = {
    ...topic,
    resources
  };

  localStorage.setItem(storageKey, JSON.stringify(updatedTopic));
  window.dispatchEvent(new CustomEvent("enarmcito_topic_sync", { detail: updatedTopic }));

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, "curriculum", resolvedId), updatedTopic, { merge: true });
    } catch (e) {
      console.warn("Error eliminando recurso en Firestore:", e);
    }
  }

  return updatedTopic;
}

/**
 * Actualiza un recurso compartido existente (título, contenido, tipo, manual, imagen, bitácora de edición)
 */
export async function updateSharedResource(topicId, resourceId, updatedFields, editorName = "Donato") {
  const scheduleItem = getScheduleDay(topicId);
  const resolvedId = scheduleItem ? scheduleItem.topicId : topicId;
  const storageKey = `enarmcito_topic_${scheduleItem ? scheduleItem.code : resolvedId}`;

  const topic = await getTopic(topicId);
  const resources = topic.resources || [];

  const nowFormatted = new Date().toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });

  const updatedResources = resources.map((r) => {
    if (r.id !== resourceId) return r;
    const previousHistory = Array.isArray(r.editHistory) ? r.editHistory : [];
    return {
      ...r,
      ...updatedFields,
      editHistory: [
        ...previousHistory,
        {
          user: editorName,
          date: nowFormatted
        }
      ]
    };
  });

  const updatedTopic = {
    ...topic,
    resources: updatedResources
  };

  localStorage.setItem(storageKey, JSON.stringify(updatedTopic));
  window.dispatchEvent(new CustomEvent("enarmcito_topic_sync", { detail: updatedTopic }));

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, "curriculum", resolvedId), updatedTopic, { merge: true });
    } catch (e) {
      console.warn("Error actualizando recurso en Firestore:", e);
    }
  }

  return updatedTopic;
}

/**
 * Alterna una reacción (ej. 🔥, 💡, ❤️, 👏, 🧠) a una publicación de material
 */
export async function toggleResourceReaction(topicId, resourceId, emoji, userName = "Donato") {
  const scheduleItem = getScheduleDay(topicId);
  const resolvedId = scheduleItem ? scheduleItem.topicId : topicId;
  const storageKey = `enarmcito_topic_${scheduleItem ? scheduleItem.code : resolvedId}`;

  const topic = await getTopic(topicId);
  const resources = topic.resources || [];

  const updatedResources = resources.map((r) => {
    if (r.id !== resourceId) return r;
    const currentReactions = r.reactions || {};
    const usersForEmoji = Array.isArray(currentReactions[emoji]) ? [...currentReactions[emoji]] : [];

    let nextUsers;
    if (usersForEmoji.includes(userName)) {
      nextUsers = usersForEmoji.filter((u) => u !== userName);
    } else {
      nextUsers = [...usersForEmoji, userName];
    }

    return {
      ...r,
      reactions: {
        ...currentReactions,
        [emoji]: nextUsers
      }
    };
  });

  const updatedTopic = {
    ...topic,
    resources: updatedResources
  };

  localStorage.setItem(storageKey, JSON.stringify(updatedTopic));
  window.dispatchEvent(new CustomEvent("enarmcito_topic_sync", { detail: updatedTopic }));

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, "curriculum", resolvedId), updatedTopic, { merge: true });
    } catch (e) {
      console.warn("Error actualizando reacción en Firestore:", e);
    }
  }

  return updatedTopic;
}

/**
 * Agrega un comentario / nota a una publicación de material compartido
 */
export async function addResourceComment(topicId, resourceId, commentText, userName = "Donato") {
  const scheduleItem = getScheduleDay(topicId);
  const resolvedId = scheduleItem ? scheduleItem.topicId : topicId;
  const storageKey = `enarmcito_topic_${scheduleItem ? scheduleItem.code : resolvedId}`;

  const topic = await getTopic(topicId);
  const resources = topic.resources || [];

  const newComment = {
    id: `comm_${Date.now()}`,
    text: String(commentText).trim(),
    author: userName,
    date: new Date().toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    })
  };

  const updatedResources = resources.map((r) => {
    if (r.id !== resourceId) return r;
    const existingComments = Array.isArray(r.comments) ? r.comments : [];
    return {
      ...r,
      comments: [...existingComments, newComment]
    };
  });

  const updatedTopic = {
    ...topic,
    resources: updatedResources
  };

  localStorage.setItem(storageKey, JSON.stringify(updatedTopic));
  window.dispatchEvent(new CustomEvent("enarmcito_topic_sync", { detail: updatedTopic }));

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, "curriculum", resolvedId), updatedTopic, { merge: true });
    } catch (e) {
      console.warn("Error agregando comentario en Firestore:", e);
    }
  }

  return updatedTopic;
}

/**
 * Guarda o reemplaza el cuestionario Pre-Test JSON en el tema activo (Local + Firestore)
 * Exclusivo para Donato; se sincroniza en tiempo real para que le aparezca a Sonia.
 */
export async function savePretestToTopic(topicId, pretestData, uploadedBy = "donato") {
  if (uploadedBy !== "donato") {
    throw new Error("Solo Donato tiene permisos para subir o actualizar los cuestionarios.");
  }

  const scheduleItem = getScheduleDay(topicId);
  const resolvedId = scheduleItem ? scheduleItem.topicId : topicId;
  const storageKey = `enarmcito_topic_${scheduleItem ? scheduleItem.code : resolvedId}`;

  const topic = await getTopic(topicId);
  const updatedTopic = {
    ...topic,
    pretest: {
      title: pretestData.title || `Pre-Test: ${topic.title}`,
      normativa_origen: pretestData.normativa_origen || topic.normativa_origen,
      duration_minutes: pretestData.duration_minutes || 20,
      uploaded_by: "donato",
      updated_at: new Date().toISOString(),
      questions: pretestData.questions || []
    }
  };

  localStorage.setItem(storageKey, JSON.stringify(updatedTopic));
  window.dispatchEvent(new CustomEvent("enarmcito_topic_sync", { detail: updatedTopic }));

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, "curriculum", resolvedId), updatedTopic, { merge: true });
    } catch (e) {
      console.warn("Error guardando Pre-Test en Firestore:", e);
    }
  }

  return updatedTopic;
}

/**
 * Guarda o actualiza el Simulador Post-Estudio JSON en el tema activo (Local + Firestore)
 * Exclusivo para Donato; se sincroniza en tiempo real para que le aparezca a Sonia.
 */
export async function saveSimulationToTopic(topicId, simulationData, uploadedBy = "donato") {
  if (uploadedBy !== "donato") {
    throw new Error("Solo Donato tiene permisos para subir o actualizar los simuladores.");
  }

  const scheduleItem = getScheduleDay(topicId);
  const resolvedId = scheduleItem ? scheduleItem.topicId : topicId;
  const storageKey = `enarmcito_topic_${scheduleItem ? scheduleItem.code : resolvedId}`;

  const topic = await getTopic(topicId);
  const updatedTopic = {
    ...topic,
    simulation: {
      title: simulationData.title || `Simulador Post-Estudio: ${topic.title}`,
      normativa_origen: simulationData.normativa_origen || topic.normativa_origen,
      duration_minutes: simulationData.duration_minutes || 30,
      uploaded_by: "donato",
      updated_at: new Date().toISOString(),
      questions: simulationData.questions || []
    }
  };

  localStorage.setItem(storageKey, JSON.stringify(updatedTopic));
  window.dispatchEvent(new CustomEvent("enarmcito_topic_sync", { detail: updatedTopic }));

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, "curriculum", resolvedId), updatedTopic, { merge: true });
    } catch (e) {
      console.warn("Error guardando Simulador en Firestore:", e);
    }
  }

  return updatedTopic;
}

/**
 * Normaliza el texto de una flashcard para detectar duplicados exactos o casi idénticos.
 */
export function normalizeFlashcardKey(text = "") {
  return String(text || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Infiere el concepto pivote ENARM a partir del contenido o etiquetas de la flashcard.
 */
function inferFlashcardPivot(front = "", back = "", tags = []) {
  const combined = `${front} ${back} ${(tags || []).join(" ")}`.toLowerCase();
  if (/gold[\s_-]?standard|est[aá]ndar de oro|confirmatorio definitivo/i.test(combined)) {
    return "Gold_Standard";
  }
  if (/al[eé]rgic|embaraz|gestante|alternativ|segunda l[ií]nea|contraindicad/i.test(combined)) {
    return "Tx_Alergicos_Especial";
  }
  if (/primera l[ií]nea|1ra l[ií]nea|tratamiento de elecci[oó]n|f[aá]rmaco inicial|manejo inicial/i.test(combined)) {
    return "Primera_Linea_Tx";
  }
  if (/escala|puntaje|score|curb|alvarado|hinchey|silverman|glasgow|child|ranson|apache|severidad|clasificaci[oó]n/i.test(combined)) {
    return "Escala_Severidad";
  }
  if (/meta|referencia|env[ií]o|segundo nivel|tercer nivel|control gluc[eé]mico|criterio de ingreso/i.test(combined)) {
    return "Meta_Referencia";
  }
  return "Estudio_Inicial";
}

/**
 * Sincroniza un arreglo de flashcards del tema con los mazos locales por usuario en localStorage,
 * preservando el progreso FSRS (cardState) de las tarjetas que ya existían.
 */
function syncUserLocalDecksForTopic(resolvedId, canonicalCards = []) {
  ["donato", "sonia"].forEach((uid) => {
    const userDeckKey = `enarmcito_anki_deck_${uid}_${resolvedId}`;
    try {
      const savedRaw = localStorage.getItem(userDeckKey);
      const savedDeck = savedRaw ? JSON.parse(savedRaw) : [];
      const stateByKey = new Map();
      const stateById = new Map();

      if (Array.isArray(savedDeck)) {
        savedDeck.forEach((c) => {
          if (c?.id && c?.cardState) stateById.set(c.id, c.cardState);
          const k = normalizeFlashcardKey(c?.front);
          if (k && c?.cardState) {
            const prev = stateByKey.get(k);
            if (!prev || (c.cardState.reps || 0) > (prev.reps || 0)) {
              stateByKey.set(k, c.cardState);
            }
          }
        });
      }

      const mergedUserDeck = canonicalCards.map((card) => {
        const k = normalizeFlashcardKey(card.front);
        const preservedState = card.cardState || stateById.get(card.id) || stateByKey.get(k);
        return preservedState ? { ...card, cardState: preservedState } : card;
      });

      localStorage.setItem(userDeckKey, JSON.stringify(mergedUserDeck));
    } catch (e) {}
  });
}

/**
 * Guarda la lista completa de flashcards de un tema (tras editar, eliminar, organizar o limpiar duplicadas)
 * tanto en Firestore como en LocalStorage (tema y mazo FSRS del usuario).
 */
export async function saveTopicFlashcards(topicId, updatedFlashcards = [], currentUserId = "donato") {
  const scheduleItem = getScheduleDay(topicId);
  const resolvedId = scheduleItem ? scheduleItem.topicId : topicId;
  const storageKey = `enarmcito_topic_${scheduleItem ? scheduleItem.code : resolvedId}`;

  const topic = await getTopic(topicId);
  const cleanCards = Array.isArray(updatedFlashcards) ? updatedFlashcards : [];

  // Guardar también el estado FSRS del usuario actual en su llave dedicada
  if (currentUserId) {
    const currentDeckKey = `enarmcito_anki_deck_${currentUserId}_${resolvedId}`;
    try {
      localStorage.setItem(currentDeckKey, JSON.stringify(cleanCards));
    } catch (e) {}
  }

  // Para el documento compartido del tema, guardamos los metadatos limpios de las tarjetas
  const sharedCards = cleanCards.map(({ cardState, ...rest }) => rest);

  const updatedTopic = {
    ...topic,
    flashcards: sharedCards
  };

  localStorage.setItem(storageKey, JSON.stringify(updatedTopic));
  syncUserLocalDecksForTopic(resolvedId, cleanCards);

  window.dispatchEvent(new CustomEvent("enarmcito_topic_sync", { detail: updatedTopic }));
  window.dispatchEvent(new CustomEvent("enarmcito_anki_sync", { detail: { topicId: resolvedId, cards: cleanCards } }));

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, "curriculum", resolvedId), updatedTopic, { merge: true });
    } catch (e) {
      console.warn("Error guardando flashcards en Firestore:", e);
    }
  }

  return updatedTopic;
}

/**
 * Elimina automáticamente todas las tarjetas duplicadas de un tema (comparando el frente normalizado),
 * conservando la copia con mayor número de repasos/estabilidad FSRS.
 */
export async function deduplicateTopicFlashcards(topicId, currentUserId = "donato", sourceCards = null) {
  const scheduleItem = getScheduleDay(topicId);
  const resolvedId = scheduleItem ? scheduleItem.topicId : topicId;
  const userDeckKey = `enarmcito_anki_deck_${currentUserId}_${resolvedId}`;

  let cardsToClean = sourceCards;
  if (!Array.isArray(cardsToClean)) {
    try {
      const localRaw = localStorage.getItem(userDeckKey);
      if (localRaw) {
        const parsed = JSON.parse(localRaw);
        if (Array.isArray(parsed) && parsed.length > 0) cardsToClean = parsed;
      }
    } catch (e) {}
  }

  if (!Array.isArray(cardsToClean)) {
    const topic = await getTopic(topicId);
    cardsToClean = topic.flashcards || [];
  }

  const uniqueMap = new Map();
  let removedCount = 0;

  cardsToClean.forEach((card) => {
    const key = normalizeFlashcardKey(card.front);
    if (!key) return;

    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, card);
    } else {
      removedCount++;
      const existing = uniqueMap.get(key);
      const existingReps = existing.cardState?.reps || 0;
      const candidateReps = card.cardState?.reps || 0;
      if (candidateReps > existingReps) {
        uniqueMap.set(key, card);
      }
    }
  });

  const deduplicated = Array.from(uniqueMap.values());
  await saveTopicFlashcards(topicId, deduplicated, currentUserId);

  return {
    removedCount,
    remainingCount: deduplicated.length,
    cards: deduplicated
  };
}

/**
 * Importa y agrega tarjetas Anki desde un bloque TSV (generado en el reporte de telemetría de la IA)
 * directamente al mazo compartido del tema en Firestore y LocalStorage, EVITANDO DUPLICADOS.
 */
export async function appendFlashcardsToTopic(topicId, tsvText, addedBy = "Donato") {
  const scheduleItem = getScheduleDay(topicId);
  const resolvedId = scheduleItem ? scheduleItem.topicId : topicId;
  const storageKey = `enarmcito_topic_${scheduleItem ? scheduleItem.code : resolvedId}`;

  const topic = await getTopic(topicId);
  const existingCards = topic.flashcards || [];

  // Conjunto de llaves normalizadas ya existentes para evitar duplicados aunque se presione varias veces
  const seenKeys = new Set(
    existingCards.map((c) => normalizeFlashcardKey(c.front)).filter(Boolean)
  );

  const lines = String(tsvText || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && (l.includes("\t") || l.includes(";")));

  if (lines.length === 0) {
    throw new Error("No se encontraron líneas TSV válidas (Frente <TAB> Reverso).");
  }

  let skippedDuplicates = 0;
  const newCards = [];

  lines.forEach((line, idx) => {
    const delimiter = line.includes("\t") ? "\t" : ";";
    const parts = line.split(delimiter);
    const cleanField = (str = "") => String(str).trim().replace(/^"(.*)"$/, "$1").trim();

    const front = cleanField(parts[0]);
    const back = cleanField(parts[1]);
    const rawTags = cleanField(parts[2]);

    if (!front || !back) return;
    // Ignorar encabezados de tabla accidentales
    if (/^(frente|front|pregunta)$/i.test(front) && /^(reverso|back|respuesta)$/i.test(back)) {
      return;
    }

    const normKey = normalizeFlashcardKey(front);
    if (!normKey) return;

    if (seenKeys.has(normKey)) {
      skippedDuplicates++;
      return;
    }

    seenKeys.add(normKey);
    const parsedTags = rawTags
      ? rawTags.split(/[\s,]+/).map((t) => t.replace(/^#/, "").trim()).filter(Boolean)
      : [scheduleItem?.code || "D01", "TelemetriaIA"];

    newCards.push({
      id: `anki_ia_${Date.now()}_${idx}`,
      front,
      back,
      tags: parsedTags,
      concepto_pivote: inferFlashcardPivot(front, back, parsedTags),
      addedBy
    });
  });

  // Además, si ya había duplicados previos en existingCards, aprovechamos para limpiarlos
  const deduplicatedExisting = [];
  const existingSeen = new Set();
  existingCards.forEach((c) => {
    const k = normalizeFlashcardKey(c.front);
    if (k && !existingSeen.has(k)) {
      existingSeen.add(k);
      deduplicatedExisting.push(c);
    }
  });

  const allMergedCards = [...deduplicatedExisting, ...newCards];

  const updatedTopic = {
    ...topic,
    flashcards: allMergedCards
  };

  localStorage.setItem(storageKey, JSON.stringify(updatedTopic));
  syncUserLocalDecksForTopic(resolvedId, allMergedCards);

  window.dispatchEvent(new CustomEvent("enarmcito_topic_sync", { detail: updatedTopic }));
  window.dispatchEvent(new CustomEvent("enarmcito_anki_sync", { detail: { topicId: resolvedId, cards: allMergedCards } }));

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, "curriculum", resolvedId), updatedTopic, { merge: true });
    } catch (e) {
      console.warn("Error guardando tarjetas Anki en Firestore:", e);
    }
  }

  return { updatedTopic, addedCount: newCards.length, skippedDuplicates };
}

/**
 * Suscripción en tiempo real al tema activo (curriculum/{resolvedId})
 * Permite que cuando Donato suba un cuestionario, recurso o flashcard, le aparezca al instante a Sonia.
 */
export function subscribeToTopic(topicId, callback) {
  const scheduleItem = getScheduleDay(topicId);
  const resolvedId = scheduleItem ? scheduleItem.topicId : topicId;
  const storageKey = `enarmcito_topic_${scheduleItem ? scheduleItem.code : resolvedId}`;
  const cleanData = scheduleItem.code === "D01"
    ? DEFAULT_TOPIC
    : generateTopicFromSchedule(scheduleItem, DEFAULT_TOPIC);

  let unsubFirestore = null;

  if (isFirebaseConfigured && db) {
    try {
      unsubFirestore = onSnapshot(doc(db, "curriculum", resolvedId), (docSnap) => {
        if (docSnap.exists()) {
          const firestoreTopic = docSnap.data();
          const merged = mergeWithCleanTopic(cleanData, firestoreTopic);
          localStorage.setItem(storageKey, JSON.stringify(merged));
          callback(merged);
        }
      });
    } catch (err) {
      console.warn("Listener de tema en Firestore no disponible:", err);
    }
  }

  const handleStorage = (e) => {
    if (e.key === storageKey && e.newValue) {
      try {
        const merged = mergeWithCleanTopic(cleanData, JSON.parse(e.newValue));
        callback(merged);
      } catch {}
    }
  };

  const handleCustomTopicSync = (e) => {
    if (e.detail && (e.detail.id === resolvedId || e.detail.code === scheduleItem?.code)) {
      callback(e.detail);
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener("enarmcito_topic_sync", handleCustomTopicSync);

  return () => {
    if (typeof unsubFirestore === "function") unsubFirestore();
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("enarmcito_topic_sync", handleCustomTopicSync);
  };
}

/**
 * Suscripción en tiempo real a los cambios del dúo Donato & Sonia
 */
export function subscribeToDuoStatus(callback) {
  if (isFirebaseConfigured && db) {
    try {
      const unsub = onSnapshot(doc(db, "meta", "duo_status"), (docSnap) => {
        if (docSnap.exists()) {
          callback(docSnap.data());
        }
      });
      return unsub;
    } catch (err) {
      console.warn("Listener Firestore no disponible:", err);
    }
  }

  // Listener local reactivo en caso de multi-pestaña
  const handleStorage = (e) => {
    if (e.key === STORAGE_KEY_USERS && e.newValue) {
      try {
        callback(JSON.parse(e.newValue));
      } catch (err) {}
    }
  };
  const handleCustomSync = (e) => {
    if (e.detail) callback(e.detail);
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener("enarmcito_user_sync", handleCustomSync);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("enarmcito_user_sync", handleCustomSync);
  };
}

/**
 * ==========================================================
 * GESTIÓN DE EVENTOS DE CALENDARIO (Compartidos y Privados)
 * ==========================================================
 */
const STORAGE_KEY_CALENDAR = "enarmcito_calendar_events";

export async function getCalendarEvents(userId) {
  let events = [];
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, "calendar_events"));
      events = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.warn("Error leyendo eventos de Firestore, fallback local:", err);
    }
  }

  if (events.length === 0) {
    try {
      const local = localStorage.getItem(STORAGE_KEY_CALENDAR);
      if (local) events = JSON.parse(local);
    } catch (e) {}
  }

  return events;
}

export async function saveCalendarEvent(eventData) {
  const eventId = eventData.id || `event_${Date.now()}`;
  const fullEvent = {
    ...eventData,
    id: eventId,
    createdAt: new Date().toISOString()
  };

  // Guardar local
  try {
    const local = JSON.parse(localStorage.getItem(STORAGE_KEY_CALENDAR) || "[]");
    const updated = [fullEvent, ...local.filter(e => e.id !== eventId)];
    localStorage.setItem(STORAGE_KEY_CALENDAR, JSON.stringify(updated));
  } catch (e) {}

  // Guardar en Firestore
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, "calendar_events", eventId), fullEvent, { merge: true });
    } catch (err) {
      console.warn("Error guardando evento en Firestore:", err);
    }
  }

  return fullEvent;
}

export async function deleteCalendarEvent(eventId) {
  try {
    const local = JSON.parse(localStorage.getItem(STORAGE_KEY_CALENDAR) || "[]");
    const filtered = local.filter(e => e.id !== eventId);
    localStorage.setItem(STORAGE_KEY_CALENDAR, JSON.stringify(filtered));
  } catch (e) {}

  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, "calendar_events", eventId));
    } catch (err) {
      console.warn("Error eliminando evento en Firestore:", err);
    }
  }

  return true;
}

