// src/data/coursesCatalog.js
// Catálogo unificado de cursos y temas para el panel de navegación estilo LMS
// Contiene el temario real de Pretemporada (18 días) y deja preparado el Curso Dr. Re para cuando se cargue

import { PRESEASON_SCHEDULE } from "./preseasonSchedule";

export const COURSES_CATALOG = [
  {
    id: "preseason",
    title: "CURSO PRE TEMPORADA",
    badge: "18 Días • Octubre 2026",
    color: "from-blue-600 to-cyan-600",
    description: "Cronograma Operativo de Pretemporada ENARM 2027 organizado en 3 Semanas",
    modules: [
      {
        id: "sem1",
        title: "Semana 1: Medicina Interna & Inicio Pediatría",
        dates: "12 al 17 de Octubre",
        topics: PRESEASON_SCHEDULE.filter((s) => s.week === 1).map((s) => ({
          id: s.code,
          code: s.code,
          dayNumber: s.dayNumber,
          title: s.title,
          specialty: s.specialty,
          normativa: s.normativa,
          summary: s.summary,
          drRePdfs: s.drRePdfs,
          phasesCount: 4
        }))
      },
      {
        id: "sem2",
        title: "Semana 2: Pediatría & Ginecología y Obstetricia",
        dates: "19 al 24 de Octubre",
        topics: PRESEASON_SCHEDULE.filter((s) => s.week === 2).map((s) => ({
          id: s.code,
          code: s.code,
          dayNumber: s.dayNumber,
          title: s.title,
          specialty: s.specialty,
          normativa: s.normativa,
          summary: s.summary,
          drRePdfs: s.drRePdfs,
          phasesCount: 4
        }))
      },
      {
        id: "sem3",
        title: "Semana 3: Cierre GYO & Cirugía General",
        dates: "26 al 31 de Octubre",
        topics: PRESEASON_SCHEDULE.filter((s) => s.week === 3).map((s) => ({
          id: s.code,
          code: s.code,
          dayNumber: s.dayNumber,
          title: s.title,
          specialty: s.specialty,
          normativa: s.normativa,
          summary: s.summary,
          drRePdfs: s.drRePdfs,
          phasesCount: 4
        }))
      }
    ]
  },
  {
    id: "dr_re",
    title: "CURSO DR RE",
    badge: "En Preparación",
    color: "from-purple-600 to-indigo-600",
    description: "El temario y módulos del Curso Dr. Re se irán configurando conforme se proporcionen los contenidos oficiales.",
    modules: []
  }
];
