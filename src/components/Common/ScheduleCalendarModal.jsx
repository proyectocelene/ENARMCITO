// src/components/Common/ScheduleCalendarModal.jsx
// Modal del Cronograma Operativo de Pretemporada — ENARM 2027 (18 Días de Octubre 2026)

import React, { useState } from "react";
import { useUser } from "../../context/UserContext";
import { 
  Calendar, 
  X, 
  CheckCircle2, 
  Circle, 
  FileText, 
  ArrowRight, 
  BookOpen, 
  Sparkles,
  Layers,
  ChevronRight
} from "lucide-react";

export function ScheduleCalendarModal() {
  const { 
    scheduleModalOpen, 
    setScheduleModalOpen, 
    schedule, 
    activeDayCode, 
    switchDay, 
    currentUser, 
    partnerUser, 
    theme 
  } = useUser();

  const [activeWeekTab, setActiveWeekTab] = useState(1);
  const isDark = theme === "dark";

  if (!scheduleModalOpen) return null;

  // Cálculo de temas completados
  const userCompleted = currentUser.completed_days || {};
  const completedCount = Object.keys(userCompleted).length;
  const progressPercent = Math.round((completedCount / schedule.length) * 100);

  const specialtyColors = {
    MI: "bg-blue-600/15 text-blue-700 dark:text-cyan-300 border-blue-500/30",
    PED: "bg-amber-600/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    GYO: "bg-pink-600/15 text-pink-700 dark:text-pink-300 border-pink-500/30",
    CIR: "bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
  };

  const handleSelectDay = (dayCode) => {
    switchDay(dayCode);
    setScheduleModalOpen(false);
  };

  const currentWeekDays = schedule.filter((s) => s.week === activeWeekTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className={`border rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden ${
        isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-900"
      }`}>
        {/* Encabezado */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-xs flex-shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg leading-tight truncate">
                  Cronograma de Pretemporada — ENARM 2027
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-cyan-300">
                  Octubre 2026
                </span>
              </div>
              <p className="text-xs opacity-70">
                18 Días de Alto Impacto Clínico • Fases 0 a 3 (Pre-Test, GPC, Anki FSRS, Simulador)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setScheduleModalOpen(false)}
            className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Progreso Global del Temario (Estilo Dataview Obsidian) */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <span>🚀 Avance de Temas de Pretemporada:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold font-mono text-sm">
                {progressPercent}%
              </strong>
            </span>
            <span className="opacity-70 font-mono text-[11px]">
              {completedCount} de {schedule.length} temas completados
            </span>
          </div>

          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500 shadow-xs"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Pestañas de Semanas */}
        <div className="px-4 sm:px-6 pt-3 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          {[
            { week: 1, label: "Semana 1: MI + Pediatría", range: "12-17 Oct" },
            { week: 2, label: "Semana 2: Pediatría + GYO", range: "19-24 Oct" },
            { week: 3, label: "Semana 3: GYO + Cirugía", range: "26-31 Oct" }
          ].map((w) => (
            <button
              key={w.week}
              type="button"
              onClick={() => setActiveWeekTab(w.week)}
              className={`pb-2.5 px-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all flex items-center gap-1.5 ${
                activeWeekTab === w.week
                  ? "border-blue-600 text-blue-600 dark:text-cyan-400 font-black"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <span>{w.label}</span>
              <span className="text-[10px] font-normal opacity-70 font-mono">({w.range})</span>
            </button>
          ))}
        </div>

        {/* Lista de Días de la Semana Seleccionada */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {currentWeekDays.map((day) => {
            const isActive = day.code === activeDayCode;
            const isDone = Boolean(userCompleted[day.code]);
            const badgeColor = specialtyColors[day.specialty] || specialtyColors.MI;

            return (
              <div
                key={day.code}
                className={`border rounded-2xl p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isActive
                    ? "bg-blue-50/70 dark:bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/20 shadow-sm"
                    : isDone
                    ? "bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-300 dark:border-emerald-800/40"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg font-mono font-black text-xs bg-slate-900 text-white dark:bg-slate-800">
                      {day.code}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${badgeColor}`}>
                      {day.specialty} • {day.specialtyName}
                    </span>
                    <span className="text-[11px] font-semibold opacity-60 font-mono">
                      📅 {day.dates}
                    </span>
                    {isDone && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Completado</span>
                      </span>
                    )}
                    {isActive && (
                      <span className="text-[10px] font-bold text-blue-600 dark:text-cyan-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                        ● Tema Activo
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm sm:text-base font-extrabold leading-tight text-slate-950 dark:text-white">
                    {day.title}
                  </h4>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                    {day.summary}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
                    <span className="opacity-70 font-mono">
                      📖 {day.normativa}
                    </span>
                    <span className="opacity-50">•</span>
                    <div className="flex items-center gap-1 text-purple-700 dark:text-purple-300 font-semibold">
                      <Layers className="w-3 h-3 text-purple-500" />
                      <span>{day.drRePdfs.map(p => p.label).join(" / ")}</span>
                    </div>
                  </div>
                </div>

                <div className="sm:flex-shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleSelectDay(day.code)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 ${
                      isActive
                        ? "bg-blue-600 text-white hover:bg-blue-500"
                        : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700"
                    }`}
                  >
                    <span>{isActive ? "Estudiando Ahora" : "Seleccionar Día"}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
