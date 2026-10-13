// src/components/AnkiDeck/GlobalDeckView.jsx
// Pantalla Centralizada de Flashcards estilo Anki Desktop
// Incluye Vista de Mazos por Especialidad/Día y el Editor/Explorador Global Anki (selección múltiple,
// eliminación en lote, limpieza de duplicadas en 1 clic, etiquetado/organización y formato Markdown limpio).

import React, { useState, useMemo, useEffect } from "react";
import { useUser } from "../../context/UserContext";
import { useToast } from "../Common/ToastAndConfirm";
import { 
  exportCardsToAnkiTSV, 
  INITIAL_CARD_STATE 
} from "../../services/fsrsEngine";
import { PIVOT_CONCEPTS } from "../../services/telemetryEngine";
import { 
  getTopic, 
  saveTopicFlashcards, 
  deduplicateTopicFlashcards, 
  normalizeFlashcardKey 
} from "../../firebase/firestoreService";
import { MarkdownRenderer } from "../Common/MarkdownRenderer";
import { filterCardsByStudyMode, getSeenDayCodes } from "../../services/ankiDeckService";
import { 
  Layers, 
  Play, 
  Plus, 
  Download, 
  Folder, 
  ChevronRight, 
  Sparkles, 
  Tag, 
  Search,
  Trash2,
  Edit3,
  AlertTriangle,
  CheckSquare,
  List,
  X,
  BookOpen,
  Target,
  Clock,
  Shuffle
} from "lucide-react";

