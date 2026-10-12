// src/components/Phase0_Pretest/PretestPlayer.jsx
// Fase A: Resolución del Pre-Test con telemetría psicométrica, candado de confianza y Modo Examen CIFRHS

import React, { useState, useEffect, useRef } from "react";
import { useUser } from "../../context/UserContext";
import { 
  X, 
  Zap, 
  HelpCircle, 
  Clock, 
  AlertCircle, 
  ChevronRight 
} from "lucide-react";

export function PretestPlayer({ topic, onFinishTest, onBackToHub }) {
  const { theme, fontPreference, fontSize } = useUser();
  const isDark = theme === "dark";

  const questions = topic.pretest?.questions || [];
  const [currentIndex, setCurrentIndex] = useState(0);

  // Registro de respuestas por cada pregunta
  const [answers, setAnswers] = useState({});

  // Cronómetro silencioso de telemetría por reactivo
  const [questionSeconds, setQuestionSeconds] = useState(0);
  const timerRef = useRef(null);

  const currentQ = questions[currentIndex];
  const currentAnswer = answers[currentQ?.id] || {
    selectedOption: null,
    confidence: null,
    struckOptions: [],
    timeSeconds: 0
  };

  // Temporizador silencioso
  useEffect(() => {
    setQuestionSeconds(0);
    clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setQuestionSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [currentIndex]);

  if (!currentQ) {
    return (
      <div className="p-8 text-center text-slate-500">
        No hay preguntas configuradas para este Pre-Test.
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

    setAnswers({
      ...answers,
      [currentQ.id]: {
        ...currentAnswer,
        struckOptions: newStruck,
        selectedOption: newSelected
      }
    });
  };

  // Seleccionar opción A, B, C, D
  const selectOption = (optKey) => {
    const struck = (currentAnswer.struckOptions || []).filter((k) => k !== optKey);
    setAnswers({
      ...answers,
      [currentQ.id]: {
        ...currentAnswer,
        selectedOption: optKey,
        struckOptions: struck
      }
    });
  };

  // Seleccionar nivel de confianza
  const setConfidence = (level) => {
    setAnswers({
      ...answers,
      [currentQ.id]: {
        ...currentAnswer,
        confidence: level
      }
    });
  };

  // Candado para avanzar: requiere opción + nivel de confianza
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

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onFinishTest(finalAnswers);
    }
  };

  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

  const fontStyle = {
    fontFamily: fontPreference === "Arial" ? "Arial, sans-serif" : fontPreference === "Helvetica" ? "Helvetica, Arial, sans-serif" : "Inter, sans-serif",
    fontSize: fontSize === "11pt" ? "14px" : fontSize === "14pt" ? "18px" : "16px"
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Barra superior de progreso y telemetría */}
      <div className={`flex items-center justify-between border rounded-2xl p-4 shadow-sm transition-colors ${
        isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
      }`}>
        <button
          type="button"
          onClick={onBackToHub}
          className={`text-xs font-semibold hover:opacity-80 transition-colors ${
            isDark ? "text-slate-400" : "text-slate-600"
          }`}
        >
          ← Volver al Hub
        </button>

        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold font-mono ${
            isDark ? "text-cyan-400" : "text-blue-600"
          }`}>
            Pregunta {currentIndex + 1} de {questions.length}
          </span>
          <div className="w-28 sm:w-44 bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Indicador de tiempo silencioso */}
        <div className="flex items-center gap-1.5 text-xs opacity-75 font-mono">
          <Clock className={`w-3.5 h-3.5 ${questionSeconds > 90 ? "text-amber-500 animate-pulse" : ""}`} />
          <span className={questionSeconds > 90 ? "text-amber-500 font-bold" : ""}>
            {questionSeconds}s
          </span>
        </div>
      </div>

      {/* Alerta si el tiempo supera 90s */}
      {questionSeconds > 90 && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
          <span>
            <strong>Atención a la fluidez:</strong> Has superado los 90 segundos en este reactivo. En el ENARM real dispones de ~75 segundos por caso.
          </span>
        </div>
      )}

      {/* Tarjeta del Caso Clínico y Reactivo (Diseño Responsivo Split-Screen en Laptop/Tablet para Evitar Scroll Infinito) */}
      <div className={`border rounded-3xl p-5 sm:p-7 shadow-sm transition-colors ${
        isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
      }`}>
        <div className="flex items-center justify-between border-b pb-3 mb-4 border-slate-700/20">
          <span className={`text-xs font-bold uppercase tracking-wider ${
            isDark ? "text-cyan-400" : "text-blue-600 font-extrabold"
          }`}>
            Caso Clínico Estilo ENARM #{currentQ.index}
          </span>
          <span className="text-xs opacity-60 font-mono">
            {topic.normativa_origen}
          </span>
        </div>

        {/* Layout de 2 columnas en pantallas medianas/grandes */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna Izquierda: Viñeta Clínica */}
          <div className="lg:col-span-5 space-y-3">
            <div
              style={fontStyle}
              className={`leading-relaxed p-4 sm:p-5 rounded-2xl border max-h-[55vh] overflow-y-auto ${
                isDark
                  ? "bg-slate-950/70 border-slate-800 text-slate-200"
                  : "bg-slate-50 border-slate-200 text-black font-normal"
              }`}
            >
              <p className="whitespace-pre-line">{currentQ.vignette}</p>
            </div>
            <p className="text-[11px] opacity-50 px-1">
              * Lee los datos pivote y filtra los distractores antes de responder.
            </p>
          </div>

          {/* Columna Derecha: Pregunta, Opciones, Candado de Confianza y Acción */}
          <div className="lg:col-span-7 space-y-4">
            {/* Pregunta Cerrada de Acción Médica */}
            <div>
              <h3 className={`text-base sm:text-lg font-bold tracking-tight ${
                isDark ? "text-white" : "text-black"
              }`}>
                {currentQ.question_text}
              </h3>
            </div>

            {/* Opciones A, B, C, D con Botón de Selección y Tachado [✕] */}
            <div className="space-y-2.5">
              {Object.entries(currentQ.options).map(([optKey, optText]) => {
                const isSelected = currentAnswer.selectedOption === optKey;
                const isStruck = currentAnswer.struckOptions?.includes(optKey);

                let borderAndBg = "";
                if (isDark) {
                  borderAndBg = isSelected
                    ? "bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-500/10"
                    : isStruck
                    ? "bg-slate-950/40 border-slate-800/60 opacity-45"
                    : "bg-slate-800/40 border-slate-700/60 hover:border-slate-600 text-slate-200";
                } else {
                  // Modo Claro / Examen CIFRHS: fondo blanco, texto negro, alto contraste
                  borderAndBg = isSelected
                    ? "bg-blue-50 border-blue-600 text-blue-950 ring-2 ring-blue-500 shadow-sm font-semibold"
                    : isStruck
                    ? "bg-gray-100 border-gray-200 text-gray-400 opacity-45"
                    : "bg-white border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-black";
                }

                return (
                  <div
                    key={optKey}
                    className={`flex items-center gap-2 p-1.5 sm:p-2 rounded-2xl border transition-all ${borderAndBg}`}
                  >
                    {/* Botón de Selección de la Opción */}
                    <button
                      type="button"
                      onClick={() => selectOption(optKey)}
                      className="flex items-start gap-2.5 flex-1 text-left p-1.5 sm:p-2 rounded-xl cursor-pointer"
                    >
                      <span
                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${
                          isSelected
                            ? "bg-blue-600 text-white shadow"
                            : isDark
                            ? "bg-slate-800 text-slate-300 border border-slate-700"
                            : "bg-slate-100 text-slate-800 border border-slate-300"
                        }`}
                      >
                        {optKey}
                      </span>
                      <span
                        style={fontStyle}
                        className={`pt-0.5 leading-snug sm:leading-relaxed ${
                          isStruck ? "line-through text-slate-400 opacity-60" : ""
                        }`}
                      >
                        {optText}
                      </span>
                    </button>

                    {/* Botón individual de Tachado de Distractores [✕] */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStrikeOption(optKey);
                      }}
                      title={isStruck ? "Quitar tachado" : "Tachar distractor (Descartar)"}
                      className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center flex-shrink-0 ${
                        isStruck
                          ? "bg-rose-500/20 text-rose-500 border border-rose-500/40"
                          : isDark
                          ? "bg-slate-800/60 text-slate-500 hover:text-slate-300 hover:bg-slate-700/60"
                          : "bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200"
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Candado Obligatorio de Confianza (Fase A) */}
            <div className="pt-3 border-t border-slate-700/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className={`font-semibold ${isDark ? "text-slate-300" : "text-slate-800"}`}>
                  Nivel de Confianza (Obligatorio):
                </span>
                <span className="text-[11px] opacity-60">
                  {currentAnswer.confidence ? "Registrado ✓" : "Elige nivel"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setConfidence("ALTA")}
                  className={`p-2.5 rounded-xl sm:rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all ${
                    currentAnswer.confidence === "ALTA"
                      ? isDark
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md ring-1 ring-cyan-400"
                        : "bg-blue-100 border-blue-600 text-blue-900 shadow-sm ring-2 ring-blue-500 font-extrabold"
                      : isDark
                      ? "bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
                      : "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-cyan-400" />
                  <span>⚡ Confianza ALTA</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfidence("BAJA")}
                  className={`p-2.5 rounded-xl sm:rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all ${
                    currentAnswer.confidence === "BAJA"
                      ? isDark
                        ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-md ring-1 ring-amber-400"
                        : "bg-amber-100 border-amber-600 text-amber-950 shadow-sm ring-2 ring-amber-500 font-extrabold"
                      : isDark
                      ? "bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
                      : "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400" />
                  <span>❓ Confianza BAJA</span>
                </button>
              </div>
            </div>

            {/* Botón Siguiente / Concluir */}
            <div className="pt-3 flex items-center justify-end">
              <button
                type="button"
                disabled={!canAdvance}
                onClick={handleNext}
                className={`w-full sm:w-auto px-6 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
                  canAdvance
                    ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:opacity-95 active:scale-95 cursor-pointer"
                    : isDark
                    ? "bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-60"
                    : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60"
                }`}
              >
                <span>
                  {currentIndex < questions.length - 1 ? "Siguiente Pregunta" : "Finalizar Pre-Test y Ver Auditoría"}
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
