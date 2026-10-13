// src/components/Phase2_Anki/AnkiCardViewer.jsx
// Fase 2: Flashcards con FSRS v4.5, Explorador y Editor Estilo Anki Desktop (selección múltiple,
// eliminación en lote, limpieza de duplicadas en 1 clic, etiquetado/organización y formato Markdown limpio).

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useUser } from "../../context/UserContext";
import { useToast } from "../Common/ToastAndConfirm";
import { 
  scheduleCardFSRS, 
  getIntervalForecast, 
  exportCardsToAnkiTSV, 
  RATINGS,
  INITIAL_CARD_STATE 
} from "../../services/fsrsEngine";
import { PIVOT_CONCEPTS } from "../../services/telemetryEngine";
import { 
  saveTopicFlashcards, 
  deduplicateTopicFlashcards, 
  appendFlashcardsToTopic,
  normalizeFlashcardKey 
} from "../../firebase/firestoreService";
import { MarkdownRenderer } from "../Common/MarkdownRenderer";
import { 
  loadAllScheduleCards, 
  filterCardsByStudyMode, 
  persistCardFSRSReview, 
  getSeenDayCodes 
} from "../../services/ankiDeckService";
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
  Sparkles,
  ArrowLeft,
  List,
  Edit3,
  Plus,
  RotateCcw,
  Star,
  Check,
  X,
  Trash2,
  Search,
  AlertTriangle,
  Upload,
  CheckSquare,
  Square,
  Layers,
  Target
} from "lucide-react";

function mergeTopicAndLocalDeck(topicCards = [], storageKey) {
  let savedDeck = [];
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) savedDeck = parsed;
    }
  } catch (e) {}

  if (topicCards.length === 0 && savedDeck.length > 0) {
    return savedDeck;
  }

  const stateById = new Map();
  const stateByKey = new Map();
  savedDeck.forEach((c) => {
    if (c?.id && c?.cardState) stateById.set(c.id, c.cardState);
    const k = normalizeFlashcardKey(c?.front);
    if (k && c?.cardState) {
      const prev = stateByKey.get(k);
      if (!prev || (c.cardState.reps || 0) > (prev.reps || 0)) {
        stateByKey.set(k, c.cardState);
      }
    }
  });

  // Combinar tarjetas del tema conservando el progreso FSRS del usuario
  return topicCards.map((c) => {
    const k = normalizeFlashcardKey(c.front);
    const preservedState = c.cardState || stateById.get(c.id) || stateByKey.get(k) || { ...INITIAL_CARD_STATE };
    return { ...c, cardState: preservedState };
  });
}