export function GlobalDeckView({ onStartStudyDeck }) {
  const { currentUserId, currentUser, activeDayCode, theme, schedule, switchDay } = useUser();
  const { showToast, confirmAction } = useToast();
  const isDark = theme === "dark";
  const isExam = theme === "enarm-cifrhs";

  const [activeTab, setActiveTab] = useState("decks"); // "decks" | "browser"
  const [selectedStudyMode, setSelectedStudyMode] = useState("today"); // "today" | "due" | "cumulative" | "random" | "difficult"
  const [allCards, setAllCards] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros del Explorador Global Anki
  const [searchTerm, setSearchTerm] = useState("");
  const [dayFilter, setDayFilter] = useState("all");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [pivotFilter, setPivotFilter] = useState("all");
  const [onlyDuplicates, setOnlyDuplicates] = useState(false);

  // Selección múltiple y acciones en lote
  const [selectedKeys, setSelectedKeys] = useState([]); // Array de `${dayCode}::${card.id}`
  const [bulkPivot, setBulkPivot] = useState("Estudio_Inicial");
  const [bulkTag, setBulkTag] = useState("");
  const [editingItem, setEditingItem] = useState(null);

  // Cargar tarjetas de todos los mazos sincronizando tema compartido + estado FSRS local
  const loadGlobalCards = async () => {
    setLoading(true);
    try {
      const cards = [];

      const dayResults = await Promise.all(
        schedule.map(async (day) => {
          const localKey = `enarmcito_anki_deck_${currentUserId}_${day.topicId}`;
          let localDeck = [];
          try {
            const saved = localStorage.getItem(localKey);
            if (saved) localDeck = JSON.parse(saved);
          } catch (e) {}

          let topicCards = [];
          try {
            const t = await getTopic(day.code);
            if (t && Array.isArray(t.flashcards) && t.flashcards.length > 0) {
              topicCards = t.flashcards;
            }
          } catch (e) {}

          const baseCards = topicCards.length > 0 ? topicCards : localDeck;
          const stateMap = new Map();
          if (Array.isArray(localDeck)) {
            localDeck.forEach((c) => {
              if (c?.id && c?.cardState) stateMap.set(c.id, c.cardState);
            });
          }

          return baseCards.map((c, idx) => {
            const cardId = c.id || `fc_${day.code}_${idx}`;
            return {
              ...c,
              id: cardId,
              compositeKey: `${day.code}::${cardId}`,
              dayCode: day.code,
              topicId: day.topicId,
              topicTitle: day.title,
              specialty: day.specialty,
              cardState: c.cardState || stateMap.get(cardId) || INITIAL_CARD_STATE
            };
          });
        })
      );

      dayResults.forEach((dayCards) => {
        cards.push(...dayCards);
      });

      setAllCards(cards);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGlobalCards();
    const handleSync = () => loadGlobalCards();
    window.addEventListener("enarmcito_topic_sync", handleSync);
    window.addEventListener("enarmcito_anki_sync", handleSync);
    return () => {
      window.removeEventListener("enarmcito_topic_sync", handleSync);
      window.removeEventListener("enarmcito_anki_sync", handleSync);
    };
  }, [currentUserId, schedule]);

  // Detectar tarjetas duplicadas por tema (mismo día y mismo frente normalizado)
  const duplicateCompositeKeys = useMemo(() => {
    const seenPerDay = new Map();
    const dups = [];
    allCards.forEach((c) => {
      const norm = normalizeFlashcardKey(c.front);
      if (!norm) return;
      const dayKey = `${c.dayCode}__${norm}`;
      if (seenPerDay.has(dayKey)) {
        dups.push(c.compositeKey);
      } else {
        seenPerDay.set(dayKey, c.compositeKey);
      }
    });
    return dups;
  }, [allCards]);

  const duplicateKeySet = useMemo(() => new Set(duplicateCompositeKeys), [duplicateCompositeKeys]);

  // Limpiar duplicadas en todos los temas afectados en 1 clic
  const handleCleanAllDuplicates = async () => {
    if (duplicateCompositeKeys.length === 0) {
      showToast("No se encontraron tarjetas duplicadas", "info");
      return;
    }

    const affectedDays = Array.from(
      new Set(
        allCards
          .filter((c) => duplicateKeySet.has(c.compositeKey))
          .map((c) => c.dayCode)
      )
    );

    let totalRemoved = 0;
    for (const dayCode of affectedDays) {
      const dayCards = allCards.filter((c) => c.dayCode === dayCode);
      const res = await deduplicateTopicFlashcards(dayCode, currentUserId, dayCards);
      totalRemoved += res.removedCount;
    }

    setSelectedKeys([]);
    await loadGlobalCards();
    showToast(`¡Se eliminaron ${totalRemoved} tarjetas duplicadas exitosamente!`, "success");
  };

  // Métricas estilo Anki: Nuevas (New), Aprendiendo (Learn), A Repasar (Due)
  const deckMetrics = useMemo(() => {
    let newCount = 0;
    let learnCount = 0;
    let dueCount = 0;
    const now = new Date();

    allCards.forEach(c => {
      const state = c.cardState?.state || "new";
      const due = c.cardState?.due ? new Date(c.cardState.due) : now;

      if (state === "new" || c.cardState?.reps === 0) {
        newCount++;
      } else if (state === "learning" || state === "relearning") {
        learnCount++;
      } else if (due <= now) {
        dueCount++;
      }
    });

    return { total: allCards.length, newCount, learnCount, dueCount };
  }, [allCards]);

  // Sesión de estudio según el modo seleccionado estilo Anki Desktop
  const currentStudySession = useMemo(() => {
    return filterCardsByStudyMode(allCards, selectedStudyMode, activeDayCode, schedule);
  }, [allCards, selectedStudyMode, activeDayCode, schedule]);

  // Contadores por modo de estudio para los botones
  const studyModeCounts = useMemo(() => {
    const today = filterCardsByStudyMode(allCards, "today", activeDayCode, schedule).cards.length;
    const due = filterCardsByStudyMode(allCards, "due", activeDayCode, schedule).cards.length;
    const cumulative = filterCardsByStudyMode(allCards, "cumulative", activeDayCode, schedule).cards.length;
    const difficult = filterCardsByStudyMode(allCards, "difficult", activeDayCode, schedule).cards.length;
    return { today, due, cumulative, difficult };
  }, [allCards, activeDayCode, schedule]);

  const handleLaunchStudySession = (overrideMode = null) => {
    const modeToUse = overrideMode || selectedStudyMode;
    const session = filterCardsByStudyMode(allCards, modeToUse, activeDayCode, schedule);
    if (session.cards.length === 0) {
      showToast(`No hay tarjetas en modo "${session.modeTitle}"`, "info");
      return;
    }
    if (onStartStudyDeck) {
      onStartStudyDeck(session);
    }
  };

  // Agrupación por Especialidades
  const specialtyDecks = useMemo(() => {
    const map = {
      MI: { name: "Medicina Interna", count: 0, days: [] },
      PED: { name: "Pediatría", count: 0, days: [] },
      GYO: { name: "Ginecología & Obstetricia", count: 0, days: [] },
      CIR: { name: "Cirugía & Trauma", count: 0, days: [] }
    };

    schedule.forEach(day => {
      if (map[day.specialty]) {
        const dayCardsCount = allCards.filter(c => c.dayCode === day.code).length;
        map[day.specialty].days.push({
          code: day.code,
          title: day.title,
          cardsCount: dayCardsCount
        });
        map[day.specialty].count += dayCardsCount;
      }
    });

    return map;
  }, [schedule, allCards]);

  // Filtrado de tarjetas para el Explorador Global Anki
  const filteredBrowserCards = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return allCards.filter((c) => {
      if (dayFilter !== "all" && c.dayCode !== dayFilter) return false;
      if (specialtyFilter !== "all" && c.specialty !== specialtyFilter) return false;
      if (pivotFilter !== "all" && c.concepto_pivote !== pivotFilter) return false;
      if (onlyDuplicates && !duplicateKeySet.has(c.compositeKey)) return false;

      if (q) {
        const matchFront = c.front?.toLowerCase().includes(q);
        const matchBack = c.back?.toLowerCase().includes(q);
        const matchTags = Array.isArray(c.tags) && c.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchFront && !matchBack && !matchTags) return false;
      }
      return true;
    });
  }, [allCards, searchTerm, dayFilter, specialtyFilter, pivotFilter, onlyDuplicates, duplicateKeySet]);

  // Alternar selección individual
  const toggleSelectKey = (compositeKey) => {
    setSelectedKeys((prev) =>
      prev.includes(compositeKey)
        ? prev.filter((k) => k !== compositeKey)
        : [...prev, compositeKey]
    );
  };

  // Seleccionar todas las visibles
  const handleToggleSelectAllVisible = () => {
    const visibleKeys = filteredBrowserCards.map((c) => c.compositeKey);
    const allSelected = visibleKeys.length > 0 && visibleKeys.every((k) => selectedKeys.includes(k));
    if (allSelected) {
      setSelectedKeys((prev) => prev.filter((k) => !visibleKeys.includes(k)));
    } else {
      setSelectedKeys((prev) => Array.from(new Set([...prev, ...visibleKeys])));
    }
  };

  // Eliminar en lote las tarjetas seleccionadas
  const handleBulkDelete = async () => {
    if (selectedKeys.length === 0) return;
    const confirmed = await confirmAction({
      title: `¿Eliminar ${selectedKeys.length} flashcards seleccionadas?`,
      message: `Se eliminarán permanentemente las ${selectedKeys.length} tarjetas marcadas.`,
      confirmText: `Sí, eliminar (${selectedKeys.length})`,
      cancelText: "Cancelar",
      isDestructive: true
    });
    if (!confirmed) return;

    const removeSet = new Set(selectedKeys);
    const affectedDays = Array.from(
      new Set(
        allCards
          .filter((c) => removeSet.has(c.compositeKey))
          .map((c) => c.dayCode)
      )
    );

    for (const dayCode of affectedDays) {
      const remainingForDay = allCards
        .filter((c) => c.dayCode === dayCode && !removeSet.has(c.compositeKey))
        .map(({ compositeKey, dayCode: _d, topicId: _t, topicTitle: _tt, specialty: _s, ...clean }) => clean);
      await saveTopicFlashcards(dayCode, remainingForDay, currentUserId);
    }

    setSelectedKeys([]);
    await loadGlobalCards();
    showToast(`Se eliminaron ${removeSet.size} flashcards correctamente`, "success");
  };

  // Eliminar 1 sola tarjeta desde la tabla global
  const handleDeleteSingle = async (cardItem) => {
    const confirmed = await confirmAction({
      title: "¿Eliminar esta flashcard?",
      message: `Se eliminará "${(cardItem.front || "").slice(0, 75)}..." del tema ${cardItem.dayCode}.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      isDestructive: true
    });
    if (!confirmed) return;

    const remainingForDay = allCards
      .filter((c) => c.dayCode === cardItem.dayCode && c.compositeKey !== cardItem.compositeKey)
      .map(({ compositeKey, dayCode: _d, topicId: _t, topicTitle: _tt, specialty: _s, ...clean }) => clean);

    await saveTopicFlashcards(cardItem.dayCode, remainingForDay, currentUserId);
    setSelectedKeys((prev) => prev.filter((k) => k !== cardItem.compositeKey));
    await loadGlobalCards();
    showToast("Flashcard eliminada", "info");
  };

  // Cambiar Concepto Pivote en lote
  const handleBulkAssignPivot = async () => {
    if (selectedKeys.length === 0) return;
    const targetSet = new Set(selectedKeys);
    const affectedDays = Array.from(
      new Set(allCards.filter((c) => targetSet.has(c.compositeKey)).map((c) => c.dayCode))
    );

    for (const dayCode of affectedDays) {
      const updatedForDay = allCards
        .filter((c) => c.dayCode === dayCode)
        .map((c) => {
          const updated = targetSet.has(c.compositeKey) ? { ...c, concepto_pivote: bulkPivot } : c;
          const { compositeKey, dayCode: _d, topicId: _t, topicTitle: _tt, specialty: _s, ...clean } = updated;
          return clean;
        });
      await saveTopicFlashcards(dayCode, updatedForDay, currentUserId);
    }

    await loadGlobalCards();
    showToast(`Pivote actualizado en ${selectedKeys.length} tarjetas`, "success");
  };

  // Añadir Etiqueta en lote
  const handleBulkAddTag = async () => {
    const cleanTag = bulkTag.trim().replace(/^#/, "");
    if (!cleanTag || selectedKeys.length === 0) return;
    const targetSet = new Set(selectedKeys);
    const affectedDays = Array.from(
      new Set(allCards.filter((c) => targetSet.has(c.compositeKey)).map((c) => c.dayCode))
    );

    for (const dayCode of affectedDays) {
      const updatedForDay = allCards
        .filter((c) => c.dayCode === dayCode)
        .map((c) => {
          let nextCard = c;
          if (targetSet.has(c.compositeKey)) {
            const tags = Array.isArray(c.tags) ? c.tags : [];
            if (!tags.includes(cleanTag)) {
              nextCard = { ...c, tags: [...tags, cleanTag] };
            }
          }
          const { compositeKey, dayCode: _d, topicId: _t, topicTitle: _tt, specialty: _s, ...clean } = nextCard;
          return clean;
        });
      await saveTopicFlashcards(dayCode, updatedForDay, currentUserId);
    }

    setBulkTag("");
    await loadGlobalCards();
    showToast(`Etiqueta #${cleanTag} añadida a ${selectedKeys.length} tarjetas`, "success");
  };

  // Guardar edición de una tarjeta individual en el modal
  const handleSaveEditedCard = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    const updatedForDay = allCards
      .filter((c) => c.dayCode === editingItem.dayCode)
      .map((c) => {
        const nextCard =
          c.compositeKey === editingItem.compositeKey
            ? {
                ...c,
                front: editingItem.front.trim(),
                back: editingItem.back.trim(),
                concepto_pivote: editingItem.concepto_pivote,
                tags: String(editingItem.tagsText || "")
                  .split(",")
                  .map((t) => t.replace(/^#/, "").trim())
                  .filter(Boolean)
              }
            : c;
        const { compositeKey, dayCode: _d, topicId: _t, topicTitle: _tt, specialty: _s, ...clean } = nextCard;
        return clean;
      });

    await saveTopicFlashcards(editingItem.dayCode, updatedForDay, currentUserId);
    setEditingItem(null);
    await loadGlobalCards();
    showToast("Flashcard actualizada correctamente", "success");
  };

  // Exportar todas las flashcards a TSV
  const handleExportAll = () => {
    if (allCards.length === 0) {
      showToast("No hay tarjetas para exportar aún", "info");
      return;
    }
    const tsvData = exportCardsToAnkiTSV(allCards);
    const blob = new Blob([tsvData], { type: "text/tab-separated-values;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ENARMCITO_Mazo_Total_${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Mazo exportado en formato Anki", "success");
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-6">
      {/* Cabecera Anki Hub */}
      <div className={`border-2 rounded-2xl p-4 sm:p-5 shadow-sm transition-all ${
        isExam 
          ? "bg-white border-black text-black"
          : isDark 
          ? "bg-slate-900 border-slate-700 text-white" 
          : "bg-white border-slate-300 text-slate-900"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black leading-tight">
                  Pantalla Central Anki FSRS & Editor de Mazos
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black border-2 border-purple-500/40 bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                  {deckMetrics.total} tarjetas registradas
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Mazos por Especialidad y Editor Estilo Anki Desktop para seleccionar varias, eliminar duplicadas y organizar
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Pestañas: Mazos vs Editor Anki */}
            <div className="flex items-center p-1 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab("decks")}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                  activeTab === "decks"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
                }`}
              >
                🗂️ Mazos por Día
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("browser")}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                  activeTab === "browser"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>🛠️ Editor / Explorador Anki ({allCards.length})</span>
                {duplicateCompositeKeys.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                    {duplicateCompositeKeys.length} dup
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportAll}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Descargar archivo TSV compatible con Anki Desktop"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar TSV</span>
            </button>
          </div>
        </div>

        {/* ALERTA DE DUPLICADAS CON BOTÓN DE LIMPIEZA EN 1 CLIC */}
        {duplicateCompositeKeys.length > 0 && (
          <div className="mt-3.5 border-2 border-amber-500/80 bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span className="text-xs font-bold">
                Se detectaron <strong>{duplicateCompositeKeys.length} tarjetas repetidas/duplicadas</strong> por múltiples importaciones.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCleanAllDuplicates}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold shadow-xs cursor-pointer"
              >
                🧹 Eliminar {duplicateCompositeKeys.length} Duplicadas en 1 Clic
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("browser");
                  setSelectedKeys(duplicateCompositeKeys);
                }}
                className="px-3 py-1.5 rounded-xl border border-amber-600/50 text-xs font-bold cursor-pointer"
              >
                Ver en el Editor Anki
              </button>
            </div>
          </div>
        )}

        {/* Contador Estilo Anki Desktop (Nuevas - Aprendiendo - Para Repasar) */}
        <div className="mt-3.5 grid grid-cols-3 gap-2 sm:gap-3 text-center">
          <div className="p-2.5 rounded-xl border-2 border-blue-300 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/40">
            <span className="block text-lg sm:text-2xl font-black font-mono text-blue-600 dark:text-cyan-400">
              {deckMetrics.newCount}
            </span>
            <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-blue-800 dark:text-cyan-300">
              Nuevas (New)
            </span>
          </div>

          <div className="p-2.5 rounded-xl border-2 border-rose-300 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/40">
            <span className="block text-lg sm:text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
              {deckMetrics.learnCount}
            </span>
            <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-rose-800 dark:text-rose-300">
              Aprendizaje (Learn)
            </span>
          </div>

          <div className="p-2.5 rounded-xl border-2 border-emerald-300 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/40">
            <span className="block text-lg sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {deckMetrics.dueCount}
            </span>
            <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Por Repasar (Due)
            </span>
          </div>
        </div>
      </div>

      {/* PESTAÑA 1: ÁRBOL DE MAZOS POR ESPECIALIDAD Y TEMAS */}
      {activeTab === "decks" && (
        <div className="space-y-3">
          {/* LANZADOR DE SESIONES INTELIGENTES ANKI */}
          <div className={`border-2 rounded-2xl p-4 sm:p-5 shadow-sm transition-all space-y-3 ${
            isExam ? "bg-white border-black text-black" : isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-purple-200 text-slate-900"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-black uppercase tracking-wide">
                  Modo de Estudio Anki (Repetición Espaciada)
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {currentStudySession.modeDescription}
              </span>
            </div>

            {/* Selector de Modos (Pills) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => setSelectedStudyMode("today")}
                className={`p-2.5 rounded-xl border-2 text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                  selectedStudyMode === "today"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-950 dark:text-cyan-200 ring-2 ring-blue-400/40 font-black"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 font-semibold"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] flex items-center gap-1">
                    <Target className="w-3 h-3 text-blue-500" />
                    <span>Tema Hoy</span>
                  </span>
                  <span className="font-mono text-[10px] font-black px-1.5 py-0.2 rounded bg-blue-200/80 dark:bg-blue-900 text-blue-900 dark:text-cyan-200">
                    {studyModeCounts.today}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">{activeDayCode}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStudyMode("due")}
                className={`p-2.5 rounded-xl border-2 text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                  selectedStudyMode === "due"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-400/40 font-black"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 font-semibold"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-500" />
                    <span>Vencidas FSRS</span>
                  </span>
                  <span className={`font-mono text-[10px] font-black px-1.5 py-0.2 rounded ${
                    studyModeCounts.due > 0 ? "bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200 animate-pulse" : "bg-slate-200 dark:bg-slate-800 text-slate-600"
                  }`}>
                    {studyModeCounts.due}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">Curva de olvido</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStudyMode("cumulative")}
                className={`p-2.5 rounded-xl border-2 text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                  selectedStudyMode === "cumulative"
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-950/60 text-purple-950 dark:text-purple-200 ring-2 ring-purple-400/40 font-black"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 font-semibold"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-purple-500" />
                    <span>Temas Vistos</span>
                  </span>
                  <span className="font-mono text-[10px] font-black px-1.5 py-0.2 rounded bg-purple-200/80 dark:bg-purple-900 text-purple-900 dark:text-purple-200">
                    {studyModeCounts.cumulative}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">Acumulado</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStudyMode("random")}
                className={`p-2.5 rounded-xl border-2 text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                  selectedStudyMode === "random"
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-400/40 font-black"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 font-semibold"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] flex items-center gap-1">
                    <Shuffle className="w-3 h-3 text-indigo-500" />
                    <span>Aleatorio</span>
                  </span>
                  <span className="font-mono text-[10px] font-black px-1.5 py-0.2 rounded bg-indigo-200/80 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200">
                    🔀
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">Cramming</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStudyMode("difficult")}
                className={`p-2.5 rounded-xl border-2 text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                  selectedStudyMode === "difficult"
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 ring-2 ring-amber-400/40 font-black"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 font-semibold"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                    <span>Difíciles</span>
                  </span>
                  <span className="font-mono text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                    {studyModeCounts.difficult}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">Lapsos FSRS</span>
              </button>
            </div>

            {/* Botón de Lanzamiento de Sesión */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="text-xs">
                <span className="font-bold text-slate-900 dark:text-white">
                  Sesión lista: {currentStudySession.modeTitle}
                </span>
                <span className="text-slate-500 ml-2">
                  ({currentStudySession.cards.length} tarjetas en esta baraja)
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleLaunchStudySession()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Iniciar Estudio ({currentStudySession.cards.length} tarjetas)</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <h3 className="font-black text-sm text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Estructura de Mazos Clínicos
            </h3>
            <button
              type="button"
              onClick={() => setActiveTab("browser")}
              className="text-xs font-extrabold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
            >
              <span>Abrir Editor / Explorador para seleccionar y borrar tarjetas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(specialtyDecks).map(([key, deckInfo]) => (
              <div
                key={key}
                className={`border-2 rounded-2xl p-4 transition-all shadow-xs ${
                  isExam
                    ? "bg-white border-black text-black"
                    : isDark
                    ? "bg-slate-900 border-slate-700 text-white"
                    : "bg-white border-slate-300 text-slate-900"
                }`}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Folder className="w-5 h-5 text-indigo-500" />
                    <h4 className="font-black text-sm">{deckInfo.name}</h4>
                  </div>
                  <span className="text-xs font-mono font-black px-2 py-0.5 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                    {deckInfo.count} tarjetas
                  </span>
                </div>

                {/* Días / sub-mazos correspondientes */}
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {deckInfo.days.map((day) => (
                    <div
                      key={day.code}
                      className="flex items-center justify-between p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all text-xs"
                    >
                      <div
                        onClick={() => {
                          switchDay(day.code);
                          if (onStartStudyDeck) onStartStudyDeck();
                        }}
                        className="flex items-center gap-2 truncate cursor-pointer flex-1"
                      >
                        <span className="font-black font-mono text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-cyan-300">
                          {day.code}
                        </span>
                        <span className="font-bold truncate">{day.title}</span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="font-mono text-[11px] font-bold text-slate-500">
                          {day.cardsCount}
                        </span>
                        {day.cardsCount > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setDayFilter(day.code);
                              setActiveTab("browser");
                            }}
                            className="px-2 py-0.5 rounded-lg border border-purple-300 dark:border-purple-700 text-[10px] font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50"
                            title="Gestionar / Eliminar / Editar tarjetas de este día"
                          >
                            Editar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            switchDay(day.code);
                            if (onStartStudyDeck) onStartStudyDeck();
                          }}
                          className="p-1 rounded-lg text-slate-500 hover:text-indigo-600"
                          title="Estudiar mazo"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PESTAÑA 2: EDITOR Y EXPLORADOR GLOBAL ESTILO ANKI DESKTOP */}
      {activeTab === "browser" && (
        <div className={`border-2 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm ${
          isExam
            ? "bg-white border-black text-black"
            : isDark
            ? "bg-slate-900 border-slate-700 text-white"
            : "bg-white border-slate-300 text-slate-900"
        }`}>
          {/* Filtros de búsqueda y organización */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-4 relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por pregunta, respuesta o #etiqueta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-transparent text-xs focus:border-purple-500 outline-hidden"
              />
            </div>

            <div className="sm:col-span-3">
              <select
                value={dayFilter}
                onChange={(e) => setDayFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-transparent text-xs font-bold focus:border-purple-500 outline-hidden"
              >
                <option value="all">Todos los temas / días</option>
                {schedule.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.code}: {d.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <select
                value={pivotFilter}
                onChange={(e) => setPivotFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-transparent text-xs font-bold focus:border-purple-500 outline-hidden"
              >
                <option value="all">Todos los Conceptos Pivote</option>
                {Object.entries(PIVOT_CONCEPTS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 flex items-center">
              <button
                type="button"
                onClick={() => setOnlyDuplicates(!onlyDuplicates)}
                className={`w-full py-1.5 px-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                  onlyDuplicates
                    ? "bg-amber-600 text-white border-amber-600"
                    : "border-slate-300 dark:border-slate-700 opacity-80 hover:opacity-100"
                }`}
              >
                ⚠️ Duplicadas ({duplicateCompositeKeys.length})
              </button>
            </div>
          </div>

          {/* Controles rápidos de selección */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleSelectAllVisible}
                className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold flex items-center gap-1.5"
              >
                <CheckSquare className="w-3.5 h-3.5 text-purple-600" />
                <span>
                  {filteredBrowserCards.length > 0 &&
                  filteredBrowserCards.every((c) => selectedKeys.includes(c.compositeKey))
                    ? "Deseleccionar visibles"
                    : `Seleccionar visibles (${filteredBrowserCards.length})`}
                </span>
              </button>

              {duplicateCompositeKeys.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedKeys(duplicateCompositeKeys)}
                  className="px-2.5 py-1.5 rounded-xl border border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold"
                >
                  Seleccionar todas las duplicadas ({duplicateCompositeKeys.length})
                </button>
              )}

              {selectedKeys.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedKeys([])}
                  className="px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white font-semibold"
                >
                  Limpiar selección ({selectedKeys.length})
                </button>
              )}
            </div>
          </div>

          {/* Barra de Acciones en Lote (cuando hay tarjetas seleccionadas) */}
          {selectedKeys.length > 0 && (
            <div className="border-2 border-purple-500 bg-purple-50/90 dark:bg-purple-950/50 rounded-2xl p-3 space-y-2.5 shadow-sm animate-fadeIn">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black text-purple-900 dark:text-purple-200">
                  ✅ {selectedKeys.length} tarjeta(s) seleccionada(s):
                </span>

                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar seleccionadas ({selectedKeys.length})</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-purple-200 dark:border-purple-800/60">
                <div className="flex items-center gap-1.5">
                  <select
                    value={bulkPivot}
                    onChange={(e) => setBulkPivot(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-xl border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 text-xs font-bold"
                  >
                    {Object.entries(PIVOT_CONCEPTS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleBulkAssignPivot}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                  >
                    Asignar Pivote
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Añadir etiqueta en lote (ej. GPC)..."
                    value={bulkTag}
                    onChange={(e) => setBulkTag(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-xl border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleBulkAddTag}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                  >
                    + Etiquetar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tabla de Tarjetas con Formato Markdown Limpio */}
          <div className="overflow-x-auto border-2 border-slate-200 dark:border-slate-800 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
                  <th className="py-2.5 px-2.5 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredBrowserCards.length > 0 &&
                        filteredBrowserCards.every((c) => selectedKeys.includes(c.compositeKey))
                      }
                      onChange={handleToggleSelectAllVisible}
                      className="w-4 h-4 rounded accent-purple-600 cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-2 font-black">Día</th>
                  <th className="py-2.5 px-3 font-black min-w-[220px]">Pregunta (Frente)</th>
                  <th className="py-2.5 px-3 font-black min-w-[240px]">Respuesta (Reverso)</th>
                  <th className="py-2.5 px-3 font-black">Concepto Pivote / Tags</th>
                  <th className="py-2.5 px-2.5 font-black text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredBrowserCards.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-semibold">
                      No se encontraron flashcards con esos criterios.
                    </td>
                  </tr>
                ) : (
                  filteredBrowserCards.map((c) => {
                    const isSelected = selectedKeys.includes(c.compositeKey);
                    const isDuplicate = duplicateKeySet.has(c.compositeKey);

                    return (
                      <tr
                        key={c.compositeKey}
                        className={`align-top transition-colors ${
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
                            onChange={() => toggleSelectKey(c.compositeKey)}
                            className="w-4 h-4 rounded accent-purple-600 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-2 font-mono font-bold">
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-cyan-300 text-[10px]">
                            {c.dayCode}
                          </span>
                          {isDuplicate && (
                            <span className="block mt-1 px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200 w-fit">
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
                              {c.tags.map((t, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700"
                                >
                                  #{String(t).replace(/^#/, "")}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                switchDay(c.dayCode);
                                if (onStartStudyDeck) onStartStudyDeck();
                              }}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                              title="Ir a estudiar este mazo"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setEditingItem({
                                  ...c,
                                  tagsText: Array.isArray(c.tags) ? c.tags.join(", ") : ""
                                })
                              }
                              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Editar tarjeta"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSingle(c)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
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

      {/* MODAL PARA EDITAR FLASHCARD DESDE EL EXPLORADOR GLOBAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className={`border-2 rounded-3xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${
            isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
          }`}>
            <div className="flex items-center justify-between border-b pb-2.5 border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-base">
                ✏️ Editar Flashcard ({editingItem.dayCode})
              </h3>
              <button type="button" onClick={() => setEditingItem(null)} className="p-1 rounded-lg opacity-60 hover:opacity-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedCard} className="space-y-3">
              <div>
                <label className="text-xs font-bold block mb-1">Frente (Pregunta)</label>
                <textarea
                  rows={3}
                  required
                  value={editingItem.front}
                  onChange={(e) => setEditingItem({ ...editingItem, front: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2 text-xs border-2 focus:outline-none focus:border-purple-500 ${
                    isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-black"
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Reverso (Respuesta Oficial GPC)</label>
                <textarea
                  rows={4}
                  required
                  value={editingItem.back}
                  onChange={(e) => setEditingItem({ ...editingItem, back: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2 text-xs border-2 focus:outline-none focus:border-purple-500 ${
                    isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-black"
                  }`}
                />
              </div>

              <div className="p-3 rounded-xl border border-purple-300 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/25 space-y-2 text-xs">
                <div className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300">
                  Vista Previa Formateada:
                </div>
                <div className="font-bold">
                  <MarkdownRenderer content={editingItem.front} />
                </div>
                <div className="pt-1.5 border-t border-purple-200 dark:border-purple-800/60">
                  <MarkdownRenderer content={editingItem.back} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold block mb-1">Concepto Pivote</label>
                  <select
                    value={editingItem.concepto_pivote || "Estudio_Inicial"}
                    onChange={(e) => setEditingItem({ ...editingItem, concepto_pivote: e.target.value })}
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
                    value={editingItem.tagsText}
                    onChange={(e) => setEditingItem({ ...editingItem, tagsText: e.target.value })}
                    className={`w-full rounded-xl px-3 py-2 text-xs border-2 focus:outline-none ${
                      isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-black"
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold opacity-70 hover:opacity-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
