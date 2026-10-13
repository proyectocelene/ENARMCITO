// src/components/Phase0_Pretest/PretestPlayer.jsx
// Fase A: Resolución del Pre-Test Psicométrico ENARM + Centro de Generación de Prompt e Importación JSON
// Implementa:
// 1. Copiado en 1 clic del Prompt Maestro para Chatbot (Gemini / ChatGPT / NotebookLM)
// 2. Importador y Validador directo del JSON generado (sincronizado con Firestore)
// 3. Viñeta estilo Illness Script en texto plano, casos seriados y reactivos en inglés
// 4. Botones [A][B][C][D], Tachado de distractores [✕], Candado de Confianza [ALTA vs BAJA] y Cronómetro (>90s alerta)

import React, { useState, useEffect, useRef } from "react";
import { useUser } from "../../context/UserContext";
import { useToast } from "../Common/ToastAndConfirm";
import { savePretestToTopic } from "../../firebase/firestoreService";
import { 
  generatePretestPromptForChatbot, 
  parseAndValidatePretestJson,
  PIVOT_CONCEPTS
} from "../../services/telemetryEngine";
import { 
  X, 
  Zap, 
  HelpCircle, 
  Clock, 
  AlertCircle, 
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Copy,
  Upload,
  Sparkles,
  CheckCircle2,
  FileJson,
  Eye,
  EyeOff,
  Link2,
  Globe
} from "lucide-react";

