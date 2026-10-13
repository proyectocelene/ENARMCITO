// src/components/Navbar.jsx
import React from "react";
import { useUser } from "../context/UserContext";
import { 
  Flame, 
  Zap, 
  Lock, 
  Settings,
  GraduationCap,
  Home,
  BookOpen,
  Calendar,
  Library,
  Layers
} from "lucide-react";

export function Navbar({ activeTab, setActiveTab }) {
  const { 
    currentUserId, 
    currentUser, 
    activeDayCode,
    setCourseSidebarOpen,
    requestSwitchUser, 
    setSettingsOpen,
    theme
  } = useUser();

  const isExam = theme === "enarm-cifrhs";
  const isDark = theme === "dark";

  // Evaluar si estamos dentro del flujo del tema del día (Fase 0, 1, 2, 3 o vista general)
  const isTopicActive = [
    "topic_day", 
    "pretest_play", 
    "pretest_audit", 
    "resources", 
    "anki", 
    "simulator"
  ].includes(activeTab);

  const navItems = [
    { id: "hub", label: "Hub", icon: Home, isActive: activeTab === "hub", target: "hub" },
    { id: "topic_day", label: `Tema (${activeDayCode})`, icon: BookOpen, isActive: isTopicActive, target: "topic_day" },
    { id: "calendar", label: "Calendario", icon: Calendar, isActive: activeTab === "calendar", target: "calendar" },
    { id: "global_library", label: "Biblioteca", icon: Library, isActive: activeTab === "global_library", target: "global_library" },
    { id: "global_anki", label: "Anki", icon: Layers, isActive: activeTab === "global_anki", target: "global_anki" }
  ];

  return (
    <>
      {/* 1. HEADER SUPERIOR LIMPIO (Desktop y Móvil) - Cero desbordes, márgenes seguros */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b-2 transition-colors w-full ${
        isExam
          ? "bg-white border-slate-300 text-black shadow-xs"
          : isDark
          ? "bg-slate-950/95 border-slate-800 text-slate-100"
          : "bg-white/95 border-slate-200 text-slate-900 shadow-xs"
      }`}>
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-2">
            {/* Logo Protegido con márgenes seguros y sin peligro de taparse */}
            <div 
              className="flex items-center gap-2 cursor-pointer select-none flex-shrink-0" 
              onClick={() => setActiveTab("hub")}
              title="Ir al Hub Principal"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-black text-sm shadow-xs flex-shrink-0">
                🩺
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm tracking-tight bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  ENARMCITO
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-cyan-300 rounded-md border border-blue-200 dark:border-blue-800">
                  Dúo
                </span>
              </div>
            </div>

            {/* Menú de pestañas en Pantallas Grandes (Desktop lg+) */}
            <div className="hidden lg:flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border-2 border-slate-300 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab("hub")}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  activeTab === "hub"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-cyan-400 shadow-xs border border-slate-300 dark:border-slate-600"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              🏠 Hub
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("topic_day")}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                isTopicActive
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-cyan-400 shadow-xs border border-slate-300 dark:border-slate-600"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              📖 Tema ({activeDayCode})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("calendar")}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeTab === "calendar"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-cyan-400 shadow-xs border border-slate-300 dark:border-slate-600"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              📅 Calendario
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("global_library")}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeTab === "global_library"
                  ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-300 dark:border-slate-600"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              📚 Biblioteca
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("global_anki")}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeTab === "global_anki"
                  ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs border border-slate-300 dark:border-slate-600"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              🗂️ Mazos Anki
            </button>
            <button
              type="button"
              onClick={() => setCourseSidebarOpen(true)}
              className="px-2.5 py-1 rounded-lg text-xs font-black text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all flex items-center gap-1 cursor-pointer"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Cursos</span>
            </button>
          </div>

          {/* Gamificación & Usuario Activo en Celular y Desktop */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Racha */}
            <div 
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-black"
              title="Días de racha consecutivos"
            >
              <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{currentUser.streak || 0}d</span>
            </div>

            {/* Píldora de Selección de Usuario Donato / Sonia */}
            <div className="flex items-center p-0.5 rounded-lg border-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => requestSwitchUser("donato")}
                className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-xs font-black transition-all cursor-pointer ${
                  currentUserId === "donato"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
                }`}
                title="Donato"
              >
                <span>👨‍⚕️</span>
                <span className="hidden sm:inline">Donato</span>
                {currentUserId !== "donato" && <Lock className="w-2.5 h-2.5 opacity-60 ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => requestSwitchUser("sonia")}
                className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-xs font-black transition-all cursor-pointer ${
                  currentUserId === "sonia"
                    ? "bg-pink-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
                }`}
                title="Sonia"
              >
                <span>👩‍⚕️</span>
                <span className="hidden sm:inline">Sonia</span>
                {currentUserId !== "sonia" && <Lock className="w-2.5 h-2.5 opacity-60 ml-0.5" />}
              </button>
            </div>

            {/* Botón de Cursos en Móvil */}
            <button
              type="button"
              onClick={() => setCourseSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 transition-all cursor-pointer"
              title="Ver Cursos y Temario"
            >
              <GraduationCap className="w-4 h-4" />
            </button>

            {/* Botón de Configuración */}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 rounded-lg border-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all flex-shrink-0 cursor-pointer"
              title="Ajustes de la PWA"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>

    {/* 2. BARRA DE NAVEGACIÓN INFERIOR NATIVA PARA CELULAR (Bottom Navigation Bar) */}
    {/* Ergonómica para el pulgar, 100% contenida, cero scroll horizontal, cero desbordes */}
    <nav 
      aria-label="Navegación Móvil"
      className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t-2 backdrop-blur-lg transition-colors ${
        isExam
          ? "bg-white/95 border-slate-300 text-black shadow-lg"
          : isDark
          ? "bg-slate-950/95 border-slate-800 text-slate-100 shadow-2xl"
          : "bg-white/95 border-slate-200 text-slate-900 shadow-lg"
      }`}
      style={{
        paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))"
      }}
    >
      <div className="w-full max-w-lg mx-auto grid grid-cols-5 h-14 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.target)}
              className={`flex flex-col items-center justify-center gap-0.5 relative py-1 rounded-xl transition-all cursor-pointer ${
                item.isActive
                  ? "text-blue-600 dark:text-cyan-400 font-black"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
              }`}
            >
              {/* Indicador superior de selección */}
              {item.isActive && (
                <span className="absolute top-0.5 w-6 h-0.5 bg-blue-600 dark:bg-cyan-400 rounded-full" />
              )}
              <Icon className={`w-5 h-5 transition-transform ${item.isActive ? "scale-110" : ""}`} />
              <span className="text-[10px] leading-tight truncate max-w-full px-0.5">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  </>
  );
}
