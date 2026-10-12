// src/components/Common/InitialUserSelectModal.jsx
import React, { useState } from "react";
import { useUser, USER_PINS } from "../../context/UserContext";
import { Lock, Sparkles, AlertCircle } from "lucide-react";

export function InitialUserSelectModal() {
  const { isUserSelected, selectInitialUser, users } = useUser();
  const [selectedUser, setSelectedUser] = useState("donato");
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  if (isUserSelected) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const success = selectInitialUser(selectedUser, pin);
    if (!success) {
      setError(true);
      setPin("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-3xl shadow-lg shadow-blue-500/20">
          🩺
        </div>

        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Bienvenido a ENARMCITO
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Plataforma de estudio psicométrico para Donato y Sonia
          </p>
        </div>

        {/* Selector de Usuario Inicial */}
        <div className="space-y-3 text-left">
          <label className="text-xs font-bold text-slate-300 block text-center">
            ¿Quién va a estudiar en este dispositivo?
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedUser("donato");
                setError(false);
              }}
              className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                selectedUser === "donato"
                  ? "bg-blue-600/20 border-blue-500 text-white ring-2 ring-blue-500 shadow-lg shadow-blue-500/20"
                  : "bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800"
              }`}
            >
              <span className="text-3xl">👨‍⚕️</span>
              <span className="font-bold text-sm">Donato</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedUser("sonia");
                setError(false);
              }}
              className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                selectedUser === "sonia"
                  ? "bg-pink-600/20 border-pink-500 text-white ring-2 ring-pink-500 shadow-lg shadow-pink-500/20"
                  : "bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800"
              }`}
            >
              <span className="text-3xl">👩‍⚕️</span>
              <span className="font-bold text-sm">Sonia</span>
            </button>
          </div>
        </div>

        {/* PIN de Ingreso */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1.5">
              Ingresa tu PIN de acceso ({selectedUser === "donato" ? "Donato: 8296" : "Sonia: 1234"}):
            </label>
            <input
              type="password"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={(e) => {
                setError(false);
                setPin(e.target.value.replace(/\D/g, ""));
              }}
              className="w-36 mx-auto text-center font-mono text-2xl tracking-widest bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-2xl py-2.5 text-black dark:text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-center gap-1.5 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>PIN incorrecto para {selectedUser === "donato" ? "Donato (8296)" : "Sonia (1234)"}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={pin.length < 4}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-500 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-cyan-500/20 active:scale-95 transition-all disabled:opacity-40"
          >
            Entrar a Estudiar
          </button>
        </form>
      </div>
    </div>
  );
}
