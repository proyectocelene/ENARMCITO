// src/components/Common/AccessibilityBar.jsx
// Control de accesibilidad, tipografía y Modo Examen Oficial CIFRHS (Arial 12pt, Fondo Blanco)

import React, { useState } from "react";
import { useUser } from "../../context/UserContext";
import { 
  Eye, 
  Sun, 
  Moon, 
  FileText, 
  Type, 
  Sliders, 
  X, 
  Check 
} from "lucide-react";

export function AccessibilityBar() {
  const { 
    theme, 
    setTheme, 
    fontPreference, 
    setFontPreference, 
    fontSize, 
    setFontSize 
  } = useUser();

  const [isOpen, setIsOpen] = useState(false);
  const isDark = theme === "dark";

  return (
    <>
      {/* Botón flotante de accesibilidad con contraste óptimo adaptativo */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-5 right-5 z-40 px-3.5 py-2.5 rounded-full border shadow-xl backdrop-blur-md flex items-center gap-2 text-xs font-bold transition-all active:scale-95 group ${
          isDark
            ? "bg-slate-900/95 hover:bg-slate-800 text-cyan-300 border-cyan-500/40 shadow-cyan-900/20"
            : "bg-white hover:bg-slate-50 text-blue-900 border-blue-400 shadow-blue-500/15 ring-2 ring-blue-500/20"
        }`}
        title="Configurar modo visual y tipografía de examen"
      >
        <Eye className={`w-4 h-4 ${isDark ? "text-cyan-400" : "text-blue-600"} group-hover:rotate-12 transition-transform`} />
        <span>Modo Examen / Vista</span>
      </button>

      {/* Modal / Menú de configuración de pantalla */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className={`border rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 ${
            isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-900"
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-700/20">
              <div className="flex items-center gap-2">
                <Sliders className={`w-5 h-5 ${isDark ? "text-cyan-400" : "text-blue-600"}`} />
                <h3 className="font-extrabold text-base">
                  Entrenamiento Visual & Accesibilidad
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={`p-1.5 rounded-xl border ${
                  isDark ? "bg-slate-800 text-slate-400 hover:text-white border-slate-700" : "bg-slate-100 text-slate-700 hover:text-black border-slate-300"
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selector de Modo Visual (Fondo y Contraste) */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 block">
                Modo Visual (Contraste):
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTheme("enarm-cifrhs")}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                    theme === "enarm-cifrhs"
                      ? "bg-white text-black border-cyan-400 ring-2 ring-cyan-400 shadow-md"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                  }`}
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-center text-[10px] sm:text-xs">Examen Oficial<br/>(Blanco CIFRHS)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                    theme === "dark"
                      ? "bg-slate-950 text-cyan-400 border-cyan-400 ring-2 ring-cyan-400 shadow-md"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                  }`}
                >
                  <Moon className="w-4 h-4 text-cyan-400" />
                  <span className="text-center text-[10px] sm:text-xs">Modo Oscuro<br/>(Guardias)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                    theme === "light"
                      ? "bg-slate-100 text-blue-600 border-cyan-400 ring-2 ring-cyan-400 shadow-md"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="text-center text-[10px] sm:text-xs">Modo Claro<br/>(Día)</span>
                </button>
              </div>
            </div>

            {/* Selector de Tipografía */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  Tipografía Clínica:
                </span>
                <span className="text-[10px] text-cyan-400 font-semibold">
                  (Arial es la oficial del examen CIFRHS)
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "Arial", label: "Arial", note: "Oficial ENARM" },
                  { id: "Helvetica", label: "Helvetica", note: "Clásica" },
                  { id: "Inter", label: "Inter", note: "Moderna" }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFontPreference(f.id)}
                    className={`p-2 rounded-xl border text-xs text-center transition-all ${
                      fontPreference === f.id
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold ring-1 ring-cyan-400"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                    }`}
                  >
                    <span className="block font-bold" style={{ fontFamily: f.id }}>{f.label}</span>
                    <span className="text-[9px] text-slate-500 block">{f.note}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Selector de Tamaño de Fuente */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 block">
                Tamaño de Letra:
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "11pt", label: "11 pt", sub: "Compacto" },
                  { id: "12pt", label: "12 pt", sub: "Estándar ENARM" },
                  { id: "14pt", label: "14 pt", sub: "Ampliado" }
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setFontSize(s.id)}
                    className={`p-2 rounded-xl border text-xs text-center transition-all ${
                      fontSize === s.id
                        ? "bg-purple-500/20 border-purple-400 text-purple-300 font-bold ring-1 ring-purple-400"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                    }`}
                  >
                    <span className="block font-bold">{s.label}</span>
                    <span className="text-[9px] text-slate-500 block">{s.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
