// src/components/Phase2_Anki/AnkiCardViewer.jsx
// Fase 2: Flashcards con FSRS v4.5, teclado completo (Espacio, 1, 2, 3, 4), etiquetas solo al reverso, filtros Anki y Modo Examen

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useUser } from "../../context/UserContext";
import { 
  scheduleCardFSRS, 
  getIntervalForecast, 
  exportCardsToAnkiTSV, 
  RATINGS 
} from "../../services/fsrsEngine";
import { PIVOT_CONCEPTS } from "../../services/telemetryEngine";
import { MarkdownRenderer } from "../Common/MarkdownRenderer";
import { 
  RotateCw, 
  Download, 
  CheckCircle2, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight,
  Tag,
  Clock,
  Undo2,
  Filter,
  Shuffle,
  BookOpen,
  Sparkles
} from "lucide-react";

export function AnkiCardViewer({ topic, onBackToHub, onProceedToSimulator }) {
  const { 
    currentUser, 
    markPhaseComplete, 
    theme, 
    fontPreference, 
    fontSize 
  } = useUser();
  const rawCards = topic.flashcards || [];

  // Modo de filtro de estudio: "all" | "new" | "review" | "random"
  const [studyFilter, setStudyFilter] = useState("all");
  const [deck, setDeck] = useState(rawCards);

  // Filtrar tarjetas según el modo
  const filteredCards = useMemo(() => {
    let result = [...deck];
    if (studyFilter === "new") {
      result = result.filter(c => !c.cardState || c.cardState.reps === 0 || c.cardState.state === "new");
    } else if (studyFilter === "review") {
      result = result.filter(c => c.cardState && c.cardState.reps > 0);
    } else if (studyFilter === "random") {
      // Barajar aleatoriamente
      result = [...result].sort(() => Math.random() - 0.5);
    }
    return result.length > 0 ? result : deck;
  }, [deck, studyFilter]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState(false);

  // Pila de historial para poder regresar a la tarjeta anterior y restaurar estado
  const [historyStack, setHistoryStack] = useState([]);

  // Medición de tiempo de respuesta
  const [cardStartTime, setCardStartTime] = useState(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef(null);

  // Asegurar índice válido
  const safeIndex = Math.min(currentIndex, Math.max(0, filteredCards.length - 1));
  const currentCard = filteredCards[safeIndex];

  // Iniciar temporizador al cambiar de tarjeta o filtro
  useEffect(() => {
    setCardStartTime(Date.now());
    setElapsedSeconds(0);
    clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [safeIndex, studyFilter]);

  // Controles de Teclado (Espacio para voltear, 1-4 para calificar, Flechas para navegar)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Evitar capturar si el usuario está escribiendo en un input o textarea
      if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePreviousCard();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (safeIndex < filteredCards.length - 1) {
          setIsFlipped(false);
          setCurrentIndex((prev) => prev + 1);
        }
      } else if (isFlipped) {
        if (e.key === "1") {
          e.preventDefault();
          handleRating(RATINGS.AGAIN);
        } else if (e.key === "2") {
          e.preventDefault();
          handleRating(RATINGS.HARD);
        } else if (e.key === "3") {
          e.preventDefault();
          handleRating(RATINGS.GOOD);
        } else if (e.key === "4") {
          e.preventDefault();
          handleRating(RATINGS.EASY);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFlipped, safeIndex, filteredCards]);

  if (!currentCard) {
    return (
      <div className="p-8 text-center text-slate-500">
        No hay tarjetas flashcards disponibles para este filtro.
      </div>
    );
  }

  // Previsión de intervalos futuros calculados con FSRS v4.5
  const intervalsForecast = getIntervalForecast(currentCard.cardState);

  // Calificar tarjeta con FSRS
  const handleRating = (rating) => {
    const responseTimeMs = Date.now() - cardStartTime;
    const oldCardState = currentCard.cardState;

    setHistoryStack((prev) => [
      ...prev,
      {
        cardId: currentCard.id,
        cardIndex: safeIndex,
        previousState: oldCardState,
        ratingApplied: rating
      }
    ]);

    const updatedCardState = scheduleCardFSRS(oldCardState, rating, responseTimeMs);
    const newDeck = deck.map((c) => c.id === currentCard.id ? { ...c, cardState: updatedCardState } : c);
    setDeck(newDeck);
    setIsFlipped(false);

    if (safeIndex < filteredCards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      markPhaseComplete(2, { phase2_cards_reviewed: filteredCards.length });
    }
  };

  // Regresar a la tarjeta anterior
  const handlePreviousCard = () => {
    if (safeIndex > 0) {
      const lastHistory = historyStack[historyStack.length - 1];
      if (lastHistory && lastHistory.cardId === filteredCards[safeIndex - 1]?.id) {
        const restoredDeck = deck.map((c) => c.id === lastHistory.cardId ? { ...c, cardState: lastHistory.previousState } : c);
        setDeck(restoredDeck);
        setHistoryStack((prev) => prev.slice(0, -1));
      }

      setIsFlipped(false);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Exportar baraja a TSV oficial de Anki
  const handleExportAnki = () => {
    const tsvContent = exportCardsToAnkiTSV(deck);
    const blob = new Blob([tsvContent], { type: "text/tab-separated-values;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Anki_${topic.code}_${topic.id}.tsv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadNotice(true);
    setTimeout(() => setDownloadNotice(false), 4000);
  };

  const progressPct = Math.round(((safeIndex + 1) / filteredCards.length) * 100);
  const isDark = theme === "dark";

  const fontStyle = {
    fontFamily: fontPreference === "Arial" ? "Arial, sans-serif" : fontPreference === "Helvetica" ? "Helvetica, Arial, sans-serif" : "Inter, sans-serif",
    fontSize: fontSize === "11pt" ? "14px" : fontSize === "14pt" ? "18px" : "16px"
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-20">
      {/* Header y Filtros estilo Anki */}
      <div className={`border rounded-2xl p-5 shadow-sm transition-colors ${
        isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 mb-4 border-slate-700/20">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                Fase 2: Flashcards FSRS v4.5
              </span>
              <span className="text-xs opacity-50">•</span>
              <span className="text-xs opacity-75">{topic.code}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold">
              Repaso Inteligente Espaciado
            </h2>
            <p className="text-xs opacity-70 mt-0.5">
              Atajos de teclado: [Espacio] Voltear • [1-4] Calificar • [← / →] Navegar
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportAnki}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Anki (.tsv)</span>
            </button>
            <button
              type="button"
              onClick={onBackToHub}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border ${
                isDark ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-300 text-slate-800"
              }`}
            >
              Volver al Hub
            </button>
          </div>
        </div>

        {/* Barra de Filtros estilo Anki (Todas / Nuevas / Repaso / Aleatorio) */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 opacity-60" />
            <span className="font-semibold opacity-75 mr-1">Modo:</span>
            {[
              { id: "all", label: `Todas (${deck.length})` },
              { id: "new", label: `Nuevas (${deck.filter(c => !c.cardState || c.cardState.reps === 0).length})` },
              { id: "review", label: `Repaso (${deck.filter(c => c.cardState && c.cardState.reps > 0).length})` },
              { id: "random", label: "Aleatorio", icon: Shuffle }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setStudyFilter(f.id);
                  setCurrentIndex(0);
                  setIsFlipped(false);
                }}
                className={`px-2.5 py-1 rounded-lg font-medium border text-[11px] transition-all ${
                  studyFilter === f.id
                    ? "bg-purple-600 text-white border-purple-600 font-bold shadow-sm"
                    : isDark ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] opacity-75">
            <span>Tarjeta {safeIndex + 1} de {filteredCards.length}</span>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 opacity-60" />
              <span>{elapsedSeconds}s</span>
            </div>
          </div>
        </div>

        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-purple-500 to-indigo-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {downloadNotice && (
        <div className="p-3 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-900 dark:text-purple-200 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
          <span>¡Archivo TSV descargado! Importa en Anki (Archivo → Importar).</span>
        </div>
      )}

      {/* Tarjeta Flashcard Interactiva (Front / Back Flip) */}
      <div className="perspective-1000">
        <div
          onClick={() => setIsFlipped(!isFlipped)}
          className={`min-h-[260px] sm:min-h-[300px] rounded-2xl p-6 sm:p-7 flex flex-col justify-between cursor-pointer transition-all duration-200 border shadow-md relative ${
            isDark
              ? isFlipped
                ? "bg-slate-900 border-purple-500/40 text-white"
                : "bg-slate-900 border-slate-800 text-white hover:border-slate-700"
              : isFlipped
                ? "bg-purple-50/40 border-purple-400 text-slate-900 shadow-purple-500/5"
                : "bg-white border-slate-300 text-slate-900 hover:border-slate-400"
          }`}
        >
          {/* Top meta de la tarjeta */}
          <div className="flex items-center justify-between text-xs border-b pb-2 border-slate-700/15">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                isDark ? "bg-purple-500/20 text-purple-300" : "bg-purple-100 text-purple-800"
              }`}>
                {isFlipped 
                  ? (PIVOT_CONCEPTS[currentCard.concepto_pivote] || currentCard.concepto_pivote)
                  : "Pregunta Pivote ENARM"
                }
              </span>
              <span className="opacity-60 font-mono text-[11px]">
                {currentCard.cardState?.state === "new" || !currentCard.cardState?.reps ? "Nueva" : `Repaso #${currentCard.cardState.reps}`}
              </span>
            </div>

            <span className="text-[11px] opacity-70 flex items-center gap-1 font-medium">
              <RotateCw className="w-3.5 h-3.5" />
              <span>[Espacio] para voltear</span>
            </span>
          </div>

          {/* Cuerpo de la tarjeta con soporte de Markdown y Renderizado Clínico */}
          <div className="py-6 my-auto text-center" style={fontStyle}>
            {!isFlipped ? (
              <div className="space-y-3">
                <div className="leading-relaxed font-bold max-w-xl mx-auto text-base sm:text-lg">
                  <MarkdownRenderer content={currentCard.front} />
                </div>
              </div>
            ) : (
              <div className="space-y-3 animate-fadeIn text-left sm:text-center">
                <span className="text-[11px] uppercase font-extrabold text-purple-600 dark:text-purple-400 tracking-wider block text-center">
                  Respuesta Oficial GPC:
                </span>
                <div className="leading-relaxed font-normal max-w-xl mx-auto text-base sm:text-lg">
                  <MarkdownRenderer content={currentCard.back} />
                </div>
              </div>
            )}
          </div>

          {/* Tags y Telemetría: LAS ETIQUETAS SOLO SE MUESTRAN AL REVERSO (Para no dar pistas al frente) */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-700/15 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap min-h-[22px]">
              {isFlipped ? (
                currentCard.tags?.map((tag, idx) => (
                  <span
                    key={idx}
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1 font-mono border ${
                      isDark ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-300 text-slate-700"
                    }`}
                  >
                    <Tag className="w-2.5 h-2.5 opacity-50" />
                    <span>{tag}</span>
                  </span>
                ))
              ) : (
                <span className="text-[10px] opacity-50 italic">
                  (Etiquetas ocultas para evitar pistas cognitivas)
                </span>
              )}
            </div>

            <div className="opacity-60 text-[10px] font-mono">
              FSRS Estabilidad: {currentCard.cardState?.stability || 0}d
            </div>
          </div>
        </div>
      </div>

      {/* Controles: Botón Regresar + Botones de Calificación FSRS v4.5 */}
      <div className="space-y-3">
        {isFlipped ? (
          <div className="space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handlePreviousCard}
                disabled={safeIndex === 0}
                className={`px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-all ${
                  isDark ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-300 text-slate-800"
                }`}
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>[←] Tarjeta Anterior</span>
              </button>

              <span className="text-xs font-bold opacity-75 hidden sm:inline">
                Usa las teclas [1], [2], [3] o [4] para calificar:
              </span>
            </div>

            {/* 4 Botones FSRS con teclas 1-4 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => handleRating(RATINGS.AGAIN)}
                className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-500/25 font-bold text-xs flex flex-col items-center gap-0.5 transition-all active:scale-95 shadow-sm"
              >
                <span>[1] Again (Repetir)</span>
                <span className="text-[11px] font-mono font-extrabold text-rose-600 dark:text-rose-400">
                  {intervalsForecast[RATINGS.AGAIN]}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleRating(RATINGS.HARD)}
                className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500/25 font-bold text-xs flex flex-col items-center gap-0.5 transition-all active:scale-95 shadow-sm"
              >
                <span>[2] Hard (Difícil)</span>
                <span className="text-[11px] font-mono font-extrabold text-amber-600 dark:text-amber-400">
                  {intervalsForecast[RATINGS.HARD]}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleRating(RATINGS.GOOD)}
                className="p-3 rounded-xl bg-blue-500/15 border border-blue-500/40 text-blue-800 dark:text-blue-300 hover:bg-blue-500/25 font-bold text-xs flex flex-col items-center gap-0.5 transition-all active:scale-95 shadow-sm"
              >
                <span>[3] Good (Bien)</span>
                <span className="text-[11px] font-mono font-extrabold text-blue-600 dark:text-blue-400">
                  {intervalsForecast[RATINGS.GOOD]}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleRating(RATINGS.EASY)}
                className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/25 font-bold text-xs flex flex-col items-center gap-0.5 transition-all active:scale-95 shadow-sm"
              >
                <span>[4] Easy (Fácil)</span>
                <span className="text-[11px] font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                  {intervalsForecast[RATINGS.EASY]}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <button
              type="button"
              disabled={safeIndex === 0}
              onClick={handlePreviousCard}
              className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed ${
                isDark ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-300 text-slate-800"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>[←] Anterior</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFlipped(true)}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md active:scale-95"
            >
              Mostrar Respuesta [Espacio]
            </button>

            <button
              type="button"
              disabled={safeIndex === filteredCards.length - 1}
              onClick={() => {
                setIsFlipped(false);
                setCurrentIndex((prev) => Math.min(filteredCards.length - 1, prev + 1));
              }}
              className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed ${
                isDark ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-300 text-slate-800"
              }`}
            >
              <span>Siguiente [→]</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Pie de navegación hacia Fase 3 */}
      <div className={`border rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6 transition-colors ${
        isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
      }`}>
        <div>
          <h4 className="text-sm font-bold">¿Concluiste el repaso de flashcards?</h4>
          <p className="text-xs opacity-75">Pasa al Simulador Contrarreloj para mecanizar el descarte de distractores.</p>
        </div>

        <button
          type="button"
          onClick={onProceedToSimulator}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:opacity-90 text-white text-xs font-bold flex items-center gap-2 shadow-sm active:scale-95"
        >
          <span>Ir a Fase 3: Simulador</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
