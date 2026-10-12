// src/components/Phase3_Simulator/SimulatorRunner.jsx
// Fase 3: Simulador Contrarreloj de 20 reactivos seriados para mecanizar el descarte de distractores

import React, { useState, useEffect, useRef } from "react";
import { useUser } from "../../context/UserContext";
import { 
  Timer, 
  X, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Trophy, 
  ArrowRight
} from "lucide-react";
import confetti from "canvas-confetti";

export function SimulatorRunner({ topic, onBackToHub }) {
  const { markPhaseComplete, theme, fontPreference, fontSize } = useUser();
  const isDark = theme === "dark";

  const simData = topic.simulation || { questions: [], seconds_per_question: 60 };
  const questions = simData.questions || [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(simData.seconds_per_question || 60);
  const [selectedOption, setSelectedOption] = useState(null);
  const [struckOptions, setStruckOptions] = useState([]);
  const [isAnswered, setIsAnswered] = useState(false);

  // Historial de resultados
  const [sessionResults, setSessionResults] = useState([]);
  const [isFinished, setIsFinished] = useState(false);

  const timerRef = useRef(null);
  const currentQ = questions[currentIndex];

  const fontStyle = {
    fontFamily: fontPreference === "Arial" ? "Arial, sans-serif" : fontPreference === "Helvetica" ? "Helvetica, Arial, sans-serif" : "Inter, sans-serif",
    fontSize: fontSize === "11pt" ? "14px" : fontSize === "14pt" ? "18px" : "16px"
  };

  // Temporizador por reactivo
  useEffect(() => {
    if (isFinished || isAnswered || !currentQ) return;

    setTimeLeft(simData.seconds_per_question || 60);
    clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [currentIndex, isAnswered, isFinished]);

  // Si se agota el tiempo (60s)
  const handleTimeExpired = () => {
    setIsAnswered(true);
    const resultItem = {
      qIndex: currentIndex + 1,
      selected: selectedOption || "Tiempo agotado",
      correct: currentQ.correctAnswer,
      isCorrect: selectedOption === currentQ.correctAnswer,
      timeSpent: simData.seconds_per_question
    };
    setSessionResults((prev) => [...prev, resultItem]);
  };

  // Tachar distractor
  const toggleStrike = (optKey) => {
    if (isAnswered) return;
    setStruckOptions((prev) =>
      prev.includes(optKey) ? prev.filter((k) => k !== optKey) : [...prev, optKey]
    );
    if (selectedOption === optKey) setSelectedOption(null);
  };

  // Confirmar respuesta
  const handleConfirmAnswer = () => {
    if (!selectedOption || isAnswered) return;
    clearInterval(timerRef.current);
    setIsAnswered(true);

    const timeSpent = (simData.seconds_per_question || 60) - timeLeft;
    const isCorrect = selectedOption === currentQ.correctAnswer;

    const resultItem = {
      qIndex: currentIndex + 1,
      selected: selectedOption,
      correct: currentQ.correctAnswer,
      isCorrect,
      timeSpent
    };
    setSessionResults((prev) => [...prev, resultItem]);
  };

  // Avanzar a siguiente pregunta
  const handleNextQuestion = () => {
    setIsAnswered(false);
    setSelectedOption(null);
    setStruckOptions([]);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
      const totalCorrect = sessionResults.filter((r) => r.isCorrect).length;
      const scorePct = Math.round((totalCorrect / questions.length) * 100);

      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.5 }
      });

      markPhaseComplete(3, { phase3_score: scorePct });
    }
  };

  if (!currentQ) {
    return (
      <div className="p-8 text-center text-slate-400">
        No hay preguntas de simulador configuradas.
      </div>
    );
  }

  // Pantalla de Resultados Finales
  if (isFinished) {
    const totalCorrect = sessionResults.filter((r) => r.isCorrect).length;
    const scorePct = Math.round((totalCorrect / questions.length) * 100);
    const avgSeconds = Math.round(
      sessionResults.reduce((acc, curr) => acc + curr.timeSpent, 0) / questions.length
    );

    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-20">
        <div className={`border rounded-3xl p-8 text-center shadow-md space-y-6 ${
          isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
        }`}>
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-xl">
            <Trophy className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block mb-1">
              Simulador Contrarreloj Concluido
            </span>
            <h2 className="text-3xl font-extrabold">
              {scorePct >= 80 ? "¡Excelente Descarte Clínico!" : "Sesión de Velocidad Completada"}
            </h2>
            <p className="text-xs opacity-75 mt-1">
              Has mecanizado el descarte de distractores en {questions.length} reactivos
            </p>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-3 gap-3">
            <div className={`p-4 rounded-2xl border ${
              isDark ? "bg-slate-800/60 border-slate-700/60" : "bg-slate-50 border-slate-200"
            }`}>
              <span className="text-[11px] opacity-75 font-medium block">Aciertos</span>
              <div className="text-2xl font-extrabold mt-1">
                {totalCorrect}/{questions.length}
              </div>
            </div>

            <div className={`p-4 rounded-2xl border ${
              isDark ? "bg-slate-800/60 border-slate-700/60" : "bg-slate-50 border-slate-200"
            }`}>
              <span className="text-[11px] opacity-75 font-medium block">Precisión</span>
              <div className="text-2xl font-extrabold text-blue-600 dark:text-cyan-400 mt-1">
                {scorePct}%
              </div>
            </div>

            <div className={`p-4 rounded-2xl border ${
              isDark ? "bg-slate-800/60 border-slate-700/60" : "bg-slate-50 border-slate-200"
            }`}>
              <span className="text-[11px] opacity-75 font-medium block">Ritmo Promedio</span>
              <div className="text-2xl font-extrabold mt-1 font-mono">
                {avgSeconds}s
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setIsFinished(false);
                setCurrentIndex(0);
                setSessionResults([]);
              }}
              className={`px-5 py-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                isDark ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200" : "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800"
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>Repetir Simulador</span>
            </button>

            <button
              type="button"
              onClick={onBackToHub}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold flex items-center gap-2 shadow-md"
            >
              <span>Volver al Tablero Principal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Vista de Pregunta en Curso
  const timerPct = Math.round((timeLeft / (simData.seconds_per_question || 60)) * 100);
  const isTimerCritical = timeLeft <= 15;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Barra de progreso y cronómetro contrarreloj */}
      <div className={`flex items-center justify-between border rounded-2xl p-4 shadow-sm ${
        isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
      }`}>
        <button
          type="button"
          onClick={onBackToHub}
          className="text-xs font-semibold opacity-75 hover:opacity-100"
        >
          ← Salir al Hub
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-rose-600 dark:text-rose-400 font-mono">
            Reactivo {currentIndex + 1} de {questions.length}
          </span>
        </div>

        {/* Temporizador con alerta visual */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold border transition-colors ${
          isTimerCritical
            ? "bg-rose-500/20 border-rose-500/40 text-rose-600 dark:text-rose-400 animate-pulse"
            : isDark ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-300 text-slate-800"
        }`}>
          <Timer className="w-4 h-4" />
          <span>{timeLeft}s</span>
        </div>
      </div>

      {/* Barra de tiempo descendente */}
      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-1.5 rounded-full transition-all duration-1000 ${
            isTimerCritical
              ? "bg-rose-500"
              : timeLeft <= 30
              ? "bg-amber-400"
              : "bg-gradient-to-r from-blue-500 to-cyan-400"
          }`}
          style={{ width: `${timerPct}%` }}
        />
      </div>

      {/* Tarjeta de la Pregunta */}
      <div className={`border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 ${
        isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
      }`}>
        <div 
          style={fontStyle}
          className={`p-5 rounded-2xl border leading-relaxed ${
            isDark ? "bg-slate-950/70 border-slate-800 text-slate-200" : "bg-slate-50 border-slate-200 text-black font-normal"
          }`}
        >
          <p>{currentQ.vignette}</p>
        </div>

        <div>
          <h3 className={`text-base sm:text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-black"}`}>
            {currentQ.question_text}
          </h3>
        </div>

        {/* Opciones con tachado */}
        <div className="space-y-3">
          {Object.entries(currentQ.options).map(([optKey, optText]) => {
            const isSelected = selectedOption === optKey;
            const isStruck = struckOptions.includes(optKey);
            const isCorrect = currentQ.correctAnswer === optKey;

            let borderStyle = "";
            if (isAnswered) {
              if (isCorrect) borderStyle = "border-emerald-500 bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 font-semibold";
              else if (isSelected) borderStyle = "border-rose-500 bg-rose-500/15 text-rose-900 dark:text-rose-200 font-semibold";
            } else if (isSelected) {
              borderStyle = isDark 
                ? "border-blue-500 bg-blue-600/20 text-white shadow-md"
                : "border-blue-600 bg-blue-50 text-blue-950 ring-2 ring-blue-500 font-semibold";
            } else if (isStruck) {
              borderStyle = "border-gray-200 bg-gray-100/70 text-gray-400 opacity-45";
            } else {
              borderStyle = isDark
                ? "border-slate-700/60 bg-slate-800/40 hover:border-slate-600 text-slate-200"
                : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50 text-black";
            }

            return (
              <div
                key={optKey}
                className={`flex items-center gap-2 p-2 rounded-2xl border transition-all ${borderStyle}`}
              >
                <button
                  type="button"
                  disabled={isAnswered}
                  onClick={() => {
                    setSelectedOption(optKey);
                    setStruckOptions(struckOptions.filter((k) => k !== optKey));
                  }}
                  className="flex items-start gap-3 flex-1 text-left p-2.5 rounded-xl cursor-pointer"
                >
                  <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    isSelected 
                      ? "bg-blue-600 text-white" 
                      : isDark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-700 border border-slate-300"
                  }`}>
                    {optKey}
                  </span>
                  <span 
                    style={fontStyle}
                    className={`pt-0.5 leading-relaxed ${isStruck ? "line-through opacity-60" : ""}`}
                  >
                    {optText}
                  </span>
                </button>

                {!isAnswered && (
                  <button
                    type="button"
                    onClick={() => toggleStrike(optKey)}
                    title="Tachar distractor"
                    className={`p-2.5 rounded-xl text-xs font-bold transition-all ${
                      isStruck 
                        ? "bg-rose-500/20 text-rose-500" 
                        : isDark ? "bg-slate-800/60 text-slate-500 hover:text-slate-300" : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-black"
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Retroalimentación inmediata si ya se respondió */}
        {isAnswered && (
          <div className={`p-4 rounded-2xl border text-xs sm:text-sm space-y-2 animate-fadeIn ${
            isDark ? "bg-slate-950/80 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-800"
          }`}>
            <div className="flex items-center gap-2 font-bold">
              {selectedOption === currentQ.correctAnswer ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> ¡Correcto!
                </span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <XCircle className="w-4 h-4" /> Incorrecto. Correcta: {currentQ.correctAnswer}
                </span>
              )}
            </div>
            <p className="opacity-80 leading-relaxed">{currentQ.explanation}</p>
          </div>
        )}

        {/* Botón de Acción */}
        <div className="pt-4 flex items-center justify-end">
          {!isAnswered ? (
            <button
              type="button"
              disabled={!selectedOption}
              onClick={handleConfirmAnswer}
              className={`px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                selectedOption
                  ? "bg-gradient-to-r from-rose-600 to-amber-600 text-white hover:opacity-95 shadow-md active:scale-95"
                  : isDark ? "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50" : "bg-slate-200 text-slate-400 cursor-not-allowed opacity-50"
              }`}
            >
              <span>Confirmar Respuesta</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextQuestion}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md active:scale-95"
            >
              <span>{currentIndex < questions.length - 1 ? "Siguiente Reactivo" : "Ver Resultados Finales"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
