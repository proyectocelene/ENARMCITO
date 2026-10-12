// src/services/fsrsEngine.js
// Implementación estándar de FSRS v4.5 / v5 (Free Spaced Repetition Scheduler)
// Optimizado para alta retención en el ENARM (Target Retention: 90%)

export const RATINGS = {
  AGAIN: 1,
  HARD: 2,
  GOOD: 3,
  EASY: 4
};

// 19 Parámetros estándar optimizados de FSRS-5 (open-spaced-repetition)
export const DEFAULT_FSRS_WEIGHTS = [
  0.40255, 1.18385, 3.173, 15.69105, // w0-w3: Estabilidad inicial por calificación (Again, Hard, Good, Easy)
  7.1949, 0.5345, 1.4604, 0.0046,    // w4-w7: Ajuste y regresión a la media de dificultad
  1.54575, 0.1192, 1.01925,          // w8-w10: Estabilidad en recuerdo exitoso
  1.9395, 0.11, 0.29605,             // w11-w13: Estabilidad en olvido (lapse/again)
  2.2698, 0.2315, 2.9898,            // w14-w16: Ponderaciones de Hard y Easy bonus
  0.51655, 0.6621                    // w17-w18: Heurística de repasos en el mismo día (Short-term review FSRS-5)
];

export const TARGET_RETENTION = 0.90; // 90% de probabilidad de recuerdo deseada para el ENARM
const DECAY_FACTOR = 19 / 81; // Factor estándar de decaimiento FSRS
const POWER = 0.5;

export const INITIAL_CARD_STATE = {
  stability: 0,
  difficulty: 0,
  reps: 0,
  lapses: 0,
  state: "new", // "new" | "learning" | "review" | "relearning"
  due: new Date().toISOString(),
  last_review: null,
  review_history: []
};

/**
 * Calcula la probabilidad de recuerdo (Retrievability) actual
 * R(t, S) = (1 + factor * t / S)^(-power)
 */
export function getRetrievability(elapsedDays, stability) {
  if (stability <= 0) return 0;
  return Math.pow(1 + (DECAY_FACTOR * elapsedDays) / stability, -POWER);
}

/**
 * Calcula el intervalo en días para alcanzar la retención deseada
 * I(r, S) = (S / factor) * (r^(-1/power) - 1)
 */
export function calculateInterval(stability, requestRetention = TARGET_RETENTION) {
  if (stability <= 0) return 0;
  const interval = (stability / DECAY_FACTOR) * (Math.pow(requestRetention, -1 / POWER) - 1);
  return Math.max(1, Math.round(interval));
}

/**
 * Calcula la dificultad inicial basada en la primera calificación (1 a 4)
 * D0(G) = w4 - exp(w5 * (G - 1)) + 1
 */
function initialDifficulty(rating, w = DEFAULT_FSRS_WEIGHTS) {
  const d = w[4] - Math.exp(w[5] * (rating - 1)) + 1;
  return Math.min(10, Math.max(1, Number(d.toFixed(2))));
}

/**
 * Calcula la estabilidad inicial según la primera calificación
 */
function initialStability(rating, w = DEFAULT_FSRS_WEIGHTS) {
  const s = Math.max(0.1, w[rating - 1]);
  return Number(s.toFixed(2));
}

/**
 * Actualiza la dificultad tras revisiones posteriores
 */
function nextDifficulty(currentD, rating, w = DEFAULT_FSRS_WEIGHTS) {
  const nextD = currentD - w[6] * (rating - 3);
  // Regresión a la media
  const meanReversion = w[7] * initialDifficulty(RATINGS.GOOD, w) + (1 - w[7]) * nextD;
  return Math.min(10, Math.max(1, Number(meanReversion.toFixed(2))));
}

/**
 * Actualiza la estabilidad tras un recuerdo exitoso (Hard, Good, Easy)
 */
function nextRecallStability(d, s, r, rating, w = DEFAULT_FSRS_WEIGHTS) {
  const hardPenalty = rating === RATINGS.HARD ? w[15] : 1;
  const easyBonus = rating === RATINGS.EASY ? w[16] : 1;
  const factor = Math.exp(w[8]) *
    (11 - d) *
    Math.pow(s, -w[9]) *
    (Math.exp((1 - r) * w[10]) - 1) *
    hardPenalty *
    easyBonus;
  const newS = s * (1 + factor);
  return Math.max(0.1, Number(newS.toFixed(2)));
}

/**
 * Actualiza la estabilidad tras un olvido (Again)
 */
function nextForgetStability(d, s, r, w = DEFAULT_FSRS_WEIGHTS) {
  const newS = w[11] *
    Math.pow(d, -w[12]) *
    (Math.pow(s + 1, w[13]) - 1) *
    Math.exp((1 - r) * w[14]);
  return Math.max(0.1, Number(Math.min(s, newS).toFixed(2)));
}

