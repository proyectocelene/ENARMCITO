// src/components/Phase0_Pretest/AuditBreakdown.jsx
// Fase B: Auditoría de Errores, Cuadrantes Metacognitivos y Preparación del Reporte para Gemini

import React, { useState } from "react";
import { useUser } from "../../context/UserContext";
import { useToast } from "../Common/ToastAndConfirm";
import { 
  computeSessionStats, 
  generateGeminiReportMarkdown, 
  analyzeAiTelemetryMarkdown,
  ERROR_TAGS, 
  AI_ACTIONS, 
  PIVOT_CONCEPTS 
} from "../../services/telemetryEngine";
import { 
  addSharedResource, 
  deleteSharedResource, 
  appendFlashcardsToTopic 
} from "../../firebase/firestoreService";
import { MarkdownRenderer } from "../Common/MarkdownRenderer";
import { GeminiReportModal } from "./GeminiReportModal";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Copy, 
  Sparkles, 
  Flag, 
  Scale, 
  Layers,
  ArrowLeft,
  RotateCcw,
  BookOpen,
  Upload,
  Eye,
  EyeOff,
  Trash2,
  Tag
} from "lucide-react";

export function AuditBreakdown({ topic, rawAnswers, onSaveAndProceed, onRetakePretest, onBackToHub }) {
  const { currentUserId, currentUser, theme } = useUser();
  const { showToast, confirmAction } = useToast();
  const isDark = theme === "dark";

  // Estado local para permitir auditar cada error
  const [answersState, setAnswersState] = useState(rawAnswers || {});
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  // Filtros de visualización de preguntas: 'all' | 'incorrect' | 'attention' | 'p1' | 'p3' | 'correct'
  const [filterMode, setFilterMode] = useState("all");
  const [pivotFilter, setPivotFilter] = useState(null);

  // Estado para pegar y guardar la respuesta Markdown de la IA en la Biblioteca Pública
  const [showPasteAiModal, setShowPasteAiModal] = useState(false);
  const [aiMarkdownInput, setAiMarkdownInput] = useState("");
  const [aiReportTitle, setAiReportTitle] = useState("");
  const [previewAiMarkdown, setPreviewAiMarkdown] = useState(false);
  const [isSavingAiReport, setIsSavingAiReport] = useState(false);

  // Calcular estadísticas dinámicas
  const stats = computeSessionStats(topic.pretest, answersState);

  // Analizar en vivo el Markdown pegado por el usuario
  const liveAiAnalysis = aiMarkdownInput.trim()
    ? analyzeAiTelemetryMarkdown(aiMarkdownInput, topic, currentUser?.name || "Donato", stats)
    : null;

  // Reportes de Telemetría IA guardados en este tema (Públicos para Donato y Sonia)
  const savedAiReports = (topic.resources || []).filter((r) => r.type === "ai_telemetry");

  // Guardar la respuesta Markdown de la IA como fuente etiquetada en la Biblioteca Pública
  const handleSaveAiTelemetryToLibrary = async (e) => {
    e.preventDefault();
    if (!aiMarkdownInput.trim()) return;

    setIsSavingAiReport(true);
    try {
      const authorName = currentUser?.name || (currentUserId === "sonia" ? "Sonia" : "Donato");
      const analysis = analyzeAiTelemetryMarkdown(aiMarkdownInput, topic, authorName, stats);
      const defaultTitle = `Reporte Telemetría IA (${topic.code || "Pre-Test"}) — ${authorName} (${stats.grossScorePercent}% Bruta / ${stats.realScorePercent}% Real)`;

      const newResource = {
        title: aiReportTitle.trim() || defaultTitle,
        type: "ai_telemetry",
        isPublic: true,
        url: "",
        content: aiMarkdownInput.trim(),
        tags: analysis.tags,
        analysisSummary: {
          sections: analysis.sections,
          tablesCount: analysis.tablesCount,
          codeBlocksCount: analysis.codeBlocksCount,
          inlineCodeCount: analysis.inlineCodeCount,
          ankiCardsCount: analysis.extractedAnkiCards.length,
          wordCount: analysis.wordCount,
          grossScorePercent: stats.grossScorePercent,
          realScorePercent: stats.realScorePercent
        },
        addedBy: authorName,
        authorId: currentUserId
      };

      await addSharedResource(topic.code || topic.id, newResource);
      setAiMarkdownInput("");
      setAiReportTitle("");
      setShowPasteAiModal(false);
      showToast(
        "¡Reporte de Telemetría IA guardado en la Biblioteca Pública! Ya pueden consultarlo Donato y Sonia.",
        "success"
      );
    } catch (err) {
      console.error("Error guardando reporte IA:", err);
      showToast("Error al guardar el reporte en la biblioteca", "error");
    } finally {
      setIsSavingAiReport(false);
    }
  };

  // Importar tarjetas TSV desde una caja de código del reporte IA directo al mazo Anki del tema
  const handleImportTsvFromMarkdown = async (tsvCodeText) => {
    try {
      const authorName = currentUser?.name || (currentUserId === "sonia" ? "Sonia" : "Donato");
      const { addedCount } = await appendFlashcardsToTopic(topic.code || topic.id, tsvCodeText, authorName);
      showToast(`¡${addedCount} tarjetas Anki agregadas al mazo del tema ${topic.code || ""}!`, "success");
    } catch (err) {
      showToast(err.message || "Error al importar tarjetas Anki", "error");
    }
  };

  // Eliminar un reporte de telemetría guardado
  const handleDeleteSavedAiReport = async (resourceId) => {
    const confirmed = await confirmAction({
      title: "¿Eliminar Reporte de Telemetría IA?",
      message: "Se eliminará de la Biblioteca compartida de Donato y Sonia.",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      isDestructive: true
    });
    if (!confirmed) return;
    try {
      await deleteSharedResource(topic.code || topic.id, resourceId);
      showToast("Reporte eliminado de la biblioteca", "info");
    } catch {
      showToast("No se pudo eliminar el reporte", "error");
    }
  };

  // Contadores para los botones de filtro
  const totalCount = stats.detailedItems.length;
  const incorrectCount = stats.detailedItems.filter((i) => !i.isCorrect).length;
  const correctCount = stats.detailedItems.filter((i) => i.isCorrect).length;
  const attentionCount = stats.detailedItems.filter((i) => !i.isCorrect || i.answer?.confidence === "BAJA").length;
  const p1Count = stats.detailedItems.filter((i) => i.quadrant?.priority === 1).length;
  const p3Count = stats.detailedItems.filter((i) => i.quadrant?.priority === 3).length;

  // Filtrar lista de reactivos según selección activa
  const filteredItems = stats.detailedItems.filter((item) => {
    if (pivotFilter && item.question?.concepto_pivote !== pivotFilter) {
      return false;
    }
    if (filterMode === "incorrect") return !item.isCorrect;
    if (filterMode === "correct") return item.isCorrect;
    if (filterMode === "attention") return !item.isCorrect || item.answer?.confidence === "BAJA";
    if (filterMode === "p1") return item.quadrant?.priority === 1;
    if (filterMode === "p3") return item.quadrant?.priority === 3;
    return true;
  });

  // Actualizar Fila 1: Tipo de error cognitivo
  const selectErrorType = (qId, errorType) => {
    setAnswersState((prev) => {
      const updated = {
        ...prev,
        [qId]: {
          ...prev[qId],
          errorType: prev[qId]?.errorType === errorType ? null : errorType
        }
      };
      // Persistir auditoría editada
      const storageKey = `enarmcito_pretest_answers_${currentUserId}_${topic.id}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  };

  // Actualizar Fila 2: Acciones solicitadas a la IA
  const toggleAiAction = (qId, action) => {
    setAnswersState((prev) => {
      const currentActions = prev[qId]?.aiActions || [];
      const hasAction = currentActions.includes(action);
      const newActions = hasAction
        ? currentActions.filter((a) => a !== action)
        : [...currentActions, action];

      const updated = {
        ...prev,
        [qId]: {
          ...prev[qId],
          aiActions: newActions
        }
      };
      const storageKey = `enarmcito_pretest_answers_${currentUserId}_${topic.id}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  };

  // Copiar reporte para Gemini directo al portapapeles
  const handleCopyReport = () => {
    const md = generateGeminiReportMarkdown(topic, stats);
    navigator.clipboard.writeText(md).then(() => {
      setCopiedSuccess(true);
      showToast("¡Informe ultra-detallado copiado al portapapeles!", "success");
      setTimeout(() => setCopiedSuccess(false), 3000);
    });
  };

  // Confirmar repetición del Pre-Test
  const handleConfirmRetake = async () => {
    const confirmed = await confirmAction({
      title: "¿Repetir Pre-Test?",
      message: "Esto reiniciará tus respuestas actuales del Pre-Test para que puedas resolverlo nuevamente desde la pregunta 1.",
      confirmText: "Sí, reiniciar",
      cancelText: "Cancelar",
      isDestructive: true
    });

    if (confirmed && onRetakePretest) {
      const storageKey = `enarmcito_pretest_answers_${currentUserId}_${topic.id}`;
      localStorage.removeItem(storageKey);
      localStorage.removeItem(`${storageKey}_idx`);
      onRetakePretest();
    }
  };

  const questions = topic.pretest?.questions || [];

  if (questions.length === 0) {
    return (
      <div className={`max-w-xl mx-auto border rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-sm my-8 ${
        isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
      }`}>
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-cyan-400 flex items-center justify-center mx-auto text-xl">
          📊
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
            Sin auditoría disponible
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Aún no hay reactivos ni intentos registrados para <strong>{topic.title}</strong>.
          </p>
        </div>
        <button
          type="button"
          onClick={onBackToHub}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Hub</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-24">
      {/* Barra de navegación superior con botón Volver y Reiniciar */}
      <div className={`flex items-center justify-between border rounded-2xl p-3 shadow-sm transition-colors ${
        isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
      }`}>
        <button
          type="button"
          onClick={onBackToHub}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition-all text-slate-800 dark:text-slate-200"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al Hub</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleConfirmRetake}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-xs font-bold transition-all"
            title="Volver a contestar el Pre-Test desde cero"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Repetir Pre-Test</span>
          </button>
        </div>
      </div>

      {/* Banner Resumen de Telemetría */}
      <div className={`border rounded-2xl p-5 sm:p-6 shadow-sm transition-colors ${
        isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 mb-4 border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-[10px] font-extrabold text-blue-600 dark:text-cyan-400 uppercase tracking-wider block mb-0.5">
              Fase B: Auditoría Psicométrica
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white">
              Autopsia Cognitiva del Examen
            </h2>
            <p className="text-xs opacity-75 mt-0.5">
              {topic.title} • {topic.normativa_origen}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyReport}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-95 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedSuccess ? "¡Copiado! ✓" : "📋 Copiar Informe Ultra-Detallado para IA"}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsReportOpen(true)}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold border-2 cursor-pointer ${
                isDark ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700" : "bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200"
              }`}
            >
              Ver Markdown
            </button>
          </div>
        </div>

        {/* Métricas en Tarjetas Rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-xl border-2 border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
            <span className="text-[10px] opacity-70 font-bold block">Calificación Bruta</span>
            <div className="text-lg sm:text-xl font-black mt-0.5 text-slate-900 dark:text-white">
              {stats.correctCount}/{stats.total}
              <span className="text-xs opacity-70 font-normal ml-1">({stats.grossScorePercent}%)</span>
            </div>
          </div>

          <div className="p-3 rounded-xl border-2 border-blue-500/40 bg-blue-500/10 text-blue-900 dark:text-cyan-200">
            <span className="text-[10px] font-bold block">Calificación Real (Alta Confianza)</span>
            <div className="text-lg sm:text-xl font-black mt-0.5">
              {stats.highConfidenceCorrect}/{stats.total}
              <span className="text-xs font-normal ml-1">({stats.realScorePercent}%)</span>
            </div>
          </div>

          <div className="p-3 rounded-xl border-2 border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
            <span className="text-[10px] opacity-70 font-bold block">Tiempo Total</span>
            <div className="text-lg sm:text-xl font-black mt-0.5 font-mono text-slate-900 dark:text-white">
              {Math.floor(stats.totalSeconds / 60)}m {stats.totalSeconds % 60}s
            </div>
          </div>

          <div className="p-3 rounded-xl border-2 border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
            <span className="text-[10px] opacity-70 font-bold block">Promedio / Reactivo</span>
            <div className="text-lg sm:text-xl font-black mt-0.5 font-mono text-slate-900 dark:text-white">
              {stats.avgSecondsPerQ}s
            </div>
          </div>
        </div>

        {/* Resumen de los 6 Conceptos Pivote (Clicables para filtrar) */}
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider opacity-80">
              Rendimiento por Concepto Pivote (Toca uno para filtrar):
            </h4>
            {pivotFilter && (
              <button
                type="button"
                onClick={() => setPivotFilter(null)}
                className="text-[10px] font-extrabold text-blue-600 dark:text-cyan-400 underline cursor-pointer"
              >
                Quitar filtro de pivote ✕
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(stats.pivotStats).map(([key, s]) => {
              if (s.total === 0) return null;
              const pct = Math.round((s.correct / s.total) * 100);
              const isCrit = pct === 0;
              const isWeak = pct > 0 && pct < 100;
              const isSelectedPivot = pivotFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPivotFilter(isSelectedPivot ? null : key)}
                  className={`p-2 rounded-xl border-2 text-xs flex items-center justify-between transition-all cursor-pointer ${
                    isSelectedPivot
                      ? "ring-2 ring-blue-500 border-blue-600 bg-blue-500/20 text-blue-900 dark:text-white font-black"
                      : isCrit
                      ? "bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-300 font-bold hover:bg-rose-500/20"
                      : isWeak
                      ? "bg-amber-500/10 border-amber-500/40 text-amber-800 dark:text-amber-300 font-bold hover:bg-amber-500/20"
                      : "bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-bold hover:bg-emerald-500/20"
                  }`}
                >
                  <span className="truncate pr-1 text-[11px]">{PIVOT_CONCEPTS[key] || key}</span>
                  <span className="font-mono flex-shrink-0 text-[11px]">
                    {s.correct}/{s.total} ({pct}%)
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECCIÓN PÚBLICA DÚO: Pegar y Consultar el Reporte de Telemetría devuelto por la IA */}
      <div className={`border-2 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5 transition-colors ${
        isDark ? "bg-slate-900 border-indigo-500/40 text-white" : "bg-white border-indigo-300 text-slate-900"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b-2 pb-3 border-slate-200 dark:border-slate-800">
          <div className="flex items-start gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-xs flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Puente IA → Biblioteca Pública Dúo
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  🌐 Público (Visible para Donato & Sonia)
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black mt-0.5">
                Retroalimentación de Telemetría IA Guardada ({savedAiReports.length})
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Pega aquí el reporte en Markdown que te devuelva la IA (tablas comparativas, cajas de código, texto monoespaciado y tarjetas Anki). Se analizará y guardará etiquetado en la Biblioteca Pública para que ambos lo consulten.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowPasteAiModal(!showPasteAiModal)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer flex-shrink-0 self-start sm:self-center"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{showPasteAiModal ? "Cerrar Editor" : "+ Pegar Reporte Markdown de la IA"}</span>
          </button>
        </div>

        {/* Formulario para pegar la respuesta Markdown de la IA */}
        {showPasteAiModal && (
          <form onSubmit={handleSaveAiTelemetryToLibrary} className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
              <div className="sm:col-span-9">
                <label className="text-[11px] font-extrabold block mb-1 opacity-80">
                  Título del Reporte en la Biblioteca (opcional, se genera automático si lo dejas vacío):
                </label>
                <input
                  type="text"
                  value={aiReportTitle}
                  onChange={(e) => setAiReportTitle(e.target.value)}
                  placeholder={`Reporte Telemetría IA (${topic.code}) — ${currentUser?.name || "Donato"} (${stats.grossScorePercent}% Bruta / ${stats.realScorePercent}% Real)`}
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div className="sm:col-span-3 flex items-end justify-end h-full pt-4">
                <button
                  type="button"
                  onClick={() => setPreviewAiMarkdown(!previewAiMarkdown)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 dark:border-slate-700 text-xs font-extrabold flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {previewAiMarkdown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{previewAiMarkdown ? "Editar Markdown" : "Vista Previa"}</span>
                </button>
              </div>
            </div>

            {!previewAiMarkdown ? (
              <textarea
                rows={9}
                value={aiMarkdownInput}
                onChange={(e) => setAiMarkdownInput(e.target.value)}
                placeholder={"Pega aquí la respuesta en Markdown de Gemini / ChatGPT...\nSoporta:\n- Encabezados (#, ##, ###)\n- Tablas comparativas (| Col 1 | Col 2 |)\n- Texto monoespaciado inline (`fármaco`, `dosis`, `#Etiqueta`)\n- Cajas de código (```tsv ... ```) para importar tarjetas Anki en 1 clic"}
                className="w-full p-3.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-xs focus:border-indigo-500 outline-hidden leading-relaxed"
              />
            ) : (
              <div className="p-4 rounded-xl border-2 border-indigo-400/50 bg-slate-50/70 dark:bg-slate-950/60 max-h-96 overflow-y-auto">
                {aiMarkdownInput.trim() ? (
                  <MarkdownRenderer
                    content={aiMarkdownInput}
                    onImportTsvCards={handleImportTsvFromMarkdown}
                  />
                ) : (
                  <p className="text-xs opacity-60 italic text-center py-6">
                    Aún no has pegado texto Markdown para previsualizar.
                  </p>
                )}
              </div>
            )}

            {/* Panel de Análisis Inteligente en Vivo del Markdown pegado */}
            {liveAiAnalysis && (
              <div className="p-3 rounded-xl border-2 border-indigo-500/30 bg-indigo-500/10 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-black text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                    <span>🧠 Análisis Automático del Reporte Pegado:</span>
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                    <span className="px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-900 border border-indigo-300 dark:border-indigo-800">
                      📑 {liveAiAnalysis.sections.length} secciones
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-900 border border-indigo-300 dark:border-indigo-800">
                      ⚖️ {liveAiAnalysis.tablesCount} tablas comparativas
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-900 border border-indigo-300 dark:border-indigo-800">
                      💻 {liveAiAnalysis.codeBlocksCount} cajas de código
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-900 border border-indigo-300 dark:border-indigo-800">
                      🔤 {liveAiAnalysis.inlineCodeCount} monoespaciados
                    </span>
                    {liveAiAnalysis.extractedAnkiCards.length > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white font-extrabold">
                        🗂️ {liveAiAnalysis.extractedAnkiCards.length} tarjetas Anki TSV listas
                      </span>
                    )}
                  </div>
                </div>

                {/* Etiquetas que se guardarán en la Biblioteca */}
                <div className="flex flex-wrap items-center gap-1 pt-1">
                  <span className="text-[10px] font-extrabold opacity-75 mr-1 flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Etiquetas Biblioteca:
                  </span>
                  {liveAiAnalysis.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-600/15 text-indigo-900 dark:text-indigo-200 border border-indigo-500/30"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="submit"
                disabled={!aiMarkdownInput.trim() || isSavingAiReport}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 disabled:opacity-40 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>
                  {isSavingAiReport
                    ? "Guardando en Biblioteca..."
                    : "💾 Guardar en Biblioteca Pública (Visible para Donato y Sonia)"}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* Lista de Reportes de Telemetría IA Guardados en este Tema */}
        {savedAiReports.length > 0 && (
          <div className="space-y-3 pt-2">
            {savedAiReports.map((rep, idx) => {
              const summary = rep.analysisSummary || {};
              return (
                <details
                  key={rep.id || idx}
                  open={idx === 0}
                  className={`border-2 rounded-2xl overflow-hidden transition-all ${
                    isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50/70 border-slate-300"
                  }`}
                >
                  <summary className="p-3.5 cursor-pointer select-none flex flex-wrap items-center justify-between gap-2 bg-indigo-500/10 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-indigo-600 text-white">
                        🤖 REPORTE IA #{savedAiReports.length - idx}
                      </span>
                      <span className="text-xs sm:text-sm font-black">
                        {rep.title}
                      </span>
                      <span className="text-[11px] font-bold opacity-75">
                        • Subido por <strong>{rep.addedBy || "Dúo"}</strong> ({rep.date || "Hoy"})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {summary.tablesCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-500/15 text-blue-700 dark:text-cyan-300 border border-blue-500/30">
                          ⚖️ {summary.tablesCount} tablas
                        </span>
                      )}
                      {summary.codeBlocksCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-200 dark:bg-slate-800">
                          💻 {summary.codeBlocksCount} cajas
                        </span>
                      )}
                      {summary.ankiCardsCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                          🗂️ {summary.ankiCardsCount} Anki
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteSavedAiReport(rep.id);
                        }}
                        className="p-1.5 rounded-lg border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100 cursor-pointer"
                        title="Eliminar reporte de la biblioteca"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </summary>

                  <div className="p-4 sm:p-5 space-y-3">
                    {Array.isArray(rep.tags) && rep.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pb-2 border-b border-slate-200 dark:border-slate-800">
                        {rep.tags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <MarkdownRenderer
                      content={rep.content}
                      onImportTsvCards={handleImportTsvFromMarkdown}
                    />
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>

      {/* Barra de Filtros de Preguntas */}
      <div className={`border-2 rounded-2xl p-3.5 shadow-xs space-y-2.5 ${
        isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-900"
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider opacity-80">
            🔍 Filtrar Preguntas del Pre-Test:
          </span>
          <span className="text-xs font-bold text-blue-600 dark:text-cyan-400">
            Mostrando {filteredItems.length} de {totalCount} reactivos
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "all", label: `📋 Todas (${totalCount})` },
            { id: "incorrect", label: `❌ Solo Equivocadas (${incorrectCount})` },
            { id: "attention", label: `🚨 Errores + Dudas (${attentionCount})` },
            { id: "p1", label: `🔴 Hipercorrección (${p1Count})` },
            { id: "p3", label: `🟡 Aciertos con Duda (${p3Count})` },
            { id: "correct", label: `✅ Solo Correctas (${correctCount})` }
          ].map((tab) => {
            const active = filterMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border-2 transition-all cursor-pointer ${
                  active
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : isDark
                    ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                    : "bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de Reactivos con Autopsia Detallada */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className={`border-2 rounded-2xl p-8 text-center space-y-2 ${
            isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-white border-slate-300 text-slate-700"
          }`}>
            <p className="text-sm font-extrabold">No hay preguntas que coincidan con este filtro.</p>
            <button
              type="button"
              onClick={() => {
                setFilterMode("all");
                setPivotFilter(null);
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer"
            >
              Mostrar todas las preguntas ({totalCount})
            </button>
          </div>
        ) : null}

        {filteredItems.map((item) => {
          const q = item.question || {};
          const ans = item.answer || {};
          const isCorrect = item.isCorrect;
          const quadrant = item.quadrant || {};
          const doubtedOption = Array.isArray(item.doubtedBetween)
            ? item.doubtedBetween.find((opt) => opt !== ans.selectedOption)
            : typeof item.doubtedBetween === "string"
            ? item.doubtedBetween
            : null;

          return (
            <div
              key={q.id || item.index}
              className={`border-2 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5 transition-all ${
                isDark
                  ? quadrant.priority === 1
                    ? "bg-slate-900 border-rose-500/50 text-white"
                    : quadrant.priority === 2
                    ? "bg-slate-900 border-amber-500/50 text-white"
                    : "bg-slate-900 border-slate-800 text-white"
                  : quadrant.priority === 1
                    ? "bg-white border-rose-400 text-slate-900 ring-1 ring-rose-200"
                    : quadrant.priority === 2
                    ? "bg-white border-amber-400 text-slate-900"
                    : "bg-white border-slate-300 text-slate-900"
              }`}
            >
              {/* 1. Veredicto Visual y Cuadrante Metacognitivo */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5 border-slate-200 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-black font-mono px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800">
                    #{item.index}
                  </span>
                  {q.case_id && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-indigo-400/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                      Caso {q.case_id}
                    </span>
                  )}
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                    {PIVOT_CONCEPTS[q.concepto_pivote] || q.concepto_pivote}
                  </span>
                  {q.nivel_cognitivo && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-400/40 bg-blue-500/10 text-blue-700 dark:text-blue-300">
                      {q.nivel_cognitivo}
                    </span>
                  )}
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                    (ans.timeSeconds || 0) > 90
                      ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                      : "opacity-70"
                  }`}>
                    ⏱️ {ans.timeSeconds || 0}s {(ans.timeSeconds || 0) > 90 ? "(Lento)" : ""}
                  </span>
                </div>

                <div className={`px-3 py-1 rounded-full text-[11px] font-extrabold border flex items-center gap-1.5 ${quadrant.badgeColor || ""}`}>
                  <span>{quadrant.verdictLabel || quadrant.name}</span>
                </div>
              </div>

              {/* Viñeta Clínica + Pregunta */}
              <div className="clinical-case-text p-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-1.5">
                <p className="opacity-90 text-xs whitespace-pre-line leading-relaxed">{q.vignette}</p>
                <p className="font-extrabold text-xs sm:text-sm pt-1 border-t border-slate-200 dark:border-slate-800">
                  {q.question_text}
                </p>
              </div>

              {/* 2. El Dato Pivote Oculto */}
              {q.dato_pivote_oculto && (
                <div className="p-3 rounded-xl border-2 border-cyan-500/40 bg-cyan-500/10 text-cyan-950 dark:text-cyan-100 text-xs">
                  <strong className="text-cyan-800 dark:text-cyan-300 block mb-0.5 font-extrabold uppercase tracking-wide text-[11px]">
                    🔑 El Dato Pivote Oculto en la Viñeta:
                  </strong>
                  <p className="leading-relaxed font-semibold">{q.dato_pivote_oculto}</p>
                </div>
              )}

              {/* Comparativa: Lo que elegiste vs La correcta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className={`p-3 rounded-xl border-2 ${
                  isCorrect
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-900 dark:text-emerald-200"
                    : "bg-rose-500/10 border-rose-500/40 text-rose-900 dark:text-rose-200"
                }`}>
                  <span className="text-[10px] uppercase font-extrabold opacity-75 block mb-0.5">
                    Tu Selección (Confianza {ans.confidence || "BAJA"}):
                  </span>
                  <div className="font-extrabold text-sm">
                    Opción {ans.selectedOption || "—"}: {q.options?.[ans.selectedOption] || "Sin respuesta"}
                  </div>
                  {!isCorrect && q.distractor_roles?.[ans.selectedOption] && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded bg-rose-500/20 text-[10px] font-bold">
                      Rol Trampa: {q.distractor_roles[ans.selectedOption]}
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-950 dark:text-emerald-200">
                  <span className="text-[10px] uppercase font-extrabold text-emerald-700 dark:text-emerald-400 block mb-0.5">
                    Respuesta Correcta GPC / NOM:
                  </span>
                  <div className="font-extrabold text-sm">
                    Opción {q.correctAnswer}: {q.options?.[q.correctAnswer] || ""}
                  </div>
                </div>
              </div>

              {/* Alertas de Telemetría de Tachado / Duda */}
              {(item.struckCorrect || doubtedOption || (item.struckOptions && item.struckOptions.length > 0)) && (
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  {item.struckCorrect && (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-700 dark:text-rose-300 font-extrabold">
                      ⚠️ Tachaste la respuesta correcta ({q.correctAnswer}) por error durante el examen
                    </span>
                  )}
                  {doubtedOption && (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-300 font-bold">
                      ⚖️ Dudaste entre tu elección ({ans.selectedOption}) y la opción ({doubtedOption}): {q.options?.[doubtedOption] || ""}
                    </span>
                  )}
                  {item.struckOptions && item.struckOptions.length > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                      ✕ Opciones tachadas: {item.struckOptions.join(", ")}
                    </span>
                  )}
                </div>
              )}

              {/* 3. Justificación Oficial GPC */}
              {q.justificacion_gpc && (
                <div className="p-3 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 text-xs">
                  <strong className="block mb-0.5 font-extrabold text-emerald-800 dark:text-emerald-300">
                    📖 Justificación Oficial GPC / NOM:
                  </strong>
                  <p className="leading-relaxed opacity-95">{q.justificacion_gpc}</p>
                </div>
              )}

              {/* 4. Autopsia de tu Distractor (y opción contra la que dudó) */}
              {!isCorrect && ans.selectedOption && q.distractor_autopsies?.[ans.selectedOption] && (
                <div className="p-3 rounded-xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-950 dark:text-amber-100 text-xs">
                  <strong className="text-amber-800 dark:text-amber-300 block mb-0.5 font-extrabold">
                    🪤 Autopsia de tu Distractor Elegido ({ans.selectedOption} — {q.options?.[ans.selectedOption] || ""}):
                  </strong>
                  <p className="leading-relaxed">{q.distractor_autopsies[ans.selectedOption]}</p>
                </div>
              )}

              {doubtedOption && q.distractor_autopsies?.[doubtedOption] && (
                <div className="p-3 rounded-xl bg-purple-500/10 border-2 border-purple-500/30 text-purple-950 dark:text-purple-100 text-xs">
                  <strong className="text-purple-800 dark:text-purple-300 block mb-0.5 font-extrabold">
                    🔍 Autopsia de la Opción contra la que Dudaste ({doubtedOption} — {q.options?.[doubtedOption] || ""}):
                  </strong>
                  <p className="leading-relaxed">{q.distractor_autopsies[doubtedOption]}</p>
                </div>
              )}

              {/* Desplegable con la autopsia de todos los distractores */}
              {q.distractor_autopsies && Object.keys(q.distractor_autopsies).length > 0 && (
                <details className="text-xs border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 bg-slate-50/60 dark:bg-slate-950/30">
                  <summary className="font-bold cursor-pointer select-none opacity-80 hover:opacity-100">
                    Ver autopsia completa de los 3 distractores (A, B, C, D)
                  </summary>
                  <div className="mt-2 space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                    {Object.entries(q.distractor_autopsies).map(([optKey, text]) => {
                      if (!text || optKey === q.correctAnswer) return null;
                      return (
                        <div key={optKey} className="text-[11px] leading-relaxed">
                          <span className="font-extrabold">Opción {optKey} ({q.options?.[optKey]}): </span>
                          <span className="opacity-90">{text}</span>
                        </div>
                      );
                    })}
                  </div>
                </details>
              )}

              {/* B. Controles Interactivos de Autodiagnóstico (Toques de 1 segundo) */}
              {(!isCorrect || ans.confidence === "BAJA") && (
                <div className="pt-3 border-t-2 border-slate-200 dark:border-slate-800 space-y-3">
                  <div>
                    <span className="text-[11px] font-extrabold block mb-1.5 text-slate-800 dark:text-slate-200">
                      Fila 1: ¿Por qué fallé? (Selección única - Toque de 1s):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {[
                        {
                          key: ERROR_TAGS.OlvidoPuro,
                          label: "🧠 Olvido Puro",
                          sub: "No sabía el dato exacto"
                        },
                        {
                          key: ERROR_TAGS.Razonamiento,
                          label: "🧩 Fallo de Razonamiento",
                          sub: "Sabía la teoría, no vi el cuadro clínico"
                        },
                        {
                          key: ERROR_TAGS.Distractor,
                          label: "🪤 Caí en el Distractor",
                          sub: "Confundí 1ra elección con Gold Standard"
                        },
                        {
                          key: ERROR_TAGS.FaltaAtencion,
                          label: "👁️ Falta de Atención",
                          sub: "Leí mal la edad, alergia o EXCEPTO"
                        }
                      ].map((errBtn) => {
                        const isSelected = ans.errorType === errBtn.key;
                        return (
                          <button
                            key={errBtn.key}
                            type="button"
                            onClick={() => selectErrorType(q.id, errBtn.key)}
                            className={`p-2 rounded-xl text-left border-2 text-xs transition-all cursor-pointer ${
                              isSelected
                                ? "bg-blue-600 text-white border-blue-600 font-extrabold shadow-xs"
                                : "bg-slate-50 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            <span className="block font-extrabold">{errBtn.label}</span>
                            <span className={`block text-[10px] ${isSelected ? "text-blue-100" : "opacity-70"}`}>
                              ({errBtn.sub})
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-extrabold block mb-1.5 text-slate-800 dark:text-slate-200">
                      Fila 2: Acción inmediata para la IA (Selección múltiple):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                      {[
                        { key: AI_ACTIONS.ExplicarAlgoritmo, label: "🚩 Explicar Algoritmo Paso a Paso" },
                        { key: AI_ACTIONS.TablaComparativa, label: "⚖️ Crear Tabla Comparativa con mi Distractor" },
                        { key: AI_ACTIONS.GenerarAnki, label: "🗂️ Generar Tarjetas Anki de este Error" }
                      ].map((actBtn) => {
                        const isActSelected = (ans.aiActions || []).includes(actBtn.key);
                        return (
                          <button
                            key={actBtn.key}
                            type="button"
                            onClick={() => toggleAiAction(q.id, actBtn.key)}
                            className={`p-2.5 rounded-xl text-left border-2 text-[11px] font-bold transition-all cursor-pointer ${
                              isActSelected
                                ? "bg-purple-600 text-white border-purple-600 font-extrabold shadow-xs"
                                : "bg-slate-50 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            <span className="block leading-snug">{actBtn.label}</span>
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

      {/* Botón Flotante Inferior para Copiar Informe Ultra-Detallado y Continuar */}
      <div className={`fixed bottom-0 left-0 right-0 p-3.5 backdrop-blur-md border-t-2 z-30 transition-colors ${
        isDark ? "bg-slate-950/95 border-slate-800" : "bg-white/95 border-slate-300 shadow-lg"
      }`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyReport}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 hover:opacity-95 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Copy className="w-4 h-4" />
            <span>{copiedSuccess ? "¡Informe Copiado al Portapapeles! ✓" : "📋 Copiar Informe Ultra-Detallado para IA"}</span>
          </button>

          <button
            type="button"
            onClick={() => onSaveAndProceed(stats)}
            className="py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <span>Guardar & Ir a Fase 1 →</span>
          </button>
        </div>
      </div>

      {isReportOpen && (
        <GeminiReportModal
          markdownContent={generateGeminiReportMarkdown(topic, stats)}
          onClose={() => setIsReportOpen(false)}
        />
      )}
    </div>
  );
}
