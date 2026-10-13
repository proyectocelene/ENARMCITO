// src/services/telemetryEngine.js
// Motor psicométrico integral para el Sistema Pre-Test ENARM:
// - Generador de Prompt Maestro para crear cuestionarios JSON bajo normativa GPC/NOM
// - Validador y normalizador de JSON de Pre-Test
// - Clasificación en los 4 Cuadrantes Metacognitivos
// - Telemetría de tachado de distractores e interferencia
// - Generador del Informe Estadístico Ultra-Detallado para IA receptora (Gemini / ChatGPT)

export const PIVOT_CONCEPTS = {
  Estudio_Inicial: "Estudio Inicial / Elección",
  Gold_Standard: "Estándar de Oro (Gold Standard)",
  Primera_Linea_Tx: "Primera Línea Tx",
  Tx_Alergicos_Especial: "Tx Especial / Comorbilidad",
  Escala_Severidad: "Escalas y Severidad",
  Meta_Referencia: "Metas y Referencia"
};

export const COGNITIVE_LEVELS = {
  "1_Memoria_Directa": "1. Memoria Directa",
  "2_Interpretacion_Clinica": "2. Interpretación Clínica",
  "3_Decision_Compleja": "3. Decisión Compleja"
};

export const DISTRACTOR_ROLES = {
  Respuesta_Correcta: "1. Respuesta Correcta GPC",
  Distractor_Escalon: "2. Distractor de Escalón (Inicial vs. Oro)",
  Distractor_Comorbilidad: "3. Distractor por Condición / Comorbilidad",
  Distractor_Espectro: "4. Distractor de Espectro Cercano"
};

export const ERROR_TAGS = {
  OlvidoPuro: "#Error::Conocimiento::OlvidoPuro",
  Razonamiento: "#Error::Cognitivo::Razonamiento",
  Distractor: "#Error::Cognitivo::Distractor",
  FaltaAtencion: "#Error::FaltaAtencion"
};

export const AI_ACTIONS = {
  ExplicarAlgoritmo: "[ 🚩 Explicar Fisiopatología / Algoritmo ]",
  TablaComparativa: "[ ⚖️ Crear Tabla Comparativa vs. Distractor ]",
  GenerarAnki: "[ 🗂️ Generar Flashcard Anki ]"
};

/**
 * Determina el cuadrante metacognitivo basado en acierto y nivel de confianza
 */
export function getMetacognitiveQuadrant(isCorrect, confidence) {
  if (!isCorrect && confidence === "ALTA") {
    return {
      id: "hipercorreccion",
      name: "1. Alerta Roja: Hipercorrección Crítica",
      verdictLabel: "❌ INCORRECTA CON CONFIANZA ALTA (Alerta de Hipercorrección)",
      priority: 1,
      badgeColor: "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/50",
      description: "Prioridad #1 Absoluta. Tenías un falso concepto arraigado. Genera máxima sorpresa cerebral y máxima retención al corregirse."
    };
  }
  if (!isCorrect && confidence === "BAJA") {
    return {
      id: "laguna",
      name: "2. Laguna Teórica Real",
      verdictLabel: "❌ INCORRECTA CON CONFIANZA BAJA (Laguna Teórica Real)",
      priority: 2,
      badgeColor: "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/50",
      description: "Prioridad #2. Reconoces que no sabes el dato. Requiere lectura focalizada de ese apartado en la GPC."
    };
  }
  if (isCorrect && confidence === "BAJA") {
    return {
      id: "fragil",
      name: "3. Falso Positivo (Acierto Frágil)",
      verdictLabel: "⚠️ CORRECTA CON CONFIANZA BAJA (Falso Positivo / Acierto Frágil)",
      priority: 3,
      badgeColor: "bg-yellow-500/20 text-yellow-800 dark:text-yellow-300 border-yellow-500/50",
      description: "Prioridad #3. Acertaste por descarte o suerte. Conocimiento inestable que requiere tarjeta de Anki."
    };
  }
  return {
    id: "dominio",
    name: "4. Dominio Consolidado",
    verdictLabel: "✅ CORRECTA CON CONFIANZA ALTA (Dominio Consolidado)",
    priority: 4,
    badgeColor: "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/50",
    description: "Prioridad #4 (Omitir en lectura). Ya dominas este pivote; no pierdas tiempo releyéndolo en la GPC."
  };
}

/**
 * Calcula estadísticas completas de la sesión de Pre-Test
 */
