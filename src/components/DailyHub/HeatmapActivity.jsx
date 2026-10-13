// src/components/DailyHub/HeatmapActivity.jsx
// Mapa de Calor de Actividad Clínica y Repasos FSRS (Ruta Oficial desde Hoy hasta el ENARM 2027)
// Muestra el camino completo de preparación desde el inicio (12 de Octubre de 2026) hasta el día del examen (28 de Septiembre de 2027)
// Diseñado para que solo aparezcan los días reales del plan de estudio, con selector de vista (Ruta Completa vs Pretemporada).

import React, { useState, useMemo } from "react";
import { Flame, Brain, Calendar, Target, Award, Sparkles, ChevronRight } from "lucide-react";

// Fecha Oficial Estimada del ENARM 2027 (Última semana de Septiembre 2027)
const ENARM_TARGET_DATE = new Date("2027-09-28T08:00:00");
const PRESEASON_START_DATE = new Date("2026-10-12T00:00:00");

export function HeatmapActivity({ currentUser, partnerUser, theme }) {
  const isDark = theme === "dark";
  const isExam = theme === "enarm-cifrhs";

  // Modo de visualización: "enarm_route" (desde hoy hasta ENARM, 51 semanas) | "preseason" (3 semanas de pretemporada)
  const [viewScope, setViewScope] = useState("enarm_route");

  const heatmapData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fecha base de inicio (12 de Octubre de 2026 o hoy)
    const baseStart = new Date(Math.min(today.getTime(), PRESEASON_START_DATE.getTime()));
    baseStart.setHours(0, 0, 0, 0);

    // Alinear al Domingo anterior de la semana de inicio
    const startSunday = new Date(baseStart);
    startSunday.setDate(baseStart.getDate() - baseStart.getDay());

    let endSaturday;
    let totalWeeks = 51;

    if (viewScope === "preseason") {
      // 3 semanas de pretemporada (21 días alineados Dom-Sáb)
      totalWeeks = 3;
      endSaturday = new Date(startSunday);
      endSaturday.setDate(startSunday.getDate() + (3 * 7 - 1));
    } else {
      // Ruta completa al ENARM 2027 (Desde Oct 2026 hasta Sep 2027)
      const targetEnarm = new Date(ENARM_TARGET_DATE);
      // Alinear al Sábado siguiente al ENARM
      endSaturday = new Date(targetEnarm);
      endSaturday.setDate(targetEnarm.getDate() + (6 - targetEnarm.getDay()));

      const diffMs = endSaturday.getTime() - startSunday.getTime();
      totalWeeks = Math.max(1, Math.round(diffMs / (7 * 24 * 60 * 60 * 1000)));
    }

    const activityLog = currentUser?.activity_log || {};
    let totalCardsReviewed = 0;
    let activeDaysCount = 0;
    const days = [];
    const weeks = [];
    let currentWeek = [];

    const enarmDateKey = `${ENARM_TARGET_DATE.getFullYear()}-${String(ENARM_TARGET_DATE.getMonth() + 1).padStart(2, "0")}-${String(ENARM_TARGET_DATE.getDate()).padStart(2, "0")}`;
    const todayDateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    for (let i = 0; i < totalWeeks * 7; i++) {
      const d = new Date(startSunday);
      d.setDate(startSunday.getDate() + i);

      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dayNum = String(d.getDate()).padStart(2, "0");
      const dateKey = `${y}-${m}-${dayNum}`;

      const isFuture = d.getTime() > today.getTime();
      const isToday = dateKey === todayDateKey;
      const isEnarmDay = dateKey === enarmDateKey;
      const isBeforeStart = d.getTime() < PRESEASON_START_DATE.getTime();

      const dayActivity = (!isFuture && activityLog[dateKey]) ? activityLog[dateKey] : { count: 0, cards: 0 };
      const count = dayActivity.count || dayActivity.cards || 0;

      if (count > 0 && !isFuture) {
        activeDaysCount++;
        totalCardsReviewed += count;
      }

      let level = 0;
      if (!isFuture && !isBeforeStart) {
        if (count >= 30) level = 4;
        else if (count >= 15) level = 3;
        else if (count >= 5) level = 2;
        else if (count > 0) level = 1;
      }

      const dayObj = {
        date: d,
        dateKey,
        dayOfWeek: d.getDay(),
        count,
        level,
        isToday,
        isFuture,
        isEnarmDay,
        isBeforeStart,
        completedTopic: dayActivity.completedTopic || false
      };

      days.push(dayObj);
      currentWeek.push(dayObj);

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Calcular encabezados de mes para las columnas de semanas
    const monthHeaders = [];
    let lastMonth = -1;

    weeks.forEach((wk, colIdx) => {
      const midDay = wk[3].date;
      const mIdx = midDay.getMonth();
      if (mIdx !== lastMonth) {
        monthHeaders.push({
          colIdx,
          name: midDay.toLocaleDateString("es-MX", { month: "short" }).toUpperCase(),
          year: midDay.getFullYear()
        });
        lastMonth = mIdx;
      }
    });

    // Días restantes exactos al ENARM
    const diffToEnarm = Math.max(0, Math.ceil((ENARM_TARGET_DATE.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

    return { 
      days, 
      weeks, 
      monthHeaders, 
      totalWeeks, 
      totalCardsReviewed, 
      activeDaysCount,
      diffToEnarm
    };
  }, [currentUser, viewScope]);

  // Colores según intensidad estilo Anki FSRS
  const getCellColor = (d) => {
    if (d.isEnarmDay) {
      return "bg-amber-400 dark:bg-amber-500 border-amber-500 dark:border-amber-400 shadow-xs";
    }
    if (d.isBeforeStart) {
      return "bg-transparent border-slate-200 dark:border-slate-800/40 opacity-20";
    }
    if (d.isFuture) {
      return isDark 
        ? "bg-slate-900/60 border-slate-800/80 hover:border-slate-700" 
        : "bg-slate-50 border-slate-200/90 hover:border-slate-300";
    }
    if (d.level === 0) {
      return isDark 
        ? "bg-slate-800/80 border-slate-700/60" 
        : "bg-slate-100 border-slate-200";
    }
    if (d.level === 1) {
      return "bg-emerald-200 dark:bg-emerald-950/70 border-emerald-400 dark:border-emerald-800";
    }
    if (d.level === 2) {
      return "bg-emerald-400 dark:bg-emerald-700 border-emerald-500 dark:border-emerald-600";
    }
    if (d.level === 3) {
      return "bg-emerald-500 dark:bg-emerald-600 border-emerald-600 dark:border-emerald-500";
    }
    return "bg-emerald-600 dark:bg-emerald-400 border-emerald-700 dark:border-emerald-300";
  };

  const dayLabels = [
    { label: "D", title: "Domingo" },
    { label: "L", title: "Lunes" },
    { label: "M", title: "Martes" },
    { label: "M", title: "Miércoles" },
    { label: "J", title: "Jueves" },
    { label: "V", title: "Viernes" },
    { label: "S", title: "Sábado" }
  ];

  return (
    <div className={`border-2 rounded-2xl p-4 sm:p-5 transition-all shadow-sm ${
      isExam 
        ? "bg-white border-black text-black"
        : isDark 
        ? "bg-slate-900 border-slate-700 text-white" 
        : "bg-white border-slate-300 text-slate-900"
    }`}>
      {/* Cabecera del Heatmap */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xs flex-shrink-0">
            <Flame className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-sm sm:text-base leading-tight">
                Ruta de Constancia al ENARM 2027
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black border-2 border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                {viewScope === "enarm_route" ? `${heatmapData.diffToEnarm} días al ENARM` : "3 Semanas Pretemporada"}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Plan activo desde hoy (12 de Octubre) hasta el examen (28 de Septiembre 2027)
            </p>
          </div>
        </div>

        {/* Selector de Alcance & Métricas */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Vista: Ruta Completa vs Pretemporada */}
          <div className="flex items-center p-1 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setViewScope("enarm_route")}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                viewScope === "enarm_route"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
              }`}
            >
              🎯 Ruta al ENARM ({heatmapData.diffToEnarm}d)
            </button>
            <button
              type="button"
              onClick={() => setViewScope("preseason")}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                viewScope === "preseason"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
              }`}
            >
              🔥 Pretemporada (18d)
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold">
              <Brain className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>{heatmapData.totalCardsReviewed} repasos</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold">
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{currentUser?.streak || 0}d racha</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contenedor del Heatmap con Scroll Horizontal contenido en la tarjeta (sin romper el ancho de la PWA) */}
      <div className="mt-3.5 w-full">
        <div className="overflow-x-auto max-w-full pb-2 scrollbar-thin">
          <div className="w-max inline-flex flex-col">
            {/* Fila de Encabezados de Mes */}
            <div className="flex items-center text-[10px] font-black text-slate-400 pl-5 mb-1 select-none">
              {heatmapData.weeks.map((_, colIdx) => {
                const header = heatmapData.monthHeaders.find((m) => m.colIdx === colIdx);
                return (
                  <div
                    key={colIdx}
                    className="w-3.5 sm:w-4 text-left flex-shrink-0"
                    style={{ marginRight: colIdx < heatmapData.weeks.length - 1 ? "4px" : "0" }}
                  >
                    {header ? (
                      <span className="block truncate text-[9px] font-black tracking-tight text-slate-500 dark:text-slate-400">
                        {header.name}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Cuadrícula de 7 Filas (Dom a Sáb) x N Columnas de Semanas */}
            <div className="inline-flex items-start gap-1.5">
              {/* Etiquetas de días de la semana (Dom a Sáb) */}
              <div className="flex flex-col gap-1 text-[9px] font-black text-slate-400 select-none pt-0.5 flex-shrink-0 w-3.5">
                {dayLabels.map((d, i) => (
                  <span
                    key={i}
                    title={d.title}
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex items-center justify-center leading-none"
                  >
                    {d.label}
                  </span>
                ))}
              </div>

              {/* Matriz de Celdas de Actividad */}
              <div className="grid grid-flow-col grid-rows-7 gap-1">
                {heatmapData.days.map((d) => {
                  let tooltip = `${d.date.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}`;
                  if (d.isEnarmDay) tooltip += " 🏆 ¡DÍA OFICIAL DEL EXAMEN ENARM 2027!";
                  else if (d.isToday) tooltip += ` 🎯 HOY (${d.count} actividades)`;
                  else if (d.isFuture) tooltip += " (Plan futuro hacia el ENARM)";
                  else tooltip += `: ${d.count} actividades completadas`;

                  return (
                    <div
                      key={d.dateKey}
                      title={tooltip}
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-xs border transition-all cursor-pointer hover:scale-125 hover:z-20 ${getCellColor(
                        d
                      )} ${
                        d.isEnarmDay
                          ? "ring-2 ring-amber-500 animate-pulse z-10"
                          : d.isToday
                          ? "ring-2 ring-blue-500 ring-offset-1 z-10"
                          : ""
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Leyenda y Referencias */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 font-bold">
              <span className="w-2.5 h-2.5 rounded-xs ring-2 ring-blue-500 bg-white dark:bg-slate-900 inline-block" />
              <span>Hoy (Inicio)</span>
            </span>
            <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-400 border border-amber-500 inline-block" />
              <span>Examen ENARM 2027</span>
            </span>
            <span className="text-slate-400">
              ({heatmapData.diffToEnarm} días objetivo)
            </span>
          </div>

          <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
            <span>Menos</span>
            {[0, 1, 2, 3, 4].map((lvl) => (
              <div
                key={lvl}
                className={`w-3 h-3 rounded-xs border ${getCellColor({ level: lvl, isFuture: false })}`}
              />
            ))}
            <span>Más actividad</span>
          </div>
        </div>
      </div>
    </div>
  );
}
