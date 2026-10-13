// src/components/Common/ToastAndConfirm.jsx
// Sistema propio de Notificaciones (Toasts) y Modales de Confirmación sin usar alerts del navegador

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const showToast = useCallback((message, type = "info", duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const confirmAction = useCallback(({ title, message, confirmText = "Confirmar", cancelText = "Cancelar", isDestructive = false }) => {
    return new Promise((resolve) => {
      setConfirmDialog({
        title,
        message,
        confirmText,
        cancelText,
        isDestructive,
        onConfirm: () => {
          setConfirmDialog(null);
          resolve(true);
        },
        onCancel: () => {
          setConfirmDialog(null);
          resolve(false);
        }
      });
    });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, confirmAction }}>
      {children}

      {/* Contenedor de Toasts flotantes */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          let bgClass = "bg-slate-900 border-slate-700 text-white";
          let Icon = Info;
          let iconColor = "text-cyan-400";

          if (t.type === "success") {
            bgClass = "bg-emerald-900/90 border-emerald-500/50 text-white";
            Icon = CheckCircle2;
            iconColor = "text-emerald-400";
          } else if (t.type === "warning") {
            bgClass = "bg-amber-900/90 border-amber-500/50 text-white";
            Icon = AlertTriangle;
            iconColor = "text-amber-400";
          } else if (t.type === "error") {
            bgClass = "bg-rose-900/90 border-rose-500/50 text-white";
            Icon = XCircle;
            iconColor = "text-rose-400";
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto p-3.5 rounded-2xl border shadow-2xl flex items-center gap-3 backdrop-blur-md animate-fadeIn transition-all text-xs font-medium ${bgClass}`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
              <span className="flex-1 leading-snug">{t.message}</span>
              <button
                type="button"
                onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                className="opacity-60 hover:opacity-100 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal de Confirmación Estilizado */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-2xl flex-shrink-0 ${
                confirmDialog.isDestructive
                  ? "bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
                  : "bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
              }`}>
                {confirmDialog.isDestructive ? <AlertTriangle className="w-6 h-6" /> : <Info className="w-6 h-6" />}
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {confirmDialog.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={confirmDialog.onCancel}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:opacity-90 transition-all"
              >
                {confirmDialog.cancelText}
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-md active:scale-95 ${
                  confirmDialog.isDestructive
                    ? "bg-rose-600 hover:bg-rose-500"
                    : "bg-blue-600 hover:bg-blue-500"
                }`}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return ctx;
}