export function computeSessionStats(topicData, userAnswers) {
  const questions = topicData?.questions || [];
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
    if (!pivotStats[pivotKey]) {
      pivotStats[pivotKey] = { total: 0, correct: 0, highCorrect: 0 };
    }
    pivotStats[pivotKey].total++;
    if (isCorrect) pivotStats[pivotKey].correct++;
    if (isCorrect && ans.confidence === "ALTA") pivotStats[pivotKey].highCorrect++;

    if (ans.errorType && errorCounts[ans.errorType] !== undefined) {
      errorCounts[ans.errorType]++;
    }

    const quadrant = getMetacognitiveQuadrant(isCorrect, ans.confidence);
    const struckOptions = ans.struckOptions || [];
    const struckCorrect = struckOptions.includes(q.correctAnswer);

    // Detectar interferencia de distractor: contra qué opción(es) dudó (las que NO tachó y NO eligió)
    const allKeys = Object.keys(q.options || { A: "", B: "", C: "", D: "" });
    const remainingCompetitors = allKeys.filter(
      k => k !== ans.selectedOption && !struckOptions.includes(k)
    );
    const doubtedBetween = remainingCompetitors.length === 1 ? remainingCompetitors[0] : null;

    return {
      index: q.index || idx + 1,
      question: q,
      answer: ans,
      isCorrect,
      quadrant,
      struckCorrect,
      struckOptions,
      doubtedBetween
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
 * Genera el informe Markdown exacto estructurado para copiar y pegar en Gemini / IA
 * Cumple 100% con la Especificación Técnica y Psicométrica (Sección 5.B + Protocolo 0)
 */
export function generateGeminiReportMarkdown(topicData, stats) {
  const dateStr = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
  const totalMin = Math.floor(stats.totalSeconds / 60);
  const totalSec = stats.totalSeconds % 60;

  const topicLabel = topicData.id || topicData.code || "Tema";
  const topicTitle = topicData.title ? ` - ${topicData.title}` : "";
  const normativa = topicData.normativa_origen || "GPC CENETEC / NOM Oficial";

  let md = `# REPORTE DE TELEMETRÍA PRE-TEST ENARM\n`;
  md += `- **Tema:** ${topicLabel}${topicTitle} (${normativa})\n`;
  md += `- **Fecha:** ${dateStr} | **Tiempo Total:** ${totalMin} min ${totalSec} seg (Promedio: ${stats.avgSecondsPerQ} seg/pregunta)\n`;
  md += `- **Calificación Bruta:** ${stats.correctCount}/${stats.total} (${stats.grossScorePercent}%) | **Calificación Real (Solo Aciertos con Confianza Alta):** ${stats.highConfidenceCorrect}/${stats.total} (${stats.realScorePercent}%)\n\n`;

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

  // Helper para obtener la opción contra la que dudó
  const getDoubtedOpt = (item) => {
    if (Array.isArray(item.doubtedBetween)) {
      return item.doubtedBetween.find(opt => opt !== item.answer?.selectedOption) || null;
    }
    return typeof item.doubtedBetween === "string" ? item.doubtedBetween : null;
  };

  // Prioridad 1: Hipercorrección (Fallo + Alta Confianza)
  const p1 = stats.detailedItems.filter(item => item.quadrant.priority === 1);
  md += `### [PRIORIDAD 1: ERRORES DE ALTA CONFIANZA - HIPERCORRECCIÓN]\n`;
  if (p1.length === 0) {
    md += `* Ninguno. No tuviste falsos conceptos arraigados.\n\n`;
  } else {
    p1.forEach(item => {
      const q = item.question;
      const ans = item.answer;
      const chosenText = q.options?.[ans.selectedOption] || "";
      const correctText = q.options?.[q.correctAnswer] || "";
      const doubtedOpt = getDoubtedOpt(item);
      const roleTrap = q.distractor_roles?.[ans.selectedOption] ? ` | Rol Trampa: ${q.distractor_roles[ans.selectedOption]}` : "";

      md += `* **Pregunta ${item.index} (Pivote: ${PIVOT_CONCEPTS[q.concepto_pivote] || q.concepto_pivote} | Tiempo: ${ans.timeSeconds || 0}s):**\n`;
      md += `  - Caso: ${q.vignette}\n`;
      if (q.question_text) {
        md += `  - Pregunta: ${q.question_text}\n`;
      }
      if (q.dato_pivote_oculto) {
        md += `  - Dato Pivote Oculto: ${q.dato_pivote_oculto}\n`;
      }
      md += `  - Elegí: ${ans.selectedOption} (${chosenText}) [Confianza: ALTA${roleTrap}] | Correcta: ${q.correctAnswer} (${correctText})\n`;
      if (doubtedOpt && q.options?.[doubtedOpt]) {
        md += `  - Dudé contra la opción: ${doubtedOpt} (${q.options[doubtedOpt]})\n`;
      }
      if (item.struckCorrect) {
        md += `  - Distractores que taché por error: Taché la ${q.correctAnswer} (Taché la respuesta correcta por error).\n`;
      } else if (item.struckOptions?.length > 0) {
        md += `  - Distractores que taché: ${item.struckOptions.join(", ")}\n`;
      }
      if (q.justificacion_gpc) {
        md += `  - Criterio GPC Oficial: ${q.justificacion_gpc}\n`;
      }
      md += `  - Mi autodiagnóstico: \`${ans.errorType || "Pendiente de clasificar"}\`\n`;
      if (ans.aiActions?.length > 0) {
        md += `  - Acción solicitada a la IA: ${ans.aiActions.map(a => `\`${a}\``).join(" + ")}\n`;
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
      const q = item.question;
      const ans = item.answer;
      const chosenText = q.options?.[ans.selectedOption] || "";
      const correctText = q.options?.[q.correctAnswer] || "";
      const doubtedOpt = getDoubtedOpt(item);
      const roleTrap = q.distractor_roles?.[ans.selectedOption] ? ` | Rol Trampa: ${q.distractor_roles[ans.selectedOption]}` : "";

      md += `* **Pregunta ${item.index} (Pivote: ${PIVOT_CONCEPTS[q.concepto_pivote] || q.concepto_pivote} | Tiempo: ${ans.timeSeconds || 0}s):**\n`;
      md += `  - Caso: ${q.vignette}\n`;
      if (q.question_text) {
        md += `  - Pregunta: ${q.question_text}\n`;
      }
      if (q.dato_pivote_oculto) {
        md += `  - Dato Pivote Oculto: ${q.dato_pivote_oculto}\n`;
      }
      md += `  - Elegí: ${ans.selectedOption} (${chosenText}) [Confianza: BAJA${roleTrap}] | Correcta: ${q.correctAnswer} (${correctText})\n`;
      if (doubtedOpt && q.options?.[doubtedOpt]) {
        md += `  - Dudé contra la opción: ${doubtedOpt} (${q.options[doubtedOpt]})\n`;
      }
      if (item.struckCorrect) {
        md += `  - Distractores que taché por error: Taché la ${q.correctAnswer} (Taché la respuesta correcta por error).\n`;
      } else if (item.struckOptions?.length > 0) {
        md += `  - Distractores que taché: ${item.struckOptions.join(", ")}\n`;
      }
      if (q.justificacion_gpc) {
        md += `  - Criterio GPC Oficial: ${q.justificacion_gpc}\n`;
      }
      md += `  - Mi autodiagnóstico: \`${ans.errorType || "Pendiente de clasificar"}\`\n`;
      if (ans.aiActions?.length > 0) {
        md += `  - Acción solicitada a la IA: ${ans.aiActions.map(a => `\`${a}\``).join(" + ")}\n`;
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
      const q = item.question;
      const ans = item.answer;
      const correctText = q.options?.[q.correctAnswer] || "";
      const doubtedOpt = getDoubtedOpt(item);
      let doubtText = "";
      if (doubtedOpt && q.options?.[doubtedOpt]) {
        doubtText = ` Dudé contra la opción ${doubtedOpt} (${q.options[doubtedOpt]}).`;
      }
      md += `* **Pregunta ${item.index} (Pivote: ${PIVOT_CONCEPTS[q.concepto_pivote] || q.concepto_pivote} | Tiempo: ${ans.timeSeconds || 0}s):** Acerté la opción ${q.correctAnswer} (${correctText}), pero marqué \`[ ❓ Confianza BAJA ]\`.${doubtText}\n`;
      md += `  - Caso: ${q.vignette}\n`;
      if (q.question_text) {
        md += `  - Pregunta: ${q.question_text}\n`;
      }
      if (q.dato_pivote_oculto) {
        md += `  - Dato Pivote Oculto: ${q.dato_pivote_oculto}\n`;
      }
      if (ans.errorType) {
        md += `  - Motivo de mi duda: \`${ans.errorType}\`\n`;
      }
      if (ans.aiActions?.length > 0) {
        md += `  - Acción solicitada a la IA: ${ans.aiActions.map(a => `\`${a}\``).join(" + ")}\n`;
      }
      md += `\n`;
    });
  }

  md += `---\n`;
  md += `## INSTRUCCIÓN AUTOMÁTICA PARA LA IA RECEPTORA (TUTOR ENARM):\n\n`;
  md += `### [PROTOCOLO 0: AUTO-CHECK DE INTEGRIDAD CLÍNICA Y NORMATIVA MEXICANA]\n`;
  md += `Antes de emitir cualquier retroalimentación, debes ejecutar un auto-chequeo reflexivo y explícito:\n`;
  md += `1. **Supremacía Normativa GPC/NOM:** Valida que tus justificaciones correspondan estrictamente a los algoritmos y cuadros de la **Guía de Práctica Clínica mexicana (${normativa} / CENETEC / IMSS / ISSSTE / SSA)** y Normas Oficiales Mexicanas vigentes. Si una guía internacional (ADA, AHA, ESC, IDSA) sugiere otra conducta, DEBES priorizar la norma mexicana oficial.\n`;
  md += `2. **Auditoría de Sesgo Cognitivo:** Identifica si el alumno cayó en un distractor de escalón (estudio inicial vs gold standard), comorbilidad o espectro cercano, explicitando el dato pivote de la viñeta que lo detonó.\n`;
  md += `3. **Verificación de Errores Alucinatorios y Ortografía UTF-8:** Confirma que las dosis, escalas y cifras de referencia numéricas coincidan con la GPC y escribe toda la respuesta con ortografía médica impecable (con todos los acentos y la letra \`ñ\`).\n\n`;
  md += `### [PLAN DE INTERVENCIÓN DIRIGIDA]:\n`;
  md += `Actúa como mi tutor personal del ENARM. Con base en la telemetría anterior, entrégame de forma estructurada antes de iniciar mi bloque de estudio:\n`;
  md += `1. **Intervención de Hipercorrección (Prioridad 1):** Corrige de forma directa y contundente mis Errores de Alta Confianza explicando por qué mi razonamiento fue erróneo, por qué caí en ese distractor y cuál es la regla de oro según la normativa mexicana.\n`;
  md += `2. **Ejecución de Botones Solicitados (Algoritmos y Tablas):** Desarrolla las explicaciones paso a paso y las tablas comparativas donde marqué \`[ ⚖️ ]\` y \`[ 🚩 ]\` (o para mis errores de Prioridad 1 y 2 si no marqué botones individuales), comparando directamente la opción que elegí/dudé contra la respuesta correcta.\n`;
  md += `3. **Guía de Estudio Sintética de Alto Rendimiento (Manuales Dr. Re & Dr. Prieto):** No nos envíes a leer la GPC completa de 100 páginas porque es una pérdida de tiempo. En su lugar, indícanos qué perlas y conceptos clave debemos buscar directamente en nuestros manuales de alta síntesis para el ENARM (**Manual Dr. Re** y **Manual Dr. Prieto**) para los pivotes que salieron en 0% CRÍTICO o <100% Débil. Si hay un algoritmo, dosis o criterio oficial de la GPC (${normativa}) clave para el ENARM, entréganoslo sintetizado directamente en una perla clínica o tabla comparativa de alto rendimiento.\n`;
  md += `4. **Borrador de Tarjetas Anki FSRS (Formato TSV Listo para Copiar):** Genera en un bloque de código \`tsv\` (formato exacto: \`Frente\tReverso\tEtiquetas\` separado por tabuladores reales, una tarjeta por línea) las flashcards correspondientes a las preguntas donde activé \`[ 🗂️ Generar Flashcard Anki ]\` (o 1 tarjeta por cada reactivo de Prioridad 1, 2 y 3 si no seleccioné botones individuales), listas para pegarlas en el importador Anki FSRS de ENARMCITO.\n`;

  return md;
}

/**
 * Genera el Prompt Maestro exacto para que el usuario lo pegue en su Chatbot (Gemini / ChatGPT / NotebookLM)
 * y obtenga el JSON del Pre-Test cumpliendo toda la Especificación Técnica y Psicométrica.
 */
export function generatePretestPromptForChatbot(topic = {}) {
  const code = topic.code || "D01";
  const title = topic.title || "Diabetes Mellitus Tipo 2, CAD y EHH";
  const specialty = topic.specialty || "MI";
  const normativa = topic.normativa_origen || "GPC IMSS-718-18 / NOM-015";

  return `Actúa como el Comité Académico Elaborador de Reactivos del CIFRHS para el ENARM y experto en Guías de Práctica Clínica (GPC CENETEC) y Normas Oficiales Mexicanas (NOM) vigentes.

Tu tarea es diseñar un **Cuestionario Pre-Test Psicométrico (Fase 0: Cebado Cognitivo / Pretesting Effect)** para el siguiente tema de nuestro calendario:
- **Código del Día:** ${code}
- **Especialidad Troncal:** ${specialty}
- **Tema Clínico:** ${title}
- **Normativa Oficial Mexicana Rectora:** ${normativa}

---
### 0. PROPÓSITO PSICOMÉTRICO Y METAS DEL PRE-TEST (LECTURA OBLIGATORIA PARA LA IA):
- **Meta Pedagógica (*Pretesting Effect*):** Este Pre-Test se resuelve ANTES de estudiar el tema. Su objetivo NO es hacer preguntas fáciles o superficiales, sino **activar esquemas mentales previos, exponer falsas creencias clínicas (hipercorrección) y generar curiosidad cognitiva basada en el error** para potenciar la codificación durante el estudio posterior.
- **Dificultad Real ENARM:** Cada caso debe obligar al médico a filtrar distractores clínicos dentro de la viñeta y discriminar entre opciones altamente plausibles mediante un **Dato Pivote Oculto** (una edad, semana de gestación, alergia, cifra de laboratorio o signo vital que cambia toda la conducta).
- **Enfoque de Estudio ENARM (Manuales Dr. Re & Dr. Prieto):** Los alumnos se preparan con manuales de alta síntesis para el ENARM (**Manual Dr. Re**, **Manual Dr. Prieto**, flashcards y resúmenes de alto rendimiento). Las preguntas deben evaluar las perlas diagnósticas, puntos de corte y algoritmos de primera línea que se preguntan en el ENARM real bajo la normativa mexicana (${normativa}). Evita minucias burocráticas o datos irrelevantes de la GPC; enfócate en el razonamiento clínico pivote, fármaco de elección, alternativas y metas terapéuticas exactas.
- **Uso de Fuentes:** Si te adjunto PDFs, resúmenes o manuales en este chat, extrae de ahí los algoritmos, puntos de corte, escalas y dosis exactas. Si no adjunto archivos, aplica con rigor absoluto la normativa mexicana vigente (**${normativa}**).

---
### 1. REGLA CRÍTICA DE REDACCIÓN Y ORTOGRAFÍA (UTF-8 ESPAÑOL DE MÉXICO):
- **PROHIBIDO OMITIR ACENTOS O LA LETRA "Ñ":** Todos los textos en español dentro del JSON DEBEN escribirse con **ortografía médica impecable en UTF-8**, incluyendo **todas las tildes (\`á, é, í, ó, ú\`), diéresis (\`ü\`), la letra \`ñ / Ñ\` (ej. *"años"*, *"niño"*, *"daño"*, *"acompañado"*) y signos de interrogación de apertura y cierre (\`¿ ... ?\`)**.
- **Sin Pistas Tipográficas:** "Sin pistas visuales" significa únicamente que NO debes usar negritas (\`**\`) ni cursivas dentro del campo \`"vignette"\` para no delatar la respuesta, pero **JAMÁS elimines los acentos ni sustituyas la \`ñ\` por \`n\`**.

---
### 2. ARQUITECTURA PSICOMÉTRICA Y CLÍNICA OBLIGATORIA:
1. **Volumen y Estructura (10 a 12 reactivos):**
   - Genera entre **10 y 12 preguntas** en total, diseñadas para resolverse en un bloque de 15 a 25 minutos.
   - Combina **al menos 2 casos clínicos seriados** (1 misma viñeta clínica con 2 o 3 preguntas encadenadas identificadas con el mismo \`"case_id"\`, ej. \`"CASO-1"\`) con casos clínicos individuales (\`"case_id": null\`).
   - **Transición Lingüística ENARM (Inglés):** Redacta exactamente **2 reactivos íntegramente en inglés médico** (\`"is_english": true\`), incluyendo viñeta, pregunta y las 4 opciones en inglés, pero cuya respuesta correcta y justificación se rijan estrictamente por la GPC/NOM mexicana.

2. **Cobertura Obligatoria de los 6 Conceptos Pivote (\`"concepto_pivote"\`):**
   Reparte las 10-12 preguntas cubriendo obligatoriamente estos 6 valores exactos en el campo \`"concepto_pivote"\` (al menos 1-2 reactivos por cada eje):
   - \`"Estudio_Inicial"\`: Primera prueba diagnóstica a solicitar por accesibilidad, rapidez o costo en 1er/2do nivel, aunque no sea la definitiva.
   - \`"Gold_Standard"\`: Prueba confirmatoria de mayor sensibilidad y especificidad (Estándar de Oro).
   - \`"Primera_Linea_Tx"\`: Fármaco (con dosis/esquema si aplica), maniobra o cirugía inicial de primera elección para un paciente estándar según GPC.
   - \`"Tx_Alergicos_Especial"\`: Esquema alternativo o de rescate obligatorio ante alergia a betalactámicos, embarazo, pediatría o comorbilidad/contraindicación (ej. TFG baja, hipokalemia, insuficiencia cardíaca).
   - \`"Escala_Severidad"\`: Puntajes pronósticos o clasificaciones de severidad que definen manejo ambulatorio, hospitalización, cirugía o UCI (ej. CURB-65, Alvarado, Hinchey, KDIGO, criterios de severidad CAD vs EHH).
   - \`"Meta_Referencia"\`: Cifras numéricas exactas que dictan el control terapéutico o los criterios de referencia oportuna a 2do o 3er nivel de atención.

3. **Nivel Cognitivo (\`"nivel_cognitivo"\`):**
   Usa uno de estos valores exactos (al menos 85% deben ser nivel 2 o 3):
   - \`"1_Memoria_Directa"\` (solo para cifras/puntos de corte críticos)
   - \`"2_Interpretacion_Clinica"\` (integrar viñeta para llegar al diagnóstico o estudio)
   - \`"3_Decision_Compleja"\` (elegir la mejor conducta terapéutica o de rescate ante comorbilidades/complicaciones)

4. **Anatomía de la Viñeta Clínica (*Illness Scripts*):**
   Cada \`"vignette"\` debe redactarse como un caso clínico realista estilo ENARM integrando:
   - **a) Condición facilitadora + Síntoma pivote:** Edad, sexo, ocupación/antecedentes epidemiológicos o semanas de gestación + motivo de consulta con tiempo de evolución.
   - **b) Fisiopatología / Hallazgos clínicos y paraclínicos:** Signos vitales completos (TA, FC, FR, Temp, SpO2), exploración física dirigida y resultados de laboratorio o gabinete con unidades (\`mg/dL\`, \`mEq/L\`, \`mm3\`), **incluyendo al menos 1 dato normal o distractor clínico** para obligar al médico a filtrar.
   - **c) Pregunta cerrada de acción médica (\`"question_text"\`):** Interrogante directa e inequívoca (ej. *"¿Cuál es el estudio diagnóstico inicial de elección?"*, *"¿Cuál es el paso terapéutico prioritario en este paciente?"*).

5. **Supremacía Normativa Mexicana e Ingeniería de las 4 Opciones (A, B, C, D):**
   - Prohibido usar "Todas las anteriores", "Ninguna de las anteriores" u opciones absurdas.
   - Si una guía extranjera (ADA, AHA, ESC, IDSA, ACOG) sugiere una conducta distinta a la GPC/NOM mexicana vigente, **la respuesta correcta DEBE ser la de la GPC/NOM mexicana** (y usa la guía extranjera como distractor explicándolo en la autopsia).
   - Las 4 opciones deben cumplir exactamente estos roles en \`"distractor_roles"\`:
     * \`"Respuesta_Correcta"\`: Conducta exacta dictada por la GPC/NOM para este paciente.
     * \`"Distractor_Escalon"\`: Opción verdadera para la enfermedad pero en otro escalón temporal (ej. poner el Gold Standard cuando se pide el Estudio Inicial, o 2da línea en lugar de 1ra línea).
     * \`"Distractor_Comorbilidad"\`: Tratamiento o estudio estándar que en este paciente específico está contraindicado por un detalle sutil de la viñeta (embarazo, edad, alergia, TFG, potasio, etc.).
     * \`"Distractor_Espectro"\`: Conducta de un diagnóstico diferencial muy parecido o recomendación de guía extranjera no adoptada por la GPC mexicana.

---
### 3. FORMATO DE SALIDA (ÚNICAMENTE JSON VÁLIDO):
Entrégame **ÚNICAMENTE** un bloque de código JSON válido (sin texto introductorio ni comentarios fuera del bloque JSON) con esta estructura exacta para pegarlo directamente en nuestra PWA ENARMCITO:

\`\`\`json
{
  "topic_code": "${code}",
  "title": "Pre-Test Psicométrico: ${title}",
  "normativa_origen": "${normativa}",
  "duration_minutes": 20,
  "questions": [
    {
      "id": "${code.toLowerCase()}_q1",
      "index": 1,
      "case_id": "CASO-1",
      "is_english": false,
      "especialidad_troncal": "${specialty}",
      "normativa_origen": "${normativa}",
      "concepto_pivote": "Estudio_Inicial",
      "nivel_cognitivo": "2_Interpretacion_Clinica",
      "vignette": "Hombre de 54 años que acude a consulta externa por presentar polidipsia, poliuria y pérdida ponderal involuntaria de 6 kg en los últimos 2 meses. Antecedente de padre con diabetes mellitus tipo 2. A la exploración física: peso 92 kg, talla 1.72 m (IMC 31.1 kg/m2), circunferencia abdominal 104 cm, TA 128/82 mmHg, FC 78 lpm, FR 16 rpm, acantosis nigricans en pliegues cervicales; cardiopulmonar sin compromiso. Trae resultado de glucosa plasmática en ayuno de 118 mg/dL, creatinina sérica de 0.9 mg/dL y examen general de orina sin glucosuria ni cetonuria.",
      "question_text": "¿Cuál es el estudio o conducta diagnóstica inicial indicada según la GPC mexicana?",
      "options": {
        "A": "Solicitar hemoglobina glucosilada (HbA1c) como único criterio confirmatorio inmediato",
        "B": "Realizar curva de tolerancia oral a la glucosa (CTOG) con carga de 75 g de glucosa anhidra",
        "C": "Iniciar metformina 850 mg cada 12 horas y citar en 6 meses",
        "D": "Determinación de anticuerpos anti-GAD65 y péptido C en ayuno"
      },
      "correctAnswer": "B",
      "dato_pivote_oculto": "Glucosa plasmática en ayuno de 118 mg/dL (rango de glucemia anormal en ayuno: 100 a 125 mg/dL) en paciente con obesidad y síntomas clínicos.",
      "justificacion_gpc": "De acuerdo con la ${normativa}, ante una glucosa plasmática en ayuno entre 100 y 125 mg/dL (prediabetes / intolerancia a la glucosa en ayuno), está indicado realizar una Curva de Tolerancia Oral a la Glucosa (CTOG) con 75 g de glucosa anhidra a las 2 horas (confirmando DM2 si es ≥ 200 mg/dL) o una segunda determinación para confirmar el diagnóstico antes de etiquetar o diferir el protocolo diagnóstico.",
      "distractor_roles": {
        "A": "Distractor_Escalon",
        "B": "Respuesta_Correcta",
        "C": "Distractor_Comorbilidad",
        "D": "Distractor_Espectro"
      },
      "distractor_autopsies": {
        "A": "[Distractor de Escalón]: Aunque la HbA1c ≥ 6.5% es un criterio diagnóstico válido en laboratorios certificados por la NGSP, en el algoritmo de tamizaje con glucosa en ayuno limítrofe (100-125 mg/dL) la prueba de mayor sensibilidad recomendada en la GPC/NOM para desenmascarar diabetes poscarga es la CTOG de 2 horas con 75 g.",
        "C": "[Distractor Terapéutico Prematuro]: Antes de iniciar tratamiento farmacológico a dosis plenas de diabetes o diferir la vigilancia a 6 meses en un paciente sintomático con pérdida de peso, es obligatorio completar el algoritmo diagnóstico confirmatorio.",
        "D": "[Distractor de Espectro Cercano]: Los anticuerpos anti-GAD65 y el péptido C se reservan para sospecha de diabetes autoinmune (DM1 o LADA en pacientes jóvenes delgados), no en un paciente de 54 años con IMC de 31.1 kg/m2 y acantosis nigricans."
      }
    }
  ]
}
\`\`\``;
}

/**
 * Parsea, limpia y valida un texto JSON pegado por el usuario desde el Chatbot
 * Soporta tanto `{ questions: [...] }` como un arreglo directo `[...]`
 */
export function parseAndValidatePretestJson(rawInput, defaultTopic = {}) {
  if (!rawInput || typeof rawInput !== "string") {
    throw new Error("El campo JSON está vacío.");
  }

  // Limpiar bloques markdown ```json ... ``` si el usuario los copió completos
  let cleaned = rawInput.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Formato JSON inválido: ${err.message}. Asegúrate de copiar el bloque JSON completo.`);
  }

  const rawQuestions = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.questions)
    ? parsed.questions
    : Array.isArray(parsed.pretest?.questions)
    ? parsed.pretest.questions
    : null;

  if (!rawQuestions || rawQuestions.length === 0) {
    throw new Error("El JSON no contiene un arreglo de preguntas ('questions') válido.");
  }

  const PIVOT_ALIASES = {
    Estudio_Inicial: "Estudio_Inicial",
    estudio_inicial: "Estudio_Inicial",
    Gold_Standard: "Gold_Standard",
    estandar_oro: "Gold_Standard",
    gold_standard: "Gold_Standard",
    Primera_Linea_Tx: "Primera_Linea_Tx",
    tratamiento_primera_linea: "Primera_Linea_Tx",
    primera_linea_tx: "Primera_Linea_Tx",
    Tx_Alergicos_Especial: "Tx_Alergicos_Especial",
    tratamiento_alternativo: "Tx_Alergicos_Especial",
    tx_alergicos_especial: "Tx_Alergicos_Especial",
    Escala_Severidad: "Escala_Severidad",
    escalas_pronosticas: "Escala_Severidad",
    escala_severidad: "Escala_Severidad",
    Meta_Referencia: "Meta_Referencia",
    metas_criterios_referencia: "Meta_Referencia",
    meta_referencia: "Meta_Referencia"
  };

  const validLevels = Object.keys(COGNITIVE_LEVELS);

  const normalizedQuestions = rawQuestions.map((q, idx) => {
    const qNum = idx + 1;
    const id = q.id || `${(defaultTopic.code || "d01").toLowerCase()}_q${qNum}`;
    const vignette = (q.vignette || q.vineta || q.viñeta || q.case || "").trim();
    const questionText = (q.question_text || q.question || q.pregunta || "¿Cuál es la conducta más adecuada?").trim();
    const options = q.options || q.opciones || {};

    if (!vignette) {
      throw new Error(`La pregunta #${qNum} no tiene viñeta clínica ('vignette').`);
    }
    if (!options.A || !options.B || !options.C || !options.D) {
      throw new Error(`La pregunta #${qNum} debe incluir las 4 opciones: A, B, C y D.`);
    }

    const correctAnswer = (q.correctAnswer || q.correct_answer || q.respuesta_correcta || "A").toUpperCase().trim();
    if (!["A", "B", "C", "D"].includes(correctAnswer)) {
      throw new Error(`La pregunta #${qNum} tiene una respuesta correcta inválida ('${correctAnswer}'). Debe ser A, B, C o D.`);
    }

    const rawPivot = (q.concepto_pivote || "").trim();
    const conceptoPivote = PIVOT_ALIASES[rawPivot] || PIVOT_ALIASES[rawPivot.toLowerCase()] || "Estudio_Inicial";

    const nivelCognitivo = validLevels.includes(q.nivel_cognitivo)
      ? q.nivel_cognitivo
      : q.nivel_cognitivo || "2_Interpretacion_Clinica";

    return {
      id,
      index: q.index || qNum,
      case_id: q.case_id || null,
      is_english: Boolean(q.is_english || q.idioma === "EN"),
      especialidad_troncal: q.especialidad_troncal || defaultTopic.specialty || "MI",
      normativa_origen: q.normativa_origen || defaultTopic.normativa_origen || "GPC CENETEC",
      concepto_pivote: conceptoPivote,
      nivel_cognitivo: nivelCognitivo,
      vignette,
      question_text: questionText,
      options: {
        A: String(options.A).trim(),
        B: String(options.B).trim(),
        C: String(options.C).trim(),
        D: String(options.D).trim()
      },
      correctAnswer,
      dato_pivote_oculto: q.dato_pivote_oculto || q.hidden_pivot || "",
      justificacion_gpc: q.justificacion_gpc || q.explanation || "",
      distractor_roles: q.distractor_roles || {},
      distractor_autopsies: q.distractor_autopsies || {}
    };
  });

  return {
    topic_code: parsed.topic_code || defaultTopic.code || null,
    title: parsed.title || defaultTopic.title || "Pre-Test Psicométrico",
    normativa_origen: parsed.normativa_origen || defaultTopic.normativa_origen || "GPC CENETEC",
    duration_minutes: parsed.duration_minutes || parsed.timeLimitMinutes || 20,
    questions: normalizedQuestions
  };
}

