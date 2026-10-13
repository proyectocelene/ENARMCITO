// src/firebase/defaultData.js
// Estructura limpia para D01 (Diabetes Mellitus Tipo 2, CAD y EHH)
// Sin reactivos, ni flashcards, ni resúmenes inventados.
// Queda listo para recibir el material real que proporciones.

import d01Pretest from "../data/pretests/D01_pretest.json";
import { getBundledSimulator } from "../data/simulators/index.js";

export const DEFAULT_TOPIC = {
  id: "D01_MI_Diabetes_Mellitus_CAD_EHH",
  code: "D01",
  specialty: "MI",
  title: "Diabetes Mellitus Tipo 2, CAD y EHH",
  normativa_origen: "GPC IMSS-718-18 / NOM-015",
  date_assigned: "2026-10-12",
  fase_actual: 0,
  drRePdfs: [
    { name: "ENDOCRINO_ocred.pdf", label: "📑 Flashcards Endocrino" }
  ],
  summary: "Tema D01 correspondiente al temario de pretemporada. Diabetes Mellitus Tipo 2, Cetoacidosis Diabética y Estado Hiperosmolar Hiperglicémico.",
  resources: [],
  flashcards: [],
  pretest: d01Pretest,
  simulation: getBundledSimulator("D01") || {
    duration_minutes: 30,
    seconds_per_question: 72,
    questions: []
  }
};
