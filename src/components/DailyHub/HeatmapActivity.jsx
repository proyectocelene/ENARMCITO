// src/components/DailyHub/HeatmapActivity.jsx
// Mapa de Calor de Actividad Clínica y Repasos FSRS (Estilo GitHub / Anki Heatmap)
// Muestra la constancia diaria, tarjetas revisadas, casos clínicos resueltos y temas completados

import React, { useMemo } from "react";
import { Flame, Brain, Calendar, Award } from "lucide-react";

export function HeatmapActivity({ currentUser, partnerUser, theme }) {
  const isDark = theme === "dark";
  const isExam = theme === "enarm-cifrhs";

  // Generar los últimos 84 días (12 semanas)
  const heatmapData = useMemo(() => {
    const days = [];
    const today = new Date();
    // Iniciar 12 semanas atrás (84 días)
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 83);

    // Actividad registrada del usuario actual
    const activityLog = currentUser?.activity_log || {};

    let totalCardsReviewed = 0;
    let activeDaysCount = 0;

    for (let i = 0; i < 84; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateKey = d.toISOString().split("T")[0]; // YYYY-MM-DD
      const dayActivity = activityLog[dateKey] || { count: 0, cards: 0, completedTopic: false };

      const count = dayActivity.count || dayActivity.cards || 0;
      if (count > 0) {
        activeDaysCount++;
        totalCardsReviewed += count;
      }

      // Nivel de intensidad (0 a 4)
      let level = 0;
      if (count >= 30) level = 4;
      else if (count >= 15) level = 3;
      else if (count >= 5) level = 2;
      else if (count > 0) level = 1;

      // Si es hoy
      const isToday = dateKey === today.toISOString().split("T")[0];

      days.push({
        date: d,
        dateKey,
        dayOfWeek: d.getDay(),
        count,
        level,
        isToday,
        completedTopic: dayActivity.completedTopic || false
      });
    }

    return { days, totalCardsReviewed, activeDaysCount };
  }, [currentUser]);

  // Colores según intensidad
  const getCellColor = (level, isToday) => {
    if (level === 0) {
      return isDark ? "bg-slate-800/80 border-slate-700/60" : "bg-slate-100 border-slate-300";
    }
    if (level === 1) {
      return "bg-emerald-200 dark:bg-emerald-900/60 border-emerald-400 dark:border-emerald-700";
    }
    if (level === 2) {
      return "bg-emerald-400 dark:bg-emerald-700 border-emerald-500 dark:border-emerald-600";
    }
    if (level === 3) {
      return "bg-emerald-500 dark:bg-emerald-600 border-emerald-600 dark:border-emerald-500";
    }
    return "bg-emerald-600 dark:bg-emerald-400 border-emerald-700 dark:border-emerald-300";
  };

  const dayNames = ["D", "L", "M", "M", "J", "V", "S"];

  return (
    <div className={`border-2 rounded-2xl p-4 sm:p-5 transition-all shadow-sm ${
      isExam 
        ? "bg-white border-black text-black"
        : isDark 
        ? "bg-slate-900 border-slate-700 text-white" 
        : "bg-white border-slate-300 text-slate-900"
    }`}>
      {/* Cabecera del Heatmap */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b-2 border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xs">
            <Flame className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm sm:text-base leading-tight">
                Consistencia y Actividad FSRS
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black border-2 border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                12 Semanas
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Historial de tarjetas revisadas y temas completados por día
            </p>
          </div>
        </div>

        {/* Estadísticas de actividad */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="font-bold text-slate-700 dark:text-slate-300">
              <strong className="font-black font-mono text-slate-900 dark:text-white">
                {heatmapData.totalCardsReviewed}
              </strong> repasos
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="font-bold text-slate-700 dark:text-slate-300">
              <strong className="font-black font-mono text-slate-900 dark:text-white">
                {currentUser?.streak || 0}d
              </strong> racha
            </span>
          </div>
        </div>
      </div>

      {/* Cuadrícula de Heatmap (7 filas x 12 columnas) */}
      <div className="mt-4 overflow-x-auto pb-2">
        <div className="min-w-[580px]">
          <div className="grid grid-flow-col grid-rows-7 gap-1.5">
            {heatmapData.days.map((d, idx) => (
              <div
                key={d.dateKey}
                title={`${d.date.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}: ${d.count} actividades`}
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-md border transition-all cursor-pointer hover:scale-125 hover:z-10 ${getCellColor(
                  d.level,
                  d.isToday
                )} ${d.isToday ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
              />
            ))}
          </div>

          {/* Leyenda de Intensidad */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <span>Menos</span>
            <div className="flex items-center gap-1.5">
              {[0, 1, 2, 3, 4].map((lvl) => (
                <div
                  key={lvl}
                  className={`w-3.5 h-3.5 rounded-md border ${getCellColor(lvl, false)}`}
                />
              ))}
            </div>
            <span>Más actividad</span>
          </div>
        </div>
      </div>
    </div>
  );
}