/**
 * Analiza la respuesta en Markdown generada por la IA tras recibir la telemetría del Pre-Test.
 * Extrae encabezados, número de tablas comparativas, cajas de código, tarjetas Anki TSV
 * y construye las etiquetas estructuradas para guardarlo en la Biblioteca Pública (Donato & Sonia).
 */
export function analyzeAiTelemetryMarkdown(markdownText = "", topic = {}, authorName = "Donato", stats = null) {
  const cleanText = String(markdownText || "").trim();

  // 1. Extraer encabezados principales (#, ##, ###)
  const headingMatches = [...cleanText.matchAll(/^#{1,3}\s+(.+)$/gm)];
  const sections = headingMatches.map((m) => m[1].replace(/\*\*/g, "").trim()).slice(0, 8);

  // 2. Contar tablas comparativas en Markdown (líneas separadoras | --- | --- |)
  const tableMatches = [...cleanText.matchAll(/^\|?\s*:?-{3,}:?\s*\|/gm)];
  const tablesCount = tableMatches.length;

  // 3. Extraer bloques de código cercados (``` ... ```)
  const codeBlockMatches = [...cleanText.matchAll(/```(\w*)\r?\n([\s\S]*?)```/g)];
  const codeBlocksCount = codeBlockMatches.length;

  // 4. Extraer tarjetas Anki TSV dentro de bloques de código o en el texto
  const extractedAnkiCards = [];
  codeBlockMatches.forEach((match) => {
    const blockContent = match[2] || "";
    blockContent.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("\t")) {
        const parts = trimmed.split("\t");
        if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
          extractedAnkiCards.push({
            front: parts[0].trim(),
            back: parts[1].trim(),
            tags: parts[2] ? parts[2].trim() : `${topic.code || "D01"} TelemetriaIA`
          });
        }
      }
    });
  });

  // 5. Contar elementos monoespaciados inline (`...`)
  const withoutBlocks = cleanText.replace(/```[\s\S]*?```/g, "");
  const inlineCodeMatches = [...withoutBlocks.matchAll(/`([^`\n]+)`/g)];
  const inlineCodeCount = inlineCodeMatches.length;

  // 6. Construir etiquetas automáticas bien estructuradas para la Biblioteca
  const tags = [
    "Reporte Telemetría IA",
    "Público Dúo",
    topic.code || "D01",
    topic.specialty || "MI",
    `Por ${authorName}`
  ];

  if (topic.normativa_origen) {
    tags.push(topic.normativa_origen.split("/")[0].trim());
  }
  if (tablesCount > 0) {
    tags.push(`${tablesCount} Tablas Comparativas`);
  }
  if (codeBlocksCount > 0) {
    tags.push(`${codeBlocksCount} Cajas Código`);
  }
  if (extractedAnkiCards.length > 0) {
    tags.push(`${extractedAnkiCards.length} Tarjetas Anki TSV`);
  }

  // Añadir pivotes débiles o críticos detectados en la sesión si existen
  if (stats?.pivotStats) {
    Object.entries(stats.pivotStats).forEach(([pivotKey, pStat]) => {
      if (pStat.total > 0 && pStat.correct < pStat.total) {
        tags.push(`Refuerzo: ${PIVOT_CONCEPTS[pivotKey] || pivotKey}`);
      }
    });
  }

  return {
    sections,
    tablesCount,
    codeBlocksCount,
    inlineCodeCount,
    extractedAnkiCards,
    wordCount: cleanText ? cleanText.split(/\s+/).length : 0,
    tags
  };
}

/**
 * =========================================================================
 * SIMULADOR DE CIERRE POST-ESTUDIO (FASE 3): ARQUITECTURA PSICOMÉTRICA
 * =========================================================================
 * Genera el Prompt Maestro para Chatbot (Gemini / ChatGPT / Claude / AI Studio)
 * que produce el Simulador de 20-30 reactivos con casos seriados, cuota de inglés,
 * taxonomía de 2do y 3er orden, y distractores trampa ("Guía Gringa", "Cierre Prematuro",
 * "Tratamiento Correcto / Paciente Incorrecto", "Ruido de Laboratorio").
 */
export function generateSimulatorPromptForChatbot(topic = {}) {
  const code = topic.code || "D01";
  const title = topic.title || "Diabetes Mellitus Tipo 2, CAD y EHH";
  const specialty = topic.specialty || "MI";
  const normativa = topic.normativa_origen || "GPC IMSS-718-18 / NOM-015";

  return `# ROL Y OBJETIVO
