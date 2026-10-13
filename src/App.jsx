// src/App.jsx
import React, { useState, useEffect } from "react";
import { UserProvider, useUser } from "./context/UserContext";
import { ToastProvider } from "./components/Common/ToastAndConfirm";
import { Navbar } from "./components/Navbar";
import { DayOverview } from "./components/DailyHub/DayOverview";
import { MainDashboardHub } from "./components/DailyHub/MainDashboardHub";
import { PretestPlayer } from "./components/Phase0_Pretest/PretestPlayer";
import { AuditBreakdown } from "./components/Phase0_Pretest/AuditBreakdown";
import { ResourceHub } from "./components/Phase1_Resources/ResourceHub";
import { AnkiCardViewer } from "./components/Phase2_Anki/AnkiCardViewer";
import { SimulatorRunner } from "./components/Phase3_Simulator/SimulatorRunner";
import { PinModal } from "./components/Common/PinModal";
import { InitialUserSelectModal } from "./components/Common/InitialUserSelectModal";
import { SettingsModal } from "./components/Common/SettingsModal";
import { ScheduleCalendarModal } from "./components/Common/ScheduleCalendarModal";
import { CourseSidebar } from "./components/Common/CourseSidebar";
import { CalendarView } from "./components/Calendar/CalendarView";
import { GlobalLibraryView } from "./components/Library/GlobalLibraryView";
import { GlobalDeckView } from "./components/AnkiDeck/GlobalDeckView";
import { savePretestAttempt } from "./firebase/firestoreService";

