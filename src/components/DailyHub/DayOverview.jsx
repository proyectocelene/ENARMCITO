// src/components/DailyHub/DayOverview.jsx
// Pantalla Principal Compacta (Cero Scroll Infinito) organizada en cuadrícula 2x2
// con navegación directa entre los 18 días del cronograma de pretemporada

import React from "react";
import { useUser } from "../../context/UserContext";
import { DuoStatusWidget } from "./DuoStatusWidget";
import { getScheduleDay } from "../../data/preseasonSchedule";
import { 
  ClipboardCheck, 
  BookOpen, 
  Layers, 
  Timer, 
  ArrowRight, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  GraduationCap,
  RotateCcw,
  TrendingUp,
  Brain,
  ShieldAlert,
  Award
} from "lucide-react";

export function DayOverview({ onSelectPhase }) {
  const { 
    topic, 
    currentUser, 
    theme, 
    activeDayCode, 
    switchDay, 
    goToToday,
    getTodayDayCode,
    setScheduleModalOpen,
    setCourseSidebarOpen,
    schedule 
  } = useUser();

  if (!topic) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        Cargando temario del día...
      </div>
    );
  }

  const isDark = theme === "dark";
  const status = currentUser.today_status || {};
  const flashcardsTotal = topic.flashcards?.length || 0;
  const resourcesTotal = topic.resources?.length || 0;

  // Encontrar índice del día actual en el cronograma (1 a 18)
  const currentDayInfo = getScheduleDay(topic.code || activeDayCode);
  const currentIndex = schedule.findIndex((s) => s.code === currentDayInfo.code);
  const prevDay = currentIndex > 0 ? schedule[currentIndex - 1] : null;
  const nextDay = currentIndex < schedule.length - 1 ? schedule[currentIndex + 1] : null;

  const isDonato = currentUser?.id === "donato";
  const pretestTotal = topic.pretest?.questions?.length || 0;
  const simTotal = topic.simulation?.questions?.length || 0;

  const phases = [
    {
      id: 0,
      number: "Fase 0",
      title: "Pre-Test Psicométrico",
      subtitle: pretestTotal > 0
        ? `${pretestTotal} casos clínicos • Compartido por Donato 👨‍⚕️`
        : isDonato
        ? "0 reactivos cargados • Exclusivo Donato: Genera Prompt o sube JSON"
        : "0 reactivos cargados • Pendiente que Donato suba el cuestionario",
      icon: ClipboardCheck,
      color: "from-blue-600 to-cyan-600",
      textColor: "text-blue-600 dark:text-cyan-400",
      done: status.phase0_done && pretestTotal > 0,
      score: status.phase0_score,
      badge: status.phase0_done && pretestTotal > 0
        ? `Calificación: ${status.phase0_score}%` 
        : pretestTotal > 0 ? `${pretestTotal} reactivos` : "0 reactivos",
      actionText: pretestTotal === 0
        ? isDonato
          ? "Subir Cuestionario JSON (Donato)"
          : "Esperando cuestionario de Donato"
        : status.phase0_done ? "Ver Auditoría & Retroalimentación" : "Iniciar Pre-Test",
      disabled: false
    },
    {
      id: 1,
      number: "Fase 1",
      title: "Lectura & Recursos",
      subtitle: resourcesTotal > 0
        ? `${resourcesTotal} materiales compartidos • GPC y PDFs`
        : "0 documentos cargados • Sube tus resúmenes o GPCs",
      icon: BookOpen,
      color: "from-emerald-600 to-teal-600",
      textColor: "text-emerald-600 dark:text-emerald-400",
      done: status.phase1_done,
      badge: status.phase1_done ? "Completado ✓" : `${resourcesTotal} archivos`,
      actionText: resourcesTotal === 0 ? "Subir Recursos" : status.phase1_done ? "Ver Biblioteca" : "Entrar a Recursos",
      disabled: false
    },
    {
      id: 2,
      number: "Fase 2",
      title: "Anki FSRS Flashcards",
      subtitle: flashcardsTotal > 0 
        ? `${flashcardsTotal} tarjetas pivote • Repaso espaciado`
        : "0 tarjetas cargadas • Crea o importa tus tarjetas",
      icon: Layers,
      color: "from-purple-600 to-indigo-600",
      textColor: "text-purple-600 dark:text-purple-400",
      done: status.phase2_done && flashcardsTotal > 0,
      badge: status.phase2_done && flashcardsTotal > 0
        ? "Mazo Repasado ✓" 
        : `${flashcardsTotal} tarjetas`,
      actionText: flashcardsTotal === 0 
        ? "Crear / Importar Tarjetas" 
        : status.phase2_done ? "Repasar Baraja" : "Estudiar Flashcards",
      disabled: false
    },
    {
      id: 3,
      number: "Fase 3",
      title: "Simulador Post-Estudio",
      subtitle: simTotal > 0 
        ? `${simTotal} reactivos seriados • 30 min de consolidación`
        : isDonato
        ? "0 reactivos cargados • Exclusivo Donato: Genera Prompt o sube JSON"
        : "0 reactivos cargados • Pendiente que Donato suba el simulador",
      icon: Timer,
      color: "from-rose-600 to-amber-600",
      textColor: "text-rose-600 dark:text-rose-400",
      done: status.phase3_done && simTotal > 0,
      score: status.phase3_score,
      badge: status.phase3_done && simTotal > 0
        ? `Puntaje: ${status.phase3_score}%` 
        : simTotal > 0 ? `${simTotal} reactivos • 30 min` : "0 reactivos",
      actionText: simTotal === 0 
        ? isDonato
          ? "Subir Simulador JSON (Donato)"
          : "Esperando simulador de Donato"
        : status.phase3_done ? "Repetir Simulador" : "Iniciar Simulador",
      disabled: false
    }
  ];

  return (
    <div className="space-y-3 max-w-5xl mx-auto pb-4">
      {/* Tablero Dúo Donato & Sonia Compacto */}
      <DuoStatusWidget />

      {/* Franja del Tema con Navegación entre Días del Cronograma (Paper over Paper) */}
      <div className={`paper-card p-3 sm:p-4.5 transition-colors ${
        isDark 
          ? "bg-slate-900 border-slate-700 text-white" 
          : "bg-white border-slate-300 text-slate-900"
      }`}>
        {/* Barra superior de control del día: Flechas y selector adaptable para celular */}
        <div className="flex items-center justify-between gap-1.5 border-b-2 pb-2.5 mb-2.5 border-slate-200 dark:border-slate-800 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                disabled={!prevDay}
                onClick={() => prevDay && switchDay(prevDay.code)}
                className="p-1.5 rounded-lg border-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                title={prevDay ? `Ir a ${prevDay.code}` : "Primer día"}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="font-mono font-black text-xs px-2 py-1 rounded-lg bg-blue-600 text-white shadow-2xs">
                {currentDayInfo.code}
              </span>

              <button
                type="button"
                disabled={!nextDay}
                onClick={() => nextDay && switchDay(nextDay.code)}
                className="p-1.5 rounded-lg border-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                title={nextDay ? `Ir a ${nextDay.code}` : "Último día"}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
              Día {currentDayInfo.dayNumber}/18
            </span>

            {/* Botón para volver al Día Actual */}
            <button
              type="button"
              onClick={goToToday}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black border transition-all cursor-pointer ${
                activeDayCode === getTodayDayCode()
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/40"
                  : "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/50 hover:bg-amber-500/25"
              }`}
              title="Volver al día de hoy"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{activeDayCode === getTodayDayCode() ? "Hoy" : "Ir a Hoy"}</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setCourseSidebarOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 text-xs font-bold transition-all cursor-pointer"
              title="Temario de Cursos"
            >
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden xs:inline">Cursos</span>
            </button>

            <button
              type="button"
              onClick={() => setScheduleModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
              <span>Cronograma</span>
            </button>
          </div>
        </div>

        {/* Título y Datos Clave del Tema */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-cyan-300 border border-blue-300 dark:border-blue-800">
                {currentDayInfo.specialtyName} ({currentDayInfo.specialty})
              </span>
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                📖 {topic.normativa_origen}
              </span>
              {currentDayInfo.drRePdfs?.[0] && (
                <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-purple-500" />
                  <span>{currentDayInfo.drRePdfs[0].label}</span>
                </span>
              )}
            </div>

            <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-950 dark:text-white">
              {topic.title}
            </h1>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Ruta del día:
            </span>
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3].map((idx) => {
                const isDone = currentUser.today_status?.[`phase${idx}_done`];
                return (
                  <span
                    key={idx}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      isDone ? "bg-emerald-500 ring-2 ring-emerald-300" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                    title={`Fase ${idx}: ${isDone ? "Completada" : "Pendiente"}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Cuadrícula 2x2 para las 4 Fases (Paper Over Paper) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
        {phases.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.id}
              className={`paper-card p-3.5 sm:p-4.5 transition-all flex flex-col justify-between ${
                isDark
                  ? p.done 
                    ? "bg-slate-900 border-emerald-500/60 text-white" 
                    : "bg-slate-900 border-slate-700 text-white hover:border-slate-500"
                  : p.done
                    ? "bg-white border-emerald-500 text-slate-900"
                    : "bg-white border-slate-300 text-slate-900 hover:border-blue-500"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2.5 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-2 rounded-xl bg-gradient-to-tr ${p.color} text-white shadow-xs flex-shrink-0`}>
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className={`text-[10px] font-black uppercase tracking-wider block ${p.textColor}`}>
                        {p.number}
                      </span>
                      <h3 className="text-sm sm:text-base font-black leading-tight text-slate-950 dark:text-white truncate">
                        {p.title}
                      </h3>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border-2 flex-shrink-0 ${
                    p.done
                      ? "bg-emerald-50 text-emerald-800 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-600"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                  }`}>
                    {p.badge}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 line-clamp-2 font-medium">
                  {p.subtitle}
                </p>
              </div>

              <button
                type="button"
                disabled={p.disabled}
                onClick={() => onSelectPhase(p.id)}
                className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  p.disabled
                    ? "opacity-40 cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700"
                    : p.done
                    ? isDark 
                      ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-2 border-slate-600 active:scale-95"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-900 border-2 border-slate-400 active:scale-95"
                    : `bg-gradient-to-r ${p.color} text-white hover:opacity-95 shadow-xs active:scale-95 border-2 border-transparent`
                }`}
              >
                <span>{p.actionText}</span>
                {!p.disabled && <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />}
              </button>
            </div>
          );
        })}
      </div>

      {/* Tablero Inteligente: Gamificación, Avance y Áreas de Oportunidad */}
      <div className={`border rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5 transition-colors ${
        isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
      }`}>
        <div className="flex items-center justify-between border-b pb-2.5 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black leading-tight">
                Análisis Inteligente & Áreas de Oportunidad
              </h3>
              <p className="text-[11px] text-slate-500">
                Monitoreo cognitivo en tiempo real de tu preparación ENARM 2027
              </p>
            </div>
          </div>

          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
            Telemetría Psicométrica
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card 1: Dominio vs Lagunas */}
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                Detección de Brechas
              </span>
              <span className="text-[10px] font-mono text-slate-400">0 detectadas</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Al contestar reactivos se clasificarán tus errores en los 4 cuadrantes (Hipercorrección, Laguna, Frágil o Dominio).
            </p>
          </div>

          {/* Card 2: Retención FSRS Flashcards */}
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                Retención Objetivo
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">90% FSRS</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              El algoritmo adaptará automáticamente la curva de olvido según la dificultad clínica de cada perla médica.
            </p>
          </div>

          {/* Card 3: Nivel de Maestría Clínica */}
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-blue-500" />
                Meta de Estudio
              </span>
              <span className="text-[10px] font-mono text-slate-400">Pretemporada</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              18 Días de alto rendimiento cubriendo Medicina Interna, Pediatría, Ginecología y Cirugía General.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