Actúa como el Comité Evaluador y Diseñador Psicométrico del ENARM y experto en Guías de Práctica Clínica mexicanas (GPC CENETEC / NOM Oficial).
Mi objetivo es realizar mi **Simulador de Cierre y Consolidación Post-Estudio (Fase 3: Transferencia y Resistencia)** tras haber completado mi bloque de estudio del tema:
- **Tema:** [${code}_${specialty}_${title.replace(/\s+/g, "_")} | NORMATIVA: ${normativa}]
- **Tiempo de Resolución:** 30 minutos (cuenta regresiva estilo ENARM).

---
# PROPÓSITO PSICOMÉTRICO (SIMULADOR POST-ESTUDIO vs. PRE-TEST):
A diferencia del Pre-Test (que buscaba sorpresa metacognitiva y error preliminar), este Simulador de Cierre busca **CONSOLIDACIÓN, TRANSFERENCIA AL CASO CLÍNICO REAL Y RESISTENCIA MENTAL BAJO PRESIÓN**. Aquí el objetivo es demostrar dominio aplicando el algoritmo de la GPC/NOM en casos largos y llenos de distractores, evitando la "ilusión de competencia" que da la lectura pasiva.

---
# INSTRUCCIONES DE DISEÑO PSICOMÉTRICO ESTRICTAS (SIMULADOR DE ALTO RENDIMIENTO):