export function PretestPlayer({ topic, onFinishTest, onBackToHub }) {
  const { currentUserId, theme } = useUser();
  const { showToast } = useToast();
  const isDark = theme === "dark";

  const questions = topic.pretest?.questions || [];
  const storageKey = `enarmcito_pretest_answers_${currentUserId}_${topic.id}`;

  // Estado del importador JSON / Generador de Prompt
  const [showJsonStudio, setShowJsonStudio] = useState(false);
  const [jsonInputText, setJsonInputText] = useState("");
  const [jsonError, setJsonError] = useState(null);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [isSavingJson, setIsSavingJson] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Cargar respuestas previamente guardadas en vivo si las hay
  const [answers, setAnswers] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [currentIndex, setCurrentIndex] = useState(() => {
    try {
      const savedIdx = localStorage.getItem(`${storageKey}_idx`);
      const parsed = savedIdx ? parseInt(savedIdx, 10) : 0;
      return parsed >= 0 && parsed < questions.length ? parsed : 0;
    } catch {
      return 0;
    }
  });

  // Cronómetro en segundo plano por reactivo
  const [questionSeconds, setQuestionSeconds] = useState(0);
  const timerRef = useRef(null);

  const currentQ = questions[currentIndex];
  const currentAnswer = answers[currentQ?.id] || {
    selectedOption: null,
    confidence: null,
    struckOptions: [],
    timeSeconds: 0
  };

  // Temporizador por reactivo
  useEffect(() => {
    setQuestionSeconds(0);
    clearInterval(timerRef.current);

    if (questions.length > 0 && !showJsonStudio) {
      timerRef.current = setInterval(() => {
        setQuestionSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => clearInterval(timerRef.current);
  }, [currentIndex, questions.length, showJsonStudio]);

  // Guardar índice actual en storage
  useEffect(() => {
    if (questions.length > 0) {
      localStorage.setItem(`${storageKey}_idx`, currentIndex.toString());
    }
  }, [currentIndex, storageKey, questions.length]);

  // Copiar el Prompt Maestro para el Chatbot
  const handleCopyMasterPrompt = () => {
    const promptText = generatePretestPromptForChatbot(topic);
    navigator.clipboard.writeText(promptText).then(() => {
      setCopiedPrompt(true);
      showToast("Prompt Maestro copiado. Pégalo en tu Chatbot para obtener el JSON.", "success");
      setTimeout(() => setCopiedPrompt(false), 3000);
    });
  };

  const isDonato = currentUserId === "donato";

  // Validar e importar el JSON pegado por Donato
  const handleImportJson = async (e) => {
    e.preventDefault();
    setJsonError(null);

    if (!isDonato) {
      setJsonError("Solo Donato tiene permisos para subir o modificar los cuestionarios.");
      return;
    }

    try {
      const validatedPretest = parseAndValidatePretestJson(jsonInputText, topic);
      setIsSavingJson(true);

      await savePretestToTopic(topic.code || topic.id, validatedPretest, currentUserId);

      // Limpiar respuestas previas de este tema para iniciar limpio
      localStorage.removeItem(storageKey);
      localStorage.removeItem(`${storageKey}_idx`);
      setAnswers({});
      setCurrentIndex(0);
      setJsonInputText("");
      setShowJsonStudio(false);

      showToast(
        `¡Pre-Test cargado con éxito! Ya está disponible para ti y para Sonia (${validatedPretest.questions.length} reactivos).`,
        "success"
      );
    } catch (err) {
      setJsonError(err.message);
    } finally {
      setIsSavingJson(false);
    }
  };

  // Vista cuando no hay preguntas aún o cuando Donato abre el estudio de carga JSON
  if (!currentQ || questions.length === 0 || (showJsonStudio && isDonato)) {
    const masterPrompt = generatePretestPromptForChatbot(topic);

    // Si es Sonia y aún no hay cuestionario subido por Donato
    if (!isDonato && questions.length === 0) {
      return (
        <div className="max-w-3xl mx-auto space-y-4 pb-12">
          <div className={`flex items-center justify-between border-2 rounded-2xl p-3 sm:p-4 shadow-sm ${
            isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
          }`}>
            <button
              type="button"
              onClick={onBackToHub}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver al Tema</span>
            </button>

            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-cyan-400 block">
                Fase 0 • Cebado Cognitivo ({topic.code || "Tema"})
              </span>
              <h2 className="text-xs sm:text-sm font-black truncate max-w-xs sm:max-w-md">
                {topic.title}
              </h2>
            </div>
          </div>

          <div className={`border-2 rounded-2xl p-8 text-center space-y-3 shadow-sm ${
            isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
          }`}>
            <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border-2 border-blue-500/30 text-blue-600 dark:text-cyan-400 flex items-center justify-center mx-auto text-2xl">
              👨‍⚕️
            </div>
            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-300">
              ⏳ Esperando carga de cuestionario por Donato
            </span>
            <h3 className="text-base sm:text-lg font-black">
              Aún no se ha subido el Pre-Test de {topic.code}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Solo <strong>Donato</strong> tiene habilitada la subida de cuestionarios JSON. En cuanto Donato cargue el cuestionario de <strong>{topic.title}</strong>, te aparecerá aquí <strong>automáticamente en tiempo real</strong> sin necesidad de recargar la página.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto space-y-4 pb-12">
        {/* Barra superior */}
        <div className={`flex items-center justify-between border-2 rounded-2xl p-3 sm:p-4 shadow-sm ${
          isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
        }`}>
          <button
            type="button"
            onClick={() => {
              if (showJsonStudio && questions.length > 0) {
                setShowJsonStudio(false);
              } else {
                onBackToHub();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{showJsonStudio && questions.length > 0 ? "Volver al Examen" : "Volver al Tema"}</span>
          </button>

          <div className="text-right">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-cyan-400 block">
              👨‍⚕️ Panel Exclusivo Donato • Sincronización Dúo ({topic.code || "Tema"})
            </span>
            <h2 className="text-xs sm:text-sm font-black truncate max-w-xs sm:max-w-md">
              {topic.title}
            </h2>
          </div>
        </div>

        {/* PASO 1: Copiar Prompt Maestro para el Chatbot */}
        <div className={`border-2 rounded-2xl p-5 space-y-3.5 shadow-sm ${
          isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 pb-3 border-slate-200 dark:border-slate-800">
            <div className="flex items-start gap-2.5">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-xs flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-cyan-400 block">
                  Paso 1 • Generación con IA (Exclusivo Donato)
                </span>
                <h3 className="text-sm sm:text-base font-black">
                  Copia el Prompt Maestro para tu Chatbot
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Este prompt instruye a Gemini / ChatGPT / NotebookLM a generar los 10-12 casos clínicos (incluyendo casos seriados, 2 en inglés, los 6 Conceptos Pivote, dato pivote oculto y autopsia de los 3 tipos de distractores bajo {topic.normativa_origen}) en el formato JSON exacto.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowPromptPreview(!showPromptPreview)}
                className="px-3 py-2 rounded-xl border-2 border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {showPromptPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPromptPreview ? "Ocultar Prompt" : "Ver Prompt"}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyMasterPrompt}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedPrompt ? "¡Prompt Copiado! ✓" : "📋 Copiar Prompt para Chatbot"}</span>
              </button>
            </div>
          </div>

          {showPromptPreview && (
            <div className="p-3.5 rounded-xl border-2 border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 max-h-64 overflow-y-auto">
              <pre className="text-[11px] font-mono whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-300">
                {masterPrompt}
              </pre>
            </div>
          )}
        </div>

        {/* PASO 2: Pegar e Incorporar el JSON Generado */}
        <div className={`border-2 rounded-2xl p-5 space-y-3.5 shadow-sm ${
          isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
        }`}>
          <div className="flex items-start gap-2.5 border-b-2 pb-3 border-slate-200 dark:border-slate-800">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xs flex-shrink-0">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                Paso 2 • Incorporar Cuestionario para Donato y Sonia
              </span>
              <h3 className="text-sm sm:text-base font-black">
                Pega aquí el código JSON que te entregó el Chatbot
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Al guardarlo, se validará automáticamente y se sincronizará en la nube (Firestore) en el tema <strong>{topic.code}</strong> para que tanto a ti como a <strong>Sonia</strong> les aparezca al instante.
              </p>
            </div>
          </div>

          <form onSubmit={handleImportJson} className="space-y-3">
            <textarea
              rows={8}
              value={jsonInputText}
              onChange={(e) => {
                setJsonInputText(e.target.value);
                if (jsonError) setJsonError(null);
              }}
              placeholder={'Pega aquí el bloque JSON generado por la IA...\n{\n  "topic_code": "' + (topic.code || "D01") + '",\n  "questions": [ ... ]\n}'}
              className="w-full p-3.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-xs focus:border-emerald-500 outline-hidden"
            />

            {jsonError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border-2 border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{jsonError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="submit"
                disabled={!jsonInputText.trim() || isSavingJson}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>{isSavingJson ? "Validando y Sincronizando..." : "Guardar y Compartir con Sonia"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Tachar o destachar distractor [✕]
  const toggleStrikeOption = (optKey) => {
    const struck = currentAnswer.struckOptions || [];
    const isStruck = struck.includes(optKey);
    const newStruck = isStruck
      ? struck.filter((k) => k !== optKey)
      : [...struck, optKey];

    let newSelected = currentAnswer.selectedOption;
    if (!isStruck && newSelected === optKey) {
      newSelected = null;
    }

    const updated = {
      ...answers,
      [currentQ.id]: {
        ...currentAnswer,
        struckOptions: newStruck,
        selectedOption: newSelected
      }
    };
    setAnswers(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  // Seleccionar opción A, B, C, D
  const selectOption = (optKey) => {
    const struck = (currentAnswer.struckOptions || []).filter((k) => k !== optKey);
    const updated = {
      ...answers,
      [currentQ.id]: {
        ...currentAnswer,
        selectedOption: optKey,
        struckOptions: struck
      }
    };
    setAnswers(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  // Seleccionar nivel de confianza
  const setConfidence = (level) => {
    const updated = {
      ...answers,
      [currentQ.id]: {
        ...currentAnswer,
        confidence: level
      }
    };
    setAnswers(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  // Candado obligatorio para avanzar: requiere opción + nivel de confianza
  const canAdvance = Boolean(currentAnswer.selectedOption && currentAnswer.confidence);

  const handleNext = () => {
    if (!canAdvance) return;

    const updatedAnswer = {
      ...currentAnswer,
      timeSeconds: (currentAnswer.timeSeconds || 0) + questionSeconds
    };
    const finalAnswers = {
      ...answers,
      [currentQ.id]: updatedAnswer
    };
    setAnswers(finalAnswers);
    localStorage.setItem(storageKey, JSON.stringify(finalAnswers));

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onFinishTest(finalAnswers);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

  // Detectar si pertenece a un caso seriado (varias preguntas con el mismo case_id)
  const serialQuestions = currentQ.case_id
    ? questions.filter((q) => q.case_id === currentQ.case_id)
    : [];
  const serialPosition = currentQ.case_id
    ? serialQuestions.findIndex((q) => q.id === currentQ.id) + 1
    : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-3.5 pb-8">
      {/* Barra superior de navegación y progreso */}
      <div className={`flex flex-wrap items-center justify-between gap-2 border-2 rounded-2xl p-3 sm:p-3.5 shadow-sm transition-colors ${
        isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
      }`}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackToHub}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition-all text-slate-800 dark:text-slate-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver</span>
          </button>

          {isDonato ? (
            <button
              type="button"
              onClick={() => setShowJsonStudio(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border-2 border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-cyan-300 text-xs font-bold hover:bg-blue-100 transition-all cursor-pointer"
              title="Exclusivo Donato: Generar Prompt o Cargar nuevo JSON de Pre-Test"
            >
              <FileJson className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Subir / Actualizar JSON</span>
            </button>
          ) : (
            <span className="px-2.5 py-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
              👨‍⚕️ Cuestionario compartido por Donato
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-black font-mono text-blue-600 dark:text-cyan-400">
            Reactivo {currentIndex + 1} de {questions.length}
          </span>
          <div className="w-24 sm:w-36 bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-300 dark:border-slate-700">
            <div
              className="bg-gradient-to-r from-blue-600 to-cyan-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span className={questionSeconds > 90 ? "text-amber-600 dark:text-amber-400 font-black" : ""}>
            {questionSeconds}s
          </span>
        </div>
      </div>

      {/* Alerta compacta si supera 90s */}
      {questionSeconds > 90 && (
        <div className="p-2.5 rounded-xl bg-amber-500/15 border-2 border-amber-500/40 text-amber-900 dark:text-amber-300 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
          <span>
            <strong>Alerta de Fluidez (&gt;90s):</strong> Has superado los 90 segundos en este reactivo. El sistema registrará este tiempo en tu telemetría.
          </span>
        </div>
      )}

      {/* Layout Split-Screen Compacto para Cero Scroll */}
      <div className={`border-2 rounded-2xl p-4 sm:p-5 shadow-sm transition-colors ${
        isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 pb-2.5 mb-3.5 border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-blue-600 dark:text-cyan-400 uppercase tracking-wider">
              Caso Clínico #{currentQ.index || currentIndex + 1}
            </span>

            {serialQuestions.length > 1 && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 flex items-center gap-1">
                <Link2 className="w-3 h-3" />
                <span>Caso Seriado ({serialPosition} de {serialQuestions.length})</span>
              </span>
            )}

            {currentQ.is_english && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                <Globe className="w-3 h-3" />
                <span>ENARM English Case</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
            <span>{currentQ.especialidad_troncal || topic.specialty}</span>
            <span>•</span>
            <span>{currentQ.normativa_origen || topic.normativa_origen}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Columna Izquierda: Viñeta Clínica (Texto Plano sin pistas visuales) */}
          <div className="lg:col-span-5 space-y-2">
            <div className={`clinical-case-text p-4 rounded-xl border-2 max-h-[50vh] overflow-y-auto ${
              isDark
                ? "bg-slate-950/70 border-slate-800 text-slate-100"
                : "bg-slate-50 border-slate-300 text-black font-normal"
            }`}>
              <p className="whitespace-pre-line leading-relaxed">{currentQ.vignette}</p>
            </div>
          </div>

          {/* Columna Derecha: Pregunta Cerrada, Opciones [A][B][C][D] + Tachado [✕] y Candado de Confianza */}
          <div className="lg:col-span-7 space-y-3">
            <h3 className="clinical-option-text font-black text-slate-950 dark:text-white leading-snug">
              {currentQ.question_text}
            </h3>

            {/* Opciones A, B, C, D */}
            <div className="space-y-2">
              {Object.entries(currentQ.options).map(([optKey, optText]) => {
                const isSelected = currentAnswer.selectedOption === optKey;
                const isStruck = currentAnswer.struckOptions?.includes(optKey);

                let borderAndBg = "";
                if (isDark) {
                  borderAndBg = isSelected
                    ? "bg-blue-600/25 border-blue-400 text-white shadow-sm ring-1 ring-blue-400"
                    : isStruck
                    ? "bg-slate-950/40 border-slate-800/60 opacity-45"
                    : "bg-slate-800/50 border-slate-700 hover:border-slate-500 text-slate-100";
                } else {
                  borderAndBg = isSelected
                    ? "bg-blue-50 border-blue-600 text-blue-950 ring-2 ring-blue-500 shadow-sm font-bold"
                    : isStruck
                    ? "bg-slate-100 border-slate-300 text-slate-400 opacity-50"
                    : "bg-white border-slate-300 hover:border-slate-500 text-black";
                }

                return (
                  <div
                    key={optKey}
                    className={`flex items-center gap-2 p-1.5 rounded-xl border-2 transition-all ${borderAndBg}`}
                  >
                    <button
                      type="button"
                      onClick={() => selectOption(optKey)}
                      className="flex items-start gap-2.5 flex-1 text-left p-1 rounded-lg cursor-pointer min-w-0"
                    >
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0 border ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-700 shadow-xs"
                          : isDark
                          ? "bg-slate-800 text-slate-200 border-slate-600"
                          : "bg-slate-100 text-black border-slate-400"
                      }`}>
                        {optKey}
                      </span>
                      <span className={`clinical-option-text pt-0.5 leading-snug ${
                        isStruck ? "line-through decoration-red-500 decoration-2 text-slate-400" : ""
                      }`}>
                        {optText}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStrikeOption(optKey);
                      }}
                      title={isStruck ? "Quitar tachado" : "Tachar distractor [✕]"}
                      className={`px-2 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center flex-shrink-0 border ${
                        isStruck
                          ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/50"
                          : isDark
                          ? "bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500"
                          : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-rose-50 hover:text-rose-600"
                      }`}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Selector Obligatorio de Confianza (Candado para avanzar) */}
            <div className="pt-2.5 border-t-2 border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-black">
                <span className="text-slate-700 dark:text-slate-300">
                  Selector Obligatorio de Confianza (Candado para avanzar):
                </span>
                <span className={currentAnswer.confidence ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                  {currentAnswer.confidence ? `Confianza ${currentAnswer.confidence} ✓` : "🔒 Selecciona para desbloquear"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfidence("ALTA")}
                  className={`py-2.5 px-3 rounded-xl border-2 text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                    currentAnswer.confidence === "ALTA"
                      ? isDark
                        ? "bg-cyan-500/25 border-cyan-400 text-cyan-200 ring-1 ring-cyan-400"
                        : "bg-blue-100 border-blue-600 text-blue-950 ring-2 ring-blue-500"
                      : isDark
                      ? "bg-slate-800/60 border-slate-700 text-slate-300 hover:text-white"
                      : "bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200"
                  }`}
                >
                  <Zap className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                  <span>⚡ Confianza ALTA (Seguro)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfidence("BAJA")}
                  className={`py-2.5 px-3 rounded-xl border-2 text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                    currentAnswer.confidence === "BAJA"
                      ? isDark
                        ? "bg-amber-500/25 border-amber-400 text-amber-200 ring-1 ring-amber-400"
                        : "bg-amber-100 border-amber-600 text-amber-950 ring-2 ring-amber-500"
                      : isDark
                      ? "bg-slate-800/60 border-slate-700 text-slate-300 hover:text-white"
                      : "bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200"
                  }`}
                >
                  <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>❓ Confianza BAJA (Dudando / Descarte)</span>
                </button>
              </div>
            </div>

            {/* Controles: Anterior + Siguiente */}
            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={handlePrevious}
                className={`px-3.5 py-2.5 rounded-xl border-2 text-xs font-black flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed ${
                  isDark ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-slate-100 border-slate-300 text-slate-900"
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>

              <button
                type="button"
                disabled={!canAdvance}
                onClick={handleNext}
                className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                  canAdvance
                    ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:opacity-95 active:scale-95 cursor-pointer"
                    : isDark
                    ? "bg-slate-800 text-slate-500 border-2 border-slate-700 cursor-not-allowed opacity-50"
                    : "bg-slate-200 text-slate-500 border-2 border-slate-300 cursor-not-allowed opacity-60"
                }`}
              >
                <span>
                  {currentIndex < questions.length - 1 ? "Siguiente Pregunta" : "Finalizar y Calificar Pre-Test"}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
