// src/components/DailyHub/MainDashboardHub.jsx
// Tablero Principal Inteligente de ENARMCITO (Hub de Gamificación, Telemetría Dúo y Acceso al Estudio)
// Segmentado de forma clara para que el Hub sea el Centro de Mando y el Tema del Día esté separado

import React, { useState, useEffect } from "react";
import { useUser } from "../../context/UserContext";
import { DuoStatusWidget } from "./DuoStatusWidget";
import { HeatmapActivity } from "./HeatmapActivity";
import { loadAllScheduleCards, filterCardsByStudyMode, getSeenDayCodes } from "../../services/ankiDeckService";
import { 
  Trophy, 
  Flame, 
  Calendar, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Brain, 
  TrendingUp, 
  Sparkles, 
  ArrowRight, 
  Target, 
  Zap, 
  Layers, 
  GraduationCap,
  ShieldCheck,
  ChevronRight,
  Shuffle,
  AlertTriangle,
  Play
} from "lucide-react";

export function MainDashboardHub({ onGoToTodayTopic, onOpenCourses, onOpenSchedule, onStartAnkiStudy }) {
  const { 
    currentUser, 
    currentUserId,
    partnerUser, 
    userRank, 
    partnerRank, 
    activeDayCode, 
    topic, 
    schedule,
    theme 
  } = useUser();

  const isDark = theme === "dark";

  // Estadísticas globales de Anki FSRS para el Hub
  const [ankiStats, setAnkiStats] = useState({
    total: 0,
    due: 0,
    newCards: 0,
    todayCards: 0,
    cumulativeCards: 0,
    hardCards: 0
  });

  useEffect(() => {
    let isMounted = true;
    async function loadStats() {
      try {
        const cards = await loadAllScheduleCards(schedule, currentUserId);
        if (!isMounted) return;
        const now = new Date();
        const seenCodes = new Set(getSeenDayCodes(schedule, activeDayCode));

        const due = cards.filter((c) => {
          if (!seenCodes.has(c.dayCode)) return false;
          const st = c.cardState;
          return st && st.due && new Date(st.due) <= now && (st.reps > 0 || st.state !== "new");
        }).length;

        const newCards = cards.filter((c) => {
          if (!seenCodes.has(c.dayCode)) return false;
          const st = c.cardState;
          return !st || !st.reps || st.state === "new";
        }).length;

        const todayCards = cards.filter((c) => c.dayCode === activeDayCode).length;
        const cumulativeCards = cards.filter((c) => seenCodes.has(c.dayCode)).length;
        const hardCards = cards.filter((c) => {
          if (!seenCodes.has(c.dayCode)) return false;
          const st = c.cardState;
          return st && ((st.lapses && st.lapses > 0) || (st.difficulty && st.difficulty >= 7));
        }).length;

        setAnkiStats({
          total: cards.length,
          due,
          newCards,
          todayCards,
          cumulativeCards,
          hardCards
        });
      } catch (err) {
        console.error("Error calculando estadísticas Anki en Hub:", err);
      }
    }
    loadStats();
    const handleSync = () => loadStats();
    window.addEventListener("enarmcito_anki_sync", handleSync);
    window.addEventListener("enarmcito_topic_sync", handleSync);
    return () => {
      isMounted = false;
      window.removeEventListener("enarmcito_anki_sync", handleSync);
      window.removeEventListener("enarmcito_topic_sync", handleSync);
    };
  }, [schedule, currentUserId, activeDayCode]);

  // Estadísticas del día para el usuario activo
  const status = currentUser.today_status || {};
  const completedPhasesToday = [
    status.phase0_done, 
    status.phase1_done, 
    status.phase2_done, 
    status.phase3_done
  ].filter(Boolean).length;

  const userCompletedDays = currentUser.completed_days || {};
  const totalCompletedDays = Object.keys(userCompletedDays).length;
  const overallProgress = Math.round((totalCompletedDays / (schedule.length || 18)) * 100);

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-8">
      {/* 1. SECCIÓN DÚO & GAMIFICACIÓN (Zonas horarias, status, toque) */}
      <DuoStatusWidget />

      {/* 2. TARJETA DESTACADA: MISIÓN DEL DÍA / TEMA EN CURSO */}
      <div className={`border rounded-3xl p-5 sm:p-6 shadow-md transition-all relative overflow-hidden ${
        isDark
          ? "bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 border-slate-800 text-white"
          : "bg-gradient-to-br from-blue-50/90 via-white to-cyan-50/80 border-blue-200 text-slate-900"
      }`}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-lg bg-blue-600 text-white shadow-2xs">
                {topic?.code || activeDayCode}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-cyan-300 border border-blue-200 dark:border-blue-800">
                {topic?.specialty || "MI"} • Pretemporada
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                {topic?.date_assigned || "12 de Octubre"}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              {topic?.title || "DM2 + Cetoacidosis Diabética (CAD) y EHH"}
            </h2>

            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
              <span>📜 {topic?.normativa_origen || "GPC IMSS-718-18"}</span>
              <span>•</span>
              <span className="font-bold text-blue-600 dark:text-cyan-400">
                Progreso hoy: {completedPhasesToday}/4 fases
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={onGoToTodayTopic}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <span>Entrar a Estudiar Tema</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onOpenSchedule}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-center transition-colors"
            >
              Ver Calendario Completo
            </button>
          </div>
        </div>
      </div>

      {/* 2.5 CENTRO DE REPASO ESPACIADO ANKI FSRS (MODOS ESTILO ANKI DESKTOP) */}
      <div className={`border-2 rounded-3xl p-4 sm:p-5 shadow-sm transition-all space-y-3.5 ${
        isDark 
          ? "bg-slate-900 border-slate-800 text-white" 
          : "bg-white border-purple-200 text-slate-900"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600 text-white shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black">
                  Repaso Espaciado Anki FSRS
                </h3>
                {ankiStats.due > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white animate-pulse">
                    ⏰ {ankiStats.due} vencidas hoy
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-cyan-300">
                    ✓ Al día en repasos
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Selecciona tu modo de sesión según el algoritmo de retención a largo plazo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-cyan-300 border border-blue-200 dark:border-blue-900 font-bold">
              🔵 {ankiStats.newCards} nuevas
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-900 font-bold">
              📚 {ankiStats.cumulativeCards} acumuladas
            </span>
          </div>
        </div>

        {/* Botones de Modos de Estudio Anki */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* MODO 1: TEMA DEL DÍA */}
          <button
            type="button"
            onClick={() => onStartAnkiStudy && onStartAnkiStudy({ mode: "today", title: `Tema del Día (${activeDayCode})` })}
            className="p-3 rounded-2xl border-2 border-blue-300 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-100/50 transition-all text-left flex flex-col justify-between gap-2 group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-blue-700 dark:text-cyan-300 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                <span>Tema del Día</span>
              </span>
              <span className="font-mono text-xs font-black px-1.5 py-0.5 rounded bg-blue-200/80 dark:bg-blue-900 text-blue-900 dark:text-cyan-200">
                {ankiStats.todayCards}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
              Flashcards del tema activo hoy ({topic?.code || activeDayCode}).
            </p>
            <div className="flex items-center gap-1 text-[11px] font-extrabold text-blue-600 dark:text-cyan-400 group-hover:translate-x-1 transition-transform">
              <span>Estudiar tema</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </button>

          {/* MODO 2: REPASO VENCIDAS FSRS (DUE) */}
          <button
            type="button"
            onClick={() => onStartAnkiStudy && onStartAnkiStudy({ mode: "due", title: "Repaso Pendiente (Due FSRS)" })}
            className={`p-3 rounded-2xl border-2 transition-all text-left flex flex-col justify-between gap-2 group cursor-pointer ${
              ankiStats.due > 0
                ? "border-emerald-400 dark:border-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/30 hover:border-emerald-500"
                : "border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 opacity-80 hover:opacity-100"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Vencidas (Due FSRS)</span>
              </span>
              <span className={`font-mono text-xs font-black px-1.5 py-0.5 rounded ${
                ankiStats.due > 0 
                  ? "bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200" 
                  : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
              }`}>
                {ankiStats.due}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
              Tarjetas vencidas según la curva del olvido para repasar hoy.
            </p>
            <div className="flex items-center gap-1 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
              <span>Repasar vencidas</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </button>

          {/* MODO 3: TEMAS VISTOS / ACUMULADO */}
          <button
            type="button"
            onClick={() => onStartAnkiStudy && onStartAnkiStudy({ mode: "cumulative", title: "Temas Vistos / Acumulados" })}
            className="p-3 rounded-2xl border-2 border-purple-300 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/30 hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-100/50 transition-all text-left flex flex-col justify-between gap-2 group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Temas Vistos</span>
              </span>
              <span className="font-mono text-xs font-black px-1.5 py-0.5 rounded bg-purple-200/80 dark:bg-purple-900 text-purple-900 dark:text-purple-200">
                {ankiStats.cumulativeCards}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
              Todas las flashcards de los temas cubiertos hasta el momento.
            </p>
            <div className="flex items-center gap-1 text-[11px] font-extrabold text-purple-600 dark:text-purple-400 group-hover:translate-x-1 transition-transform">
              <span>Repaso acumulado</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </button>

          {/* MODO 4: MODO ALEATORIO (CRAM) & DIFÍCILES */}
          <button
            type="button"
            onClick={() => onStartAnkiStudy && onStartAnkiStudy({ mode: "random", title: "Modo Aleatorio (Cram Intercalado)" })}
            className="p-3 rounded-2xl border-2 border-indigo-300 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-100/50 transition-all text-left flex flex-col justify-between gap-2 group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                <Shuffle className="w-3.5 h-3.5" />
                <span>Modo Aleatorio</span>
              </span>
              <span className="font-mono text-xs font-black px-1.5 py-0.5 rounded bg-indigo-200/80 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200">
                🔀
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
              Práctica intercalada sin orden fijo para simular examen real.
            </p>
            <div className="flex items-center gap-1 text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
              <span>Barajar tarjetas</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </button>
        </div>
      </div>

      {/* 3. RESUMEN GLOBAL DE AVANCE & MÉTRICAS COGNITIVAS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Métrica 1: Progreso Pretemporada */}
        <div className={`border rounded-2xl p-4 shadow-xs transition-colors ${
          isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Avance Pretemporada</span>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono">{overallProgress}%</span>
            <span className="text-xs text-slate-500">({totalCompletedDays}/18 días)</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-2.5">
            <div 
              className="bg-gradient-to-r from-blue-600 to-cyan-500 h-2 rounded-full transition-all" 
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Métrica 2: Retención FSRS y Dominio */}
        <div className={`border rounded-2xl p-4 shadow-xs transition-colors ${
          isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Retención Anki (FSRS)</span>
            <Brain className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono">90%</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">Meta Oficial</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Intervalos optimizados para retención a largo plazo hacia ENARM 2027.
          </p>
        </div>

        {/* Métrica 3: Rango y Nivel Médico */}
        <div className={`border rounded-2xl p-4 shadow-xs transition-colors ${
          isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Rango Clínico</span>
            <span className="text-base">{userRank.icon}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-black truncate">{userRank.title}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span>{currentUser.xp || 0} XP acumulados</span>
            <span className="font-bold text-blue-600 dark:text-cyan-400">{userRank.progressPercent}% al Nivel {userRank.level + 1}</span>
          </div>
        </div>
      </div>

      {/* 3.5 MAPA DE CALOR (HEATMAP) DE ACTIVIDAD CLÍNICA & REPASOS FSRS */}
      <HeatmapActivity currentUser={currentUser} partnerUser={partnerUser} theme={theme} />

      {/* 4. ANÁLISIS INTELIGENTE & ÁREAS DE OPORTUNIDAD */}
      <div className={`border rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 transition-colors ${
        isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
      }`}>
        <div className="flex items-center justify-between border-b pb-2.5 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Diagnóstico de Aprendizaje & Áreas de Oportunidad
            </h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            En espera de cuestionarios
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-1">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              1. Hipercorrección (Errores con Alta Seguridad)
            </span>
            <p className="text-[11px] text-slate-500 leading-snug">
              Se registrarán automáticamente cuando marques respuestas incorrectas creyendo que eran correctas, para evitar falsos conceptos en el examen real.
            </p>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-1">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              2. Lagunas Teóricas (Dudas Reconocidas)
            </span>
            <p className="text-[11px] text-slate-500 leading-snug">
              Te orientará a qué página exacta de la GPC o algoritmo acudir para subsanar los huecos de conocimiento detectados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
