// src/services/telemetryEngine.js
// Motor psicométrico para telemetría, clasificación de cuadrantes y reporte para Gemini

export const PIVOT_CONCEPTS = {
  Estudio_Inicial: "Estudio Inicial / Elección",
  Gold_Standard: "Estándar de Oro (Gold Standard)",
  Primera_Linea_Tx: "Primera Línea de Tratamiento",
  Tx_Alergicos_Especial: "Tx Especial / Comorbilidad / Alérgicos",
  Escala_Severidad: "Escalas y Severidad Pronóstica",
  Meta_Referencia: "Metas de Control y Criterios de Referencia"
};

export const ERROR_TAGS = {
  OlvidoPuro: "#Error::Conocimiento::OlvidoPuro",
  Razonamiento: "#Error::Cognitivo::Razonamiento",
  Distractor: "#Error::Cognitivo::Distractor",
  FaltaAtencion: "#Error::FaltaAtencion"
};

export const AI_ACTIONS = {
  ExplicarAlgoritmo: "🚩 Explicar Fisiopatología / Algoritmo",
  TablaComparativa: "⚖️ Crear Tabla Comparativa vs. Distractor",
  GenerarAnki: "🗂️ Generar Flashcard Anki"
};

/**
 * Determina el cuadrante metacognitivo basado en acierto y confianza
 */
export function getMetacognitiveQuadrant(isCorrect, confidence) {
  if (!isCorrect && confidence === "ALTA") {
    return {
      id: "hipercorreccion",
      name: "Alerta Roja: Hipercorrección Crítica",
      priority: 1,
      badgeColor: "bg-red-500/20 text-red-400 border-red-500/40",
      description: "Tenías un falso concepto arraigado. Requiere máxima prioridad de corrección."
    };
  }
  if (!isCorrect && confidence === "BAJA") {
    return {
      id: "laguna",
      name: "Laguna Teórica Real",
      priority: 2,
      badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/40",
      description: "Reconoces que desconocías el dato. Requiere lectura focalizada en GPC."
    };
  }
  if (isCorrect && confidence === "BAJA") {
    return {
      id: "fragil",
      name: "Acierto Frágil (Falso Positivo)",
      priority: 3,
      badgeColor: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
      description: "Acertaste con duda o por descarte. Requiere tarjeta Anki para consolidar."
    };
  }
  return {
    id: "dominio",
    name: "Dominio Consolidado",
    priority: 4,
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    description: "Dominas este concepto con alta seguridad. Puedes omitir su relectura."
  };
}

/**
 * Calcula estadísticas completas de la sesión de Pre-Test
 */
export function computeSessionStats(topicData, userAnswers) {
  const questions = topicData.questions || [];
  const total = questions.length;
  let correctCount = 0;
  let highConfidenceCorrect = 0;
  let totalSeconds = 0;

  const pivotStats = {};
  Object.keys(PIVOT_CONCEPTS).forEach(k => {
    pivotStats[k] = { total: 0, correct: 0, highCorrect: 0 };
  });

  const errorCounts = {
    [ERROR_TAGS.OlvidoPuro]: 0,
    [ERROR_TAGS.Razonamiento]: 0,
    [ERROR_TAGS.Distractor]: 0,
    [ERROR_TAGS.FaltaAtencion]: 0
  };

  const detailedItems = questions.map((q, idx) => {
    const ans = userAnswers[q.id] || {
      selectedOption: null,
      confidence: "BAJA",
      struckOptions: [],
      timeSeconds: 0,
      errorType: null,
      aiActions: []
    };

    const isCorrect = ans.selectedOption === q.correctAnswer;
    if (isCorrect) correctCount++;
    if (isCorrect && ans.confidence === "ALTA") highConfidenceCorrect++;

    totalSeconds += ans.timeSeconds || 0;

    const pivotKey = q.concepto_pivote || "Estudio_Inicial";
    if (pivotStats[pivotKey]) {
      pivotStats[pivotKey].total++;
      if (isCorrect) pivotStats[pivotKey].correct++;
      if (isCorrect && ans.confidence === "ALTA") pivotStats[pivotKey].highCorrect++;
    }

    if (ans.errorType && errorCounts[ans.errorType] !== undefined) {
      errorCounts[ans.errorType]++;
    }

    const quadrant = getMetacognitiveQuadrant(isCorrect, ans.confidence);
    const struckCorrect = ans.struckOptions?.includes(q.correctAnswer);

    return {
      index: idx + 1,
      question: q,
      answer: ans,
      isCorrect,
      quadrant,
      struckCorrect
    };
  });

  const grossScorePercent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const realScorePercent = total > 0 ? Math.round((highConfidenceCorrect / total) * 100) : 0;
  const avgSecondsPerQ = total > 0 ? Math.round(totalSeconds / total) : 0;

  return {
    total,
    correctCount,
    highConfidenceCorrect,
    grossScorePercent,
    realScorePercent,
    totalSeconds,
    avgSecondsPerQ,
    pivotStats,
    errorCounts,
    detailedItems
  };
}

