// src/components/Phase3_Simulator/SimulatorRunner.jsx
// Fase 3: Simulador Post-Estudio de Alto Rendimiento (Consolidación, Transferencia y Resistencia)
// Integra:
// 1. Cronómetro global de 30 minutos (cuenta regresiva) y ritmo medio por reactivo (~72s).
// 2. Casos Clínicos Seriados con viñeta contextual de 3-4 preguntas encadenadas (badge SERIADO).
// 3. Cuota de reactivos en inglés con etiqueta de traducción médica.
// 4. Copiado de Prompt Maestro para Chatbot (Gemini / AI Studio / ChatGPT) e importador JSON exclusivo para Donato.
// 5. Informe final de auditoría detallado con ruta del algoritmo GPC, trampa del distractor y pase directo de flashcards TSV a Anki FSRS.

import React, { useState, useEffect, useRef } from "react";
import { useUser } from "../../context/UserContext";
import { useToast } from "../Common/ToastAndConfirm";
import { saveSimulationToTopic, appendFlashcardsToTopic } from "../../firebase/firestoreService";
import { 
  generateSimulatorPromptForChatbot, 
  parseAndValidateSimulatorJson,
  generateSimulatorAuditReport
} from "../../services/telemetryEngine";
import { getBundledSimulator } from "../../data/simulators/index.js";
import { MarkdownRenderer } from "../Common/MarkdownRenderer";
import { 
  Timer, 
  X, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Trophy, 
  ArrowRight,
  ArrowLeft,
  Flame,
  Zap,
  Copy,
  Upload,
  Sparkles,
  FileJson,
  Layers,
  Globe,
  AlertTriangle,
  Bookmark,
  Check,
  Share2
} from "lucide-react";
import confetti from "canvas-confetti";

