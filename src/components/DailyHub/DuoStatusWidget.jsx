// src/components/DailyHub/DuoStatusWidget.jsx
// Tablero Dúo Donato & Sonia con gamificación cooperativa, rangos médicos y reacciones interactivas

import React, { useState } from "react";
import { useUser } from "../../context/UserContext";
import { 
  CheckCircle2, 
  Circle, 
  Flame, 
  Sparkles, 
  Award, 
  Send,
  Coffee,
  Zap,
  Target,
  X
} from "lucide-react";

export function DuoStatusWidget() {
  const { 
    currentUser, 
    partnerUser, 
    userRank, 
    partnerRank, 
    sendCheerToPartner, 
    incomingCheer,
    clearIncomingCheer,
    theme 
  } = useUser();

  const [showCheerMenu, setShowCheerMenu] = useState(false);
  const [justSent, setJustSent] = useState(null);

  const isDark = theme === "dark";

  const countPhases = (user) => {
    const s = user.today_status || {};
    return [s.phase0_done, s.phase1_done, s.phase2_done, s.phase3_done].filter(Boolean).length;
  };

  const myCount = countPhases(currentUser);
  const partnerCount = countPhases(partnerUser);
  const totalDuoPhases = myCount + partnerCount; // de 8 fases posibles

  const cheerPresets = [
    { text: "¡A darle con todo hoy!", icon: "⚡" },
    { text: "¡Imparable en esa racha!", icon: "🔥" },
    { text: "¿Sale un café de 10 min?", icon: "☕" },
    { text: "¡Terminé mi simulador, te toca!", icon: "🎯" }
  ];

  const handleSendPreset = async (preset) => {
    await sendCheerToPartner(preset.text, preset.icon);
    setJustSent(preset.text);
    setShowCheerMenu(false);
    setTimeout(() => setJustSent(null), 3000);
  };

  const renderPhasePills = (user) => {
    const s = user.today_status || {};
    const phases = [
      { id: "F0", done: s.phase0_done, label: "Pre-Test" },
      { id: "F1", done: s.phase1_done, label: "Recursos" },
      { id: "F2", done: s.phase2_done, label: "Anki" },
      { id: "F3", done: s.phase3_done, label: "Simulador" }
    ];

    return (
      <div className="flex items-center gap-1">
        {phases.map((p) => (
          <span
            key={p.id}
            title={`${p.label}: ${p.done ? "Completado" : "Pendiente"}`}
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border transition-all ${
              p.done
                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 opacity-60"
            }`}
          >
            {p.id}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className={`border rounded-2xl p-3.5 sm:p-4 shadow-sm transition-all ${
      isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
    }`}>
      {/* Banner de Reacción Entrante de la Pareja */}
      {incomingCheer && (
        <div className="mb-3 p-3 rounded-xl bg-gradient-to-r from-blue-600/15 via-cyan-500/15 to-teal-500/15 border border-cyan-500/40 flex items-center justify-between gap-2 animate-bounce">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-cyan-200">
            <span className="text-xl">{incomingCheer.icon || "⚡"}</span>
            <span>
              <strong>{incomingCheer.senderName}</strong> dice: «{incomingCheer.message}»
            </span>
          </div>
          <button
            type="button"
            onClick={clearIncomingCheer}
            className="p-1 rounded-lg opacity-60 hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Encabezado: Meta Cooperativa Dúo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-600/10 text-blue-600 dark:text-cyan-400">
            <Award className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-xs sm:text-sm">
              Meta Cooperativa Dúo
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-cyan-300">
              {totalDuoPhases}/8 fases completadas
            </span>
          </div>
        </div>

        {/* Botón de Enviar Reacción / Toque */}
        <div className="relative self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setShowCheerMenu(!showCheerMenu)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:opacity-95 text-white text-xs font-bold shadow-sm active:scale-95 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Enviar Toque a {partnerUser.name}</span>
          </button>

          {/* Menú de Reacciones Rápidas */}
          {showCheerMenu && (
            <div className="absolute right-0 top-8 z-30 w-64 p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xl space-y-1 animate-fadeIn">
              <span className="text-[10px] font-bold opacity-60 block px-2 py-0.5">
                Elige un mensaje de apoyo:
              </span>
              {cheerPresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendPreset(preset)}
                  className="w-full p-2 text-left rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
                >
                  <span className="text-base">{preset.icon}</span>
                  <span className="truncate">{preset.text}</span>
                </button>
              ))}
            </div>
          )}

          {justSent && (
            <span className="absolute right-0 -bottom-5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
              ¡Enviado a {partnerUser.name}! ✓
            </span>
          )}
        </div>
      </div>

      {/* Comparativa Compacta: Donato vs Sonia */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2.5">
        {/* Tu Perfil */}
        <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl">{currentUser.avatar}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                  Tú ({currentUser.name})
                </span>
                <span className="text-[10px] opacity-70">
                  {userRank.icon} {userRank.title.split(" ")[0]}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                <span>📍 {currentUser.city || (currentUser.id === "donato" ? "Tijuana, B.C." : "Hermosillo, Son.")}</span>
                <span>•</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {new Date().toLocaleTimeString("es-MX", { 
                    timeZone: currentUser.id === "donato" ? "America/Tijuana" : "America/Hermosillo", 
                    hour: "2-digit", 
                    minute: "2-digit" 
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-semibold text-blue-600 dark:text-cyan-400 mt-0.5">
                <span>{currentUser.xp || 0} XP</span>
                <span>•</span>
                <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                  <Flame className="w-3 h-3 fill-amber-500" />
                  {currentUser.streak || 0}d
                </span>
              </div>
            </div>
          </div>
          {renderPhasePills(currentUser)}
        </div>

        {/* Perfil Compañero/a */}
        <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl">{partnerUser.avatar}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                  {partnerUser.name}
                </span>
                <span className="text-[10px] opacity-70">
                  {partnerRank.icon} {partnerRank.title.split(" ")[0]}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                <span>📍 {partnerUser.city || (partnerUser.id === "donato" ? "Tijuana, B.C." : "Hermosillo, Son.")}</span>
                <span>•</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {new Date().toLocaleTimeString("es-MX", { 
                    timeZone: partnerUser.id === "donato" ? "America/Tijuana" : "America/Hermosillo", 
                    hour: "2-digit", 
                    minute: "2-digit" 
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                <span>{partnerUser.xp || 0} XP</span>
                <span>•</span>
                <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                  <Flame className="w-3 h-3 fill-amber-500" />
                  {partnerUser.streak || 0}d
                </span>
              </div>
            </div>
          </div>
          {renderPhasePills(partnerUser)}
        </div>
      </div>
    </div>
  );
}
