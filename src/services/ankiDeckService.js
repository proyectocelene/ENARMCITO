// src/services/ankiDeckService.js
// Servicio Centralizado de Mazos y Sesiones de Estudio Anki FSRS
// Provee sincronización multi-tema, filtrado según los modos de estudio Anki Desktop
// (Tema de Hoy, Repaso Vencidas FSRS, Temas Vistos Acumulados, Aleatorio/Cram y Difíciles)

import { getTopic } from "../firebase/firestoreService";
import { INITIAL_CARD_STATE } from "./fsrsEngine";

/**
 * Carga todas las flashcards registradas en el cronograma para el usuario,
 * sincronizando el mazo base de Firestore con el estado FSRS guardado localmente.
 */
export async function loadAllScheduleCards(schedule = [], currentUserId = "donato") {
  if (!schedule || schedule.length === 0) return [];

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
          cardState: c.cardState || stateMap.get(cardId) || { ...INITIAL_CARD_STATE }
        };
      });
    })
  );

  const flatCards = [];
  dayResults.forEach((cards) => flatCards.push(...cards));
  return flatCards;
}

/**
 * Calcula los días "vistos" o transcurridos hasta el día actual en el cronograma
 */
export function getSeenDayCodes(schedule = [], activeDayCode = "D01") {
  const activeIdx = schedule.findIndex((d) => d.code === activeDayCode);
  const maxIdx = activeIdx >= 0 ? activeIdx : 0;
  return schedule.slice(0, maxIdx + 1).map((d) => d.code);
}

/**
 * Filtra y prepara una baraja según el modo de estudio Anki seleccionado
 */
export function filterCardsByStudyMode(allCards = [], mode = "today", activeDayCode = "D01", schedule = []) {
  const seenCodes = new Set(getSeenDayCodes(schedule, activeDayCode));
  const now = new Date();

  switch (mode) {
    case "today": {
      // Tarjetas exclusivas del tema asignado para hoy
      const todayCards = allCards.filter((c) => c.dayCode === activeDayCode);
      return {
        mode,
        modeTitle: `Tema del Día (${activeDayCode})`,
        modeDescription: "Estudio de las tarjetas del tema clínico activo hoy",
        cards: todayCards
      };
    }

    case "due": {
      // Tarjetas vencidas según FSRS en todos los temas vistos
      const dueCards = allCards.filter((c) => {
        if (!seenCodes.has(c.dayCode)) return false;
        const st = c.cardState;
        if (!st || !st.due) return false;
        const isGraduated = st.reps > 0 || st.state === "review" || st.state === "learning" || st.state === "relearning";
        const isPastDue = new Date(st.due) <= now;
        return isGraduated && isPastDue;
      });
      return {
        mode,
        modeTitle: "Repaso Pendiente (Due FSRS)",
        modeDescription: "Tarjetas programadas por la curva del olvido para repasar hoy",
        cards: dueCards
      };
    }

    case "cumulative": {
      // Todas las tarjetas acumuladas de los días vistos
      const cumulativeCards = allCards.filter((c) => seenCodes.has(c.dayCode));
      return {
        mode,
        modeTitle: `Temas Vistos / Acumulados (${seenCodes.size} temas)`,
        modeDescription: "Consolidación de todo el material cubierto hasta hoy",
        cards: cumulativeCards
      };
    }

    case "random": {
      // Barajado aleatorio de todos los temas vistos (Modo Cramming)
      const pool = allCards.filter((c) => seenCodes.has(c.dayCode));
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      return {
        mode,
        modeTitle: "Modo Aleatorio (Cram Intercalado)",
        modeDescription: "Práctica intercalada sin orden temático predecible",
        cards: shuffled
      };
    }

    case "difficult": {
      // Tarjetas con historial de fallos (lapses > 0) o dificultad FSRS alta (>= 7)
      const hardCards = allCards.filter((c) => {
        if (!seenCodes.has(c.dayCode)) return false;
        const st = c.cardState;
        if (!st) return false;
        return (st.lapses && st.lapses > 0) || (st.difficulty && st.difficulty >= 7);
      });
      return {
        mode,
        modeTitle: "Tarjetas Difíciles & Lapsos",
        modeDescription: "Reactivos donde has tenido tropiezos o alta dificultad cognitiva",
        cards: hardCards
      };
    }

    case "new": {
      // Tarjetas nuevas no vistas de los temas acumulados
      const newCards = allCards.filter((c) => {
        if (!seenCodes.has(c.dayCode)) return false;
        const st = c.cardState;
        return !st || !st.reps || st.state === "new";
      });
      return {
        mode,
        modeTitle: "Tarjetas Nuevas",
        modeDescription: "Tarjetas pendientes de primer encuentro clínico",
        cards: newCards
      };
    }

    default:
      return {
        mode: "today",
        modeTitle: `Tema del Día (${activeDayCode})`,
        modeDescription: "Estudio de las tarjetas del tema activo hoy",
        cards: allCards.filter((c) => c.dayCode === activeDayCode)
      };
  }
}

/**
 * Guarda la calificación FSRS de una tarjeta en el LocalStorage de su tema respectivo
 */
export function persistCardFSRSReview(currentUserId, card, updatedCardState) {
  if (!card || !card.topicId) return;
  const storageKey = `enarmcito_anki_deck_${currentUserId}_${card.topicId}`;
  try {
    let localDeck = [];
    const saved = localStorage.getItem(storageKey);
    if (saved) localDeck = JSON.parse(saved);

    const updatedDeck = localDeck.map((c) => {
      if (c.id === card.id) {
        return { ...c, cardState: updatedCardState };
      }
      return c;
    });

    localStorage.setItem(storageKey, JSON.stringify(updatedDeck));

    // Notificar cambio
    window.dispatchEvent(
      new CustomEvent("enarmcito_anki_sync", {
        detail: { topicId: card.topicId, cardId: card.id, cardState: updatedCardState }
      })
    );
  } catch (e) {
    console.error("Error guardando progreso FSRS de tarjeta:", e);
  }
}