/**
 * Genera el informe Markdown exacto estructurado para copiar y pegar en Gemini
 */
export function generateGeminiReportMarkdown(topicData, stats) {
  const dateStr = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
  const totalMin = Math.floor(stats.totalSeconds / 60);
  const totalSec = stats.totalSeconds % 60;

  let md = `# REPORTE DE TELEMETRÍA PRE-TEST ENARM\n`;
  md += `- **Tema:** ${topicData.id || "Tema"} - ${topicData.title || "Clínica"} (${topicData.normativa_origen || "GPC CENETEC"})\n`;
  md += `- **Fecha:** ${dateStr} | **Tiempo Total:** ${totalMin} min ${totalSec} seg (Promedio: ${stats.avgSecondsPerQ} seg/pregunta)\n`;
  md += `- **Calificación Bruta:** ${stats.correctCount}/${stats.total} (${stats.grossScorePercent}%)\n`;
  md += `- **Calificación Real (Solo Aciertos con Confianza Alta):** ${stats.highConfidenceCorrect}/${stats.total} (${stats.realScorePercent}%)\n\n`;

  md += `## 1. ESTADÍSTICA POR CONCEPTO PIVOTE\n`;
  Object.keys(PIVOT_CONCEPTS).forEach(k => {
    const s = stats.pivotStats[k];
    if (s && s.total > 0) {
      const pct = Math.round((s.correct / s.total) * 100);
      let status = "Dominado";
      if (pct === 0) status = "CRÍTICO";
      else if (pct < 100) status = "Débil";
      md += `- ${PIVOT_CONCEPTS[k]}: ${s.correct}/${s.total} (${pct}%) - ${status}\n`;
    }
  });
  md += `\n`;

  const totalErrors = stats.total - stats.correctCount;
  md += `## 2. ESTADÍSTICA POR TIPO DE ERROR COGNITIVO\n`;
  if (totalErrors === 0) {
    md += `- Sin errores registrados en esta sesión.\n\n`;
  } else {
    Object.keys(ERROR_TAGS).forEach(k => {
      const tag = ERROR_TAGS[k];
      const count = stats.errorCounts[tag] || 0;
      const pct = totalErrors > 0 ? Math.round((count / totalErrors) * 100) : 0;
      md += `- \`${tag}\`: ${count} fallos (${pct}%)\n`;
    });
    md += `\n`;
  }

  md += `## 3. DESGLOSE DE REACTIVOS CRÍTICOS (PARA INTERVENCIÓN DE LA IA)\n\n`;

  // Prioridad 1: Hipercorrección (Fallo + Alta Confianza)
  const p1 = stats.detailedItems.filter(item => item.quadrant.priority === 1);
  md += `### [PRIORIDAD 1: ERRORES DE ALTA CONFIANZA - HIPERCORRECCIÓN]\n`;
  if (p1.length === 0) {
    md += `* Ninguno. No tuviste falsos conceptos arraigados.\n\n`;
  } else {
    p1.forEach(item => {
      md += `* **Pregunta ${item.index} (Pivote: ${PIVOT_CONCEPTS[item.question.concepto_pivote] || item.question.concepto_pivote} | Tiempo: ${item.answer.timeSeconds || 0}s):**\n`;
      md += `  - Viñeta: ${item.question.vignette.slice(0, 140)}...\n`;
      md += `  - Elegí: ${item.answer.selectedOption} (${item.question.options[item.answer.selectedOption]}) [Confianza: ALTA] | Correcta: ${item.question.correctAnswer} (${item.question.options[item.question.correctAnswer]})\n`;
      if (item.struckCorrect) {
        md += `  - ⚠️ Distractores tachados: Taché la respuesta correcta por error.\n`;
      }
      if (item.answer.errorType) {
        md += `  - Mi autodiagnóstico: \`${item.answer.errorType}\`\n`;
      }
      if (item.answer.aiActions?.length > 0) {
        md += `  - Acción solicitada a la IA: ${item.answer.aiActions.join(" + ")}\n`;
      }
      md += `\n`;
    });
  }

  // Prioridad 2: Lagunas Teóricas (Fallo + Baja Confianza)
  const p2 = stats.detailedItems.filter(item => item.quadrant.priority === 2);
  md += `### [PRIORIDAD 2: ERRORES DE BAJA CONFIANZA - LAGUNAS TEÓRICAS]\n`;
  if (p2.length === 0) {
    md += `* Ninguno.\n\n`;
  } else {
    p2.forEach(item => {
      md += `* **Pregunta ${item.index} (Pivote: ${PIVOT_CONCEPTS[item.question.concepto_pivote] || item.question.concepto_pivote} | Tiempo: ${item.answer.timeSeconds || 0}s):**\n`;
      md += `  - Elegí: ${item.answer.selectedOption} [Confianza: BAJA] | Correcta: ${item.question.correctAnswer}\n`;
      if (item.answer.errorType) {
        md += `  - Mi autodiagnóstico: \`${item.answer.errorType}\`\n`;
      }
      if (item.answer.aiActions?.length > 0) {
        md += `  - Acción solicitada a la IA: ${item.answer.aiActions.join(" + ")}\n`;
      }
      md += `\n`;
    });
  }

  // Prioridad 3: Aciertos Frágiles (Acierto + Baja Confianza)
  const p3 = stats.detailedItems.filter(item => item.quadrant.priority === 3);
  md += `### [PRIORIDAD 3: ACIERTOS FRÁGILES CON CONFIANZA BAJA]\n`;
  if (p3.length === 0) {
    md += `* Ninguno.\n\n`;
  } else {
    p3.forEach(item => {
      md += `* **Pregunta ${item.index} (Pivote: ${PIVOT_CONCEPTS[item.question.concepto_pivote] || item.question.concepto_pivote}):** Acerté la opción ${item.question.correctAnswer}, pero marqué \`[ ❓ Confianza BAJA ]\`. Requiere tarjeta Anki para fijar el conocimiento.\n`;
    });
    md += `\n`;
  }

  md += `---\n`;
  md += `## INSTRUCCIÓN AUTOMÁTICA PARA LA IA RECEPTORA (TUTOR ENARM):\n\n`;
  md += `### [PROTOCOLO 0: AUTO-CHECK DE INTEGRIDAD CLÍNICA Y NORMATIVA MEXICANA]\n`;
  md += `Antes de emitir cualquier retroalimentación, debes ejecutar un auto-chequeo reflexivo y explícito:\n`;
  md += `1. **Supremacía Normativa GPC/NOM:** Valida que tus justificaciones correspondan estrictamente a los algoritmos y cuadros de la **Guía de Práctica Clínica mexicana (CENETEC / IMSS / ISSSTE / SSA)** y Normas Oficiales Mexicanas vigentes. Si una guía internacional (ADA, AHA, ESC) sugiere otra conducta, DEBES priorizar la norma mexicana oficial.\n`;
  md += `2. **Auditoría de Sesgo Cognitivo:** Identifica si el alumno cayó en un distractor de escalón (estudio inicial vs gold standard) o en un distractor por contraindicación/comorbilidad, explicitando el dato de la viñeta que lo detonó.\n`;
  md += `3. **Verificación de Errores Alucinatorios:** Confirma que las dosis, escalas y cifras de referencia numéricas coincidan con la GPC antes de redactar las tarjetas Anki.\n\n`;
  md += `### [PLAN DE INTERVENCIÓN DIRIGIDA]:\n`;
  md += `Con base en la telemetría previa y el Auto-Check, entrégame:\n`;
  md += `1. **Intervención de Hipercorrección:** Corrige de forma directa y contundente mis Errores de Alta Confianza explicando por qué mi razonamiento fue erróneo según la GPC.\n`;
  md += `2. **Ejecución de Botones Solicitados:** Genera las tablas comparativas y explicaciones de algoritmos donde marqué \`[ ⚖️ ]\` y \`[ 🚩 ]\`.\n`;
  md += `3. **Guía de Lectura Dirigida (60 min):** Dime exactamente qué apartados de la GPC debo leer hoy (los pivotes donde saqué 0% y 50%) y qué apartados puedo saltar por tener 100% con Confianza Alta.\n`;
  md += `4. **Borrador de Tarjetas Anki:** Genera en formato TSV las tarjetas correspondientes a las preguntas donde activé el botón \`[ 🗂️ Generar Flashcard Anki ]\`.\n`;

  return md;
}
