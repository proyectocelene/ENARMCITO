// src/App.jsx
import React, { useState } from "react";
import { UserProvider, useUser } from "./context/UserContext";
import { Navbar } from "./components/Navbar";
import { DayOverview } from "./components/DailyHub/DayOverview";
import { PretestPlayer } from "./components/Phase0_Pretest/PretestPlayer";
import { AuditBreakdown } from "./components/Phase0_Pretest/AuditBreakdown";
import { ResourceHub } from "./components/Phase1_Resources/ResourceHub";
import { AnkiCardViewer } from "./components/Phase2_Anki/AnkiCardViewer";
import { SimulatorRunner } from "./components/Phase3_Simulator/SimulatorRunner";
import { PinModal } from "./components/Common/PinModal";
import { InitialUserSelectModal } from "./components/Common/InitialUserSelectModal";
import { AccessibilityBar } from "./components/Common/AccessibilityBar";
import { savePretestAttempt } from "./firebase/firestoreService";

function AppContent() {
  const { topic, currentUserId, loading, theme } = useUser();

  // Vista activa sincronizada con Hash de la URL para que no se pierda al recargar
  const [activeView, setActiveView] = useState(() => {
    const hash = window.location.hash.replace("#/", "").replace("#", "");
    const validViews = ["hub", "pretest_play", "pretest_audit", "resources", "anki", "simulator"];
    if (validViews.includes(hash)) return hash;
    return localStorage.getItem("enarmcito_last_view") || "hub";
  });
  const [pretestAnswers, setPretestAnswers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("enarmcito_current_pretest_answers") || "{}");
    } catch {
      return {};
    }
  });

  // Guardar vista en hash y storage
  const navigateToView = (viewName) => {
    setActiveView(viewName);
    window.location.hash = `#/${viewName}`;
    localStorage.setItem("enarmcito_last_view", viewName);
  };

  // Escuchar botón atrás / adelante del navegador
  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#/", "").replace("#", "");
      const validViews = ["hub", "pretest_play", "pretest_audit", "resources", "anki", "simulator"];
      if (validViews.includes(hash)) {
        setActiveView(hash);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    // Establecer hash inicial si no existe
    if (!window.location.hash) {
      window.location.hash = `#/${activeView}`;
    }
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [activeView]);

  if (loading || !topic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold">Cargando plataforma ENARMCITO...</p>
        </div>
      </div>
    );
  }

  // Navegar a una fase específica desde el Hub
  const handleSelectPhase = (phaseNumber) => {
    switch (phaseNumber) {
      case 0:
        navigateToView("pretest_play");
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

  // Concluir resolución del Pre-Test y pasar a Auditoría
  const handleFinishPretest = (answers) => {
    setPretestAnswers(answers);
    localStorage.setItem("enarmcito_current_pretest_answers", JSON.stringify(answers));
    navigateToView("pretest_audit");
  };

  // Guardar auditoría y proceder a Fase 1
  const handleSaveAuditAndProceed = async (stats) => {
    await savePretestAttempt(currentUserId, topic.id, stats);
    localStorage.removeItem("enarmcito_current_pretest_answers");
    navigateToView("resources");
  };

  const isExamMode = theme === "enarm-cifrhs";

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${
      isExamMode ? "bg-white text-black font-clinical" : ""
    }`}>
      {/* Selector de Usuario Inicial si no hay sesión activa */}
      <InitialUserSelectModal />

      {/* Modal de PIN para cambio de usuario */}
      <PinModal />

      <Navbar activeTab={activeView} setActiveTab={navigateToView} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {activeView === "hub" && (
          <DayOverview onSelectPhase={handleSelectPhase} />
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
            rawAnswers={pretestAnswers}
            onSaveAndProceed={handleSaveAuditAndProceed}
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

      {/* Botón flotante y modal de accesibilidad */}
      <AccessibilityBar />

      {/* Footer minimalista */}
      <footer className="border-t border-slate-700/20 py-4 text-center text-xs opacity-60">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ENARMCITO • Preparación Médica ENARM Dúo (Donato & Sonia)</span>
          <span className="font-mono text-[11px]">
            Fase Pre-Temporada (Octubre) • GPC CENETEC / NOM
          </span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}
