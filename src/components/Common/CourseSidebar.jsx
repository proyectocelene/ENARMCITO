// src/components/Common/CourseSidebar.jsx
// Panel lateral estilo plataforma de cursos (LMS) para navegar entre Cursos, Semanas, Módulos y Temas
// Permite alternar fácilmente entre CURSO PRE TEMPORADA y CURSO DR RE con desglose de progreso

import React, { useState } from "react";
import { useUser } from "../../context/UserContext";
import { 
  GraduationCap, 
  X, 
  ChevronDown, 
  ChevronRight, 
  CheckCircle2, 
  Circle, 
  BookOpen, 
  FileText, 
  Sparkles, 
  Layers, 
  Search,
  Flame,
  ArrowRight
} from "lucide-react";

export function CourseSidebar() {
  const { 
    courseSidebarOpen, 
    setCourseSidebarOpen,
    coursesCatalog,
    activeCourseId,
    setActiveCourseId,
    activeDayCode,
    switchDay,
    currentUser,
    theme
  } = useUser();

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedModules, setExpandedModules] = useState({
    sem1: true,
    sem2: true,
    sem3: true,
    dr_re_mi: true,
    dr_re_pedia: true,
    dr_re_gyo: true,
    dr_re_cirugia: true
  });

  if (!courseSidebarOpen) return null;

  const isDark = theme === "dark";
  const currentCourse = coursesCatalog.find((c) => c.id === activeCourseId) || coursesCatalog[0];

  const toggleModule = (modId) => {
    setExpandedModules((prev) => ({
      ...prev,
      [modId]: !prev[modId]
    }));
  };

  const handleSelectTopic = (topicItem) => {
    switchDay(topicItem.id || topicItem.code);
    setCourseSidebarOpen(false);
  };

  // Estado de completitud por usuario
  const userCompleted = currentUser.completed_days || {};

  // Filtrar temas por búsqueda si el usuario escribe
  const filterTopics = (topics) => {
    if (!searchQuery.trim()) return topics;
    const q = searchQuery.toLowerCase();
    return topics.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.specialty.toLowerCase().includes(q) ||
        (t.normativa && t.normativa.toLowerCase().includes(q))
    );
  };

  const specialtyBadgeColors = {
    MI: "bg-blue-500/15 text-blue-700 dark:text-cyan-300 border-blue-500/30",
    PED: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    GYO: "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30",
    CIR: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
  };

  return (
    <div className="fixed inset-0 z-50 flex animate-fadeIn">
      {/* Fondo oscuro con desenfoque para cerrar */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        onClick={() => setCourseSidebarOpen(false)}
      />

      {/* Cajón lateral (Sidebar Drawer) */}
      <aside className={`relative z-10 w-full max-w-md sm:max-w-lg h-full flex flex-col shadow-2xl border-r transition-transform duration-200 ease-out ${
        isDark 
          ? "bg-slate-900 border-slate-800 text-white" 
          : "bg-white border-slate-200 text-slate-900"
      }`}>
        {/* Cabecera del Panel */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-1.5">
                <span>Temario & Navegación de Cursos</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Selecciona tu programa de estudio y lección
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCourseSidebarOpen(false)}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Cerrar panel"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Selector de Cursos Principales (Tabs estilo LMS) */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-1">
            Programas Disponibles
          </div>
          <div className="grid grid-cols-2 gap-2">
            {coursesCatalog.map((course) => {
              const isActive = course.id === activeCourseId;
              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => setActiveCourseId(course.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all relative ${
                    isActive
                      ? "border-blue-500 bg-blue-500/10 dark:bg-blue-950/40 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className={`text-xs font-black truncate ${isActive ? "text-blue-600 dark:text-cyan-300" : "text-slate-700 dark:text-slate-300"}`}>
                      {course.title}
                    </span>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 animate-pulse" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                    {course.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Buscador de temas en tiempo real */}
        <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar tema, patología, GPC..."
            className="w-full text-xs bg-transparent border-none outline-none placeholder:text-slate-400 dark:text-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-[11px] text-slate-400 hover:text-slate-600 px-1"
            >
              Borrar
            </button>
          )}
        </div>

        {/* Lista de Módulos y Temas (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {(!currentCourse.modules || currentCourse.modules.length === 0) && (
            <div className="p-8 text-center space-y-3 border border-dashed rounded-2xl border-slate-300 dark:border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto text-xl">
                ⏳
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {currentCourse.title} en preparación
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  {currentCourse.description}
                </p>
              </div>
            </div>
          )}

          {currentCourse.modules && currentCourse.modules.map((mod) => {
            const topics = filterTopics(mod.topics);
            if (topics.length === 0 && searchQuery) return null;

            const isExpanded = expandedModules[mod.id] ?? true;

            // Conteo completado en este módulo
            const completedInModule = topics.filter((t) => userCompleted[t.id || t.code]).length;
            const modulePercent = topics.length > 0 ? Math.round((completedInModule / topics.length) * 100) : 0;

            return (
              <div 
                key={mod.id} 
                className={`border rounded-2xl overflow-hidden transition-colors ${
                  isDark ? "border-slate-800 bg-slate-900/60" : "border-slate-200/90 bg-white"
                }`}
              >
                {/* Cabecera del Módulo (Acordeón) */}
                <button
                  type="button"
                  onClick={() => toggleModule(mod.id)}
                  className={`w-full p-3 flex items-center justify-between gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                    isExpanded ? "border-b border-slate-200 dark:border-slate-800/80" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {mod.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                      <span>{mod.dates}</span>
                      <span>•</span>
                      <span>{completedInModule}/{topics.length} completados</span>
                      {modulePercent > 0 && (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          ({modulePercent}%)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="w-12 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden hidden sm:block">
                      <div 
                        className="bg-emerald-500 h-1.5 rounded-full" 
                        style={{ width: `${modulePercent}%` }} 
                      />
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Sub-lecciones / Temas individuales */}
                {isExpanded && (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
                    {topics.map((t) => {
                      const isCurrentActive = activeDayCode === t.id || activeDayCode === t.code;
                      const isCompleted = userCompleted[t.id || t.code];

                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelectTopic(t)}
                          className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 ${
                            isCurrentActive
                              ? "bg-blue-500/10 dark:bg-blue-950/60 border border-blue-500/40 text-blue-900 dark:text-cyan-200 shadow-2xs font-semibold"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {/* Ícono de Estado */}
                          <div className="mt-0.5 flex-shrink-0">
                            {isCompleted ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
                            ) : isCurrentActive ? (
                              <div className="w-4 h-4 rounded-full border-2 border-blue-500 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                              </div>
                            ) : (
                              <Circle className="w-4 h-4 text-slate-400 opacity-60" />
                            )}
                          </div>

                          {/* Info del Tema */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-[10px] font-black px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                                {t.code}
                              </span>
                              {t.specialty && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${specialtyBadgeColors[t.specialty] || "bg-slate-500/10"}`}>
                                  {t.specialty}
                                </span>
                              )}
                              {isCurrentActive && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-blue-600 text-white">
                                  En Curso
                                </span>
                              )}
                            </div>

                            <div className="text-xs font-bold leading-snug mt-1 truncate">
                              {t.title}
                            </div>

                            {t.normativa && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                📜 {t.normativa}
                              </div>
                            )}

                            {/* Flashcards Dr Re asignadas */}
                            {t.drRePdfs && t.drRePdfs.length > 0 && (
                              <div className="mt-1 flex items-center gap-1 flex-wrap">
                                {t.drRePdfs.map((pdf, pIdx) => (
                                  <span 
                                    key={pIdx} 
                                    className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 truncate max-w-[200px]"
                                  >
                                    {pdf.label || pdf.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <ArrowRight className={`w-3.5 h-3.5 flex-shrink-0 mt-1 transition-transform ${isCurrentActive ? "text-blue-500 translate-x-0.5" : "text-slate-400 opacity-40"}`} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pie del Panel con indicador de avance */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Tema Activo:
            </span>
            <span className="font-mono font-black text-blue-600 dark:text-cyan-400">
              {activeDayCode}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCourseSidebarOpen(false)}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
          >
            Continuar Estudio
          </button>
        </div>
      </aside>
    </div>
  );
}
