// src/data/preseasonSchedule.js
// Cronograma Operativo Oficial de Pretemporada — ENARM 2027 (Octubre 2026)
// 18 Días de Alto Impacto Clínico distribuidos en 3 Semanas

export const PRESEASON_SCHEDULE = [
  // ==================== SEMANA 1 ====================
  {
    dayNumber: 1,
    code: "D01",
    specialty: "MI",
    specialtyName: "Medicina Interna",
    week: 1,
    weekName: "Semana 1: Medicina Interna + Pediatría (12 al 17 de Octubre)",
    dates: "12 de Octubre",
    title: "DM2 + Cetoacidosis Diabética (CAD) y EHH",
    normativa: "GPC IMSS-718-18 / NOM-015",
    obsidianNote: "D01_MI_Diabetes_Mellitus_Tipo_2_CAD_EHH",
    topicId: "D01_MI_Diabetes_Mellitus_CAD_EHH",
    drRePdfs: [
      { name: "ENDOCRINO_ocred.pdf", label: "📑 Flashcards Endocrino" }
    ],
    summary: "Diagnóstico inicial vs CTGO, manejo intensivo con soluciones e insulina, criterios de resolución CAD y corrección de potasio."
  },
  {
    dayNumber: 2,
    code: "D02",
    specialty: "MI",
    specialtyName: "Medicina Interna",
    week: 1,
    weekName: "Semana 1: Medicina Interna + Pediatría (12 al 17 de Octubre)",
    dates: "13 de Octubre",
    title: "Hipertensión Arterial Sistémica y Crisis HTA",
    normativa: "GPC IMSS-076-08 / NOM-030",
    obsidianNote: "D02_MI_Hipertension_Arterial_Crisis_Hipertensivas",
    topicId: "D02_MI_Hipertension_Arterial_Crisis_Hipertensivas",
    drRePdfs: [
      { name: "FLASHCARD CARDIO EM_ocred.pdf", label: "📑 Flashcards Cardio" }
    ],
    summary: "Clasificación NOM-030, urgencia vs emergencia hipertensiva, metas de reducción de TA y fármacos según daño a órgano blanco."
  },
  {
    dayNumber: 3,
    code: "D03",
    specialty: "MI",
    specialtyName: "Medicina Interna",
    week: 1,
    weekName: "Semana 1: Medicina Interna + Pediatría (12 al 17 de Octubre)",
    dates: "14 de Octubre",
    title: "IAMCEST / Síndromes Coronarios Agudos",
    normativa: "GPC IMSS-357-21 (Código Infarto)",
    obsidianNote: "D03_MI_Infarto_Agudo_Miocardio_IAMCEST_SICA",
    topicId: "D03_MI_Infarto_Agudo_Miocardio_IAMCEST_SICA",
    drRePdfs: [
      { name: "FLASHCARD CARDIO EM_ocred.pdf", label: "📑 Flashcards Cardio" }
    ],
    summary: "Código Infarto IMSS, ventana de fibrinólisis vs ICP primaria, contraindicaciones absolutas y terapia antitrombótica dual."
  },
  {
    dayNumber: 4,
    code: "D04",
    specialty: "MI",
    specialtyName: "Medicina Interna",
    week: 1,
    weekName: "Semana 1: Medicina Interna + Pediatría (12 al 17 de Octubre)",
    dates: "15 de Octubre",
    title: "EPOC, Asma Adulto/Pedia y NAC (CURB-65)",
    normativa: "GPC IMSS-037 / IMSS-234",
    obsidianNote: "D04_MI_Neumopatias_EPOC_Asma_NAC_CURB65",
    topicId: "D04_MI_Neumopatias_EPOC_Asma_NAC_CURB65",
    drRePdfs: [
      { name: "NEUMO EM _ocred.pdf", label: "📑 Flashcards Neumo" }
    ],
    summary: "Escala CURB-65 para ingreso, exacerbaciones de EPOC (criterios de Anthonisen) y escalones de tratamiento en crisis asmática."
  },
  {
    dayNumber: 5,
    code: "D05",
    specialty: "MI",
    specialtyName: "Medicina Interna",
    week: 1,
    weekName: "Semana 1: Medicina Interna + Pediatría (12 al 17 de Octubre)",
    dates: "16 de Octubre",
    title: "Enfermedad Renal Crónica (KDIGO) y EVC",
    normativa: "GPC IMSS-335-19 / IMSS-152",
    obsidianNote: "D05_MI_Enfermedad_Renal_Cronica_KDIGO_EVC",
    topicId: "D05_MI_Enfermedad_Renal_Cronica_KDIGO_EVC",
    drRePdfs: [
      { name: "NEFRO_ocred.pdf", label: "📑 Flashcards Nefro" },
      { name: "NEURO_ocred.pdf", label: "📑 Flashcards Neuro" }
    ],
    summary: "Estadificación KDIGO (TFG y albuminuria), complicaciones urémicas y ventana de trombolisis en EVC isquémico (escala NIHSS)."
  },
  {
    dayNumber: 6,
    code: "D06",
    specialty: "PED",
    specialtyName: "Pediatría",
    week: 1,
    weekName: "Semana 1: Medicina Interna + Pediatría (12 al 17 de Octubre)",
    dates: "17 de Octubre",
    title: "Vacunación Nacional y Exantemáticas",
    normativa: "NOM-036 / GPC IMSS-579-19",
    obsidianNote: "D06_PED_Vacunacion_Nacional_Enfermedades_Exantematicas",
    topicId: "D06_PED_Vacunacion_Nacional_Enfermedades_Exantematicas",
    drRePdfs: [
      { name: "INFECTO PEDIA_ocred.pdf", label: "📑 Infecto Pedia" },
      { name: "PEDIATRIA GENERAL EM_ocred.pdf", label: "📑 Pedia General" }
    ],
    summary: "Esquema Nacional de Vacunación mexicano, diagnóstico diferencial de exantemas (sarampión, rubéola, escarlatina, roséola, eritema infeccioso, Kawasaki)."
  },

  // ==================== SEMANA 2 ====================
  {
    dayNumber: 7,
    code: "D07",
    specialty: "PED",
    specialtyName: "Pediatría",
    week: 2,
    weekName: "Semana 2: Pediatría + Ginecología y Obstetricia (19 al 24 de Octubre)",
    dates: "19 de Octubre",
    title: "Deshidratación y EDA (Planes A, B y C)",
    normativa: "GPC IMSS-156-08 / NOM-031",
    obsidianNote: "D07_PED_Deshidratacion_Enfermedad_Diarreica_Aguda",
    topicId: "D07_PED_Deshidratacion_Enfermedad_Diarreica_Aguda",
    drRePdfs: [
      { name: "PEDIATRIA GENERAL EM_ocred.pdf", label: "📑 Pedia General" },
      { name: "GASTRO_ocred.pdf", label: "📑 Flashcards Gastro" }
    ],
    summary: "Planes de hidratación de la NOM-031 (Plan A en el hogar, Plan B con VSO en unidad médica, Plan C con Hartman intravenoso)."
  },
  {
    dayNumber: 8,
    code: "D08",
    specialty: "PED",
    specialtyName: "Pediatría",
    week: 2,
    weekName: "Semana 2: Pediatría + Ginecología y Obstetricia (19 al 24 de Octubre)",
    dates: "20 de Octubre",
    title: "OMA, Faringitis, Crup, Bronquiolitis, NAC",
    normativa: "GPC IMSS-080 / IMSS-062",
    obsidianNote: "D08_PED_Infecciones_Respiratorias_Pediatricas",
    topicId: "D08_PED_Infecciones_Respiratorias_Pediatricas",
    drRePdfs: [
      { name: "INFECTO PEDIA_ocred.pdf", label: "📑 Infecto Pedia" },
      { name: "NEUMO EM _ocred.pdf", label: "📑 Flashcards Neumo" }
    ],
    summary: "Criterios de Centor en faringoamigdalitis, escala de Westley para Crup (dexametasona + adrenalina) y manejo de bronquiolitis (VRS)."
  },
  {
    dayNumber: 9,
    code: "D09",
    specialty: "PED",
    specialtyName: "Pediatría",
    week: 2,
    weekName: "Semana 2: Pediatría + Ginecología y Obstetricia (19 al 24 de Octubre)",
    dates: "21 de Octubre",
    title: "RENEO (Minuto de Oro), Sepsis y SDR",
    normativa: "NOM-007 / GPC Sepsis y SDR",
    obsidianNote: "D09_PED_Reanimacion_Neonatal_Sepsis_SDR",
    topicId: "D09_PED_Reanimacion_Neonatal_Sepsis_SDR",
    drRePdfs: [
      { name: "NEONATOLOGIA_ocred.pdf", label: "📑 Flashcards Neonatología" }
    ],
    summary: "Algoritmo RENEO (pasos iniciales, VPP, intubación, masaje cardíaco 3:1), SDR por deficiencia de surfactante y sepsis temprana vs tardía."
  },
  {
    dayNumber: 10,
    code: "D10",
    specialty: "PED",
    specialtyName: "Pediatría",
    week: 2,
    weekName: "Semana 2: Pediatría + Ginecología y Obstetricia (19 al 24 de Octubre)",
    dates: "22 de Octubre",
    title: "Hitos del Desarrollo, Tanner y Tamiz",
    normativa: "NOM-031 / NOM-034",
    obsidianNote: "D10_PED_Crecimiento_Neurodesarrollo_Tamiz_Metabolico",
    topicId: "D10_PED_Crecimiento_Neurodesarrollo_Tamiz_Metabolico",
    drRePdfs: [
      { name: "CRECIMIENTO_ocred.pdf", label: "📑 Flashcards Crecimiento" }
    ],
    summary: "Hitos motores/lenguaje por edad, estadificación puberal de Tanner y tamiz metabólico neonatal (hipotiroidismo congénito prioritario)."
  },
  {
    dayNumber: 11,
    code: "D11",
    specialty: "GYO",
    specialtyName: "Ginecología y Obstetricia",
    week: 2,
    weekName: "Semana 2: Pediatría + Ginecología y Obstetricia (19 al 24 de Octubre)",
    dates: "23 de Octubre",
    title: "Preeclampsia, Eclampsia y Síndrome HELLP",
    normativa: "GPC IMSS-058-08",
    obsidianNote: "D11_GYO_Trastornos_Hipertensivos_Preeclampsia_HELLP",
    topicId: "D11_GYO_Trastornos_Hipertensivos_Preeclampsia_HELLP",
    drRePdfs: [
      { name: "OBSTE_ocred.pdf", label: "📑 Flashcards Obste" },
      { name: "RIESGO OBSTETRICO_ocred.pdf", label: "📑 Riesgo Obstétrico" }
    ],
    summary: "Criterios de severidad, esquema de Zuspan con Sulfato de Magnesio (prevención de convulsiones) y manejo antihipertensivo de emergencia."
  },
  {
    dayNumber: 12,
    code: "D12",
    specialty: "GYO",
    specialtyName: "Ginecología y Obstetricia",
    week: 2,
    weekName: "Semana 2: Pediatría + Ginecología y Obstetricia (19 al 24 de Octubre)",
    dates: "24 de Octubre",
    title: "Hemorragias 1ra/2da Mitad y Atonía (4T)",
    normativa: "GPC IMSS-162-09 / IMSS-436-19",
    obsidianNote: "D12_GYO_Hemorragia_Obstetrica_1ra_2da_Mitad_Atonia",
    topicId: "D12_GYO_Hemorragia_Obstetrica_1ra_2da_Mitad_Atonia",
    drRePdfs: [
      { name: "OBSTE_ocred.pdf", label: "📑 Flashcards Obste" },
      { name: "RIESGO OBSTETRICO_ocred.pdf", label: "📑 Riesgo Obstétrico" }
    ],
    summary: "Amenaza de aborto vs ectópico vs mola; DPPNI vs placenta previa; manejo activo del 3er periodo y regla de las 4T en hemorragia postparto."
  },

  // ==================== SEMANA 3 ====================
  {
    dayNumber: 13,
    code: "D13",
    specialty: "GYO",
    specialtyName: "Ginecología y Obstetricia",
    week: 3,
    weekName: "Semana 3: Cierre de GYO + Cirugía General (26 al 31 de Octubre)",
    dates: "26 de Octubre",
    title: "Tamizaje CaCu (VPH), Vaginitis y EPI",
    normativa: "NOM-014 / GPC Vaginitis / EPI",
    obsidianNote: "D13_GYO_Tamizaje_CaCu_VPH_Infecciones_Vaginales_EPI",
    topicId: "D13_GYO_Tamizaje_CaCu_VPH_Infecciones_Vaginales_EPI",
    drRePdfs: [
      { name: "GINE_ocred.pdf", label: "📑 Flashcards Ginecología" }
    ],
    summary: "Citología cervical y genotipificación VPH, criterios diagnósticos de vaginitis (criterios de Amsel) y régimen antibiótico en EPI."
  },
  {
    dayNumber: 14,
    code: "D14",
    specialty: "GYO",
    specialtyName: "Ginecología y Obstetricia",
    week: 3,
    weekName: "Semana 3: Cierre de GYO + Cirugía General (26 al 31 de Octubre)",
    dates: "27 de Octubre",
    title: "Patología Mamaria (BI-RADS, CaMa) y DMG",
    normativa: "GPC IMSS-232-09 / IMSS-320",
    obsidianNote: "D14_GYO_Patologia_Mamaria_BI_RADS_Diabetes_Gestacional",
    topicId: "D14_GYO_Patologia_Mamaria_BI_RADS_Diabetes_Gestacional",
    drRePdfs: [
      { name: "GINE_ocred.pdf", label: "📑 Flashcards Gine" },
      { name: "OBSTE_ocred.pdf", label: "📑 Flashcards Obste" }
    ],
    summary: "Clasificación y conducta BI-RADS, tamizaje mastográfico >40 años y diagnóstico en 1 o 2 pasos de diabetes gestacional (criterios IADPSG)."
  },
  {
    dayNumber: 15,
    code: "D15",
    specialty: "CIR",
    specialtyName: "Cirugía General",
    week: 3,
    weekName: "Semana 3: Cierre de GYO + Cirugía General (26 al 31 de Octubre)",
    dates: "28 de Octubre",
    title: "Apendicitis Aguda (Escala de Alvarado)",
    normativa: "GPC IMSS-031-08",
    obsidianNote: "D15_CIR_Apendicitis_Aguda_Alvarado",
    topicId: "D15_CIR_Apendicitis_Aguda_Alvarado",
    drRePdfs: [
      { name: "URG QX_ocred.pdf", label: "📑 Flashcards Urg Qx" },
      { name: "CIRU GENERAL_ocred.pdf", label: "📑 Cirugía General" }
    ],
    summary: "Puntaje de Alvarado (conducta según corte ≥7 vs intermedio), estudios de imagen de elección (USG en niños/embarazo vs TAC en adultos)."
  },
  {
    dayNumber: 16,
    code: "D16",
    specialty: "CIR",
    specialtyName: "Cirugía General",
    week: 3,
    weekName: "Semana 3: Cierre de GYO + Cirugía General (26 al 31 de Octubre)",
    dates: "29 de Octubre",
    title: "Patología Biliar (Tokio, Colangitis)",
    normativa: "GPC IMSS-237-09",
    obsidianNote: "D16_CIR_Patologia_Biliar_Tokio_Colangitis",
    topicId: "D16_CIR_Patologia_Biliar_Tokio_Colangitis",
    drRePdfs: [
      { name: "CIRU GENERAL_ocred.pdf", label: "📑 Cirugía General" },
      { name: "GASTRO_ocred.pdf", label: "📑 Flashcards Gastro" }
    ],
    summary: "Guías de Tokio para colecistitis (Grados I, II y III), tríada de Charcot y péntada de Reynolds en colangitis supurativa, indicación de CPRE."
  },
  {
    dayNumber: 17,
    code: "D17",
    specialty: "CIR",
    specialtyName: "Cirugía General",
    week: 3,
    weekName: "Semana 3: Cierre de GYO + Cirugía General (26 al 31 de Octubre)",
    dates: "30 de Octubre",
    title: "Hernias de Pared Abdominal y Diverticulitis",
    normativa: "GPC IMSS-065-08 / GPC Diverticulitis",
    obsidianNote: "D17_CIR_Hernias_Pared_Abdominal_Enfermedad_Diverticular",
    topicId: "D17_CIR_Hernias_Pared_Abdominal_Enfermedad_Diverticular",
    drRePdfs: [
      { name: "CIRU GENERAL_ocred.pdf", label: "📑 Cirugía General" },
      { name: "COLOPROCTO_ocred.pdf", label: "📑 Flashcards Coloprocto" }
    ],
    summary: "Clasificación de Nyhus, técnica quirúrgica de Lichtenstein, clasificación tomográfica de Hinchey para diverticulitis y manejo ambulatorio vs quirúrgico."
  },
  {
    dayNumber: 18,
    code: "D18",
    specialty: "CIR",
    specialtyName: "Cirugía General",
    week: 3,
    weekName: "Semana 3: Cierre de GYO + Cirugía General (26 al 31 de Octubre)",
    dates: "31 de Octubre",
    title: "Politraumatizado (ATLS: ABCDE) y Quemaduras",
    normativa: "ATLS 10ª Ed. / GPC Quemados",
    obsidianNote: "D18_CIR_Politraumatizado_ATLS_Quemaduras",
    topicId: "D18_CIR_Politraumatizado_ATLS_Quemaduras",
    drRePdfs: [
      { name: "URGENCIAS EM _ocred.pdf", label: "📑 Flashcards Urg Médicas" },
      { name: "URG QX_ocred.pdf", label: "📑 Flashcards Urg Qx" }
    ],
    summary: "Secuencia ABCDE de ATLS, neumotórax a tensión vs taponamiento cardíaco, regla de los 9 de Wallace y fórmula de Parkland para reanimación hídrica."
  }
];

