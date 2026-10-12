// src/components/Phase0_Pretest/AuditBreakdown.jsx
// Fase B: Auditoría de Errores, Cuadrantes Metacognitivos y Preparación del Reporte para Gemini

import React, { useState } from "react";
import { useUser } from "../../context/UserContext";
import { 
  computeSessionStats, 
  generateGeminiReportMarkdown, 
  ERROR_TAGS, 
  AI_ACTIONS, 
  PIVOT_CONCEPTS 
} from "../../services/telemetryEngine";
import { GeminiReportModal } from "./GeminiReportModal";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Copy, 
  Sparkles, 
  Flag, 
  Scale, 
  Layers 
} from "lucide-react";

export function AuditBreakdown({ topic, rawAnswers, onSaveAndProceed }) {
  const { theme, fontPreference, fontSize } = useUser();
  const isDark = theme === "dark";

  // Estado local para permitir al usuario auditar cada error
  const [answersState, setAnswersState] = useState(rawAnswers);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Calcular estadísticas dinámicas
  const stats = computeSessionStats(topic.pretest, answersState);

  const fontStyle = {
    fontFamily: fontPreference === "Arial" ? "Arial, sans-serif" : fontPreference === "Helvetica" ? "Helvetica, Arial, sans-serif" : "Inter, sans-serif",
    fontSize: fontSize === "11pt" ? "14px" : fontSize === "14pt" ? "18px" : "16px"
  };

  // Actualizar Fila 1: Tipo de error cognitivo
  const selectErrorType = (qId, errorType) => {
    setAnswersState((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        errorType: prev[qId]?.errorType === errorType ? null : errorType
      }
    }));
  };

  // Actualizar Fila 2: Acciones solicitadas a la IA
  const toggleAiAction = (qId, action) => {
    const currentActions = answersState[qId]?.aiActions || [];
    const hasAction = currentActions.includes(action);
    const newActions = hasAction
      ? currentActions.filter((a) => a !== action)
      : [...currentActions, action];

    setAnswersState((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        aiActions: newActions
      }
    }));
  };

  // Copiar reporte para Gemini directo al portapapeles
  const handleCopyReport = () => {
    const md = generateGeminiReportMarkdown(topic, stats);
    navigator.clipboard.writeText(md).then(() => {
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 3000);
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Banner Resumen de Telemetría */}
      <div className={`border rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden transition-colors ${
        isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6 mb-6 border-slate-700/20">
          <div>
            <span className="text-xs font-bold text-blue-600 dark:text-cyan-400 uppercase tracking-wider block mb-1">
              Fase B: Auditoría Psicométrica Post-Test
            </span>
            <h2 className="text-2xl font-extrabold">
              Autopsia Cognitiva del Examen
            </h2>
            <p className="text-xs opacity-75 mt-1">
              {topic.title} • {topic.normativa_origen}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopyReport}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-90 text-white text-xs font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-all"
            >
              <Copy className="w-4 h-4" />
              <span>{copiedSuccess ? "¡Copiado al Portapapeles! ✓" : "Copiar Informe para Gemini"}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsReportOpen(true)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold border ${
                isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700" : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
              }`}
            >
              Ver Markdown
            </button>
          </div>
        </div>

        {/* Métricas en Tarjetas Rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={`p-3.5 rounded-2xl border ${
            isDark ? "bg-slate-800/60 border-slate-700/60 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
          }`}>
            <span className="text-[11px] opacity-75 font-medium block">Calificación Bruta</span>
            <div className="text-xl sm:text-2xl font-extrabold mt-1">
              {stats.correctCount}/{stats.total}
              <span className="text-xs opacity-75 font-normal ml-1">({stats.grossScorePercent}%)</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-900 dark:text-cyan-200">
            <span className="text-[11px] font-semibold block">Calificación Real (Alta Conf.)</span>
            <div className="text-xl sm:text-2xl font-extrabold mt-1">
              {stats.highConfidenceCorrect}/{stats.total}
              <span className="text-xs font-normal ml-1">({stats.realScorePercent}%)</span>
            </div>
          </div>

          <div className={`p-3.5 rounded-2xl border ${
            isDark ? "bg-slate-800/60 border-slate-700/60 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
          }`}>
            <span className="text-[11px] opacity-75 font-medium block">Tiempo Total</span>
            <div className="text-xl sm:text-2xl font-extrabold mt-1 font-mono">
              {Math.floor(stats.totalSeconds / 60)}m {stats.totalSeconds % 60}s
            </div>
          </div>

          <div className={`p-3.5 rounded-2xl border ${
            isDark ? "bg-slate-800/60 border-slate-700/60 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
          }`}>
            <span className="text-[11px] opacity-75 font-medium block">Promedio por Pregunta</span>
            <div className="text-xl sm:text-2xl font-extrabold mt-1 font-mono">
              {stats.avgSecondsPerQ}s
            </div>
          </div>
        </div>

        {/* Resumen de los 6 Conceptos Pivote */}
        <div className="mt-6 pt-5 border-t border-slate-700/20">
          <h4 className="text-xs font-bold uppercase tracking-wider mb-3 opacity-80">
            Rendimiento en los 6 Conceptos Pivote ENARM:
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(stats.pivotStats).map(([key, s]) => {
              if (s.total === 0) return null;
              const pct = Math.round((s.correct / s.total) * 100);
              const isCrit = pct === 0;
              const isWeak = pct > 0 && pct < 100;
              return (
                <div
                  key={key}
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                    isCrit
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 font-semibold"
                      : isWeak
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300 font-semibold"
                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-semibold"
                  }`}
                >
                  <span className="truncate pr-1">{PIVOT_CONCEPTS[key] || key}</span>
                  <span className="font-extrabold flex-shrink-0">
                    {s.correct}/{s.total} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lista de Reactivos con Autopsia Detallada */}
      <div className="space-y-6">
        <h3 className="text-base font-bold">
          Desglose y Auditoría de Reactivos:
        </h3>

        {stats.detailedItems.map((item) => {
          const q = item.question;
          const ans = item.answer;
          const isCorrect = item.isCorrect;
          const quadrant = item.quadrant;

          return (
            <div
              key={q.id}
              className={`border rounded-3xl p-6 sm:p-7 shadow-sm space-y-5 transition-all ${
                isDark
                  ? quadrant.priority === 1
                    ? "bg-slate-900 border-red-500/40 ring-1 ring-red-500/20 text-white"
                    : quadrant.priority === 2
                    ? "bg-slate-900 border-amber-500/40 text-white"
                    : quadrant.priority === 3
                    ? "bg-slate-900 border-yellow-500/30 text-white"
                    : "bg-slate-900 border-slate-800 text-white"
                  : quadrant.priority === 1
                    ? "bg-white border-red-300 ring-2 ring-red-200 text-slate-900 shadow-sm"
                    : quadrant.priority === 2
                    ? "bg-white border-amber-300 ring-2 ring-amber-100 text-slate-900 shadow-sm"
                    : quadrant.priority === 3
                    ? "bg-white border-yellow-300 text-slate-900 shadow-sm"
                    : "bg-white border-slate-200 text-slate-900 shadow-sm"
              }`}
            >
              {/* Encabezado del Reactivo */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 border-slate-700/20">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold opacity-60 font-mono">
                    Reactivo #{item.index}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                    isDark ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-slate-100 text-slate-800 border-slate-300"
                  }`}>
                    {PIVOT_CONCEPTS[q.concepto_pivote] || q.concepto_pivote}
                  </span>
                  <span className="text-xs opacity-60 font-mono">
                    ⏱️ {ans.timeSeconds || 0}s
                  </span>
                </div>

                {/* Badge del Cuadrante Metacognitivo */}
                <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${quadrant.badgeColor}`}>
                  {isCorrect ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  <span>{quadrant.name}</span>
                </div>
              </div>

              {/* Alerta de tachado erróneo */}
              {item.struckCorrect && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>
                    <strong>Sesgo Severo:</strong> Tachaste con [✕] la respuesta correcta ({q.correctAnswer}) durante tu descarte inicial.
                  </span>
                </div>
              )}

              {/* Viñeta Clínica con tipografía de examen */}
              <div 
                style={fontStyle}
                className={`p-4 rounded-2xl border leading-relaxed ${
                  isDark ? "bg-slate-950/70 border-slate-800 text-slate-200" : "bg-slate-50 border-slate-200 text-black font-normal"
                }`}
              >
                <p className="font-bold mb-1">{q.question_text}</p>
                <p className="opacity-80 text-xs">{q.vignette}</p>
              </div>

              {/* Comparativa: Lo que elegiste vs La correcta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className={`p-3 rounded-xl border ${
                  isCorrect
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200"
                }`}>
                  <span className="text-[10px] uppercase font-bold opacity-60 block mb-1">
                    Tu Selección:
                  </span>
                  <div className="font-bold flex items-center gap-1.5">
                    <span>Opción {ans.selectedOption}:</span>
                    <span>{q.options[ans.selectedOption] || "Sin respuesta"}</span>
                  </div>
                  <span className="text-[11px] opacity-70 mt-1 block font-mono">
                    Confianza marcada: {ans.confidence}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block mb-1">
                    Respuesta Correcta GPC:
                  </span>
                  <div className="font-bold flex items-center gap-1.5">
                    <span>Opción {q.correctAnswer}:</span>
                    <span>{q.options[q.correctAnswer]}</span>
                  </div>
                  <span className="text-[11px] opacity-80 mt-1 block">
                    {q.distractor_types?.[q.correctAnswer] || "Conducta oficial GPC"}
                  </span>
                </div>
              </div>

              {/* El Dato Pivote Oculto */}
              {q.dato_pivote_oculto && (
                <div className="p-3.5 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-cyan-950 dark:text-cyan-200 text-xs">
                  <strong className="text-cyan-800 dark:text-cyan-300 block mb-0.5 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                    El Dato Pivote Oculto:
                  </strong>
                  <p>{q.dato_pivote_oculto}</p>
                </div>
              )}

              {/* Justificación Oficial GPC */}
              {q.justificacion_gpc && (
                <div className={`p-3.5 rounded-2xl border text-xs ${
                  isDark ? "bg-slate-800/40 border-slate-700/60 text-slate-300" : "bg-slate-100 border-slate-300 text-slate-900"
                }`}>
                  <strong className="block mb-0.5 font-bold">
                    📖 Justificación Oficial GPC / NOM:
                  </strong>
                  <p className="leading-relaxed">{q.justificacion_gpc}</p>
                </div>
              )}

              {/* Autopsia del Distractor que elegiste (si fallaste) */}
              {!isCorrect && ans.selectedOption && q.distractor_autopsies?.[ans.selectedOption] && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200 text-xs">
                  <strong className="text-amber-800 dark:text-amber-300 block mb-0.5 font-bold">
                    🪤 Autopsia de tu Distractor ({ans.selectedOption}):
                  </strong>
                  <p className="leading-relaxed">{q.distractor_autopsies[ans.selectedOption]}</p>
                </div>
              )}

              {/* SECCIÓN OBLIGATORIA DE AUDITORÍA (Fila 1 y Fila 2) si falló o confianza baja */}
              {(!isCorrect || ans.confidence === "BAJA") && (
                <div className="pt-3 border-t border-slate-700/20 space-y-3">
                  {/* Fila 1: Botones de Autodiagnóstico del Error */}
                  <div>
                    <span className="text-[11px] font-bold block mb-2 opacity-80">
                      Fila 1: ¿Por qué fallaste o dudaste? (Toca uno):
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { key: ERROR_TAGS.OlvidoPuro, label: "🧠 Olvido Puro", desc: "No sabías la dosis o cifra" },
                        { key: ERROR_TAGS.Razonamiento, label: "🧩 Razonamiento", desc: "Cierre prematuro" },
                        { key: ERROR_TAGS.Distractor, label: "🪤 Distractor", desc: "Confusión / Trampa" },
                        { key: ERROR_TAGS.FaltaAtencion, label: "👁️ Falta Atención", desc: "Lectura rápida / Excepto" }
                      ].map((errBtn) => {
                        const isSelected = ans.errorType === errBtn.key;
                        return (
                          <button
                            key={errBtn.key}
                            type="button"
                            onClick={() => selectErrorType(q.id, errBtn.key)}
                            className={`p-2 rounded-xl text-left border text-[11px] font-medium transition-all ${
                              isSelected
                                ? "bg-cyan-100 dark:bg-cyan-500/20 border-cyan-500 text-cyan-900 dark:text-cyan-200 ring-2 ring-cyan-400 font-bold"
                                : isDark
                                ? "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white"
                                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            <span className="font-bold block truncate">{errBtn.label}</span>
                            <span className="text-[9px] opacity-70 block truncate">{errBtn.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Fila 2: Botones de Acción Inmediata para la IA */}
                  <div>
                    <span className="text-[11px] font-bold block mb-2 opacity-80">
                      Fila 2: ¿Qué debe hacer la IA por ti en el informe final?:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { key: AI_ACTIONS.ExplicarAlgoritmo, icon: Flag, label: "🚩 Explicar Algoritmo", sub: "Mecanismo fisiopatológico" },
                        { key: AI_ACTIONS.TablaComparativa, icon: Scale, label: "⚖️ Tabla Comparativa", sub: "Tu distractor vs la correcta" },
                        { key: AI_ACTIONS.GenerarAnki, icon: Layers, label: "🗂️ Generar Anki", sub: "Crear tarjeta para importar" }
                      ].map((actBtn) => {
                        const isActSelected = (ans.aiActions || []).includes(actBtn.key);
                        return (
                          <button
                            key={actBtn.key}
                            type="button"
                            onClick={() => toggleAiAction(q.id, actBtn.key)}
                            className={`p-2.5 rounded-xl text-left border text-[11px] font-medium transition-all ${
                              isActSelected
                                ? "bg-purple-100 dark:bg-purple-500/20 border-purple-500 text-purple-950 dark:text-purple-200 ring-2 ring-purple-400 font-bold"
                                : isDark
                                ? "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white"
                                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            <span className="font-bold block">{actBtn.label}</span>
                            <span className="text-[9px] opacity-70 block">{actBtn.sub}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Botón flotante inferior para finalizar auditoría */}
      <div className={`fixed bottom-0 left-0 right-0 p-4 backdrop-blur-md border-t z-30 transition-colors ${
        isDark ? "bg-slate-950/90 border-slate-800" : "bg-white/95 border-slate-200 shadow-lg"
      }`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyReport}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 hover:opacity-95 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
          >
            <Copy className="w-4 h-4" />
            <span>{copiedSuccess ? "¡Copiado al Portapapeles! ✓" : "📋 Copiar Informe Ultra-Detallado para IA"}</span>
          </button>

          <button
            type="button"
            onClick={() => onSaveAndProceed(stats)}
            className="py-3 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md active:scale-95 transition-all"
          >
            <span>Guardar & Continuar a Fase 1 →</span>
          </button>
        </div>
      </div>

      {/* Modal con el Markdown Completo */}
      {isReportOpen && (
        <GeminiReportModal
          markdownContent={generateGeminiReportMarkdown(topic, stats)}
          onClose={() => setIsReportOpen(false)}
        />
      )}
    </div>
  );
}