function AppContent() {
  const { topic, currentUserId, currentUser, loading, theme, setScheduleModalOpen, setCourseSidebarOpen } = useUser();

  // Vista activa sincronizada con Hash de la URL para que no se pierda al recargar
  const [activeView, setActiveView] = useState(() => {
    const hash = window.location.hash.replace("#/", "").replace("#", "");
    const validViews = [
      "hub", 
      "topic_day", 
      "calendar", 
      "global_library", 
      "global_anki", 
      "pretest_play", 
      "pretest_audit", 
      "resources", 
      "anki", 
      "simulator"
    ];
    if (validViews.includes(hash)) return hash;
    return localStorage.getItem("enarmcito_last_view") || "hub";
  });

  // Guardar vista en hash y storage
  const navigateToView = (viewName) => {
    setActiveView(viewName);
    window.location.hash = `#/${viewName}`;
    localStorage.setItem("enarmcito_last_view", viewName);
  };

  // Escuchar botón atrás / adelante del navegador
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#/", "").replace("#", "");
      const validViews = [
        "hub", 
        "topic_day", 
        "calendar", 
        "global_library", 
        "global_anki", 
        "pretest_play", 
        "pretest_audit", 
        "resources", 
        "anki", 
        "simulator"
      ];
      if (validViews.includes(hash)) {
        setActiveView(hash);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    if (!window.location.hash) {
      window.location.hash = `#/${activeView}`;
    }
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [activeView]);

  if (loading || !topic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold font-mono">Cargando ENARMCITO...</p>
        </div>
      </div>
    );
  }

  // Obtener respuestas guardadas para el usuario y tema actual
  const getSavedPretestAnswers = () => {
    const storageKey = `enarmcito_pretest_answers_${currentUserId}_${topic.id}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  };

  // Navegar a una fase específica desde el Hub
  const handleSelectPhase = (phaseNumber) => {
    switch (phaseNumber) {
      case 0:
        // Si ya completó el Pre-Test y tiene reactivos cargados, abrir su Auditoría; si no, ir al reproductor / cargador JSON
        if (currentUser.today_status?.phase0_done && (topic.pretest?.questions?.length || 0) > 0) {
          navigateToView("pretest_audit");
        } else {
          navigateToView("pretest_play");
        }
        break;
      case 1:
        navigateToView("resources");
        break;
      case 2:
        navigateToView("anki");
        break;
      case 3:
        navigateToView("simulator");
        break;
      default:
        navigateToView("hub");
    }
  };

  // Concluir resolución del Pre-Test
  const handleFinishPretest = (answers) => {
    const storageKey = `enarmcito_pretest_answers_${currentUserId}_${topic.id}`;
    localStorage.setItem(storageKey, JSON.stringify(answers));
    navigateToView("pretest_audit");
  };

  // Guardar auditoría y proceder a Fase 1
  const handleSaveAuditAndProceed = async (stats) => {
    await savePretestAttempt(currentUserId, topic.id, stats);
    navigateToView("resources");
  };

  // Reiniciar el Pre-Test para volver a contestarlo desde cero
  const handleRetakePretest = () => {
    navigateToView("pretest_play");
  };

  const isExamMode = theme === "enarm-cifrhs";

  return (
    <div className={`min-h-screen w-full overflow-x-hidden flex flex-col transition-colors ${
      isExamMode ? "bg-white text-black font-clinical" : ""
    }`}>
      {/* Selector de Usuario Inicial si no hay sesión activa */}
      <InitialUserSelectModal />

      {/* Modal de PIN para cambio de usuario */}
      <PinModal />

      {/* Modal de Configuración (Accesibilidad, Tema, Tamaño de Letra) */}
      <SettingsModal />

      {/* Calendario y Cronograma Operativo de Pretemporada (18 Días / 3 Semanas) */}
      <ScheduleCalendarModal />

      {/* Panel de Navegación Lateral estilo LMS (Cursos y Sub-temas) */}
      <CourseSidebar />

      <Navbar activeTab={activeView} setActiveTab={navigateToView} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-5 lg:px-8 pt-2.5 sm:pt-5 pb-24 lg:pb-8 overflow-x-hidden min-w-0">
        {/* VISTA 1: TABLERO HUB (Gamificación Dúo, avance global y diagnóstico) */}
        {activeView === "hub" && (
          <MainDashboardHub
            onGoToTodayTopic={() => navigateToView("topic_day")}
            onOpenCourses={() => setCourseSidebarOpen(true)}
            onOpenSchedule={() => setScheduleModalOpen(true)}
          />
        )}

        {/* VISTA 2: TEMA DEL DÍA (4 Fases de Estudio) */}
        {activeView === "topic_day" && (
          <DayOverview 
            onSelectPhase={handleSelectPhase}
            onBackToDashboard={() => navigateToView("hub")} 
          />
        )}

        {/* VISTA 3: CALENDARIO MENSUAL & CUENTA REGRESIVA ENARM */}
        {activeView === "calendar" && (
          <CalendarView 
            onSelectDayTopic={() => navigateToView("topic_day")} 
          />
        )}

        {/* VISTA 4: BIBLIOTECA GLOBAL DE RECURSOS & DOCUMENTOS */}
        {activeView === "global_library" && (
          <GlobalLibraryView />
        )}

        {/* VISTA 5: PANTALLA GENERAL DE MAZOS ANKI FSRS */}
        {activeView === "global_anki" && (
          <GlobalDeckView 
            onStartStudyDeck={() => navigateToView("anki")} 
          />
        )}

        {activeView === "pretest_play" && (
          <PretestPlayer
            topic={topic}
            onFinishTest={handleFinishPretest}
            onBackToHub={() => navigateToView("hub")}
          />
        )}

        {activeView === "pretest_audit" && (
          <AuditBreakdown
            topic={topic}
            rawAnswers={getSavedPretestAnswers()}
            onSaveAndProceed={handleSaveAuditAndProceed}
            onRetakePretest={handleRetakePretest}
            onBackToHub={() => navigateToView("hub")}
          />
        )}

        {activeView === "resources" && (
          <ResourceHub
            topic={topic}
            onBackToHub={() => navigateToView("hub")}
            onProceedToAnki={() => navigateToView("anki")}
          />
        )}

        {activeView === "anki" && (
          <AnkiCardViewer
            topic={topic}
            onBackToHub={() => navigateToView("hub")}
            onProceedToSimulator={() => navigateToView("simulator")}
          />
        )}

        {activeView === "simulator" && (
          <SimulatorRunner
            topic={topic}
            onBackToHub={() => navigateToView("hub")}
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <UserProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </UserProvider>
  );
}
