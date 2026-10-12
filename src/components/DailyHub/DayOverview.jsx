// src/components/DailyHub/DayOverview.jsx
import React from "react";
import { useUser } from "../../context/UserContext";
import { DuoStatusWidget } from "./DuoStatusWidget";
import { 
  ClipboardCheck, 
  BookOpen, 
  Layers, 
  Timer, 
  ArrowRight, 
  CheckCircle2
} from "lucide-react";

export function DayOverview({ onSelectPhase }) {
  const { topic, currentUser, theme } = useUser();

  if (!topic) {
    return (
      <div className="p-8 text-center text-slate-500">
        Cargando temario del día...
      </div>
    );
  }

  const isDark = theme === "dark";
  const status = currentUser.today_status || {};

  const phases = [
    {
      id: 0,
      number: "Fase 0",
      title: "Pre-Test Interactivo Psicométrico",
      subtitle: "Cebado cognitivo y autopsia de errores (10-12 reactivos)",
      description: "Resuelve los casos clínicos pivote, marca tu nivel de confianza y exporta tu reporte de telemetría directo para Gemini.",
      icon: ClipboardCheck,
      color: "from-blue-600 to-cyan-600",
      textColor: isDark ? "text-cyan-400" : "text-blue-600",
      done: status.phase0_done,
      score: status.phase0_score,
      actionText: status.phase0_done ? "Revisar Auditoría / Reporte" : "Comenzar Pre-Test (15 min)"
    },
    {
      id: 1,
      number: "Fase 1",
      title: "Lectura Focalizada & Recursos Compartidos",
      subtitle: "GPC oficial, videos y apuntes colaborativos",
      description: "Lectura dirigida de los pivotes fallados. Consulta y aporta resúmenes, enlaces a videos y cuadros oficiales con Sonia.",
      icon: BookOpen,
      color: "from-emerald-600 to-teal-600",
      textColor: isDark ? "text-emerald-400" : "text-emerald-600",
      done: status.phase1_done,
      actionText: status.phase1_done ? "Ver Biblioteca de Recursos" : "Entrar a Lectura & Recursos"
    },
    {
      id: 2,
      number: "Fase 2",
      title: "Extracción de Pivotes & Flashcards (Anki FSRS)",
      subtitle: "Repetición espaciada inteligente y exportación",
      description: "Estudia las tarjetas de memoria con el algoritmo FSRS nativo (Again, Hard, Good, Easy) o descárgalas en .tsv para Anki.",
      icon: Layers,
      color: "from-purple-600 to-indigo-600",
      textColor: isDark ? "text-purple-400" : "text-purple-600",
      done: status.phase2_done,
      actionText: status.phase2_done ? "Repasar Baraja de Tarjetas" : "Estudiar Flashcards FSRS"
    },
    {
      id: 3,
      number: "Fase 3",
      title: "Auto-Evaluación (Simulador Contrarreloj)",
      subtitle: "20 reactivos seriados de descarte veloz",
      description: "Entrena la velocidad y precisión bajo presión de tiempo (60s por pregunta) para mecanizar el descarte de trampas.",
      icon: Timer,
      color: "from-rose-600 to-amber-600",
      textColor: isDark ? "text-rose-400" : "text-rose-600",
      done: status.phase3_done,
      score: status.phase3_score,
      actionText: status.phase3_done ? "Repetir Simulador" : "Iniciar Simulador (20 min)"
    }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Tablero Dúo Donato & Sonia */}
      <DuoStatusWidget />

      {/* Banner del Tema del Día */}
      <div className={`border rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden transition-colors ${
        isDark 
          ? "bg-slate-900 border-slate-800 text-white" 
          : "bg-gradient-to-br from-blue-50 via-white to-cyan-50 border-blue-200 text-slate-900"
      }`}>
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
              isDark 
                ? "bg-blue-500/20 text-blue-400 border-blue-500/30" 
                : "bg-blue-100 text-blue-800 border-blue-300"
            }`}>
              {topic.specialty === "MI" ? "Medicina Interna" : topic.specialty}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border font-mono ${
              isDark 
                ? "bg-slate-800 text-slate-300 border-slate-700" 
                : "bg-slate-100 text-slate-800 border-slate-300 font-bold"
            }`}>
              {topic.code}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              isDark 
                ? "bg-cyan-950/60 text-cyan-300 border-cyan-800/40" 
                : "bg-cyan-100 text-cyan-900 border-cyan-300"
            }`}>
              {topic.normativa_origen}
            </span>
          </div>

          <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 ${
            isDark ? "text-white" : "text-black"
          }`}>
            {topic.title}
          </h1>

          <p className={`text-sm sm:text-base max-w-2xl leading-relaxed ${
            isDark ? "text-slate-300" : "text-slate-700"
          }`}>
            Tu plan de estudio de hoy está dividido en <strong className={isDark ? "text-white" : "text-black"}>4 fases progresivas</strong>. Comienza con el Pre-Test para activar tus esquemas mentales y descubrir dónde enfocar tu lectura.
          </p>
        </div>
      </div>

      {/* Tarjetas de las 4 Fases de Estudio */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className={`text-base font-bold flex items-center gap-2 ${
            isDark ? "text-slate-200" : "text-slate-900"
          }`}>
            <span>Ruta Diaria de Estudio</span>
            <span className="text-xs font-normal opacity-70">(Pre-Temporada Octubre)</span>
          </h2>
          <span className="text-xs opacity-70 font-medium">Paso a paso guiado</span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {phases.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.id}
                className={`border rounded-2xl p-5 sm:p-6 transition-all shadow-sm ${
                  isDark
                    ? p.done 
                      ? "bg-emerald-950/10 border-emerald-500/30 text-white" 
                      : "bg-slate-900 border-slate-800 text-white hover:border-slate-700"
                    : p.done
                      ? "bg-emerald-50/60 border-emerald-300 text-slate-900"
                      : "bg-white border-slate-200 text-slate-900 hover:border-blue-400 hover:shadow-md"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3.5 rounded-2xl bg-gradient-to-tr ${p.color} text-white shadow-md flex-shrink-0`}>
                      <Icon className="w-6 h-6" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-extrabold tracking-wider uppercase ${p.textColor}`}>
                          {p.number}
                        </span>
                        {p.done && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Completado {p.score !== undefined ? `(${p.score}%)` : ""}</span>
                          </span>
                        )}
                      </div>

                      <h3 className={`text-base sm:text-lg font-bold ${isDark ? "text-white" : "text-black"}`}>
                        {p.title}
                      </h3>

                      <p className={`text-xs leading-relaxed max-w-xl ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                        {p.description}
                      </p>
                    </div>
                  </div>

                  <div className="sm:flex-shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => onSelectPhase(p.id)}
                      className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        p.done
                          ? isDark 
                            ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300"
                          : `bg-gradient-to-r ${p.color} text-white hover:opacity-95 shadow-md active:scale-95`
                      }`}
                    >
                      <span>{p.actionText}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
