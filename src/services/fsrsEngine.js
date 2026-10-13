// src/services/fsrsEngine.js
// Implementación Fidedigna y Rigurosa del Algoritmo FSRS-5 (Free Spaced Repetition Scheduler)
// Basado en el estándar oficial open-spaced-repetition (ts-fsrs / fsrs-rs / Anki 24.10)
// Configurado con la meta oficial de retención clínica para el ENARM (Target Retention: 90%)

export const RATINGS = {
  AGAIN: 1,
  HARD: 2,
  GOOD: 3,
  EASY: 4
};

export const CARD_STATES = {
  NEW: "new",
  LEARNING: "learning",
  REVIEW: "review",
  RELEARNING: "relearning"
};

/**
 * 19 Parámetros (Pesos Oficiales) de FSRS-5 (Anki / open-spaced-repetition)
 * w0..w3: Estabilidad inicial según calificación (Again, Hard, Good, Easy)
 * w4: Dificultad base inicial
 * w5: Factor de escalamiento de dificultad inicial
 * w6: Sensibilidad de ajuste de dificultad por calificación
 * w7: Tasa de regresión a la media (Mean reversion)
 * w8..w10: Parámetros del factor de incremento de estabilidad tras recuerdo exitoso
 * w11..w14: Parámetros de estabilidad tras olvido (Lapse/Again)
 * w15: Modificador de estabilidad para calificación Hard (Penalización)
 * w16: Modificador de estabilidad para calificación Easy (Bono)
 * w17..w18: Parámetros para estabilidad a corto plazo / mismo día (Short-term stability)
 */
export const DEFAULT_FSRS_WEIGHTS = [
  0.4072, 1.1829, 3.1262, 15.4722, // w0-w3: Initial stability (Again, Hard, Good, Easy)
  7.2102, 0.5316, 1.0651, 0.0234,   // w4-w7: Difficulty initial & mean reversion
  1.6160, 0.1544, 1.0824,           // w8-w10: Stability recall factor
  1.9813, 0.0953, 0.2975,           // w11-w13: Stability forget factor
  2.2042,                           // w14: Forget decay factor
  0.2407,                           // w15: Hard penalty factor
  2.9466,                           // w16: Easy bonus factor
  0.5034, 0.6567                    // w17-w18: Short-term / same-day stability
];

// 90% de probabilidad de recuerdo deseada para el ENARM
export const TARGET_RETENTION = 0.90; 

// Factor de decaimiento estándar FSRS: factor = 19 / 81 = 0.2345679...
export const DECAY_FACTOR = 19 / 81; 
export const POWER = 0.5;

// Límites de seguridad clínica
export const MAXIMUM_INTERVAL = 36500; // 100 años límite superior
export const MINIMUM_INTERVAL = 1;     // 1 día para tarjetas graduadas

export const INITIAL_CARD_STATE = {
  stability: 0,
  difficulty: 0,
  reps: 0,
  lapses: 0,
  state: CARD_STATES.NEW,
  due: new Date().toISOString(),
  last_review: null,
  review_history: []
};

/**
 * 1. Curva del Olvido y Probabilidad de Recuerdo (Retrievability)
 * R(t, S) = (1 + factor * t / S)^(-power)
 */
export function getRetrievability(elapsedDays, stability) {
  if (stability <= 0) return 0;
  if (elapsedDays <= 0) return 1.0;
  return Math.pow(1 + (DECAY_FACTOR * elapsedDays) / stability, -POWER);
}

/**
 * 2. Cálculo del Intervalo para la Retención Deseada
 * I(r, S) = (S / factor) * (r^(-1/power) - 1)
 */
export function calculateInterval(stability, requestRetention = TARGET_RETENTION, enableFuzz = true) {
  if (stability <= 0) return 0;
  const rawInterval = (stability / DECAY_FACTOR) * (Math.pow(requestRetention, -1 / POWER) - 1);
  let ivl = Math.max(MINIMUM_INTERVAL, Math.round(rawInterval));
  
  if (enableFuzz && ivl >= 3) {
    ivl = applyFuzz(ivl);
  }

  return Math.min(ivl, MAXIMUM_INTERVAL);
}

/**
 * Fuzzing FSRS: Distribuye la carga de repasos para evitar aglomeraciones en un solo día
 */
