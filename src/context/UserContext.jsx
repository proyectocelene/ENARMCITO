// src/context/UserContext.jsx
// Gestión del usuario activo con PIN de seguridad (1234), racha, puntos y accesibilidad visual ENARM

import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  getUsersState, 
  updateUserData, 
  getTopic, 
  subscribeToDuoStatus, 
  INITIAL_USERS_STATE 
} from "../firebase/firestoreService";
import { isFirebaseConfigured } from "../firebase/firebaseConfig";
import confetti from "canvas-confetti";

const UserContext = createContext();

export const USER_PINS = {
  donato: "8296",
  sonia: "1234"
};

export function UserProvider({ children }) {
  // Usuario activo en sesión
  const [currentUserId, setCurrentUserId] = useState(() => {
    return localStorage.getItem("enarmcito_active_user") || null;
  });

  const [users, setUsers] = useState(INITIAL_USERS_STATE);
  const [topic, setTopic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cheerNotice, setCheerNotice] = useState(null);

  // Modal de PIN para cambio de usuario
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState(null);

  // Preferencias de Accesibilidad Visual y Modo Examen
  // Forzar "enarm-cifrhs" (Blanco Puro CIFRHS, texto negro de alto contraste) por defecto
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("enarmcito_theme");
    // Si no está guardado o estaba guardado en oscuro antiguo, activar Modo Examen Blanco
    if (!saved || saved === "dark") {
      localStorage.setItem("enarmcito_theme", "enarm-cifrhs");
      return "enarm-cifrhs";
    }
    return saved;
  });

  // fontPreference: "Arial" | "Helvetica" | "Inter"
  const [fontPreference, setFontPreference] = useState(() => {
    return localStorage.getItem("enarmcito_font") || "Arial";
  });
  // fontSize: "11pt" | "12pt" | "14pt" (12pt es la oficial del ENARM = 16px)
  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem("enarmcito_fontsize") || "12pt";
  });

  // Aplicar tema y tipografía al DOM raíz
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
      // Modo oficial CIFRHS: Fondo blanco puro, texto negro sólido para acostumbrar los ojos al examen
      root.classList.add("theme-enarm-cifrhs");
      document.body.className = "theme-enarm-cifrhs bg-white text-black antialiased min-h-screen";
    }

    localStorage.setItem("enarmcito_theme", theme);
  }, [theme]);

  // Aplicar fuente preferida
  useEffect(() => {
    localStorage.setItem("enarmcito_font", fontPreference);
    localStorage.setItem("enarmcito_fontsize", fontSize);
  }, [fontPreference, fontSize]);

  // Monitor online/offline
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

  // Carga inicial y suscripción dúo
  useEffect(() => {
    async function init() {
      try {
        const u = await getUsersState();
        setUsers(u);
        const t = await getTopic();
        setTopic(t);
      } catch (err) {
        console.error("Error inicializando contexto:", err);
      } finally {
        setLoading(false);
      }
    }
    init();

    const unsub = subscribeToDuoStatus((updatedUsers) => {
      setUsers(updatedUsers);
    });

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

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

  // Marcar fase como completada y lanzar confeti
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
    const newStatus = {
      [key]: true,
      ...extraData
    };

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    await updateUserData(activeId, {
      xp: (currentUser.xp || 0) + xpGained,
      today_status: newStatus
    });
  };

  // Enviar un "Toque" motivacional al compañero
  const sendCheerToPartner = async () => {
    setCheerNotice(`¡Le enviaste un toque a ${partnerUser.name}!`);
    setTimeout(() => setCheerNotice(null), 4000);

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 }
    });
  };

  return (
    <UserContext.Provider
      value={{
        currentUserId,
        isUserSelected: Boolean(currentUserId),
        currentUser,
        partnerId,
        partnerUser,
        users,
        requestSwitchUser,
        confirmPinAndSwitch,
        selectInitialUser,
        pinModalOpen,
        setPinModalOpen,
        targetUserId,
        topic,
        setTopic,
        markPhaseComplete,
        sendCheerToPartner,
        isOnline,
        isFirebase: isFirebaseConfigured,
        cheerNotice,
        loading,
        // Configuración de vista y accesibilidad
        theme,
        setTheme,
        fontPreference,
        setFontPreference,
        fontSize,
        setFontSize
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
