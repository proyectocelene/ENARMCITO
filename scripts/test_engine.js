// scripts/test_engine.js
// Pruebas unitarias de validación matemática y lógica psicométrica

import { 
  getMetacognitiveQuadrant, 
  computeSessionStats, 
  generateGeminiReportMarkdown,
  ERROR_TAGS,
  AI_ACTIONS
} from '../src/services/telemetryEngine.js';
import { 
  scheduleCardFSRS, 
  getIntervalForecast, 
  calculateInterval,
  getRetrievability,
  TARGET_RETENTION,
  exportCardsToAnkiTSV, 
  RATINGS 
} from '../src/services/fsrsEngine.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log("=== 1. Probando Clasificación en los 4 Cuadrantes Metacognitivos ===");

// 1. Fallo + Alta Confianza -> Hipercorrección Crítica (Prioridad 1)
const q1 = getMetacognitiveQuadrant(false, "ALTA");
assert(q1.priority === 1, "Fallo con Alta Confianza clasifica como Prioridad 1 (Hipercorrección)");
assert(q1.id === "hipercorreccion", "ID de cuadrante es 'hipercorreccion'");

// 2. Fallo + Baja Confianza -> Laguna Teórica (Prioridad 2)
const q2 = getMetacognitiveQuadrant(false, "BAJA");
assert(q2.priority === 2, "Fallo con Baja Confianza clasifica como Prioridad 2 (Laguna Teórica)");

// 3. Acierto + Baja Confianza -> Acierto Frágil (Prioridad 3)
const q3 = getMetacognitiveQuadrant(true, "BAJA");
assert(q3.priority === 3, "Acierto con Baja Confianza clasifica como Prioridad 3 (Acierto Frágil)");

// 4. Acierto + Alta Confianza -> Dominio Consolidado (Prioridad 4)
const q4 = getMetacognitiveQuadrant(true, "ALTA");
assert(q4.priority === 4, "Acierto con Alta Confianza clasifica como Prioridad 4 (Dominio)");

console.log("\n=== 2. Probando Motor de Telemetría y Sesgo de Tachado ===");

const mockTopic = {
  id: "D01_TEST",
  title: "Test de Diabetes",
  normativa_origen: "GPC-IMSS-718-18",
  questions: [
    {
      id: "q1",
      concepto_pivote: "Estudio_Inicial",
      correctAnswer: "B",
      vignette: "Caso clínico de prueba...",
      options: { A: "Opt A", B: "Opt B", C: "Opt C", D: "Opt D" }
    },
    {
      id: "q2",
      concepto_pivote: "Gold_Standard",
      correctAnswer: "A",
      vignette: "Caso 2 de prueba...",
      options: { A: "Opt A", B: "Opt B", C: "Opt C", D: "Opt D" }
    }
  ]
};

const mockAnswers = {
  q1: {
    selectedOption: "A", // Falló
    confidence: "ALTA",   // Hipercorrección
    struckOptions: ["B"], // Tachó la correcta!
    timeSeconds: 65,
    errorType: ERROR_TAGS.Razonamiento,
    aiActions: [AI_ACTIONS.ExplicarAlgoritmo]
  },
  q2: {
    selectedOption: "A", // Acertó
    confidence: "ALTA",
    struckOptions: ["C", "D"],
    timeSeconds: 40,
    errorType: null,
    aiActions: []
  }
};

const stats = computeSessionStats(mockTopic, mockAnswers);
assert(stats.total === 2, "Total de preguntas procesadas es 2");
assert(stats.correctCount === 1, "Aciertos brutos es 1");
assert(stats.highConfidenceCorrect === 1, "Aciertos de alta confianza es 1");
assert(stats.detailedItems[0].struckCorrect === true, "Detectó que tachó la respuesta correcta en Q1");
assert(stats.detailedItems[1].struckCorrect === false, "No tachó la respuesta correcta en Q2");

console.log("\n=== 3. Probando Generación de Reporte Markdown para Gemini con AUTO-CHECK ===");

const reportMd = generateGeminiReportMarkdown(mockTopic, stats);
assert(reportMd.includes("# REPORTE DE TELEMETRÍA PRE-TEST ENARM"), "Contiene encabezado formal");
assert(reportMd.includes("PROTOCOLO 0: AUTO-CHECK DE INTEGRIDAD CLÍNICA"), "Incluye Auto-Check de integridad para la IA");
assert(reportMd.includes("Supremacía Normativa GPC/NOM"), "Instruye a la IA validar supremacía normativa mexicana");
assert(reportMd.includes("PRIORIDAD 1: ERRORES DE ALTA CONFIANZA - HIPERCORRECCIÓN"), "Contiene sección de Prioridad 1");
assert(reportMd.includes("Taché la respuesta correcta por error"), "Reporta sesgo de tachado erróneo a la IA");

console.log("\n=== 4. Probando Algoritmo FSRS v4.5, Proyecciones y Telemetría de Tarjeta ===");

assert(TARGET_RETENTION === 0.90, "Retención objetivo configurada en 90% para el ENARM");

const initialCard = { stability: 0, difficulty: 0, reps: 0, lapses: 0, state: "new" };

// Proyecciones de la tarjeta nueva
const forecast = getIntervalForecast(initialCard);
assert(forecast[RATINGS.AGAIN] === "< 10 min", "Again proyecta < 10 min en tarjeta nueva");
assert(forecast[RATINGS.GOOD].includes("días") || forecast[RATINGS.GOOD].includes("día"), "Good proyecta días en tarjeta nueva");

// Calificar con Good registrando 4500 ms de tiempo de respuesta
const reviewedGood = scheduleCardFSRS(initialCard, RATINGS.GOOD, 4500);
assert(reviewedGood.reps === 1, "Reps incrementó a 1");
assert(reviewedGood.stability > 0, "Estabilidad calculada positivamente");
assert(reviewedGood.lastResponseTimeMs === 4500, "Registró tiempo de respuesta de 4.5s");
assert(reviewedGood.review_history.length === 1, "Historial de revisión estilo Anki registrado");

// Calificar con Again (Lapse)
const reviewedAgain = scheduleCardFSRS(reviewedGood, RATINGS.AGAIN, 3200);
assert(reviewedAgain.lapses === 1, "Lapses incrementó a 1");
assert(reviewedAgain.state === "relearning", "Estado pasó a relearning tras olvido");
assert(reviewedAgain.intervalDays === 0, "Again programa repetición hoy mismo (0 días)");

const cardsToExport = [
  { front: "¿Pregunta 1?", back: "Respuesta 1", tags: ["#MI", "#DM2"] },
  { front: "¿Pregunta 2?", back: "Respuesta 2", tags: ["#CIR"] }
];
const tsv = exportCardsToAnkiTSV(cardsToExport);
assert(tsv.includes("#separator:tab"), "TSV incluye cabecera de separador Anki");
assert(tsv.includes("¿Pregunta 1?\tRespuesta 1\t#MI #DM2"), "Formato tabulado Anki Front <TAB> Back <TAB> Tags");

console.log(`\n==========================================`);
console.log(`Resultados: ${passed} pasadas, ${failed} fallidas`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("¡Todas las mejoras psicométricas y algoritmos funcionan al 100%!");
}