export function AnkiCardViewer({ topic, studySession = null, onChangeStudySession, onBackToHub, onProceedToSimulator }) {
  const { currentUserId, currentUser, markPhaseComplete, theme, schedule, activeDayCode } = useUser();
  const { showToast, confirmAction } = useToast();
  const isDark = theme === "dark";

  const storageKey = `enarmcito_anki_deck_${currentUserId}_${topic.id}`;
  const rawCards = topic.flashcards || [];

  // Modo de visualización: "study" (tarjetas) vs "browser" (Editor y Explorador Anki)
  const [viewMode, setViewMode] = useState("study");

  // Modo de estudio estilo Anki Desktop: "today" | "due" | "cumulative" | "random" | "difficult"
  const [studyMode, setStudyMode] = useState(studySession?.mode || "today");

  // Baraja sincronizada del tema actual
  const [deck, setDeck] = useState(() => mergeTopicAndLocalDeck(rawCards, storageKey));

  // Banco global de tarjetas de todos los temas
  const [globalCards, setGlobalCards] = useState([]);

  useEffect(() => {
    if (studySession?.mode && studySession.mode !== studyMode) {
      setStudyMode(studySession.mode);
      setCurrentIndex(0);
      setIsFlipped(false);
    }
  }, [studySession]);

  const loadGlobalCards = async () => {
    try {
      const cards = await loadAllScheduleCards(schedule, currentUserId);
      setGlobalCards(cards);
    } catch (e) {
      console.error("Error cargando banco global de tarjetas Anki:", e);
    }
  };

  useEffect(() => {
    loadGlobalCards();
    const handleSync = () => loadGlobalCards();
    window.addEventListener("enarmcito_anki_sync", handleSync);
    return () => window.removeEventListener("enarmcito_anki_sync", handleSync);
  }, [schedule, currentUserId]);

  useEffect(() => {
    setDeck(mergeTopicAndLocalDeck(topic.flashcards || [], storageKey));
  }, [topic.id, topic.flashcards, storageKey]);

  useEffect(() => {
    const handleAnkiSync = (e) => {
      if (!e.detail || e.detail.topicId === topic.id) {
        setDeck(mergeTopicAndLocalDeck(e.detail?.cards || topic.flashcards || [], storageKey));
      }
    };
    window.addEventListener("enarmcito_anki_sync", handleAnkiSync);
    return () => window.removeEventListener("enarmcito_anki_sync", handleAnkiSync);
  }, [topic.id, topic.flashcards, storageKey]);

  // Guardar solo estado FSRS local (al repasar)
  const updateLocalFSRSDeck = (newDeck) => {
    setDeck(newDeck);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newDeck));
    } catch (e) {}
  };

  // Guardar cambios estructurales (editar, eliminar, agregar, organizar, limpiar duplicadas) en Firestore + LocalStorage
  const persistDeckChanges = async (newDeck) => {
    setDeck(newDeck);
    await saveTopicFlashcards(topic.code || topic.id, newDeck, currentUserId);
  };

  // Detectar tarjetas duplicadas en el mazo actual (mismo frente normalizado)
  const duplicateCardIds = useMemo(() => {
    const seenKeys = new Map();
    const dupIds = [];
    deck.forEach((c) => {
      const k = normalizeFlashcardKey(c.front);
      if (!k) return;
      if (seenKeys.has(k)) {
        dupIds.push(c.id);
      } else {
        seenKeys.set(k, c.id);
      }
    });
    return dupIds;
  }, [deck]);

  const duplicateIdSet = useMemo(() => new Set(duplicateCardIds), [duplicateCardIds]);

  // Filtro de estudio: "all" | "new" | "review" | "random"
  const [studyFilter, setStudyFilter] = useState("all");
  const [customSelectedIds, setCustomSelectedIds] = useState(null);

  // Controles del Explorador / Editor Estilo Anki
  const [browserSearch, setBrowserSearch] = useState("");
  const [browserPivotFilter, setBrowserPivotFilter] = useState("all");
  const [browserStateFilter, setBrowserStateFilter] = useState("all"); // "all" | "new" | "learning" | "review" | "mastered" | "duplicates"
  const [browserSortBy, setBrowserSortBy] = useState("index"); // "index" | "alpha" | "pivot" | "stability"
  const [selectedCardIds, setSelectedCardIds] = useState([]);
  const [bulkPivotTarget, setBulkPivotTarget] = useState("Estudio_Inicial");
  const [bulkTagInput, setBulkTagInput] = useState("");

  // Modal para crear / editar flashcard e importar TSV
  const [editingCard, setEditingCard] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportTsvOpen, setIsImportTsvOpen] = useState(false);
  const [tsvInputText, setTsvInputText] = useState("");

  // Conteo de tarjetas por modo para los botones del selector
  const modeCounts = useMemo(() => {
    const today = deck.length;
    const now = new Date();
    const seenCodes = new Set(getSeenDayCodes(schedule, activeDayCode));

    const due = globalCards.filter((c) => {
      if (!seenCodes.has(c.dayCode)) return false;
      const st = c.cardState;
      return st && st.due && new Date(st.due) <= now && (st.reps > 0 || st.state !== "new");
    }).length;

    const cumulative = globalCards.filter((c) => seenCodes.has(c.dayCode)).length;
    const difficult = globalCards.filter((c) => {
      if (!seenCodes.has(c.dayCode)) return false;
      const st = c.cardState;
      return st && ((st.lapses && st.lapses > 0) || (st.difficulty && st.difficulty >= 7));
    }).length;

    return { today, due, cumulative, difficult };
  }, [deck, globalCards, schedule, activeDayCode]);

  // Tarjetas activas para la sesión de estudio actual
  const activeDeck = useMemo(() => {
    let sourcePool = deck;

    if (studyMode !== "today" && globalCards.length > 0) {
      const filtered = filterCardsByStudyMode(globalCards, studyMode, activeDayCode, schedule);
      sourcePool = filtered.cards;
    }

    let result = [...sourcePool];
    if (customSelectedIds && customSelectedIds.length > 0) {
      result = result.filter(c => customSelectedIds.includes(c.id));
    } else if (studyFilter === "new") {
      result = result.filter(c => !c.cardState || c.cardState.reps === 0 || c.cardState.state === "new");
    } else if (studyFilter === "review") {
      result = result.filter(c => c.cardState && c.cardState.reps > 0);
    } else if (studyFilter === "random" && studyMode === "today") {
      result = [...result].sort(() => Math.random() - 0.5);
    }
    return result;
  }, [deck, globalCards, studyMode, activeDayCode, schedule, studyFilter, customSelectedIds]);

  // Tarjetas filtradas y ordenadas en el Explorador / Editor Anki
  const filteredBrowserCards = useMemo(() => {
    const q = browserSearch.trim().toLowerCase();

    const filtered = deck.filter((c) => {
      if (q) {
        const matchFront = c.front?.toLowerCase().includes(q);
        const matchBack = c.back?.toLowerCase().includes(q);
        const matchTags = Array.isArray(c.tags) && c.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchFront && !matchBack && !matchTags) return false;
      }

      if (browserPivotFilter !== "all" && c.concepto_pivote !== browserPivotFilter) {
        return false;
      }

      const st = c.cardState || INITIAL_CARD_STATE;
      const isNew = !st.reps || st.state === "new";
      const isLearning = st.state === "learning" || st.state === "relearning";
      const isMastered = (st.stability || 0) >= 7;
      const isReview = st.reps > 0 && !isLearning;

      if (browserStateFilter === "new" && !isNew) return false;
      if (browserStateFilter === "learning" && !isLearning) return false;
      if (browserStateFilter === "review" && !isReview) return false;
      if (browserStateFilter === "mastered" && !isMastered) return false;
      if (browserStateFilter === "duplicates" && !duplicateIdSet.has(c.id)) return false;

      return true;
    });

    if (browserSortBy === "alpha") {
      return [...filtered].sort((a, b) => (a.front || "").localeCompare(b.front || ""));
    }
    if (browserSortBy === "pivot") {
      return [...filtered].sort((a, b) => (a.concepto_pivote || "").localeCompare(b.concepto_pivote || ""));
    }
    if (browserSortBy === "stability") {
      return [...filtered].sort((a, b) => (b.cardState?.stability || 0) - (a.cardState?.stability || 0));
    }
    return filtered;
  }, [deck, browserSearch, browserPivotFilter, browserStateFilter, browserSortBy, duplicateIdSet]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [historyStack, setHistoryStack] = useState([]);

  // Medición de tiempo
  const [cardStartTime, setCardStartTime] = useState(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef(null);

  const safeIndex = Math.min(currentIndex, Math.max(0, activeDeck.length - 1));
  const currentCard = activeDeck[safeIndex];

  // Iniciar temporizador
  useEffect(() => {
    setCardStartTime(Date.now());
    setElapsedSeconds(0);
    clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [safeIndex, studyFilter, viewMode]);

  // Atajos de teclado para pantallas de computadora
  useEffect(() => {
    if (viewMode !== "study") return;

    const handleKeyDown = (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (safeIndex > 0) {
          setIsFlipped(false);
          setCurrentIndex((prev) => prev - 1);
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (safeIndex < activeDeck.length - 1) {
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
  }, [isFlipped, safeIndex, activeDeck, viewMode]);

  // Calificar tarjeta con FSRS v4.5
  const handleRating = (rating) => {
    if (!currentCard) return;

    const responseTimeMs = Date.now() - cardStartTime;
    const oldCardState = currentCard.cardState || INITIAL_CARD_STATE;

    setHistoryStack((prev) => [
      ...prev,
      {
        cardId: currentCard.id,
        previousState: oldCardState,
        ratingApplied: rating
      }
    ]);

    const updatedCardState = scheduleCardFSRS(oldCardState, rating, responseTimeMs);

    // Persistir siempre en el almacenamiento del tema correspondiente a la tarjeta
    if (currentCard.topicId || (currentCard.dayCode && currentCard.dayCode !== topic.code)) {
      persistCardFSRSReview(currentUserId, currentCard, updatedCardState);
    }

    if (studyMode === "today" || currentCard.dayCode === topic.code || currentCard.topicId === topic.id) {
      const updatedDeck = deck.map((c) => (c.id === currentCard.id ? { ...c, cardState: updatedCardState } : c));
      updateLocalFSRSDeck(updatedDeck);
    }

    setGlobalCards((prev) =>
      prev.map((c) => (c.id === currentCard.id ? { ...c, cardState: updatedCardState } : c))
    );

    setIsFlipped(false);

    if (safeIndex < activeDeck.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      markPhaseComplete(2, { phase2_cards_reviewed: Math.max(1, activeDeck.length) });
      showToast("¡Has completado esta sesión de repaso Anki FSRS! (+50 XP)", "success");
    }
  };

  // Deshacer última calificación FSRS
  const handleUndoRating = () => {
    if (historyStack.length === 0) return;
    const last = historyStack[historyStack.length - 1];
    const restoredDeck = deck.map((c) => c.id === last.cardId ? { ...c, cardState: last.previousState } : c);
    updateLocalFSRSDeck(restoredDeck);
    setHistoryStack((prev) => prev.slice(0, -1));
    showToast("Última calificación deshecha", "info");
  };

  // Exportar a TSV de Anki
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
    showToast("Archivo TSV generado para Anki Oficial", "success");
  };

  // Limpiar todas las tarjetas duplicadas en 1 clic
  const handleDeduplicateDeck = async () => {
    if (duplicateCardIds.length === 0) {
      showToast("No hay tarjetas duplicadas en este mazo", "info");
      return;
    }
    const result = await deduplicateTopicFlashcards(topic.code || topic.id, currentUserId, deck);
    setDeck(result.cards);
    setSelectedCardIds([]);
    setCurrentIndex(0);
    showToast(
      `¡Limpieza completada! Se eliminaron ${result.removedCount} copias duplicadas y quedaron ${result.remainingCount} tarjetas únicas.`,
      "success"
    );
  };

  // Eliminar una tarjeta individual
  const handleDeleteSingleCard = async (card) => {
    const confirmed = await confirmAction({
      title: "¿Eliminar esta flashcard?",
      message: `Se eliminará del mazo "${(card.front || "").slice(0, 80)}..."`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      isDestructive: true
    });
    if (!confirmed) return;

    const updated = deck.filter((c) => c.id !== card.id);
    await persistDeckChanges(updated);
    setSelectedCardIds((prev) => prev.filter((id) => id !== card.id));
    showToast("Flashcard eliminada del mazo", "info");
  };

  // Eliminar múltiples tarjetas seleccionadas en lote
  const handleBulkDeleteSelected = async () => {
    if (selectedCardIds.length === 0) return;
    const confirmed = await confirmAction({
      title: `¿Eliminar ${selectedCardIds.length} flashcards seleccionadas?`,
      message: `Esta acción eliminará permanentemente las ${selectedCardIds.length} tarjetas marcadas de este mazo.`,
      confirmText: `Sí, eliminar (${selectedCardIds.length})`,
      cancelText: "Cancelar",
      isDestructive: true
    });
    if (!confirmed) return;

    const toRemove = new Set(selectedCardIds);
    const updated = deck.filter((c) => !toRemove.has(c.id));
    await persistDeckChanges(updated);
    setSelectedCardIds([]);
    setCurrentIndex(0);
    showToast(`Se eliminaron ${toRemove.size} flashcards del mazo`, "success");
  };

  // Cambiar Concepto Pivote en lote a las seleccionadas
  const handleBulkChangePivot = async () => {
    if (selectedCardIds.length === 0) return;
    const targetSet = new Set(selectedCardIds);
    const updated = deck.map((c) =>
      targetSet.has(c.id) ? { ...c, concepto_pivote: bulkPivotTarget } : c
    );
    await persistDeckChanges(updated);
    showToast(
      `Concepto pivote actualizado a "${PIVOT_CONCEPTS[bulkPivotTarget]}" en ${selectedCardIds.length} tarjetas`,
      "success"
    );
  };

  // Agregar etiqueta en lote a las seleccionadas
  const handleBulkAddTag = async () => {
    const cleanTag = bulkTagInput.trim().replace(/^#/, "");
    if (!cleanTag || selectedCardIds.length === 0) return;
    const targetSet = new Set(selectedCardIds);
    const updated = deck.map((c) => {
      if (!targetSet.has(c.id)) return c;
      const existingTags = Array.isArray(c.tags) ? c.tags : [];
      if (existingTags.includes(cleanTag)) return c;
      return { ...c, tags: [...existingTags, cleanTag] };
    });
    await persistDeckChanges(updated);
    setBulkTagInput("");
    showToast(`Etiqueta #${cleanTag} añadida a ${selectedCardIds.length} tarjetas`, "success");
  };

  // Reiniciar progreso FSRS en lote
  const handleBulkResetSelected = async () => {
    if (selectedCardIds.length === 0) return;
    const targetSet = new Set(selectedCardIds);
    const updated = deck.map((c) =>
      targetSet.has(c.id) ? { ...c, cardState: { ...INITIAL_CARD_STATE } } : c
    );
    updateLocalFSRSDeck(updated);
    showToast(`Progreso FSRS reiniciado en ${selectedCardIds.length} tarjetas`, "info");
  };

  // Alternar selección de una tarjeta
  const toggleCardSelection = (cardId) => {
    setSelectedCardIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  // Seleccionar o deseleccionar todas las visibles en el filtro actual
  const handleToggleSelectAllVisible = () => {
    const visibleIds = filteredBrowserCards.map((c) => c.id);
    const allVisibleSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedCardIds.includes(id));

    if (allVisibleSelected) {
      setSelectedCardIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedCardIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  // Reiniciar progreso de una tarjeta individual
  const handleResetCardProgress = async (cardId) => {
    const confirmed = await confirmAction({
      title: "¿Reiniciar progreso de esta tarjeta?",
      message: "Se restablecerán sus repasos a 0 y volverá al estado 'Nueva'.",
      confirmText: "Reiniciar",
      cancelText: "Cancelar",
      isDestructive: true
    });
    if (!confirmed) return;

    const newDeck = deck.map((c) => c.id === cardId ? { ...c, cardState: { ...INITIAL_CARD_STATE } } : c);
    updateLocalFSRSDeck(newDeck);
    showToast("Tarjeta restablecida a 'Nueva'", "info");
  };

  // Reiniciar todo el mazo
  const handleResetEntireDeck = async () => {
    const confirmed = await confirmAction({
      title: "¿Reiniciar progreso FSRS de todo el mazo?",
      message: "Se restablecerá el progreso de todas las flashcards de este tema a 'Nueva' (sin borrar las tarjetas).",
      confirmText: "Sí, reiniciar progreso",
      cancelText: "Cancelar",
      isDestructive: true
    });
    if (!confirmed) return;

    const newDeck = deck.map((c) => ({ ...c, cardState: { ...INITIAL_CARD_STATE } }));
    updateLocalFSRSDeck(newDeck);
    setCurrentIndex(0);
    showToast("Todo el mazo fue restablecido a 'Nueva'", "info");
  };

  // Guardar edición o creación de tarjeta
  const handleSaveCard = async (cardData) => {
    if (editingCard) {
      const updated = deck.map((c) => c.id === editingCard.id ? { ...c, ...cardData } : c);
      await persistDeckChanges(updated);
      showToast("Tarjeta editada correctamente", "success");
      setEditingCard(null);
    } else {
      const newCard = {
        id: `fc_custom_${Date.now()}`,
        topic_id: topic.code,
        ...cardData,
        addedBy: currentUser?.name || "Donato",
        cardState: { ...INITIAL_CARD_STATE }
      };
      await persistDeckChanges([...deck, newCard]);
      showToast("Nueva flashcard creada", "success");
      setIsCreateModalOpen(false);
    }
  };

  // Importar TSV directamente desde el modal de Anki
  const handleImportTsvModal = async (e) => {
    e.preventDefault();
    if (!tsvInputText.trim()) return;
    try {
      const res = await appendFlashcardsToTopic(
        topic.code || topic.id,
        tsvInputText,
        currentUser?.name || "Donato"
      );
      setDeck(mergeTopicAndLocalDeck(res.updatedTopic.flashcards || [], storageKey));
      setTsvInputText("");
      setIsImportTsvOpen(false);
      if (res.addedCount > 0) {
        showToast(
          `¡${res.addedCount} tarjetas nuevas agregadas!${
            res.skippedDuplicates > 0 ? ` (${res.skippedDuplicates} duplicadas omitidas)` : ""
          }`,
          "success"
        );
      } else {
        showToast("Todas las tarjetas del bloque TSV ya estaban en el mazo (0 duplicadas agregadas).", "info");
      }
    } catch (err) {
      showToast(err.message || "Error al importar TSV", "error");
    }
  };

  // Estadísticas del mazo
  const newCount = deck.filter((c) => !c.cardState || c.cardState.reps === 0 || c.cardState.state === "new").length;
  const learningCount = deck.filter((c) => c.cardState && (c.cardState.state === "learning" || c.cardState.state === "relearning")).length;
  const reviewCount = deck.filter((c) => c.cardState && c.cardState.reps > 0 && c.cardState.state === "review").length;
  const masteredCount = deck.filter((c) => c.cardState && c.cardState.stability >= 7).length;

  const intervalsForecast = currentCard ? getIntervalForecast(currentCard.cardState) : {};

  return (
    <div className="max-w-5xl mx-auto space-y-3.5 pb-20">
      {/* Barra de Navegación Superior */}
      <div className={`flex flex-wrap items-center justify-between gap-2 border-2 rounded-2xl p-3 shadow-sm transition-colors ${
        isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-900"
      }`}>
        <button
          type="button"
          onClick={onBackToHub}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition-all text-slate-800 dark:text-slate-200"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al Tema</span>
        </button>

        {/* Selector de Vista: Modo Estudio vs Editor / Explorador Anki */}
        <div className="flex items-center p-1 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setViewMode("study")}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
              viewMode === "study"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
            }`}
          >
            ▶️ Modo Estudio ({activeDeck.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode("browser")}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
              viewMode === "browser"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>🛠️ Editor / Explorador Anki ({deck.length})</span>
            {duplicateCardIds.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                {duplicateCardIds.length} dup
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all"
            title="Crear nueva flashcard"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nueva</span>
          </button>
          <button
            type="button"
            onClick={handleExportAnki}
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 text-xs font-bold transition-all"
            title="Descargar baraja en formato Anki (.tsv)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar .tsv</span>
          </button>
        </div>
      </div>

      {/* ALERTA AUTOMÁTICA DE DUPLICADAS CON LIMPIEZA EN 1 CLIC */}
      {duplicateCardIds.length > 0 && (
        <div className="border-2 border-amber-500/80 bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fadeIn">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <h4 className="text-xs sm:text-sm font-black">
                Se detectaron {duplicateCardIds.length} tarjetas repetidas/duplicadas en este mazo
              </h4>
              <p className="text-[11px] opacity-85">
                Puedes eliminar todas las copias repetidas en 1 solo clic (conservando 1 original de cada tarjeta y tu progreso FSRS) o revisarlas en el Editor Anki.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleDeduplicateDeck}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer"
            >
              🧹 Eliminar {duplicateCardIds.length} Duplicadas en 1 Clic
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("browser");
                setSelectedCardIds(duplicateCardIds);
              }}
              className="px-3 py-2 rounded-xl border-2 border-amber-600/50 hover:bg-amber-500/10 text-xs font-bold transition-all cursor-pointer"
            >
              Seleccionarlas en Editor
            </button>
          </div>
        </div>
      )}

      {/* SELECTOR DE MODO DE ESTUDIO ESTILO ANKI DESKTOP */}
      {viewMode === "study" && (
        <div className={`p-2 sm:p-2.5 rounded-2xl border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-purple-200"
        }`}>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => {
                setStudyMode("today");
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all flex-shrink-0 cursor-pointer ${
                studyMode === "today"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Tema Hoy ({modeCounts.today})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStudyMode("due");
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all flex-shrink-0 cursor-pointer ${
                studyMode === "due"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Vencidas FSRS ({modeCounts.due})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStudyMode("cumulative");
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all flex-shrink-0 cursor-pointer ${
                studyMode === "cumulative"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Temas Vistos ({modeCounts.cumulative})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStudyMode("random");
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all flex-shrink-0 cursor-pointer ${
                studyMode === "random"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Aleatorio (Cram)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStudyMode("difficult");
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all flex-shrink-0 cursor-pointer ${
                studyMode === "difficult"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Difíciles ({modeCounts.difficult})</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-semibold px-1 text-right flex-shrink-0">
            {studyMode === "today" && `Tema activo: ${topic?.code || activeDayCode}`}
            {studyMode === "due" && "Repasando según curva del olvido"}
            {studyMode === "cumulative" && "Material acumulado"}
            {studyMode === "random" && "Práctica intercalada"}
            {studyMode === "difficult" && "Reactivos con lapsos/fallos"}
          </div>
        </div>
      )}

      {/* Contadores estilo Anki (Nuevas, Aprendizaje, Repaso, Dominadas) */}
      <div className={`border-2 rounded-2xl p-3 shadow-sm transition-colors ${
        isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-900"
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3 font-mono font-bold flex-wrap">
            <span className="text-blue-600 dark:text-cyan-400" title="Tarjetas nuevas no vistas">
              🔵 {newCount} Nuevas
            </span>
            <span className="text-amber-600 dark:text-amber-400" title="Tarjetas en proceso de aprendizaje">
              🟠 {learningCount} Aprendiendo
            </span>
            <span className="text-emerald-600 dark:text-emerald-400" title="Tarjetas en repaso espaciado">
              🟢 {reviewCount} Repaso
            </span>
            <span className="text-purple-600 dark:text-purple-400" title="Tarjetas con estabilidad ≥ 7 días">
              ⭐ {masteredCount} Dominadas
            </span>
            {customSelectedIds && customSelectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => setCustomSelectedIds(null)}
                className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-400 text-[10px] font-bold"
              >
                Filtro personalizado ({customSelectedIds.length}) ✕
              </button>
            )}
          </div>

          {viewMode === "study" && (
            <div className="flex items-center gap-2">
              {historyStack.length > 0 && (
                <button
                  type="button"
                  onClick={handleUndoRating}
                  className="px-2 py-0.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[11px] font-semibold flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Deshacer última calificación FSRS"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>Deshacer</span>
                </button>
              )}

              <span className="text-[11px] font-mono opacity-70">
                {safeIndex + 1} / {activeDeck.length} ({elapsedSeconds}s)
              </span>
            </div>
          )}
        </div>

        {/* Tira de Navegación Directa por Tarjeta (Clic para saltar a cualquier tarjeta) */}
        {viewMode === "study" && activeDeck.length > 0 && (
          <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 overflow-x-auto pb-1">
            {activeDeck.map((c, idx) => {
              const isCurrent = idx === safeIndex;
              const hasReps = c.cardState && c.cardState.reps > 0;
              const isDominada = c.cardState && c.cardState.stability >= 7;

              let dotClass = "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400";
              if (isDominada) dotClass = "bg-purple-600 text-white";
              else if (hasReps) dotClass = "bg-emerald-600 text-white";

              return (
                <button
                  key={c.id || idx}
                  type="button"
                  onClick={() => {
                    setIsFlipped(false);
                    setCurrentIndex(idx);
                  }}
                  className={`w-6 h-6 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center flex-shrink-0 transition-all ${dotClass} ${
                    isCurrent ? "ring-2 ring-blue-500 scale-110 font-black shadow-xs" : "opacity-75 hover:opacity-100"
                  }`}
                  title={`Tarjeta ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* VISTA 1: MODO TARJETAS (ESTUDIO INTERACTIVO) */}
      {viewMode === "study" && (!currentCard || activeDeck.length === 0) && (
        <div className={`border-2 rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-sm ${
          isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-900"
        }`}>
          <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-2xl">
            📭
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              No hay flashcards cargadas para este tema
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              El mazo de tarjetas Anki para <strong>{topic.title}</strong> aún está vacío. Puedes crear tarjetas manualmente o importar un bloque TSV generado por la IA.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Flashcard</span>
            </button>
            <button
              type="button"
              onClick={() => setIsImportTsvOpen(true)}
              className="px-4 py-2 rounded-xl border-2 border-purple-500/50 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              <span>Importar TSV de IA</span>
            </button>
          </div>
        </div>
      )}

      {viewMode === "study" && currentCard && activeDeck.length > 0 && (
        <div className="space-y-3">
          {/* Tarjeta Flashcard Interactiva */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className={`min-h-[250px] sm:min-h-[290px] rounded-2xl p-5 sm:p-6 flex flex-col justify-between cursor-pointer transition-all duration-200 border-2 shadow-xs relative select-none ${
              isDark
                ? isFlipped
                  ? "bg-slate-900 border-purple-500/60 text-white"
                  : "bg-slate-900 border-slate-800 text-white hover:border-slate-700"
                : isFlipped
                  ? "bg-purple-50/40 border-purple-400 text-slate-900"
                  : "bg-white border-slate-300 text-slate-900 hover:border-slate-400"
            }`}
          >
            {/* Meta superior de la tarjeta */}
            <div className="flex items-center justify-between text-xs border-b pb-2 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 flex-wrap">
                {isFlipped ? (
                  <>
                    <span className="px-2.5 py-0.5 rounded-md font-bold text-[11px] bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                      {PIVOT_CONCEPTS[currentCard.concepto_pivote] || currentCard.concepto_pivote || "Pivote GPC"}
                    </span>
                    <span className="opacity-70 font-mono text-[11px]">
                      {currentCard.cardState?.reps ? `Repaso #${currentCard.cardState.reps}` : "Nueva"}
                    </span>
                  </>
                ) : (
                  <span className="text-[11px] font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                    Pregunta Clínica
                  </span>
                )}
                {duplicateIdSet.has(currentCard.id) && (
                  <span className="px-2 py-0.5 rounded-md font-black text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-400">
                    DUPLICADA
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingCard(currentCard);
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 cursor-pointer"
                  title="Editar esta tarjeta"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSingleCard(currentCard);
                  }}
                  className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800 cursor-pointer"
                  title="Eliminar esta tarjeta"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] opacity-70 flex items-center gap-1 font-semibold ml-1">
                  <RotateCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">[Espacio] o Toca para voltear</span>
                  <span className="sm:hidden">Voltear</span>
                </span>
              </div>
            </div>

            {/* Contenido de la Tarjeta con Markdown Limpio (negritas ** y cursivas * reales) */}
            <div className="py-5 my-auto text-center clinical-case-text">
              {!isFlipped ? (
                <div className="leading-relaxed font-bold max-w-2xl mx-auto text-sm sm:text-base">
                  <MarkdownRenderer content={currentCard.front} />
                </div>
              ) : (
                <div className="space-y-2 animate-fadeIn text-left sm:text-center">
                  <span className="text-[10px] uppercase font-extrabold text-purple-600 dark:text-purple-400 tracking-wider block text-center">
                    Respuesta Oficial GPC:
                  </span>
                  <div className="leading-relaxed font-normal max-w-2xl mx-auto text-sm sm:text-base">
                    <MarkdownRenderer content={currentCard.back} />
                  </div>
                </div>
              )}
            </div>

            {/* Tags al reverso (en el frente permanece completamente limpio sin texto residual) */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px]">
              <div className="flex items-center gap-1 flex-wrap min-h-[20px]">
                {isFlipped && currentCard.tags?.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-1.5 py-0.5 rounded-md font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                  >
                    #{String(tag).replace(/^#/, "")}
                  </span>
                ))}
              </div>

              {isFlipped && (
                <span className="font-mono opacity-60">
                  Estabilidad: {currentCard.cardState?.stability || 0}d
                </span>
              )}
            </div>
          </div>

          {/* Botones de Navegación y Calificación FSRS */}
          <div className="space-y-2">
            {isFlipped ? (
              <div className="space-y-2 animate-fadeIn">
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => handleRating(RATINGS.AGAIN)}
                    className="p-2 sm:p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-700 dark:text-rose-300 font-bold text-xs flex flex-col items-center gap-0.5 transition-all active:scale-95 shadow-xs"
                  >
                    <span>Repetir</span>
                    <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400">
                      {intervalsForecast[RATINGS.AGAIN]}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRating(RATINGS.HARD)}
                    className="p-2 sm:p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-300 font-bold text-xs flex flex-col items-center gap-0.5 transition-all active:scale-95 shadow-xs"
                  >
                    <span>Difícil</span>
                    <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                      {intervalsForecast[RATINGS.HARD]}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRating(RATINGS.GOOD)}
                    className="p-2 sm:p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/40 text-blue-800 dark:text-blue-300 font-bold text-xs flex flex-col items-center gap-0.5 transition-all active:scale-95 shadow-xs"
                  >
                    <span>Bien</span>
                    <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400">
                      {intervalsForecast[RATINGS.GOOD]}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRating(RATINGS.EASY)}
                    className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex flex-col items-center gap-0.5 transition-all active:scale-95 shadow-xs"
                  >
                    <span>Fácil</span>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                      {intervalsForecast[RATINGS.EASY]}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={safeIndex === 0}
                  onClick={() => {
                    setIsFlipped(false);
                    setCurrentIndex((prev) => Math.max(0, prev - 1));
                  }}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed ${
                    isDark ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-300 text-slate-800"
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Anterior</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsFlipped(true)}
                  className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold shadow-sm active:scale-95 transition-all"
                >
                  Mostrar Respuesta
                </button>

                <button
                  type="button"
                  disabled={safeIndex === activeDeck.length - 1}
                  onClick={() => {
                    setIsFlipped(false);
                    setCurrentIndex((prev) => Math.min(activeDeck.length - 1, prev + 1));
                  }}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed ${
                    isDark ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-300 text-slate-800"
                  }`}
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Pie de navegación hacia Fase 3 */}
          <div className={`border-2 rounded-2xl p-3.5 shadow-sm flex items-center justify-between gap-3 mt-4 transition-colors ${
            isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-900"
          }`}>
            <div>
              <h4 className="text-xs font-bold">¿Listo para el Simulador Contrarreloj?</h4>
              <p className="text-[11px] opacity-70">20 reactivos seriados contrarreloj.</p>
            </div>

            <button
              type="button"
              onClick={onProceedToSimulator}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:opacity-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <span>Ir a Simulador</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* VISTA 2: EDITOR Y EXPLORADOR DE MAZO ESTILO ANKI DESKTOP (SELECCIÓN MÚLTIPLE, ELIMINACIÓN Y ORGANIZACIÓN) */}
      {viewMode === "browser" && (
        <div className={`border-2 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 ${
          isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-900"
        }`}>
          {/* Cabecera del Editor Anki */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 pb-3 border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>🛠️ Editor y Explorador de Flashcards Anki</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300">
                  {filteredBrowserCards.length} / {deck.length} tarjetas
                </span>
              </h3>
              <p className="text-xs opacity-75">
                Selecciona varias tarjetas con las casillas para eliminarlas en lote, limpiar duplicadas, organizarlas por Concepto Pivote o etiquetarlas.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {duplicateCardIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeduplicateDeck}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <span>🧹 Limpiar {duplicateCardIds.length} Duplicadas</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsImportTsvOpen(true)}
                className="px-3 py-1.5 rounded-xl border-2 border-purple-400 dark:border-purple-700 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center gap-1 hover:bg-purple-50 dark:hover:bg-purple-950/40"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Importar TSV</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold flex items-center gap-1 shadow-xs hover:bg-purple-500"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nueva Tarjeta</span>
              </button>

              <button
                type="button"
                onClick={handleResetEntireDeck}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Reiniciar FSRS
              </button>
            </div>
          </div>

          {/* Barra de Búsqueda, Filtros y Ordenamiento */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-5 relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar en frente, reverso o #etiquetas..."
                value={browserSearch}
                onChange={(e) => setBrowserSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-transparent text-xs focus:border-purple-500 outline-hidden"
              />
            </div>

            <div className="sm:col-span-3">
              <select
                value={browserPivotFilter}
                onChange={(e) => setBrowserPivotFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-transparent text-xs font-bold focus:border-purple-500 outline-hidden"
              >
                <option value="all">Todos los Conceptos Pivote</option>
                {Object.entries(PIVOT_CONCEPTS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <select
                value={browserStateFilter}
                onChange={(e) => setBrowserStateFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-transparent text-xs font-bold focus:border-purple-500 outline-hidden"
              >
                <option value="all">Todos los estados</option>
                <option value="duplicates">⚠️ Solo Duplicadas ({duplicateCardIds.length})</option>
                <option value="new">🔵 Nuevas ({newCount})</option>
                <option value="learning">🟠 Aprendiendo ({learningCount})</option>
                <option value="review">🟢 En Repaso ({reviewCount})</option>
                <option value="mastered">⭐ Dominadas ({masteredCount})</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <select
                value={browserSortBy}
                onChange={(e) => setBrowserSortBy(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-transparent text-xs font-bold focus:border-purple-500 outline-hidden"
              >
                <option value="index">Orden original</option>
                <option value="alpha">Pregunta (A-Z)</option>
                <option value="pivot">Por Concepto Pivote</option>
                <option value="stability">Por Estabilidad FSRS</option>
              </select>
            </div>
          </div>

          {/* Barra de Selección Rápida */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleSelectAllVisible}
                className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold flex items-center gap-1.5"
              >
                <CheckSquare className="w-3.5 h-3.5 text-purple-600" />
                <span>
                  {filteredBrowserCards.length > 0 &&
                  filteredBrowserCards.every((c) => selectedCardIds.includes(c.id))
                    ? "Deseleccionar visibles"
                    : `Seleccionar visibles (${filteredBrowserCards.length})`}
                </span>
              </button>

              {duplicateCardIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCardIds(duplicateCardIds)}
                  className="px-2.5 py-1 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold"
                >
                  Seleccionar solo duplicadas ({duplicateCardIds.length})
                </button>
              )}

              {selectedCardIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCardIds([])}
                  className="px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white font-semibold"
                >
                  Limpiar selección ({selectedCardIds.length})
                </button>
              )}
            </div>
          </div>

          {/* BARRA DE ACCIONES EN LOTE (CUANDO HAY TARJETAS SELECCIONADAS) */}
          {selectedCardIds.length > 0 && (
            <div className="border-2 border-purple-500 bg-purple-50/90 dark:bg-purple-950/50 rounded-2xl p-3 space-y-2.5 shadow-sm animate-fadeIn">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black text-purple-900 dark:text-purple-200">
                  ✅ {selectedCardIds.length} tarjeta(s) seleccionada(s) — Acciones en lote:
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomSelectedIds(selectedCardIds);
                      setCurrentIndex(0);
                      setIsFlipped(false);
                      setViewMode("study");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold shadow-xs"
                  >
                    ▶️ Estudiar seleccionadas ({selectedCardIds.length})
                  </button>

                  <button
                    type="button"
                    onClick={handleBulkResetSelected}
                    className="px-3 py-1.5 rounded-xl border border-amber-400 bg-amber-100/70 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 text-xs font-bold"
                  >
                    🔄 Reiniciar FSRS
                  </button>

                  <button
                    type="button"
                    onClick={handleBulkDeleteSelected}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar seleccionadas ({selectedCardIds.length})</span>
                  </button>
                </div>
              </div>

              {/* Organizar en lote: Cambiar Concepto Pivote o Añadir Etiqueta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-purple-200 dark:border-purple-800/60">
                <div className="flex items-center gap-1.5">
                  <select
                    value={bulkPivotTarget}
                    onChange={(e) => setBulkPivotTarget(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-xl border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 text-xs font-bold"
                  >
                    {Object.entries(PIVOT_CONCEPTS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleBulkChangePivot}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold whitespace-nowrap"
                  >
                    Asignar Pivote
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Nueva etiqueta (ej. CAD, GPC)..."
                    value={bulkTagInput}
                    onChange={(e) => setBulkTagInput(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-xl border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleBulkAddTag}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold whitespace-nowrap"
                  >
                    + Etiquetar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tabla de Flashcards con Formato Markdown Real */}
          <div className="overflow-x-auto border-2 border-slate-200 dark:border-slate-800 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
                  <th className="py-2.5 px-2.5 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredBrowserCards.length > 0 &&
                        filteredBrowserCards.every((c) => selectedCardIds.includes(c.id))
                      }
                      onChange={handleToggleSelectAllVisible}
                      className="w-4 h-4 rounded accent-purple-600 cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-2 font-black w-10">#</th>
                  <th className="py-2.5 px-3 font-black min-w-[220px]">Pregunta (Frente)</th>
                  <th className="py-2.5 px-3 font-black min-w-[240px]">Respuesta (Reverso)</th>
                  <th className="py-2.5 px-3 font-black">Pivote / Etiquetas</th>
                  <th className="py-2.5 px-2 font-black">Estado</th>
                  <th className="py-2.5 px-2.5 font-black text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredBrowserCards.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 font-semibold">
                      No hay tarjetas que coincidan con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredBrowserCards.map((c, idx) => {
                    const state = c.cardState || INITIAL_CARD_STATE;
                    const isNew = !state.reps || state.state === "new";
                    const isMastered = state.stability >= 7;
                    const isSelected = selectedCardIds.includes(c.id);
                    const isDuplicate = duplicateIdSet.has(c.id);

                    return (
                      <tr
                        key={c.id || idx}
                        className={`transition-colors align-top ${
                          isSelected
                            ? "bg-purple-50/80 dark:bg-purple-950/30"
                            : isDuplicate
                            ? "bg-amber-50/40 dark:bg-amber-950/15"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <td className="py-3 px-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleCardSelection(c.id)}
                            className="w-4 h-4 rounded accent-purple-600 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-2 font-mono font-bold">
                          <div>{idx + 1}</div>
                          {isDuplicate && (
                            <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                              DUP
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 max-w-xs">
                          <div className="font-semibold text-xs leading-snug">
                            <MarkdownRenderer content={c.front} />
                          </div>
                        </td>
                        <td className="py-3 px-3 max-w-sm">
                          <div className="text-xs leading-snug opacity-90">
                            <MarkdownRenderer content={c.back} />
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800 mb-1">
                            {PIVOT_CONCEPTS[c.concepto_pivote] || c.concepto_pivote || "Pivote"}
                          </span>
                          {Array.isArray(c.tags) && c.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {c.tags.map((t, tidx) => (
                                <span
                                  key={tidx}
                                  className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700"
                                >
                                  #{String(t).replace(/^#/, "")}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isMastered 
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                              : isNew
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-cyan-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          }`}>
                            {isMastered ? "Dominada" : isNew ? "Nueva" : "En Repaso"}
                          </span>
                          <div className="text-[10px] font-mono opacity-60 mt-1">
                            Reps: {state.reps || 0} • Est: {state.stability || 0}d
                          </div>
                        </td>
                        <td className="py-3 px-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const deckIdx = deck.findIndex((item) => item.id === c.id);
                                setCustomSelectedIds(null);
                                setCurrentIndex(deckIdx >= 0 ? deckIdx : 0);
                                setViewMode("study");
                                setIsFlipped(false);
                              }}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-transparent hover:border-blue-300"
                              title="Estudiar esta tarjeta"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCard(c)}
                              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-300"
                              title="Editar tarjeta"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResetCardProgress(c.id)}
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 border border-transparent hover:border-amber-300"
                              title="Reiniciar progreso a 'Nueva'"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSingleCard(c)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-transparent hover:border-rose-300"
                              title="Eliminar tarjeta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL PARA CREAR O EDITAR FLASHCARD */}
      {(editingCard || isCreateModalOpen) && (
        <CardEditorModal
          card={editingCard}
          onSave={handleSaveCard}
          onClose={() => {
            setEditingCard(null);
            setIsCreateModalOpen(false);
          }}
          isDark={isDark}
        />
      )}

      {/* MODAL PARA IMPORTAR BLOQUE TSV DIRECTAMENTE */}
      {isImportTsvOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className={`border-2 rounded-3xl w-full max-w-xl p-5 sm:p-6 shadow-2xl space-y-4 ${
            isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
          }`}>
            <div className="flex items-center justify-between border-b pb-2.5 border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-base">
                📥 Importar Tarjetas TSV (Sin Duplicados)
              </h3>
              <button type="button" onClick={() => setIsImportTsvOpen(false)} className="p-1 rounded-lg opacity-60 hover:opacity-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleImportTsvModal} className="space-y-3">
              <p className="text-xs opacity-75">
                Pega las líneas en formato <code className="font-mono font-bold">Frente [TAB] Reverso [TAB] Etiquetas</code>. El sistema omitirá automáticamente cualquier tarjeta repetida.
              </p>
              <textarea
                rows={6}
                required
                placeholder={"¿Cuál es el estudio inicial en CAD?\tGasometría arterial y glucemia capilar\t#MI #D01"}
                value={tsvInputText}
                onChange={(e) => setTsvInputText(e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-xs font-mono border-2 focus:outline-none focus:border-purple-500 ${
                  isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-black"
                }`}
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportTsvOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold opacity-70 hover:opacity-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
                >
                  Importar Tarjetas Únicas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponente Modal de Edición / Creación de Flashcards con Vista Previa Markdown en Vivo
function CardEditorModal({ card, onSave, onClose, isDark }) {
  const [front, setFront] = useState(card ? card.front : "");
  const [back, setBack] = useState(card ? card.back : "");
  const [conceptoPivote, setConceptoPivote] = useState(card?.concepto_pivote || "Estudio_Inicial");
  const [tags, setTags] = useState(card?.tags ? card.tags.join(", ") : "MI, ENARM");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;

    onSave({
      front: front.trim(),
      back: back.trim(),
      concepto_pivote: conceptoPivote,
      tags: tags.split(",").map(t => t.replace(/^#/, "").trim()).filter(Boolean)
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className={`border-2 rounded-3xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${
        isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
      }`}>
        <div className="flex items-center justify-between border-b pb-2.5 border-slate-200 dark:border-slate-800">
          <h3 className="font-extrabold text-base">
            {card ? "✏️ Editar Flashcard" : "➕ Crear Nueva Flashcard"}
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-bold block mb-1">
              Frente (Pregunta Pivote — soporta **negritas**, *cursivas* y `código`)
            </label>
            <textarea
              rows={3}
              required
              value={front}
              onChange={(e) => setFront(e.target.value)}
              className={`w-full rounded-xl px-3 py-2 text-xs border-2 focus:outline-none focus:border-purple-500 ${
                isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-black"
              }`}
            />
          </div>

          <div>
            <label className="text-xs font-bold block mb-1">
              Reverso (Respuesta Oficial GPC — soporta **negritas**, *cursivas*, listas y tablas)
            </label>
            <textarea
              rows={4}
              required
              value={back}
              onChange={(e) => setBack(e.target.value)}
              className={`w-full rounded-xl px-3 py-2 text-xs border-2 focus:outline-none focus:border-purple-500 ${
                isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-black"
              }`}
            />
          </div>

          {/* Vista previa en vivo del formato */}
          {(front.trim() || back.trim()) && (
            <div className="p-3 rounded-xl border border-purple-300 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/25 space-y-2 text-xs">
              <div className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300">
                Vista Previa de Formato:
              </div>
              {front.trim() && (
                <div className="font-bold">
                  <MarkdownRenderer content={front} />
                </div>
              )}
              {back.trim() && (
                <div className="pt-1.5 border-t border-purple-200 dark:border-purple-800/60">
                  <MarkdownRenderer content={back} />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold block mb-1">Concepto Pivote</label>
              <select
                value={conceptoPivote}
                onChange={(e) => setConceptoPivote(e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-xs border-2 focus:outline-none ${
                  isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-black"
                }`}
              >
                {Object.entries(PIVOT_CONCEPTS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">Etiquetas (separadas por coma)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-xs border-2 focus:outline-none ${
                  isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-black"
                }`}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold opacity-70 hover:opacity-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
            >
              Guardar Flashcard
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