// Obtener tema por código (ej. "D01", "RE-01", topicId)
export function getScheduleDay(identifier) {
  if (!identifier) return PRESEASON_SCHEDULE[0];
  
  // Buscar en PRESEASON_SCHEDULE
  const pre = PRESEASON_SCHEDULE.find(
    (s) => s.code.toLowerCase() === identifier.toLowerCase() || s.topicId === identifier
  );
  if (pre) return pre;

  // Si es un tema del CURSO DR RE (RE-01 o DR_RE_*)
  return {
    dayNumber: 0,
    code: identifier,
    specialty: identifier.includes("PED") ? "PED" : identifier.includes("GYO") || identifier.includes("OBSTE") || identifier.includes("GINE") ? "GYO" : identifier.includes("CIR") || identifier.includes("TRAUMA") ? "CIR" : "MI",
    specialtyName: "Curso Dr. Re",
    week: 0,
    weekName: "Curso Especializado Dr. Re",
    dates: "Banco Continuo",
    title: identifier.replace("DR_RE_", "").replace(/_/g, " "),
    normativa: "Algoritmos Dr. Re / GPC",
    obsidianNote: `DrRe_${identifier}`,
    topicId: identifier,
    drRePdfs: [{ name: `${identifier}.pdf`, label: "📑 Flashcards Dr. Re" }],
    summary: "Revisión sistemática de perlas clínicas, algoritmos y tarjetas de alta rentabilidad del Dr. Re."
  };
}

// Generar estructura completa de tema para cualquiera de los días o cursos
export function generateTopicFromSchedule(scheduleItem, baseTopic = null) {
  if (scheduleItem.code === "D01" && baseTopic) {
    return baseTopic;
  }

  return {
    id: scheduleItem.topicId,
    code: scheduleItem.code,
    specialty: scheduleItem.specialty,
    title: scheduleItem.title,
    normativa_origen: scheduleItem.normativa,
    date_assigned: scheduleItem.dates,
    dayNumber: scheduleItem.dayNumber,
    week: scheduleItem.week,
    drRePdfs: scheduleItem.drRePdfs,
    summary: "",
    resources: [],
    // Material real pendiente de ser cargado por el usuario
    flashcards: [],
    pretest: {
      duration_minutes: 20,
      questions: []
    },
    simulation: {
      duration_minutes: 20,
      seconds_per_question: 60,
      questions: []
    }
  };
}