export function SimulatorRunner({ topic, onBackToHub }) {
  const { currentUserId, currentUser, markPhaseComplete, theme } = useUser();
  const { showToast } = useToast();
  const isDark = theme === "dark";

  const bundledSim = getBundledSimulator(topic.code || topic.id);
  const simData = (topic.simulation?.questions?.length > 0)
    ? topic.simulation
    : (bundledSim || topic.simulation || { questions: [], duration_minutes: 30, seconds_per_question: 72 });
  const questions = simData.questions || [];

  // Modo JSON Studio / Creador
  const [showJsonStudio, setShowJsonStudio] = useState(false);
  const [jsonInputText, setJsonInputText] = useState("");
  const [jsonError, setJsonError] = useState(null);
  const [isSavingJson, setIsSavingJson] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  // Estados de examen activo
  const [currentIndex, setCurrentIndex] = useState(0);
  const totalExamSeconds = (simData.duration_minutes || 30) * 60;
  const [overallTimeLeft, setOverallTimeLeft] = useState(totalExamSeconds);
  const [questionSeconds, setQuestionSeconds] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [struckOptions, setStruckOptions] = useState([]);
  const [isAnswered, setIsAnswered] = useState(false);

  // Gamificación y combo
  const [streakCombo, setStreakCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  // Historial de respuestas y auditoría
  const [sessionResults, setSessionResults] = useState([]);
  const [isFinished, setIsFinished] = useState(false);
  const [copiedAuditReport, setCopiedAuditReport] = useState(false);

  const examTimerRef = useRef(null);
  const qTimerRef = useRef(null);
  const currentQ = questions[currentIndex];

  const isDonato = currentUserId === "donato";

  // Copiar Prompt Maestro para IA Studio / ChatGPT / Gemini
  const handleCopyMasterPrompt = () => {
    const promptText = generateSimulatorPromptForChatbot(topic);
    navigator.clipboard.writeText(promptText).then(() => {
      setCopiedPrompt(true);
      showToast("Prompt de Simulador copiado. Pégalo en tu Chatbot para obtener las 25 preguntas.", "success");
      setTimeout(() => setCopiedPrompt(false), 3000);
    });
  };

  // Importar JSON
  const handleImportJson = async (e) => {
    e.preventDefault();
    setJsonError(null);

    if (!isDonato) {
      setJsonError("Solo Donato tiene permisos para cargar los simuladores oficiales.");
      return;
    }

    try {
      const validatedSim = parseAndValidateSimulatorJson(jsonInputText, topic);
      setIsSavingJson(true);

      await saveSimulationToTopic(topic.code || topic.id, validatedSim, currentUserId);

      // Reiniciar estado
      setCurrentIndex(0);
      setSessionResults([]);
      setStreakCombo(0);
      setOverallTimeLeft((validatedSim.duration_minutes || 30) * 60);
      setIsFinished(false);
      setShowJsonStudio(false);
      setJsonInputText("");
      showToast(`¡Simulador guardado con ${validatedSim.questions.length} reactivos para Donato y Sonia!`, "success");
    } catch (err) {
      console.error(err);
      setJsonError(err.message || "Error al validar JSON");
    } finally {
      setIsSavingJson(false);
    }
  };

  // Cronómetro global de cuenta regresiva (30 min)
  useEffect(() => {
    if (isFinished || questions.length === 0 || showJsonStudio) {
      clearInterval(examTimerRef.current);
      clearInterval(qTimerRef.current);
      return;
    }

    examTimerRef.current = setInterval(() => {
      setOverallTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(examTimerRef.current);
          handleTimeExpiredExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    qTimerRef.current = setInterval(() => {
      setQuestionSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(examTimerRef.current);
      clearInterval(qTimerRef.current);
    };
  }, [isFinished, questions.length, showJsonStudio]);

  // Si se termina el tiempo del examen
  const handleTimeExpiredExam = () => {
    showToast("¡Tiempo agotado del simulador (30 min)!", "error");
    finishSimulator(sessionResults);
  };

  // Tachar distractor
  const toggleStrike = (optKey) => {
    if (isAnswered) return;
    setStruckOptions((prev) =>
      prev.includes(optKey) ? prev.filter((k) => k !== optKey) : [...prev, optKey]
    );
    if (selectedOption === optKey) setSelectedOption(null);
  };

  // Confirmar respuesta de la pregunta
  const handleConfirmAnswer = () => {
    if (!selectedOption || isAnswered || !currentQ) return;
    setIsAnswered(true);

    const isCorrect = selectedOption === currentQ.correctAnswer;
    if (isCorrect) {
      const newCombo = streakCombo + 1;
      setStreakCombo(newCombo);
      if (newCombo > maxCombo) setMaxCombo(newCombo);
    } else {
      setStreakCombo(0);
    }

    const resultItem = {
      qIndex: currentIndex + 1,
      selected: selectedOption,
      correct: currentQ.correctAnswer,
      isCorrect,
      timeSpent: questionSeconds
    };

    setSessionResults((prev) => [...prev, resultItem]);
  };

  // Siguiente reactivo
  const handleNextQuestion = () => {
    setIsAnswered(false);
    setSelectedOption(null);
    setStruckOptions([]);
    setQuestionSeconds(0);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      finishSimulator(sessionResults);
    }
  };

  const finishSimulator = (results) => {
    setIsFinished(true);
    const totalCorrect = results.filter((r) => r.isCorrect).length;
    const scorePct = questions.length > 0 ? Math.round((totalCorrect / questions.length) * 100) : 0;

    confetti({
      particleCount: 130,
      spread: 100,
      origin: { y: 0.5 }
    });

    const bonusXp = maxCombo >= 5 ? 50 : 0;
    markPhaseComplete(3, { phase3_score: scorePct, phase3_bonus_combo: bonusXp });
  };

  // Copiar informe de auditoría completo
  const handleCopyAuditReport = () => {
    const reportText = generateSimulatorAuditReport(topic, sessionResults, questions, currentUser?.name || "Donato");
    navigator.clipboard.writeText(reportText).then(() => {
      setCopiedAuditReport(true);
      showToast("Informe de auditoría y flashcards copiados", "success");
      setTimeout(() => setCopiedAuditReport(false), 3000);
    });
  };

  // Importar tarjetas de fallos directamente a Anki FSRS
  const handleImportFailedCardsToAnki = async () => {
    try {
      const reportText = generateSimulatorAuditReport(topic, sessionResults, questions, currentUser?.name || "Donato");
      const match = reportText.match(/```tsv\r?\n([\s\S]*?)```/);
      if (!match || !match[1].trim()) {
        showToast("No hay reactivos fallados para exportar a Anki", "info");
        return;
      }
      const { addedCount } = await appendFlashcardsToTopic(topic.code || topic.id, match[1], currentUser?.name || "Donato");
      showToast(`¡${addedCount} micro-viñetas agregadas a tu mazo Anki FSRS!`, "success");
    } catch (err) {
      showToast("Error al importar a Anki", "error");
    }
  };

  // Formatear minutos y segundos
  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Si no hay preguntas cargadas en el simulador
  if (questions.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 pb-16">
        <div className={`border-2 rounded-2xl p-3 shadow-xs flex items-center justify-between ${
          isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
        }`}>
          <button
            type="button"
            onClick={onBackToHub}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-bold hover:bg-slate-200 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al Hub</span>
          </button>
          <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
            Fase 3: Simulador Post-Estudio
          </span>
        </div>

        <div className={`border-2 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-sm ${
          isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
        }`}>
          <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/10 text-rose-600 flex items-center justify-center text-3xl">
            ⏱️
          </div>

          <div className="space-y-1.5 max-w-lg mx-auto">
            <h2 className="text-lg sm:text-xl font-black">
              Simulador Post-Estudio Pendiente ({topic.code}: {topic.title})
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              El simulador de cierre evalúa <strong>consolidación, transferencia al caso real y resistencia mental</strong> mediante 20-25 preguntas de 2do y 3er orden con distractores trampa y cuota de inglés.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleCopyMasterPrompt}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-95"
            >
              {copiedPrompt ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedPrompt ? "¡Prompt Copiado!" : "Copiar Prompt Maestro para IA"}</span>
            </button>

            {isDonato ? (
              <button
                type="button"
                onClick={() => setShowJsonStudio(true)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>Pegar JSON del Simulador</span>
              </button>
            ) : (
              <span className="text-xs text-slate-500 font-bold px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border">
                Esperando que Donato suba el simulador
              </span>
            )}
          </div>
        </div>

        {/* Modal Pegar JSON */}
        {showJsonStudio && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
            <div className={`border-2 rounded-3xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${
              isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
            }`}>
              <div className="flex items-center justify-between border-b pb-2.5 border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <FileJson className="w-5 h-5 text-rose-500" />
                  <h3 className="font-black text-base">Cargar Simulador Post-Estudio (25 Reactivos)</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowJsonStudio(false)}
                  className="p-1 rounded-lg opacity-60 hover:opacity-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleImportJson} className="space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Pega aquí el JSON devuelto por Google AI Studio, Gemini o ChatGPT tras usar el Prompt Maestro:
                </p>

                <textarea
                  rows={10}
                  required
                  placeholder='{"questions": [ { "id": "d01_sim_q1", "vignette": "...", "question_text": "...", "options": {...}, "correctAnswer": "A", ... } ] }'
                  value={jsonInputText}
                  onChange={(e) => setJsonInputText(e.target.value)}
                  className={`w-full rounded-2xl p-3 text-xs font-mono border-2 focus:outline-hidden focus:border-rose-500 ${
                    isDark ? "bg-slate-950 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                />

                {jsonError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-600 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{jsonError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowJsonStudio(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold opacity-70 hover:opacity-100 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingJson}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 text-white text-xs font-bold shadow-xs hover:opacity-95 cursor-pointer"
                  >
                    {isSavingJson ? "Guardando..." : "Validar y Guardar Simulador"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // PANTALLA DE RESULTADOS FINALES Y AUDITORÍA
  if (isFinished) {
    const totalCorrect = sessionResults.filter((r) => r.isCorrect).length;
    const scorePct = Math.round((totalCorrect / questions.length) * 100);
    const avgSeconds = Math.round(
      sessionResults.reduce((acc, curr) => acc + curr.timeSpent, 0) / questions.length
    );
    const failedItems = sessionResults.filter((r) => !r.isCorrect);

    return (
      <div className="max-w-4xl mx-auto space-y-4 pb-16">
        <div className={`border-2 rounded-3xl p-6 sm:p-8 text-center shadow-md space-y-5 ${
          isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
        }`}>
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-lg">
            <Trophy className="w-8 h-8" />
          </div>

          <div>
            <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider block mb-1">
              Simulador Post-Estudio Concluido • 30 Minutos
            </span>
            <h2 className="text-2xl sm:text-3xl font-black">
              {scorePct >= 80 ? "¡Excelente Transferencia Clínica!" : "Auditoría de Cierre Completada"}
            </h2>
            <p className="text-xs opacity-75 mt-1 font-medium">
              {questions.length} reactivos de 2do y 3er orden resueltos bajo presión de tiempo
            </p>
          </div>

          {/* Tarjetas de estadísticas */}
          <div className="grid grid-cols-3 gap-2.5 max-w-xl mx-auto">
            <div className="p-3 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
              <span className="text-[10px] opacity-70 font-bold block">Aciertos</span>
              <div className="text-xl font-black mt-0.5 text-slate-900 dark:text-white">
                {totalCorrect}/{questions.length}
              </div>
            </div>

            <div className="p-3 rounded-2xl border-2 border-blue-500/30 bg-blue-500/10 text-blue-900 dark:text-cyan-200">
              <span className="text-[10px] font-bold block">Precisión</span>
              <div className="text-xl font-black mt-0.5">
                {scorePct}%
              </div>
            </div>

            <div className="p-3 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
              <span className="text-[10px] opacity-70 font-bold block">Ritmo Medio</span>
              <div className="text-xl font-black mt-0.5 font-mono text-slate-900 dark:text-white">
                {avgSeconds}s
              </div>
            </div>
          </div>

          {/* Botones de Auditoría y Pase a Anki */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleCopyAuditReport}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold flex items-center gap-2 border border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              {copiedAuditReport ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>{copiedAuditReport ? "¡Auditoría Copiada!" : "Copiar Informe de Auditoría"}</span>
            </button>

            {failedItems.length > 0 && (
              <button
                type="button"
                onClick={handleImportFailedCardsToAnki}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>Pase Directo a Anki ({failedItems.length} fallos)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsFinished(false);
                setCurrentIndex(0);
                setSessionResults([]);
                setStreakCombo(0);
                setOverallTimeLeft((simData.duration_minutes || 30) * 60);
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Repetir</span>
            </button>

            <button
              type="button"
              onClick={onBackToHub}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>Volver al Tablero</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* DESGLOSE REACTIVO POR REACTIVO DE LA AUDITORÍA */}
        <div className="space-y-3">
          <h3 className="text-base font-black text-slate-900 dark:text-white px-1">
            Auditoría de Algoritmos GPC y Trampas ({questions.length} Reactivos)
          </h3>

          {questions.map((q, idx) => {
            const res = sessionResults.find((r) => r.qIndex === q.index) || sessionResults[idx];
            const isCorrect = res?.isCorrect;
            const chosen = res?.selected;

            return (
              <div
                key={q.id || idx}
                className={`border-2 rounded-2xl p-4 space-y-2.5 transition-all ${
                  isCorrect
                    ? isDark ? "bg-slate-900 border-emerald-700/60" : "bg-white border-emerald-300"
                    : isDark ? "bg-slate-900 border-rose-700/60" : "bg-white border-rose-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-black ${
                      isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                    }`}>
                      Q{q.index} • {isCorrect ? "ACIERTO" : "FALLO"}
                    </span>
                    {q.case_id && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-cyan-300 border border-blue-300">
                        {q.case_id}
                      </span>
                    )}
                    {q.is_english && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-300">
                        🇬🇧 INGLÉS
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-mono text-slate-500">
                    {res?.timeSpent || 0}s
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium line-clamp-3">
                  {q.vignette}
                </p>

                <h4 className="text-xs sm:text-sm font-bold text-slate-950 dark:text-white">
                  {q.question_text}
                </h4>

                <div className="text-xs space-y-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>Elegiste: <strong>{chosen || "Sin responder"}</strong></span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      Correcta: {q.correctAnswer} ({q.options[q.correctAnswer]})
                    </span>
                  </div>

                  {!isCorrect && (
                    <div className="text-[11px] text-rose-700 dark:text-rose-400 font-semibold pt-1">
                      🎯 <strong>Diagnóstico de Falla:</strong>{" "}
                      {(() => {
                        const trapText = typeof q.distractor_trap === "object" ? q.distractor_trap.trap_type : String(q.distractor_trap || "");
                        const lower = trapText.toLowerCase();
                        if (lower.includes("paciente incorrecto") || lower.includes("comorbilidad") || lower.includes("contraindicaci")) {
                          return "Condición Facilitadora (Antecedentes / Comorbilidades / Alergia / TFG)";
                        } else if (lower.includes("cierre prematuro") || lower.includes("anclaje") || lower.includes("espectro")) {
                          return "Fallo (Mecanismo Fisiopatológico / Sesgo de Anclaje Prematuro)";
                        }
                        return "Consecuencia (Clínica / Laboratorios / Escalonamiento GPC)";
                      })()}
                    </div>
                  )}

                  {q.distractor_trap && (
                    <div className="text-[11px] text-amber-800 dark:text-amber-300 pt-1">
                      ⚠️ <strong>Trampa del Distractor:</strong> {typeof q.distractor_trap === "object" ? `${q.distractor_trap.trap_type}: ${q.distractor_trap.explanation}` : q.distractor_trap}
                    </div>
                  )}

                  {q.gpc_algorithm_step && (
                    <div className="text-[11px] text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-800">
                      📜 <strong>Ruta Algoritmo GPC:</strong> {q.gpc_algorithm_step}
                    </div>
                  )}

                  {q.anki_flashcard && !isCorrect && (
                    <div className="text-[11px] text-purple-700 dark:text-purple-300 pt-1 border-t border-slate-200 dark:border-slate-800 bg-purple-500/5 p-2 rounded-lg">
                      🎴 <strong>Micro-Viñeta Anki (3 líneas):</strong>
                      <div className="font-medium mt-0.5">• <em>Pregunta:</em> {q.anki_flashcard.front}</div>
                      <div className="font-bold text-purple-900 dark:text-purple-200">• <em>Perla GPC:</em> {q.anki_flashcard.back}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // PANTALLA DE RESOLUCIÓN DEL SIMULADOR ACTIVO
  const isTimerCritical = overallTimeLeft <= 300; // últimos 5 minutos

  return (
    <div className="max-w-4xl mx-auto space-y-3.5 pb-16">
      {/* Barra de progreso y cronómetros */}
      <div className={`flex items-center justify-between border-2 rounded-2xl p-3 shadow-xs transition-colors ${
        isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
      }`}>
        <button
          type="button"
          onClick={onBackToHub}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold transition-all text-slate-800 dark:text-slate-200 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Hub</span>
        </button>

        <div className="flex items-center gap-2.5">
          <span className="text-xs font-black text-rose-600 dark:text-rose-400 font-mono">
            Reactivo {currentIndex + 1} de {questions.length}
          </span>

          {currentQ.case_id && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-cyan-300 border border-blue-300">
              {currentQ.case_id}
            </span>
          )}

          {currentQ.is_english && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-100 text-indigo-800 border border-indigo-300 flex items-center gap-1">
              <Globe className="w-3 h-3" />
              <span>EN</span>
            </span>
          )}

          {streakCombo >= 2 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-400 flex items-center gap-1 animate-pulse">
              <Flame className="w-3 h-3 fill-amber-500 text-amber-500" />
              <span>x{streakCombo}</span>
            </span>
          )}
        </div>

        {/* Cronómetro Global de 30 minutos */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-black border-2 transition-colors ${
          isTimerCritical
            ? "bg-rose-500/20 border-rose-500 text-rose-600 dark:text-rose-400 animate-pulse"
            : isDark ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-300 text-slate-800"
        }`}>
          <Timer className="w-3.5 h-3.5" />
          <span>{formatTimer(overallTimeLeft)}</span>
        </div>
      </div>

      {/* Barra de progreso global del examen */}
      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-1.5 bg-gradient-to-r from-rose-600 to-amber-500 rounded-full transition-all duration-300"
          style={{ width: `${Math.round(((currentIndex + 1) / questions.length) * 100)}%` }}
        />
      </div>

      {/* Tarjeta del Caso Clínico y Pregunta */}
      <div className={`border-2 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5 transition-colors ${
        isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
      }`}>
        {/* Título de caso seriado si existe */}
        {currentQ.case_title && (
          <div className="flex items-center gap-2 text-xs font-extrabold text-blue-600 dark:text-cyan-400">
            <Bookmark className="w-3.5 h-3.5" />
            <span>{currentQ.case_title}</span>
          </div>
        )}

        {/* Viñeta Clínica con soporte Markdown (tablas de laboratorio, fórmulas, etc.) */}
        <div className="clinical-case-text p-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 leading-relaxed text-xs sm:text-sm">
          <p>{currentQ.vignette}</p>
        </div>

        <div>
          <h3 className="clinical-option-text font-black text-slate-950 dark:text-white">
            {currentQ.question_text}
          </h3>
        </div>

        {/* Opciones A, B, C, D con soporte de tachado malicioso */}
        <div className="space-y-2">
          {Object.entries(currentQ.options).map(([optKey, optText]) => {
            const isSelected = selectedOption === optKey;
            const isStruck = struckOptions.includes(optKey);
            const isCorrect = currentQ.correctAnswer === optKey;

            let borderStyle = "";
            if (isAnswered) {
              if (isCorrect) borderStyle = "border-emerald-500 bg-emerald-500/15 text-emerald-950 dark:text-emerald-200 font-semibold";
              else if (isSelected) borderStyle = "border-rose-500 bg-rose-500/15 text-rose-950 dark:text-rose-200 font-semibold";
            } else if (isSelected) {
              borderStyle = isDark 
                ? "border-blue-500 bg-blue-600/25 text-white ring-2 ring-blue-500"
                : "border-blue-600 bg-blue-50 text-blue-950 ring-2 ring-blue-500 font-semibold";
            } else if (isStruck) {
              borderStyle = "border-gray-200 bg-gray-100 text-gray-400 opacity-40";
            } else {
              borderStyle = isDark
                ? "border-slate-700 bg-slate-800/40 hover:border-slate-600 text-slate-200"
                : "border-slate-300 bg-white hover:border-slate-400 text-slate-900";
            }

            return (
              <div
                key={optKey}
                className={`flex items-center gap-2 p-1 rounded-xl border-2 transition-all ${borderStyle}`}
              >
                <button
                  type="button"
                  disabled={isAnswered}
                  onClick={() => {
                    setSelectedOption(optKey);
                    setStruckOptions(struckOptions.filter((k) => k !== optKey));
                  }}
                  className="flex items-start gap-2.5 flex-1 text-left p-1.5 rounded-lg cursor-pointer min-w-0"
                >
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    isSelected 
                      ? "bg-blue-600 text-white shadow-2xs" 
                      : isDark ? "bg-slate-800 text-slate-400 border border-slate-700" : "bg-slate-100 text-slate-700 border border-slate-300"
                  }`}>
                    {optKey}
                  </span>
                  <span className={`clinical-option-text pt-0.5 leading-snug ${isStruck ? "line-through opacity-60" : ""}`}>
                    {optText}
                  </span>
                </button>

                {!isAnswered && (
                  <button
                    type="button"
                    onClick={() => toggleStrike(optKey)}
                    title="Tachar distractor"
                    className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isStruck 
                        ? "bg-rose-500/20 text-rose-500" 
                        : isDark ? "bg-slate-800 text-slate-500 hover:text-slate-300" : "bg-slate-100 text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Retroalimentación inmediata con algoritmo GPC */}
        {isAnswered && (
          <div className="p-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs space-y-1.5 animate-fadeIn">
            <div className="flex items-center gap-2 font-bold">
              {selectedOption === currentQ.correctAnswer ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-black">
                  <CheckCircle2 className="w-4 h-4" /> ¡Acierto! Respuesta GPC: {currentQ.correctAnswer}
                </span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1 font-black">
                  <XCircle className="w-4 h-4" /> Fallo. Respuesta GPC: {currentQ.correctAnswer}
                </span>
              )}
            </div>

            {currentQ.distractor_trap && (
              <div className="text-[11px] text-amber-800 dark:text-amber-300">
                ⚠️ <strong>Trampa del Distractor:</strong> {typeof currentQ.distractor_trap === "object" ? `${currentQ.distractor_trap.trap_type}: ${currentQ.distractor_trap.explanation}` : currentQ.distractor_trap}
              </div>
            )}

            {currentQ.gpc_algorithm_step && (
              <p className="opacity-90 leading-relaxed pt-1 border-t border-slate-200 dark:border-slate-800">
                📜 <strong>Algoritmo GPC:</strong> {currentQ.gpc_algorithm_step}
              </p>
            )}
          </div>
        )}

        {/* Botón de Acción */}
        <div className="pt-2 flex items-center justify-end">
          {!isAnswered ? (
            <button
              type="button"
              disabled={!selectedOption}
              onClick={handleConfirmAnswer}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                selectedOption
                  ? "bg-gradient-to-r from-rose-600 to-amber-600 text-white hover:opacity-95 active:scale-95 cursor-pointer"
                  : isDark ? "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50" : "bg-slate-200 text-slate-400 cursor-not-allowed opacity-50"
              }`}
            >
              <span>Confirmar Respuesta</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextQuestion}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
            >
              <span>{currentIndex < questions.length - 1 ? "Siguiente Reactivo" : "Ver Auditoría Final"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
