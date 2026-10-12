// src/components/DailyHub/DuoStatusWidget.jsx
import React from "react";
import { useUser } from "../../context/UserContext";
import { CheckCircle2, Circle, Flame, Sparkles, Award } from "lucide-react";

export function DuoStatusWidget() {
  const { 
    currentUser, 
    partnerUser, 
    sendCheerToPartner, 
    cheerNotice,
    theme 
  } = useUser();

  const isDark = theme === "dark";

  const renderPhasesBadge = (user) => {
    const status = user.today_status || {};
    const phases = [
      { name: "F0: Pre-Test", done: status.phase0_done },
      { name: "F1: Lectura", done: status.phase1_done },
      { name: "F2: Anki", done: status.phase2_done },
      { name: "F3: Simulador", done: status.phase3_done }
    ];

    const completedCount = phases.filter(p => p.done).length;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className={isDark ? "text-slate-400" : "text-slate-600"}>Progreso de hoy:</span>
          <span className={`font-semibold ${isDark ? "text-cyan-400" : "text-blue-600"}`}>
            {completedCount} de 4 completadas
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {phases.map((p, idx) => (
            <div
              key={idx}
              className={`p-1.5 rounded-lg text-center text-[10px] font-semibold border transition-all ${
                p.done
                  ? isDark
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-emerald-100 border-emerald-300 text-emerald-800"
                  : isDark
                    ? "bg-slate-800/60 border-slate-700/50 text-slate-500"
                    : "bg-slate-100 border-slate-200 text-slate-500"
              }`}
            >
              <div className="flex items-center justify-center mb-0.5">
                {p.done ? (
                  <CheckCircle2 className={`w-3.5 h-3.5 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} />
                ) : (
                  <Circle className="w-3.5 h-3.5 opacity-40" />
                )}
              </div>
              <span className="truncate block">{p.name.split(":")[0]}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`border rounded-2xl p-5 shadow-sm transition-colors ${
      isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
    }`}>
      {/* Título de la tarjeta */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-cyan-400 border border-blue-500/20">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className={`font-bold text-sm sm:text-base ${isDark ? "text-white" : "text-black"}`}>
              Tablero Dúo: Donato & Sonia
            </h3>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Sincronización de estudio y apoyo mutuo
            </p>
          </div>
        </div>

        {/* Botón enviar empujón / toque */}
        <button
          type="button"
          onClick={sendCheerToPartner}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:opacity-95 text-white rounded-xl text-xs font-semibold shadow-md active:scale-95 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Dar Toque a {partnerUser.name}</span>
        </button>
      </div>

      {/* Alerta de toque */}
      {cheerNotice && (
        <div className="mb-4 p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-800 dark:text-cyan-200 text-xs flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span className="font-semibold">{cheerNotice}</span>
        </div>
      )}

      {/* Comparativa Donato vs Sonia */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tu perfil */}
        <div className={`p-4 rounded-xl border ${
          isDark ? "bg-slate-800/50 border-slate-700/60" : "bg-slate-50 border-slate-200"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{currentUser.avatar}</span>
              <div>
                <span className={`text-sm font-bold block ${isDark ? "text-white" : "text-black"}`}>
                  Tú ({currentUser.name})
                </span>
                <span className="text-[11px] font-semibold text-blue-600 dark:text-cyan-400">
                  {currentUser.xp} XP acumulados
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold">
              <Flame className="w-3.5 h-3.5 fill-amber-400" />
              <span>{currentUser.streak} días</span>
            </div>
          </div>
          {renderPhasesBadge(currentUser)}
        </div>

        {/* Perfil de tu compañero/a */}
        <div className={`p-4 rounded-xl border ${
          isDark ? "bg-slate-800/30 border-slate-700/40" : "bg-slate-50/70 border-slate-200"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{partnerUser.avatar}</span>
              <div>
                <span className={`text-sm font-bold block ${isDark ? "text-slate-300" : "text-slate-800"}`}>
                  {partnerUser.name}
                </span>
                <span className="text-[11px] font-semibold text-blue-600 dark:text-cyan-400">
                  {partnerUser.xp} XP acumulados
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold">
              <Flame className="w-3.5 h-3.5 fill-amber-400" />
              <span>{partnerUser.streak} días</span>
            </div>
          </div>
          {renderPhasesBadge(partnerUser)}
        </div>
      </div>
    </div>
  );
}