1. **VOLUMEN Y ESTRUCTURA:**
   - Genera exactamente **25 preguntas** de opción múltiple (A, B, C, D).
   - **80% Casos Clínicos Seriados (20 preguntas agrupadas):** Organizadas en bloques de 3 a 4 preguntas encadenadas dependientes de 1 misma viñeta clínica extensa (ej. Q1: Diagnóstico clínico diferencial; Q2: Estudio de imagen/laboratorio inicial; Q3: Estándar de oro confirmatorio; Q4: Primera línea de tratamiento o conducta ante complicación). Usa el mismo \`"case_id"\` para las preguntas de un mismo caso (ej. \`"SERIADO-1"\`, \`"SERIADO-2"\`, etc.).
   - **Cuota de Inglés Médico Obligatoria:** El último caso clínico seriado (**preguntas 22 a 25**) debe estar redactado **100% EN INGLÉS MÉDICO** (\`"is_english": true\`), simulando la fatiga lingüística de la sección de inglés del ENARM real.

2. **TAXONOMÍA DE DIFICULTAD (PENSAMIENTO DE 2DO Y 3ER ORDEN - PROHIBIDA MEMORIA PURA):**
   - **PROHIBIDO EL PENSAMIENTO DE 1ER ORDEN:** Cero preguntas de memoria directa estilo *"¿Cuál es la meta de HbA1c?"* o *"¿Cuál es la dosis de X?"*. Eso es tarea de Anki.
   - **OBLIGATORIO EL PENSAMIENTO DE 2DO ORDEN:** Integración de algoritmos y escalonamiento (ej. *"Paciente que ya toma fármaco X y presenta falla terapéutica con HbA1c de 8.5%, ¿cuál es el siguiente paso según el algoritmo de la GPC?"*).
   - **OBLIGATORIO EL PENSAMIENTO DE 3ER ORDEN:** Integración de múltiples variables clínicas (ej. *"Paciente con DM2, TFG de 25 mL/min y antecedente de falla cardíaca que ingresa por cetoacidosis; tras estabilizarlo, ¿qué ajuste farmacológico ambulatorio se prescribe al alta considerando contraindicaciones renales?"*).

3. **INGENIERÍA MALICIOSA DE DISTRACTORES (TRAMPAS ESTILO ENARM REAL):**
   Las 3 opciones incorrectas deben diseñarse para castigar lecturas rápidas o superficiales inyectando:
   - **a) La Trampa de la "Guía Gringa":** Fármacos o estudios que son estándar de oro en literatura estadounidense (ADA, AHA, IDSA, ATS), pero que la GPC/NOM mexicana NO contempla como primera línea institucional por costo o disponibilidad (ej. ofrecer Azitromicina empírica cuando la GPC IMSS dicta Amoxicilina oral).
   - **b) El Cierre Prematuro (Anclaje):** La viñeta inicia con un cuadro clásico, pero en el tercer renglón añade un dato o antecedente que cambia el diagnóstico por completo.
   - **c) El Tratamiento Correcto, Paciente Incorrecto:** El fármaco de primera línea perfecto, pero el paciente tiene una contraindicación absoluta oculta en la viñeta (alergia, embarazo, TFG baja, hepatopatía o interacción).
   - **d) El Ruido de Laboratorio:** Incluir una batería extensa de laboratorio o signos vitales con datos normales o irrelevantes para abrumar la memoria de trabajo y ocultar el dato pivote.

4. **REGLA CRÍTICA DE ORTOGRAFÍA (UTF-8):**
   Escribe con **ortografía médica impecable en UTF-8**, con **todos los acentos (\`á, é, í, ó, ú\`), diéresis (\`ü\`) y la letra \`ñ\` (años, daño, niño)**.

---
# FORMATO DE ENTREGA (JSON VÁLIDO PARA LA PWA ENARMCITO):
Devuélveme **ÚNICAMENTE** el bloque JSON delimitado por \`\`\`json ... \`\`\` sin texto conversacional introductorio ni conclusiones, con este esquema exacto para cargarse directamente en la PWA:

\`\`\`json
{
  "topic_code": "${code}",
  "title": "Simulador Post-Estudio: ${title}",
  "normativa_origen": "${normativa}",
  "duration_minutes": 30,
  "seconds_per_question": 72,
  "questions": [
    {
      "id": "${code.toLowerCase()}_sim_q1",
      "index": 1,
      "case_id": "SERIADO-1",
      "case_title": "Caso Seriado 1: Cetoacidosis Diabética Severa con Falla Renal",
      "is_english": false,
      "cognitive_order": "3er_Orden",
      "vignette": "Hombre de 58 años con antecedente de diabetes mellitus tipo 2 de 12 años de evolución... [viñeta con signos vitales, ruido de laboratorio y comorbilidades]",
      "question_text": "¿Cuál es la conducta inicial prioritaria de acuerdo con el algoritmo de la GPC mexicana?",
      "options": {
        "A": "Opción A",
        "B": "Opción B",
        "C": "Opción C",
        "D": "Opción D"
      },
      "correctAnswer": "A",
      "pivot_concept": "Primera_Linea_Tx",
      "gpc_algorithm_step": "La GPC IMSS dicta: Paso 1 (Expansión con SS 0.9% 1000 mL/h) -> Paso 2 (Verificar K+ > 3.3 antes de insulina). En este paciente el potasio es 3.1 mEq/L, por lo que iniciar insulina prematuramente es una violación crítica del algoritmo.",
      "distractor_trap": {
        "trap_type": "Tratamiento Correcto, Paciente Incorrecto",
        "explanation": "La opción B ofrecía bolo de insulina regular a 0.1 UI/kg, que es el tratamiento estándar pero está absolutamente contraindicado con potasio sérico < 3.3 mEq/L por riesgo de paro cardíaco en diástole."
      },
      "anki_flashcard": {
        "front": "¿Cuál es el valor mínimo de potasio sérico requerido en la GPC antes de iniciar infusión de insulina en CAD?",
        "back": "> 3.3 mEq/L. Si K+ < 3.3 mEq/L, reponer potasio a 20-30 mEq/h y diferir insulina.",
        "tags": "${code} CAD Potasio Insulina GPC"
      }
    }
  ]
}
\`\`\``;
}

