// src/components/Common/PinModal.jsx
import React, { useState } from "react";
import { useUser, USER_PINS } from "../../context/UserContext";
import { Lock, X, AlertCircle, Check } from "lucide-react";

export function PinModal() {
  const { 
    pinModalOpen, 
    setPinModalOpen, 
    confirmPinAndSwitch, 
    targetUserId, 
    users 
  } = useUser();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  if (!pinModalOpen) return null;

  const targetName = users[targetUserId]?.name || targetUserId;

  const handleSubmit = (e) => {
    e.preventDefault();
    const success = confirmPinAndSwitch(pin);
    if (!success) {
      setError(true);
      setPin("");
    } else {
      setError(false);
      setPin("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-5 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
          <Lock className="w-7 h-7" />
        </div>

        <div>
          <h3 className="font-extrabold text-white text-lg">Cambio de Perfil</h3>
          <p className="text-xs text-slate-400 mt-1">
            Ingresa el PIN de seguridad para cambiar a la cuenta de <strong className="text-cyan-400">{targetName}</strong>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              maxLength={4}
              autoFocus
              placeholder="••••"
              value={pin}
              onChange={(e) => {
                setError(false);
                setPin(e.target.value.replace(/\D/g, ""));
              }}
              className="w-36 mx-auto text-center font-mono text-2xl tracking-widest bg-slate-950 border border-slate-800 rounded-2xl py-2.5 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {error && (
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-center gap-1.5 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>PIN incorrecto para {targetName}</span>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setPinModalOpen(false);
                setPin("");
                setError(false);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pin.length < 4}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold disabled:opacity-40"
            >
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
