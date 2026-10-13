// src/components/DailyHub/MainDashboardHub.jsx
// Tablero Principal Inteligente de ENARMCITO (Hub de Gamificación, Telemetría Dúo y Acceso al Estudio)
// Segmentado de forma clara para que el Hub sea el Centro de Mando y el Tema del Día esté separado

import React, { useState, useEffect } from "react";
import { useUser } from "../../context/UserContext";
import { DuoStatusWidget } from "./DuoStatusWidget";
import { HeatmapActivity } from "./HeatmapActivity";
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
  ChevronRight
} from "lucide-react";

export function MainDashboardHub({ onGoToTodayTopic, onOpenCourses, onOpenSchedule }) {
  const { 
    currentUser, 
    partnerUser, 
    userRank, 
    partnerRank, 
    activeDayCode, 
    topic, 
    schedule,
    theme 
  } = useUser();

  const isDark = theme === "dark";

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