/**
 * Valida y normaliza el JSON del Simulador Post-Estudio importado en la PWA
 */
export function parseAndValidateSimulatorJson(rawInput, defaultTopic = {}) {
  if (!rawInput || typeof rawInput !== "string") {
    throw new Error("El campo JSON está vacío.");
  }

  let cleaned = rawInput.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`JSON no válido: ${err.message}. Asegúrate de copiar el bloque completo.`);
  }

  const rawQuestions = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.questions)
    ? parsed.questions
    : Array.isArray(parsed.simulation?.questions)
    ? parsed.simulation.questions
    : null;

  if (!rawQuestions || rawQuestions.length === 0) {
    throw new Error("El JSON no contiene un arreglo de preguntas ('questions') válido.");
  }

  const normalizedQuestions = rawQuestions.map((q, idx) => {
    const qNum = idx + 1;
    const id = q.id || `${(defaultTopic.code || "d01").toLowerCase()}_sim_q${qNum}`;
    const vignette = (q.vignette || q.vineta || q.viñeta || q.case || "").trim();
    const questionText = (q.question_text || q.question || q.pregunta || "¿Cuál es la conducta indicada?").trim();
    const options = q.options || q.opciones || {};

    if (!vignette) {
      throw new Error(`La pregunta #${qNum} del simulador no tiene viñeta clínica.`);
    }
    if (!options.A || !options.B || !options.C || !options.D) {
      throw new Error(`La pregunta #${qNum} debe incluir 4 opciones: A, B, C y D.`);
    }

    const correctAnswer = (q.correctAnswer || q.correct_answer || q.respuesta_correcta || "A").toUpperCase().trim();
    if (!["A", "B", "C", "D"].includes(correctAnswer)) {
      throw new Error(`La pregunta #${qNum} tiene respuesta correcta inválida ('${correctAnswer}').`);
    }

    return {
      id,
      index: q.index || qNum,
      case_id: q.case_id || null,
      case_title: q.case_title || (q.case_id ? `Caso Clínico Seriado: ${q.case_id}` : null),
      is_english: Boolean(q.is_english || q.idioma === "EN"),
      cognitive_order: q.cognitive_order || "2do_Orden",
      vignette,
      question_text: questionText,
      options: {
        A: String(options.A).trim(),
        B: String(options.B).trim(),
        C: String(options.C).trim(),
        D: String(options.D).trim()
      },
      correctAnswer,
      pivot_concept: q.pivot_concept || q.concepto_pivote || "Primera_Linea_Tx",
      gpc_algorithm_step: q.gpc_algorithm_step || q.explanation || q.justificacion_gpc || "",
      distractor_trap: q.distractor_trap || {
        trap_type: q.trap_type || "Distractor Plausible",
        explanation: q.trap_explanation || ""
      },
      anki_flashcard: q.anki_flashcard || null
    };
  });

  return {
    topic_code: parsed.topic_code || defaultTopic.code || null,
    title: parsed.title || `Simulador Post-Estudio: ${defaultTopic.title || "Tema"}`,
    normativa_origen: parsed.normativa_origen || defaultTopic.normativa_origen || "GPC CENETEC",
    duration_minutes: parsed.duration_minutes || 30,
    seconds_per_question: parsed.seconds_per_question || 72,
    questions: normalizedQuestions
  };
}

