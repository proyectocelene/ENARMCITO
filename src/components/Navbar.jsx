// src/components/Navbar.jsx
import React from "react";
import { useUser } from "../context/UserContext";
import { 
  Flame, 
  Zap, 
  Cloud, 
  Wifi, 
  WifiOff, 
  Lock, 
  Sun, 
  Moon, 
  FileText 
} from "lucide-react";

export function Navbar({ activeTab, setActiveTab }) {
  const { 
    currentUserId, 
    currentUser, 
    requestSwitchUser, 
    isOnline, 
    isFirebase,
    theme,
    setTheme
  } = useUser();

  const toggleTheme = () => {
    if (theme === "dark") setTheme("light");
    else if (theme === "light") setTheme("enarm-cifrhs");
    else setTheme("dark");
  };

  return (
    <header className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors ${
      theme === "enarm-cifrhs"
        ? "bg-white/95 border-gray-300 text-gray-900 shadow-sm"
        : theme === "light"
        ? "bg-slate-100/95 border-slate-200 text-slate-900 shadow-sm"
        : "bg-slate-900/90 border-slate-800 text-slate-100"
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo y Fase */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("hub")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-bold text-xl">
              🩺
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 bg-clip-text text-transparent">
                  ENARMCITO
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-full">
                  Dúo
                </span>
              </div>
              <p className="text-xs opacity-75 flex items-center gap-1">
                <span>Pre-Temporada</span>
                <span>•</span>
                <span className="font-semibold text-cyan-600 dark:text-cyan-400">Octubre</span>
              </p>
            </div>
          </div>

          {/* Gamificación & Usuario Activo */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Racha */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500 dark:text-amber-400 text-xs font-semibold" title="Racha de estudio consecutiva">
              <Flame className="w-4 h-4 fill-amber-400 text-amber-500 animate-pulse" />
              <span>{currentUser.streak || 1} días</span>
            </div>

            {/* Puntos XP */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-600 dark:text-purple-300 text-xs font-semibold" title="Puntos de experiencia acumulados">
              <Zap className="w-4 h-4 fill-purple-400 text-purple-400" />
              <span>{currentUser.xp || 0} XP</span>
            </div>

            {/* Toggle rápido de Tema */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-800/20 hover:bg-slate-800/40 border border-slate-700/30 transition-all text-xs"
              title={
                theme === "dark"
                  ? "Cambiar a Modo Claro"
                  : theme === "light"
                  ? "Cambiar a Modo Oficial ENARM CIFRHS (Blanco Puro)"
                  : "Cambiar a Modo Oscuro"
              }
            >
              {theme === "dark" ? (
                <Moon className="w-4 h-4 text-cyan-400" />
              ) : theme === "light" ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <FileText className="w-4 h-4 text-blue-600" />
              )}
            </button>

            {/* Estado de sincronización */}
            <div className="flex items-center text-xs opacity-75" title={isFirebase ? "Conectado a Firebase Cloud" : "Almacenamiento Local Offline"}>
              {isOnline ? (
                isFirebase ? (
                  <Cloud className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Wifi className="w-4 h-4 text-cyan-500" />
                )
              ) : (
                <WifiOff className="w-4 h-4 text-rose-500" />
              )}
            </div>

            {/* Switcher Protegido por PIN Donato / Sonia */}
            <div className="flex items-center bg-slate-800/30 p-1 rounded-xl border border-slate-700/40">
              <button
                type="button"
                onClick={() => requestSwitchUser("donato")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  currentUserId === "donato"
                    ? "bg-blue-600 text-white shadow-sm font-bold"
                    : "opacity-60 hover:opacity-100"
                }`}
                title="Cambiar a Donato (Requiere PIN 1234)"
              >
                <span>👨‍⚕️</span>
                <span className="hidden sm:inline">Donato</span>
                {currentUserId !== "donato" && <Lock className="w-2.5 h-2.5 opacity-60 ml-0.5" />}
              </button>
              <button
                type="button"
                onClick={() => requestSwitchUser("sonia")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  currentUserId === "sonia"
                    ? "bg-pink-600 text-white shadow-sm font-bold"
                    : "opacity-60 hover:opacity-100"
                }`}
                title="Cambiar a Sonia (Requiere PIN 1234)"
              >
                <span>👩‍⚕️</span>
                <span className="hidden sm:inline">Sonia</span>
                {currentUserId !== "sonia" && <Lock className="w-2.5 h-2.5 opacity-60 ml-0.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
