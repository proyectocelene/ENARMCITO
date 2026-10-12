// src/firebase/firestoreService.js
// Servicio unificado de datos (Firestore en la nube con fallback reactivo a LocalStorage)

import { db, isFirebaseConfigured } from "./firebaseConfig";
import { DEFAULT_TOPIC } from "./defaultData";
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  onSnapshot, 
  serverTimestamp 
} from "firebase/firestore";

const STORAGE_KEY_TOPIC = "enarmcito_topic_d01";
const STORAGE_KEY_USERS = "enarmcito_users_state";
const STORAGE_KEY_ATTEMPTS = "enarmcito_attempts";
const STORAGE_KEY_FLASHCARDS = "enarmcito_flashcards";

// Estado inicial para los dos usuarios
export const INITIAL_USERS_STATE = {
  donato: {
    id: "donato",
    name: "Donato",
    avatar: "👨‍⚕️",
    streak: 3,
    xp: 450,
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
    streak: 4,
    xp: 520,
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

/**
 * Obtiene el tema del día (D01 por defecto o de Firestore/Local)
 */
export async function getTopic(topicId = "D01_MI_Diabetes_Mellitus_CAD_EHH") {
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, "curriculum", topicId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data();
      }
    } catch (err) {
      console.warn("Error leyendo tema de Firestore, usando caché local:", err);
    }
  }

  // Fallback LocalStorage
  const localData = localStorage.getItem(STORAGE_KEY_TOPIC);
  if (localData) {
    try {
      return JSON.parse(localData);
    } catch (e) {
      // Ignorar error y usar DEFAULT_TOPIC
    }
  }

  // Guardar DEFAULT_TOPIC inicialmente
  localStorage.setItem(STORAGE_KEY_TOPIC, JSON.stringify(DEFAULT_TOPIC));
  return DEFAULT_TOPIC;
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
  const attempt = {
    id: `attempt_${userId}_${Date.now()}`,
    userId,
    topicId,
    timestamp: new Date().toISOString(),
    stats
  };

  // Guardar en histórico local
  try {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY_ATTEMPTS) || "[]");
    history.unshift(attempt);
    localStorage.setItem(STORAGE_KEY_ATTEMPTS, JSON.stringify(history.slice(0, 50)));
  } catch (e) {}

  // Actualizar estado del usuario (+100 XP por completar el Pre-test)
  await updateUserData(userId, {
    xp: (await getUsersState())[userId].xp + 100,
    today_status: {
      phase0_done: true,
      phase0_score: stats.grossScorePercent
    }
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

  localStorage.setItem(STORAGE_KEY_TOPIC, JSON.stringify(updatedTopic));
  window.dispatchEvent(new CustomEvent("enarmcito_topic_sync", { detail: updatedTopic }));

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, "curriculum", topicId), updatedTopic, { merge: true });
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
  const topic = await getTopic(topicId);
  const resources = (topic.resources || []).filter(r => r.id !== resourceId);

  const updatedTopic = {
    ...topic,
    resources
  };

  localStorage.setItem(STORAGE_KEY_TOPIC, JSON.stringify(updatedTopic));
  window.dispatchEvent(new CustomEvent("enarmcito_topic_sync", { detail: updatedTopic }));

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, "curriculum", topicId), updatedTopic, { merge: true });
    } catch (e) {
      console.warn("Error eliminando recurso en Firestore:", e);
    }
  }

  return updatedTopic;
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
