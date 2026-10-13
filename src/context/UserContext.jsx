// src/context/UserContext.jsx
// Gestión del usuario activo con PIN, rango médico, racha, puntos XP, gamificación dúo,
// cronograma de 18 días de pretemporada y configuración de tipografía/tamaño por dispositivo

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { 
  getUsersState, 
  updateUserData, 
  getTopic, 
  subscribeToTopic,
  subscribeToDuoStatus, 
  INITIAL_USERS_STATE 
} from "../firebase/firestoreService";
import { isFirebaseConfigured } from "../firebase/firebaseConfig";
import { PRESEASON_SCHEDULE, getScheduleDay } from "../data/preseasonSchedule";
import { COURSES_CATALOG } from "../data/coursesCatalog";
import confetti from "canvas-confetti";

const UserContext = createContext();

export const USER_PINS = {
  donato: "8296",
  sonia: "1234"
};

// Mapa exhaustivo de fuentes con tipografías web reales
export const FONT_MAP = {
  Arial: "Arial, 'Helvetica Neue', sans-serif",
  Inter: "'Inter', sans-serif",
  Roboto: "'Roboto', sans-serif",
  Merriweather: "'Merriweather', Georgia, serif",
  Helvetica: "'Helvetica Neue', Helvetica, Arial, sans-serif"
};

// Escala de Rangos Médicos de Gamificación
export const MEDICAL_RANKS = [
  { minXp: 0, title: "MIP (Médico Interno)", icon: "🩺", nextAt: 300 },
  { minXp: 300, title: "MPSS (Pasante)", icon: "🏥", nextAt: 700 },
  { minXp: 700, title: "Aspirante ENARM", icon: "📚", nextAt: 1200 },
  { minXp: 1200, title: "R1 Medicina Interna", icon: "⭐", nextAt: 2000 },
  { minXp: 2000, title: "R2 Guardia Mayor", icon: "🛡️", nextAt: 3000 },
  { minXp: 3000, title: "Jefe de Residentes", icon: "👑", nextAt: 5000 }
];

export function getMedicalRank(xp = 0) {
  for (let i = MEDICAL_RANKS.length - 1; i >= 0; i--) {
    if (xp >= MEDICAL_RANKS[i].minXp) {
      const current = MEDICAL_RANKS[i];
      const prevXp = current.minXp;
      const nextXp = current.nextAt;
      const progressPercent = Math.min(100, Math.round(((xp - prevXp) / (nextXp - prevXp)) * 100));
      return { ...current, level: i + 1, progressPercent };
    }
  }
  return { ...MEDICAL_RANKS[0], level: 1, progressPercent: 0 };
}