/**
 * Genera el informe de auditoría final del Simulador Post-Estudio
 * con ruta del algoritmo GPC por cada reactivo fallado y bloque TSV para Anki FSRS
 */
export function generateSimulatorAuditReport(topicData, sessionResults, questions, userName = "Donato") {
  const totalQuestions = questions.length;
  const totalCorrect = sessionResults.filter(r => r.isCorrect).length;
  const scorePct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const failedResults = sessionResults.filter(r => !r.isCorrect);

  let md = `# INFORME DE AUDITORÍA POST-SIMULADOR ENARM\n`;
  md += `- **Tema:** ${topicData.code || "D01"} - ${topicData.title || "Tema"} (${topicData.normativa_origen || "GPC"})\n`;
  md += `- **Alumno:** ${userName} | **Fecha:** ${new Date().toLocaleDateString("es-MX")}\n`;
  md += `- **Resultado Final:** ${totalCorrect}/${totalQuestions} reactivos (${scorePct}% precisión)\n`;
  md += `- **Reactivos Fallados:** ${failedResults.length} / ${totalQuestions}\n\n`;

  if (failedResults.length === 0) {
    md += `## 🎉 ¡DOMINIO COMPLETO DEL ALGORITMO!\n`;
    md += `No tuviste ningún reactivo fallado en esta sesión. Demostraste resistencia mental, filtrado de ruido clínico y apego 100% a la GPC mexicana.\n`;
    return md;
  }

  md += `## 1. DESGLOSE DE FALLAS COGNITIVAS Y VIOLACIÓN DE ALGORITMOS GPC\n\n`;

  const tsvAnkiLines = [];

  failedResults.forEach((res) => {
    const q = questions.find((item) => item.index === res.qIndex) || questions[res.qIndex - 1];
    if (!q) return;

    const chosenOpt = res.selected;
    const correctOpt = q.correctAnswer;
    const chosenText = q.options[chosenOpt] || chosenOpt;
    const correctText = q.options[correctOpt] || "";

    md += `### Reactivo ${q.index}: ${q.case_id ? `[${q.case_id}] ` : ""}${q.is_english ? "🇬🇧 (Inglés) " : ""}${q.pivot_concept || "Clínico"}\n`;
    md += `- **Viñeta:** ${q.vignette}\n`;
    md += `- **Pregunta:** ${q.question_text}\n`;
    md += `- **Tu Elección:** **${chosenOpt}** (${chosenText}) ❌ | **Correcta GPC:** **${correctOpt}** (${correctText}) ✅\n`;

    // Diagnóstico de Falla estructurado
    const trap = typeof q.distractor_trap === "object" ? q.distractor_trap : { trap_type: "Trampa", explanation: q.distractor_trap };
    const lowerTrap = (trap.trap_type || "").toLowerCase();
    let failureDiag = "Consecuencia (Clínica / Laboratorios / Escalonamiento GPC)";
    if (lowerTrap.includes("paciente incorrecto") || lowerTrap.includes("comorbilidad") || lowerTrap.includes("contraindicaci")) {
      failureDiag = "Condición Facilitadora (Antecedentes / Comorbilidades / Alergia / TFG)";
    } else if (lowerTrap.includes("cierre prematuro") || lowerTrap.includes("anclaje") || lowerTrap.includes("espectro")) {
      failureDiag = "Fallo (Mecanismo Fisiopatológico / Sesgo de Anclaje Prematuro)";
    }

    md += `- **1. Tu Diagnóstico de Falla:** \`${failureDiag}\`\n`;
    md += `- **2. Trampa del Distractor:** \`${trap.trap_type || "Distractor"}\`\n`;
    if (trap.explanation) {
      md += `  > ${trap.explanation}\n`;
    }

    if (q.gpc_algorithm_step) {
      md += `- **3. Ruta del Algoritmo GPC:**\n`;
      md += `  ${q.gpc_algorithm_step}\n`;
    }

    md += `\n`;

    // Recolectar flashcard para Anki
    if (q.anki_flashcard && q.anki_flashcard.front && q.anki_flashcard.back) {
      tsvAnkiLines.push(`${q.anki_flashcard.front}\t${q.anki_flashcard.back}\t${q.anki_flashcard.tags || `${topicData.code} SimuladorFallo`}`);
    } else {
      // Autogenerar micro-viñeta de 3 líneas
      const autoFront = `[${topicData.code}] ${q.question_text} (Ante: ${q.vignette.slice(0, 120)}...)`;
      const autoBack = `<b>${correctOpt}: ${correctText}</b><br><br><i>GPC:</i> ${q.gpc_algorithm_step || "Norma oficial mexicana."}`;
      tsvAnkiLines.push(`${autoFront}\t${autoBack}\t${topicData.code} SimuladorError`);
    }
  });

  md += `---\n`;
  md += `## 2. PASE DIRECTO A ANKI (TARJETAS FSRS LISTAS PARA IMPORTAR)\n`;
  md += `Estas preguntas falladas representan tus lagunas residuales tras la lectura. Se han estructurado en formato TSV para importarse al mazo Anki:\n\n`;

  md += `\`\`\`tsv\n`;
  md += tsvAnkiLines.join("\n") + "\n";
  md += `\`\`\`\n`;

  return md;
}

