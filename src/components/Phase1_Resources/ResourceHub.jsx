// src/components/Phase1_Resources/ResourceHub.jsx
// Fase 1: Biblioteca de Recursos Compartidos y Checklist de Lectura Focalizada

import React, { useState } from "react";
import { useUser } from "../../context/UserContext";
import { addSharedResource, deleteSharedResource } from "../../firebase/firestoreService";
import { MarkdownRenderer } from "../Common/MarkdownRenderer";
import { 
  BookOpen, 
  Video, 
  FileText, 
  Plus, 
  CheckCircle2, 
  ExternalLink, 
  Sparkles,
  ArrowRight,
  Trash2
} from "lucide-react";

export function ResourceHub({ topic, onBackToHub, onProceedToAnki }) {
  const { currentUser, markPhaseComplete, theme, fontPreference, fontSize } = useUser();
  const isDark = theme === "dark";

  const [resources, setResources] = useState(topic.resources || []);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Formulario nuevo recurso
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("note"); // "note" | "video" | "pdf" | "link"
  const [newUrl, setNewUrl] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCompleted = currentUser.today_status?.phase1_done;

  const fontStyle = {
    fontFamily: fontPreference === "Arial" ? "Arial, sans-serif" : fontPreference === "Helvetica" ? "Helvetica, Arial, sans-serif" : "Inter, sans-serif",
    fontSize: fontSize === "11pt" ? "14px" : fontSize === "14pt" ? "18px" : "16px"
  };

  const handleAddResource = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    const newRes = {
      title: newTitle.trim(),
      type: newType,
      url: newUrl.trim(),
      content: newContent.trim(),
      addedBy: currentUser.name
    };

    try {
      const updatedTopic = await addSharedResource(topic.id, newRes);
      setResources(updatedTopic.resources || []);
      setNewTitle("");
      setNewUrl("");
      setNewContent("");
      setShowAddModal(false);
    } catch (err) {
      console.error("Error agregando recurso:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteResource = async (resourceId) => {
    if (!window.confirm("¿Seguro que deseas eliminar este recurso compartido?")) return;
    setDeletingId(resourceId);
    try {
      const updatedTopic = await deleteSharedResource(topic.id, resourceId);
      setResources(updatedTopic.resources || []);
    } catch (err) {
      console.error("Error al eliminar recurso:", err);
      alert("Hubo un error al eliminar el recurso.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleMarkComplete = () => {
    markPhaseComplete(1);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className={`border rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden transition-colors ${
        isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 mb-5 border-slate-700/20">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Fase 1: Lectura Focalizada
              </span>
              <span className="text-xs opacity-50">•</span>
              <span className="text-xs opacity-75">{topic.code}</span>
            </div>
            <h2 className="text-2xl font-extrabold">
              Recursos de Estudio Compartidos
            </h2>
            <p className="text-xs opacity-75 mt-1">
              Materiales, resúmenes y videos compartidos entre Donato y Sonia
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-90 text-white text-xs font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir Material</span>
            </button>
            <button
              type="button"
              onClick={onBackToHub}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800/10 hover:bg-slate-800/20 text-xs font-semibold border border-slate-700/20"
            >
              Volver al Hub
            </button>
          </div>
        </div>

        {/* Guía de Estudio Focalizado */}
        <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
          isDark
            ? "bg-emerald-950/30 border-emerald-800/40 text-emerald-200"
            : "bg-emerald-50 border-emerald-200 text-emerald-900"
        }`}>
          <Sparkles className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-emerald-700 dark:text-emerald-300">
              Estrategia de Lectura Focalizada (60 minutos):
            </p>
            <p className="leading-relaxed opacity-90">
              No leas la GPC completa de corrido. Dirige tu lectura <strong>únicamente a los apartados de los conceptos pivote que fallaste o marcaste con Confianza Baja</strong> en el Pre-Test. Si un concepto lo dominas con Confianza Alta, ¡ahorra tiempo y omite su lectura!
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Recursos */}
      <div className="space-y-4">
        <h3 className={`text-base font-bold flex items-center justify-between ${
          isDark ? "text-slate-200" : "text-slate-900"
        }`}>
          <span>Materiales Disponibles ({resources.length})</span>
          <span className="text-xs opacity-60 font-normal">Sincronizado en tiempo real</span>
        </h3>

        {resources.map((res) => {
          const isVideo = res.type === "video";
          const isPdf = res.type === "pdf";

          return (
            <div
              key={res.id}
              className={`border rounded-2xl p-5 sm:p-6 shadow-sm space-y-3 transition-all ${
                isDark 
                  ? "bg-slate-900 border-slate-800 text-white hover:border-slate-700" 
                  : "bg-white border-slate-200 text-slate-900 hover:border-slate-300 hover:shadow-md"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl text-white ${
                    isVideo ? "bg-rose-600/80" : isPdf ? "bg-blue-600/80" : "bg-emerald-600/80"
                  }`}>
                    {isVideo ? <Video className="w-4 h-4" /> : isPdf ? <FileText className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold">
                      {res.title}
                    </h4>
                    <span className="text-[11px] opacity-60 flex items-center gap-1.5 mt-0.5">
                      <span>Subido por <strong className="text-blue-600 dark:text-cyan-400">{res.addedBy || "Compañero"}</strong></span>
                      <span>•</span>
                      <span>{res.date || "Hoy"}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {res.url && (
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all border ${
                        isDark 
                          ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700" 
                          : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
                      }`}
                    >
                      <span>Abrir</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    type="button"
                    title="Eliminar recurso"
                    onClick={() => handleDeleteResource(res.id)}
                    disabled={deletingId === res.id}
                    className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-center transition-all border ${
                      isDark 
                        ? "bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border-rose-900/50" 
                        : "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200"
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Contenido / Resumen con Markdown y estilo tipográfico */}
              {res.content && (
                <div 
                  style={fontStyle}
                  className={`p-4 rounded-xl border leading-relaxed overflow-x-auto ${
                    isDark
                      ? "bg-slate-950/70 border-slate-800 text-slate-200"
                      : "bg-slate-50 border-slate-200 text-black font-normal"
                  }`}
                >
                  <MarkdownRenderer content={res.content} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Checklist / Botón de Fase Completada */}
      <div className={`border rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
        isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
      }`}>
        <div>
          <h4 className="text-sm font-bold">¿Terminaste tu bloque de lectura de hoy?</h4>
          <p className="text-xs opacity-75">Marcar este paso como completado sumará +50 XP a tu perfil y actualizará el tablero de Sonia.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleMarkComplete}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              isCompleted
                ? isDark
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isCompleted ? "Lectura Marcada como Cumplida ✓" : "Marcar Lectura Completada (+50 XP)"}</span>
          </button>

          <button
            type="button"
            onClick={onProceedToAnki}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white text-xs font-bold flex items-center gap-2 shadow-md active:scale-95"
          >
            <span>Ir a Fase 2: Anki</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal para añadir nuevo recurso */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className={`border rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 ${
            isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-900"
          }`}>
            <h3 className="font-bold text-lg">Añadir Recurso Compartido</h3>
            <p className="text-xs opacity-75">Este recurso estará disponible de inmediato para ti y para Sonia.</p>

            <form onSubmit={handleAddResource} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-semibold block mb-1">Título del Material</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Resumen de Criterios de CAD / Enlace a clase de YouTube"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs border focus:outline-none focus:border-cyan-500 ${
                    isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-black"
                  }`}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "note", label: "Apunte / Texto" },
                  { id: "video", label: "Video" },
                  { id: "pdf", label: "PDF / Guía" }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setNewType(t.id)}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      newType === t.id
                        ? "bg-cyan-500/20 border-cyan-500 text-cyan-600 dark:text-cyan-300 font-bold"
                        : "bg-slate-100 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700 opacity-70"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">URL (Opcional si es enlace o video)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs border focus:outline-none focus:border-cyan-500 ${
                    isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-black"
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Contenido / Notas / Resumen</label>
                <textarea
                  rows={4}
                  placeholder="Pega aquí tus notas, perlas de la GPC o puntos clave..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs border focus:outline-none focus:border-cyan-500 ${
                    isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-black"
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold opacity-70 hover:opacity-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-xs font-bold hover:opacity-95"
                >
                  {isSubmitting ? "Guardando..." : "Guardar Recurso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