/**
 * Proyecta los próximos intervalos en formato legible para los 4 botones
 */
export function getIntervalForecast(cardState) {
  const state = { ...INITIAL_CARD_STATE, ...cardState };
  
  if (state.reps === 0) {
    return {
      [RATINGS.AGAIN]: "< 10 min",
      [RATINGS.HARD]: "1 día",
      [RATINGS.GOOD]: `${calculateInterval(initialStability(RATINGS.GOOD))} días`,
      [RATINGS.EASY]: `${calculateInterval(initialStability(RATINGS.EASY))} días`
    };
  }

  const elapsedDays = state.last_review
    ? Math.max(0, (Date.now() - new Date(state.last_review).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const r = getRetrievability(elapsedDays, state.stability);
  const currentD = state.difficulty || initialDifficulty(RATINGS.GOOD);

  // Proyecciones
  const sAgain = nextForgetStability(currentD, state.stability, r);
  const sHard = nextRecallStability(nextDifficulty(currentD, RATINGS.HARD), state.stability, r, RATINGS.HARD);
  const sGood = nextRecallStability(nextDifficulty(currentD, RATINGS.GOOD), state.stability, r, RATINGS.GOOD);
  const sEasy = nextRecallStability(nextDifficulty(currentD, RATINGS.EASY), state.stability, r, RATINGS.EASY);

  const formatDays = (days) => {
    if (days <= 0) return "< 10 min";
    if (days === 1) return "1 día";
    if (days < 30) return `${days} días`;
    const months = (days / 30).toFixed(1);
    return `${months} meses`;
  };

  return {
    [RATINGS.AGAIN]: "< 10 min",
    [RATINGS.HARD]: formatDays(calculateInterval(sHard)),
    [RATINGS.GOOD]: formatDays(calculateInterval(sGood)),
    [RATINGS.EASY]: formatDays(calculateInterval(sEasy))
  };
}

/**
 * Programa la tarjeta y genera el registro de auditoría estilo Anki
 */
export function scheduleCardFSRS(cardState = INITIAL_CARD_STATE, rating = RATINGS.GOOD, responseTimeMs = 0) {
  const current = { ...INITIAL_CARD_STATE, ...cardState };
  const reps = current.reps + 1;
  const now = new Date();

  const elapsedDays = current.last_review
    ? Math.max(0, (now.getTime() - new Date(current.last_review).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  let newS = current.stability;
  let newD = current.difficulty;
  let lapses = current.lapses;
  let nextState = current.state;

  if (current.reps === 0) {
    // Primera vez que se responde
    newS = initialStability(rating);
    newD = initialDifficulty(rating);
    nextState = rating === RATINGS.AGAIN ? "learning" : "review";
    if (rating === RATINGS.AGAIN) lapses += 1;
  } else {
    // Repaso subsecuente
    const r = getRetrievability(elapsedDays, current.stability);
    newD = nextDifficulty(current.difficulty, rating);

    if (rating === RATINGS.AGAIN) {
      newS = nextForgetStability(newD, current.stability, r);
      lapses += 1;
      nextState = "relearning";
    } else {
      newS = nextRecallStability(newD, current.stability, r, rating);
      nextState = "review";
    }
  }

  // Calcular el intervalo en días
  let intervalDays = rating === RATINGS.AGAIN ? 0 : calculateInterval(newS, TARGET_RETENTION);

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + intervalDays);

  const reviewLog = {
    date: now.toISOString(),
    rating,
    responseTimeMs,
    elapsedDays: Number(elapsedDays.toFixed(2)),
    scheduledDays: intervalDays,
    stability: newS,
    difficulty: newD,
    state: nextState
  };

  const updatedHistory = [...(current.review_history || []), reviewLog];

  return {
    ...current,
    stability: newS,
    difficulty: newD,
    reps,
    lapses,
    state: nextState,
    due: dueDate.toISOString(),
    last_review: now.toISOString(),
    intervalDays,
    lastResponseTimeMs: responseTimeMs,
    review_history: updatedHistory
  };
}

/**
 * Exporta tarjetas al formato oficial TSV de Anki
 */
export function exportCardsToAnkiTSV(cards = []) {
  let tsv = "#separator:tab\n#html:true\n#tags column:3\n";
  cards.forEach(card => {
    const front = (card.front || "").replace(/\t/g, " ").replace(/\n/g, "<br>");
    const back = (card.back || "").replace(/\t/g, " ").replace(/\n/g, "<br>");
    const tags = Array.isArray(card.tags) ? card.tags.join(" ") : (card.tags || "ENARMCITO");
    tsv += `${front}\t${back}\t${tags}\n`;
  });
  return tsv;
}