export function UserProvider({ children }) {
  // Usuario activo en sesión
  const [currentUserId, setCurrentUserId] = useState(() => {
    return localStorage.getItem("enarmcito_active_user") || null;
  });

  // Día activo de la Pretemporada (D01 a D18)
  const [activeDayCode, setActiveDayCode] = useState(() => {
    return localStorage.getItem("enarmcito_active_day") || "D01";
  });

  const [users, setUsers] = useState(INITIAL_USERS_STATE);
  const [topic, setTopic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [incomingCheer, setIncomingCheer] = useState(null);

  // Modal de PIN para cambio de usuario
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState(null);

  // Modales principales & Panel de Navegación lateral tipo LMS
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [courseSidebarOpen, setCourseSidebarOpen] = useState(false);

  // Curso seleccionado ('preseason' | 'dr_re')
  const [activeCourseId, setActiveCourseId] = useState(() => {
    return localStorage.getItem("enarmcito_active_course") || "preseason";
  });

  // Preferencias de Accesibilidad Visual guardadas en el dispositivo específico
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("enarmcito_theme");
    return saved || "enarm-cifrhs";
  });

  const [fontPreference, setFontPreference] = useState(() => {
    return localStorage.getItem("enarmcito_font") || "Arial";
  });

  // Tamaño de fuente en píxeles configurable libremente (12px a 24px)
  const [customFontSize, setCustomFontSize] = useState(() => {
    const saved = localStorage.getItem("enarmcito_fontsize_px");
    return saved ? parseInt(saved, 10) : 16;
  });

  // Aplicar tema al DOM raíz
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light", "theme-dark", "theme-light", "theme-enarm-cifrhs");

    if (theme === "dark") {
      root.classList.add("dark", "theme-dark");
      document.body.className = "theme-dark bg-slate-950 text-slate-100 antialiased min-h-screen";
    } else if (theme === "light") {
      root.classList.add("light", "theme-light");
      document.body.className = "theme-light bg-slate-50 text-slate-900 antialiased min-h-screen";
    } else {
      // Modo oficial CIFRHS: Fondo blanco puro, texto negro de alto contraste
      root.classList.add("theme-enarm-cifrhs");
      document.body.className = "theme-enarm-cifrhs bg-white text-black antialiased min-h-screen";
    }

    localStorage.setItem("enarmcito_theme", theme);
  }, [theme]);

  // Aplicar variables CSS de tipografía dinámicamente en todo el documento
  useEffect(() => {
    const root = document.documentElement;
    const chosenFont = FONT_MAP[fontPreference] || "Arial, sans-serif";

    root.style.setProperty("--font-clinical", chosenFont);
    root.style.setProperty("--font-size-clinical", `${customFontSize}px`);
    root.style.setProperty("--font-size-options", `${Math.max(13, customFontSize - 1)}px`);

    document.body.style.setProperty("font-family", chosenFont, "important");

    localStorage.setItem("enarmcito_font", fontPreference);
    localStorage.setItem("enarmcito_fontsize_px", customFontSize.toString());
  }, [fontPreference, customFontSize]);

  // Monitor de conectividad
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Carga inicial y suscripción dúo con purga única de datos mockeados antiguos
  useEffect(() => {
    async function init() {
      try {
        // Purgar una sola vez claves viejas de topics con mocks o cachés sin reactivos
        if (!localStorage.getItem("enarmcito_purged_topics_v4")) {
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (
              k && (
                k.startsWith("enarmcito_topic_") ||
                k === "enarmcito_topic_d01"
              )
            ) {
              keysToRemove.push(k);
            }
          }
          keysToRemove.forEach((k) => localStorage.removeItem(k));
          localStorage.setItem("enarmcito_purged_topics_v4", "true");
        }

        const u = await getUsersState();
        setUsers(u);
        const savedDay = localStorage.getItem("enarmcito_active_day") || "D01";
        const loadedTopic = await getTopic(savedDay);
        setTopic(loadedTopic);
      } catch (err) {
        console.error("Error inicializando contexto:", err);
      } finally {
        setLoading(false);
      }
    }
    init();

    const handleTopicSync = (e) => {
      if (e.detail) {
        setTopic(e.detail);
      }
    };
    window.addEventListener("enarmcito_topic_sync", handleTopicSync);

    const unsub = subscribeToDuoStatus((updatedUsers) => {
      setUsers(updatedUsers);

      const activeId = localStorage.getItem("enarmcito_active_user") || "donato";
      const myData = updatedUsers[activeId];
      if (myData?.incoming_cheer && myData.incoming_cheer.timestamp) {
        const cheerTime = new Date(myData.incoming_cheer.timestamp).getTime();
        if (Date.now() - cheerTime < 30000) {
          setIncomingCheer(myData.incoming_cheer);
        }
      }
    });

    return () => {
      window.removeEventListener("enarmcito_topic_sync", handleTopicSync);
      if (typeof unsub === "function") unsub();
    };
  }, []);

  // Suscripción en tiempo real al tema del día activo (Firestore + pestañas) para que Sonia reciba al instante los cuestionarios que suba Donato
  useEffect(() => {
    if (!activeDayCode) return;
    const unsubTopic = subscribeToTopic(activeDayCode, (liveTopic) => {
      if (liveTopic) {
        setTopic(liveTopic);
      }
    });
    return () => {
      if (typeof unsubTopic === "function") unsubTopic();
    };
  }, [activeDayCode]);

  // Cambiar día activo de estudio (D01 a D18)
  const switchDay = async (dayCode) => {
    setActiveDayCode(dayCode);
    localStorage.setItem("enarmcito_active_day", dayCode);
    setLoading(true);
    try {
      const loadedTopic = await getTopic(dayCode);
      setTopic(loadedTopic);
    } catch (err) {
      console.error("Error cambiando de tema:", err);
    } finally {
      setLoading(false);
    }
  };

  // Obtener el día calendario correspondiente a hoy (12 de Octubre = D01)
  const getTodayDayCode = () => "D01";

  const goToToday = () => {
    switchDay(getTodayDayCode());
  };

  // Solicitar cambio de usuario
  const requestSwitchUser = (userId) => {
    if (userId === currentUserId) return;
    setTargetUserId(userId);
    setPinModalOpen(true);
  };

  // Validar PIN y confirmar cambio
  const confirmPinAndSwitch = (inputPin) => {
    const requiredPin = USER_PINS[targetUserId];
    if (inputPin === requiredPin) {
      if (targetUserId) {
        setCurrentUserId(targetUserId);
        localStorage.setItem("enarmcito_active_user", targetUserId);
      }
      setPinModalOpen(false);
      setTargetUserId(null);
      return true;
    }
    return false;
  };

  // Primer login
  const selectInitialUser = (userId, inputPin) => {
    const requiredPin = USER_PINS[userId];
    if (inputPin === requiredPin) {
      setCurrentUserId(userId);
      localStorage.setItem("enarmcito_active_user", userId);
      return true;
    }
    return false;
  };

  const activeId = currentUserId || "donato";
  const currentUser = users[activeId] || INITIAL_USERS_STATE[activeId];
  const partnerId = activeId === "donato" ? "sonia" : "donato";
  const partnerUser = users[partnerId] || INITIAL_USERS_STATE[partnerId];

  // Obtener estado específico por día / tema (evita que un tema marque a los demás como hechos)
  const getDayStatus = (dayCode) => {
    const code = dayCode || activeDayCode || "D01";

    // 1. Si existe progreso guardado explícito para ese día
    if (currentUser.day_progress && currentUser.day_progress[code]) {
      return currentUser.day_progress[code];
    }

    // 2. Si el día solicitado es HOY ("D01") y solo está en today_status
    if (code === getTodayDayCode() && currentUser.today_status?.phase0_done) {
      return currentUser.today_status;
    }

    // 3. Revisar si hay intento guardado en LocalStorage para ese día/tema
    try {
      const attempts = JSON.parse(localStorage.getItem("enarmcito_attempts") || "[]");
      const matched = attempts.find(a => 
        (a.topicId && a.topicId.startsWith(code)) || 
        (a.dayCode === code)
      );
      if (matched) {
        return {
          phase0_done: true,
          phase0_score: matched.stats?.grossScorePercent || 0,
          phase1_done: false,
          phase2_done: false,
          phase3_done: false
        };
      }
    } catch {}

    // 4. Por defecto, el tema NO ha sido contestado
    return {
      phase0_done: false,
      phase0_score: 0,
      phase1_done: false,
      phase2_done: false,
      phase2_cards_reviewed: 0,
      phase3_done: false,
      phase3_score: 0
    };
  };

  // Marcar fase como completada y otorgar XP con confeti
  const markPhaseComplete = async (phaseNumber, extraData = {}) => {
    const fieldMap = {
      0: "phase0_done",
      1: "phase1_done",
      2: "phase2_done",
      3: "phase3_done"
    };
    const key = fieldMap[phaseNumber];
    if (!key) return;

    const xpGained = phaseNumber === 0 ? 100 : phaseNumber === 3 ? 150 : 50;
    const currentDayStatus = getDayStatus(activeDayCode);
    const newDayStatus = {
      ...currentDayStatus,
      [key]: true,
      ...extraData
    };

    const updatedDayProgress = {
      ...(currentUser.day_progress || {}),
      [activeDayCode]: newDayStatus
    };

    // Registrar tema completado si se completaron las 4 fases
    const updatedCompletedDays = {
      ...(currentUser.completed_days || {})
    };
    if (newDayStatus.phase0_done && newDayStatus.phase1_done && newDayStatus.phase2_done && newDayStatus.phase3_done) {
      updatedCompletedDays[activeDayCode] = true;
    }

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    const isToday = activeDayCode === getTodayDayCode();

    await updateUserData(activeId, {
      xp: (currentUser.xp || 0) + xpGained,
      day_progress: updatedDayProgress,
      today_status: isToday ? newDayStatus : (currentUser.today_status || {}),
      completed_days: updatedCompletedDays
    });
  };

  // Enviar una reacción interactiva al compañero
  const sendCheerToPartner = async (cheerText = "¡Mucho éxito en el estudio de hoy! 🔥", cheerIcon = "⚡") => {
    const cheerPayload = {
      senderId: activeId,
      senderName: currentUser.name,
      message: cheerText,
      icon: cheerIcon,
      timestamp: new Date().toISOString()
    };

    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.7 }
    });

    await updateUserData(partnerId, {
      incoming_cheer: cheerPayload
    });

    return cheerPayload;
  };

  const clearIncomingCheer = () => {
    setIncomingCheer(null);
  };

  const userRank = getMedicalRank(currentUser.xp || 0);
  const partnerRank = getMedicalRank(partnerUser.xp || 0);

  return (
    <UserContext.Provider
      value={{
        currentUserId,
        isUserSelected: Boolean(currentUserId),
        currentUser,
        partnerId,
        partnerUser,
        users,
        userRank,
        partnerRank,
        // Cronograma y tema activo
        schedule: PRESEASON_SCHEDULE,
        activeDayCode,
        switchDay,
        goToToday,
        getTodayDayCode,
        scheduleModalOpen,
        setScheduleModalOpen,
        // Navegación de Cursos LMS
        coursesCatalog: COURSES_CATALOG,
        activeCourseId,
        setActiveCourseId: (id) => {
          setActiveCourseId(id);
          localStorage.setItem("enarmcito_active_course", id);
        },
        courseSidebarOpen,
        setCourseSidebarOpen,
        requestSwitchUser,
        confirmPinAndSwitch,
        selectInitialUser,
        pinModalOpen,
        setPinModalOpen,
        targetUserId,
        topic,
        setTopic,
        getDayStatus,
        markPhaseComplete,
        sendCheerToPartner,
        incomingCheer,
        clearIncomingCheer,
        isOnline,
        isFirebase: isFirebaseConfigured,
        loading,
        settingsOpen,
        setSettingsOpen,
        theme,
        setTheme,
        fontPreference,
        setFontPreference,
        customFontSize,
        setCustomFontSize
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser debe usarse dentro de UserProvider");
  return ctx;
}
