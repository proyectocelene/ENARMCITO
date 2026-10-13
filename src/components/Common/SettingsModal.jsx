// src/components/Common/SettingsModal.jsx
// Modal de configuración de pantalla, tamaño de fuente por dispositivo y conexión

import React from "react";
import { useUser, FONT_MAP } from "../../context/UserContext";
import { 
  X, 
  Sun, 
  Moon, 
  FileText, 
  Type, 
  Sliders, 
  Cloud, 
  Minus, 
  Plus, 
  RotateCcw 
} from "lucide-react";

export function SettingsModal() {
  const { 
    settingsOpen, 
    setSettingsOpen, 
    theme, 
    setTheme, 
    fontPreference, 
    setFontPreference, 
    customFontSize, 
    setCustomFontSize,
    isFirebase,
    isOnline
  } = useUser();

  if (!settingsOpen) return null;

  const isDark = theme === "dark";

  const availableFonts = [
    { id: "Arial", label: "Arial", desc: "Oficial CIFRHS" },
    { id: "Inter", label: "Inter", desc: "Moderna" },
    { id: "Roboto", label: "Roboto", desc: "Nítida" },
    { id: "Merriweather", label: "Merriweather", desc: "Editorial / GPC" },
    { id: "Helvetica", label: "Helvetica", desc: "Clásica" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className={`border rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto ${
        isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-900"
      }`}>
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b pb-3 border-slate-700/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/10 text-blue-600 dark:text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">
                Configuración del Dispositivo
              </h3>
              <p className="text-xs opacity-70">
                Se guarda automáticamente en este dispositivo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(false)}
            className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sección 1: Tema y Contraste */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider block opacity-75">
            1. Tema Visual y Contraste:
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setTheme("enarm-cifrhs")}
              className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-2 transition-all ${
                theme === "enarm-cifrhs"
                  ? "bg-white text-black border-blue-600 ring-2 ring-blue-500 shadow-md"
                  : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
              }`}
            >
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="text-center text-[11px] leading-tight">
                Examen CIFRHS<br/><span className="text-[10px] font-normal text-slate-500">(Blanco Puro)</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-2 transition-all ${
                theme === "light"
                  ? "bg-slate-100 text-blue-900 border-blue-600 ring-2 ring-blue-500 shadow-md"
                  : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
              }`}
            >
              <Sun className="w-5 h-5 text-amber-500" />
              <span className="text-center text-[11px] leading-tight">
                Modo Claro<br/><span className="text-[10px] font-normal text-slate-500">(Suave)</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-2 transition-all ${
                theme === "dark"
                  ? "bg-slate-950 text-cyan-300 border-cyan-500 ring-2 ring-cyan-400 shadow-md"
                  : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
              }`}
            >
              <Moon className="w-5 h-5 text-cyan-400" />
              <span className="text-center text-[11px] leading-tight">
                Modo Oscuro<br/><span className="text-[10px] font-normal text-slate-500">(Guardias)</span>
              </span>
            </button>
          </div>
        </div>

        {/* Sección 2: Tipografía Clínica */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider opacity-75">
              2. Tipografía:
            </label>
            <span className="text-[11px] font-semibold text-blue-600 dark:text-cyan-400">
              Cambia al instante en toda la pantalla
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {availableFonts.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFontPreference(f.id)}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  fontPreference === f.id
                    ? "bg-blue-50 dark:bg-blue-950/40 border-blue-600 dark:border-cyan-400 text-blue-950 dark:text-cyan-200 ring-2 ring-blue-500 font-black shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-80 hover:opacity-100"
                }`}
              >
                <span className="block text-sm font-bold" style={{ fontFamily: FONT_MAP[f.id] }}>
                  {f.label}
                </span>
                <span className="text-[10px] opacity-60 block mt-0.5">{f.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sección 3: Control Granular de Tamaño de Letra */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider opacity-75">
              3. Tamaño de Letra en tu Dispositivo:
            </label>
            <span className="px-2.5 py-0.5 rounded-full font-mono text-xs font-extrabold bg-blue-600/10 text-blue-600 dark:text-cyan-400 border border-blue-600/20">
              {customFontSize} px
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCustomFontSize((prev) => Math.max(12, prev - 1))}
              className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
              title="Reducir tamaño"
            >
              <Minus className="w-4 h-4" />
            </button>

            <input
              type="range"
              min="12"
              max="24"
              step="1"
              value={customFontSize}
              onChange={(e) => setCustomFontSize(parseInt(e.target.value, 10))}
              className="flex-1 accent-blue-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg"
            />

            <button
              type="button"
              onClick={() => setCustomFontSize((prev) => Math.min(24, prev + 1))}
              className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
              title="Aumentar tamaño"
            >
              <Plus className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setCustomFontSize(16)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-[11px] font-semibold opacity-70 hover:opacity-100"
              title="Restablecer a 16px (estándar)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Caja de Vista Previa en Vivo */}
          <div className="p-4 rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">
              Vista previa con tipografía '{fontPreference}' a {customFontSize}px:
            </span>
            <p 
              style={{ fontFamily: FONT_MAP[fontPreference], fontSize: `${customFontSize}px` }} 
              className="leading-relaxed font-normal text-slate-900 dark:text-slate-100"
            >
              «Femenina de 52 años acude por astenia y poliuria de 2 meses. Glucosa plasmática en ayuno de 142 mg/dL.»
            </p>
            <div className="p-2.5 rounded-xl border border-blue-500/40 bg-blue-500/10 flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">A</span>
              <span 
                style={{ fontFamily: FONT_MAP[fontPreference], fontSize: `${Math.max(13, customFontSize - 1)}px` }} 
                className="font-semibold text-slate-900 dark:text-slate-100"
              >
                Iniciar Metformina 850 mg con titulación
              </span>
            </div>
          </div>
        </div>

        {/* Sección 4: Estado de Sincronización en la Nube */}
        <div className="pt-2 border-t border-slate-700/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Cloud className={`w-4 h-4 ${isFirebase ? "text-emerald-500" : "text-amber-500"}`} />
            <div>
              <span className="font-bold block">
                {isFirebase ? "Firebase Cloud Conectado" : "Modo Local (IndexedDB)"}
              </span>
              <span className="text-[10px] opacity-70">
                {isFirebase ? "Proyecto: enarmcito-a225e • Sincronización Dúo Activa" : "Tus datos se guardan en el navegador"}
              </span>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            isOnline ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/15 text-rose-600"
          }`}>
            {isOnline ? "En Línea" : "Sin Internet"}
          </span>
        </div>

        {/* Botón Cerrar */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(false)}
            className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-95"
          >
            Guardar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