function applyFuzz(interval) {
  const delta = Math.max(1, Math.round(interval * 0.05));
  const min = Math.max(MINIMUM_INTERVAL, interval - delta);
  const max = interval + delta;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Limita la dificultad estrictamente al rango [1.0, 10.0]
 */
function constrainDifficulty(d) {
  return Math.min(10, Math.max(1, Number(d.toFixed(2))));
}

/**
 * 3. Dificultad Inicial D0(G) para tarjetas nuevas
 * D0(G) = w4 - exp(w5 * (G - 1)) + 1
 */
export function initialDifficulty(rating, w = DEFAULT_FSRS_WEIGHTS) {
  const d = w[4] - Math.exp(w[5] * (rating - 1)) + 1;
  return constrainDifficulty(d);
}

/**
 * 4. Estabilidad Inicial S0(G) para tarjetas nuevas
 * S0(G) = w[G - 1]
 */
export function initialStability(rating, w = DEFAULT_FSRS_WEIGHTS) {
  const s = Math.max(0.1, w[rating - 1]);
  return Number(s.toFixed(2));
}

/**
 * 5. Actualización de Dificultad con Regresión a la Media (Mean Reversion)
 * D' = D - w6 * (G - 3)
 * D_final = w7 * D0(3) + (1 - w7) * D'
 */
export function nextDifficulty(currentD, rating, w = DEFAULT_FSRS_WEIGHTS) {
  const dDelta = currentD - w[6] * (rating - 3);
  const dBaseline = initialDifficulty(RATINGS.GOOD, w);
  const meanReverted = w[7] * dBaseline + (1 - w[7]) * dDelta;
  return constrainDifficulty(meanReverted);
}

/**
 * 6. Estabilidad tras Recuerdo Exitoso (Recall)
 * S'r = S * (1 + exp(w8) * (11 - D) * S^(-w9) * (exp((1 - R) * w10) - 1) * hardPenalty * easyBonus)
 */
export function nextRecallStability(d, s, r, rating, w = DEFAULT_FSRS_WEIGHTS) {
  const hardPenalty = rating === RATINGS.HARD ? w[15] : 1.0;
  const easyBonus = rating === RATINGS.EASY ? w[16] : 1.0;
  
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
 * 7. Estabilidad tras Olvido (Forget / Lapse)
 * S'f = w11 * D^(-w12) * ((S + 1)^w13 - 1) * exp((1 - R) * w14)
 */
export function nextForgetStability(d, s, r, w = DEFAULT_FSRS_WEIGHTS) {
  const newS = w[11] *
    Math.pow(d, -w[12]) *
    (Math.pow(s + 1, w[13]) - 1) *
    Math.exp((1 - r) * w[14]);

  return Math.max(0.1, Number(Math.min(s, newS).toFixed(2)));
}

/**
 * 8. Estabilidad a Corto Plazo / Mismo Día (Short-term Stability FSRS-5)
 * Utilizado cuando la tarjeta se repasa varias veces dentro del mismo día (t ≈ 0)
 * S' = S * exp(w17 * (G - 3 + w18))
 */
export function nextShortTermStability(s, rating, w = DEFAULT_FSRS_WEIGHTS) {
  let sinc = Math.exp(w[17] * (rating - 3 + w[18]));
  if (rating >= RATINGS.GOOD) {
    sinc = Math.max(sinc, 1.0);
  }
  return Math.max(0.1, Number((s * sinc).toFixed(2)));
}

/**
 * Proyecta los próximos intervalos en formato legible para los 4 botones
 */
export function getIntervalForecast(cardState) {
  const state = { ...INITIAL_CARD_STATE, ...cardState };
  
  if (state.reps === 0 || state.state === CARD_STATES.NEW) {
    return {
      [RATINGS.AGAIN]: "< 10 min",
      [RATINGS.HARD]: "1 día",
      [RATINGS.GOOD]: `${calculateInterval(initialStability(RATINGS.GOOD), TARGET_RETENTION, false)} días`,
      [RATINGS.EASY]: `${calculateInterval(initialStability(RATINGS.EASY), TARGET_RETENTION, false)} días`
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
    [RATINGS.HARD]: formatDays(calculateInterval(sHard, TARGET_RETENTION, false)),
    [RATINGS.GOOD]: formatDays(calculateInterval(sGood, TARGET_RETENTION, false)),
    [RATINGS.EASY]: formatDays(calculateInterval(sEasy, TARGET_RETENTION, false))
  };
}

/**
 * Programa la tarjeta y genera el registro de auditoría estilo Anki con soporte para mismo día
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

  if (current.reps === 0 || current.state === CARD_STATES.NEW) {
    // Tarjeta Nueva (New -> Learning o Review)
    newS = initialStability(rating);
    newD = initialDifficulty(rating);
    nextState = rating === RATINGS.AGAIN ? CARD_STATES.LEARNING : CARD_STATES.REVIEW;
    if (rating === RATINGS.AGAIN) lapses += 1;
  } else if (elapsedDays < 0.2 && current.state === CARD_STATES.LEARNING) {
    // Repaso en el mismo día / Fase de Aprendizaje corto (Short-term FSRS-5)
    newS = nextShortTermStability(current.stability, rating);
    newD = nextDifficulty(current.difficulty, rating);
    if (rating === RATINGS.AGAIN) {
      lapses += 1;
      nextState = CARD_STATES.LEARNING;
    } else {
      nextState = CARD_STATES.REVIEW;
    }
  } else {
    // Repaso estándar (Review / Relearning)
    const r = getRetrievability(elapsedDays, current.stability);
    newD = nextDifficulty(current.difficulty, rating);

    if (rating === RATINGS.AGAIN) {
      newS = nextForgetStability(newD, current.stability, r);
      lapses += 1;
      nextState = CARD_STATES.RELEARNING;
    } else {
      newS = nextRecallStability(newD, current.stability, r, rating);
      nextState = CARD_STATES.REVIEW;
    }
  }

  // Calcular el intervalo en días (Si es Again, repite hoy; si aprueba, calcula según FSRS)
  let intervalDays = rating === RATINGS.AGAIN ? 0 : calculateInterval(newS, TARGET_RETENTION, false);

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
