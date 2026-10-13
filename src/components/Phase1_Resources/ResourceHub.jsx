// src/components/Phase1_Resources/ResourceHub.jsx
// Fase 1: Biblioteca de Recursos con Vista Previa/Descarga de PDFs, modales propios,
// colapso/expansión, ajuste de fuente, reacciones, comentarios, bitácora de edición,
// pegado de imágenes (Ctrl+V / subir), previsualizador de YouTube y widget de Manuales Dr. Re / Dr. Prieto.

import React, { useState, useEffect, useRef } from "react";
import { useUser } from "../../context/UserContext";
import { useToast } from "../Common/ToastAndConfirm";
import { 
  addSharedResource, 
  deleteSharedResource, 
  appendFlashcardsToTopic,
  updateSharedResource,
  toggleResourceReaction,
  addResourceComment
} from "../../firebase/firestoreService";
import { analyzeAiTelemetryMarkdown } from "../../services/telemetryEngine";
import { MarkdownRenderer } from "../Common/MarkdownRenderer";
import { 
  BookOpen, 
  Video, 
  FileText, 
  Plus, 
  CheckCircle2, 
  ExternalLink, 
  ArrowRight,
  Trash2, 
  ArrowLeft,
  Eye, 
  Download, 
  X, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Edit3,
  Bookmark,
  MessageSquare,
  Send,
  Image as ImageIcon,
  History,
  ZoomIn,
  Clipboard
} from "lucide-react";

// Extraer ID de YouTube para embed seguro
function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/;
  const match = url.match(regExp);
  return match && match[1] ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
}

export function ResourceHub({ topic, onBackToHub, onProceedToAnki }) {
  const { currentUser, markPhaseComplete, theme } = useUser();
  const { showToast, confirmAction } = useToast();
  const isDark = theme === "dark";

  const [resources, setResources] = useState(topic.resources || []);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Estados interactivos por recurso
  const [expandedMap, setExpandedMap] = useState({}); // id -> boolean
  const [fontSizeMap, setFontSizeMap] = useState({}); // id -> 'sm' | 'base' | 'lg'
  const [openCommentsMap, setOpenCommentsMap] = useState({}); // id -> boolean
  const [commentInputMap, setCommentInputMap] = useState({}); // id -> string
  const [showHistoryModal, setShowHistoryModal] = useState(null); // resource obj or null
  const [lightboxImage, setLightboxImage] = useState(null); // url or null

  // Modal de edición
  const [editingResource, setEditingResource] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editManualName, setEditManualName] = useState("");
  const [editManualPages, setEditManualPages] = useState("");
  const [editManualChapter, setEditManualChapter] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Sincronizar en tiempo real cuando Donato o Sonia agregan un reporte o recurso
  useEffect(() => {
    setResources(topic.resources || []);
  }, [topic.resources]);

  // Modal de Vista Previa de PDF / Enlace
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [previewTitle, setPreviewTitle] = useState("");

  // Formulario nuevo recurso
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("note"); // "note" | "ai_telemetry" | "video" | "pdf" | "manual" | "image"
  const [newUrl, setNewUrl] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newManualName, setNewManualName] = useState("Manual Dr. Re");
  const [newManualPages, setNewManualPages] = useState("");
  const [newManualChapter, setNewManualChapter] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef(null);
  const isCompleted = currentUser.today_status?.phase1_done;

  // Manejador de pegado de imágenes en portapapeles (Ctrl+V)
  const handlePasteImage = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = (event) => {
          setNewImageUrl(event.target.result);
          if (newType !== "image") setNewType("image");
          if (!newTitle) setNewTitle(`Imagen / Algoritmo (${topic.code || "D01"})`);
          showToast("Imagen pegada desde el portapapeles", "success");
        };
        reader.readAsDataURL(blob);
        break;
      }
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Por favor selecciona un archivo de imagen válido", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setNewImageUrl(event.target.result);
      if (newType !== "image") setNewType("image");
      if (!newTitle) setNewTitle(file.name.replace(/\.[^/.]+$/, ""));
      showToast("Imagen cargada con éxito", "success");
    };
    reader.readAsDataURL(file);
  };

  // Transformar URLs para visualizador embebido (ej. Google Drive)
  const getEmbeddablePdfUrl = (url) => {
    if (!url) return null;
    if (url.includes("drive.google.com/file/d/")) {
      return url.replace(/\/view(\?usp=.*)?$/, "/preview");
    }
    return url;
  };

  const toggleExpand = (id) => {
    setExpandedMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const cycleFontSize = (id) => {
    setFontSizeMap(prev => {
      const current = prev[id] || "sm";
      const next = current === "xs" ? "sm" : current === "sm" ? "base" : current === "base" ? "lg" : "xs";
      return { ...prev, [id]: next };
    });
  };

  const handleImportTsvFromResource = async (tsvCodeText) => {
    try {
      const { addedCount } = await appendFlashcardsToTopic(topic.code || topic.id, tsvCodeText, currentUser.name);
      showToast(`¡${addedCount} tarjetas Anki agregadas al mazo del tema!`, "success");
    } catch (err) {
      showToast(err.message || "Error al importar tarjetas Anki", "error");
    }
  };

  const handleAddResource = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() && newType !== "ai_telemetry" && newType !== "manual") return;

    setIsSubmitting(true);
    const analysis = newType === "ai_telemetry"
      ? analyzeAiTelemetryMarkdown(newContent, topic, currentUser.name)
      : null;

    let manualData = null;
    if (newType === "manual") {
      manualData = {
        manualName: newManualName,
        pages: newManualPages.trim(),
        chapter: newManualChapter.trim()
      };
    }

    const newRes = {
      title: newTitle.trim() || (newType === "manual" ? `${newManualName} — ${newManualPages ? `Pág. ${newManualPages}` : topic.title}` : `Reporte Telemetría IA (${topic.code}) — ${currentUser.name}`),
      type: newType,
      isPublic: true,
      url: newUrl.trim(),
      imageUrl: newImageUrl || null,
      content: newContent.trim(),
      manualRef: manualData,
      tags: analysis ? analysis.tags : [topic.code || "D01", topic.specialty || "MI", `Por ${currentUser.name}`],
      analysisSummary: analysis
        ? {
            sections: analysis.sections,
            tablesCount: analysis.tablesCount,
            codeBlocksCount: analysis.codeBlocksCount,
            inlineCodeCount: analysis.inlineCodeCount,
            ankiCardsCount: analysis.extractedAnkiCards.length,
            wordCount: analysis.wordCount
          }
        : null,
      addedBy: currentUser.name,
      editHistory: []
    };

    try {
      const updatedTopic = await addSharedResource(topic.id, newRes);
      setResources(updatedTopic.resources || []);
      setNewTitle("");
      setNewUrl("");
      setNewContent("");
      setNewImageUrl("");
      setNewManualPages("");
      setNewManualChapter("");
      setShowAddModal(false);
      showToast("Recurso compartido añadido a la Biblioteca Pública", "success");
    } catch (err) {
      console.error("Error agregando recurso:", err);
      showToast("No se pudo guardar el recurso", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteResource = async (resourceId) => {
    const confirmed = await confirmAction({
      title: "¿Eliminar recurso?",
      message: "Este material compartido se eliminará de la biblioteca de estudio de ambos.",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      isDestructive: true
    });

    if (!confirmed) return;

    setDeletingId(resourceId);
    try {
      const updatedTopic = await deleteSharedResource(topic.id, resourceId);
      setResources(updatedTopic.resources || []);
      showToast("Recurso eliminado", "info");
    } catch (err) {
      console.error("Error al eliminar recurso:", err);
      showToast("Error al eliminar recurso", "error");
    } finally {
      setDeletingId(null);
    }
  };

  // Reacciones
  const handleReaction = async (resourceId, emoji) => {
    try {
      const updatedTopic = await toggleResourceReaction(topic.id, resourceId, emoji, currentUser.name);
      setResources(updatedTopic.resources || []);
    } catch (err) {
      console.error(err);
      showToast("Error al reaccionar", "error");
    }
  };

  // Comentarios
  const handleAddComment = async (resourceId) => {
    const commentText = commentInputMap[resourceId];
    if (!commentText || !commentText.trim()) return;

    try {
      const updatedTopic = await addResourceComment(topic.id, resourceId, commentText.trim(), currentUser.name);
      setResources(updatedTopic.resources || []);
      setCommentInputMap(prev => ({ ...prev, [resourceId]: "" }));
      showToast("Comentario agregado", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al agregar comentario", "error");
    }
  };

  // Abrir Modal de Edición
  const openEditModal = (res) => {
    setEditingResource(res);
    setEditTitle(res.title || "");
    setEditContent(res.content || "");
    setEditUrl(res.url || "");
    if (res.manualRef) {
      setEditManualName(res.manualRef.manualName || "Manual Dr. Re");
      setEditManualPages(res.manualRef.pages || "");
      setEditManualChapter(res.manualRef.chapter || "");
    } else {
      setEditManualName("Manual Dr. Re");
      setEditManualPages("");
      setEditManualChapter("");
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingResource) return;
    setIsUpdating(true);

    try {
      const updatedFields = {
        title: editTitle.trim(),
        content: editContent.trim(),
        url: editUrl.trim()
      };

      if (editingResource.type === "manual" || editingResource.manualRef) {
        updatedFields.manualRef = {
          manualName: editManualName,
          pages: editManualPages.trim(),
          chapter: editManualChapter.trim()
        };
      }

      const updatedTopic = await updateSharedResource(
        topic.id,
        editingResource.id,
        updatedFields,
        currentUser.name
      );

      setResources(updatedTopic.resources || []);
      setEditingResource(null);
      showToast("Recurso actualizado con bitácora registrada", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al actualizar recurso", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkComplete = () => {
    markPhaseComplete(1);
    showToast("+50 XP por completar bloque de lectura focalizada", "success");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-20">
      {/* Barra de navegación superior con botón Volver */}
      <div className={`flex items-center justify-between border-2 rounded-2xl p-3 shadow-xs transition-colors ${
        isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
      }`}>
        <button
          type="button"
          onClick={onBackToHub}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition-all text-slate-800 dark:text-slate-200 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al Hub</span>
        </button>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-90 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Añadir Material / Manual</span>
        </button>
      </div>

      {/* Header Compacto con Delimitación Nítida */}
      <div className={`border-2 rounded-2xl p-4 sm:p-5 shadow-xs transition-colors ${
        isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Fase 1: Lectura Focalizada
              </span>
              <span className="text-xs opacity-50">•</span>
              <span className="text-xs font-mono font-bold">{topic.code}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white">
              Recursos, Manuales y Guías de Estudio
            </h2>
          </div>

          <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-500/30">
            {resources.length} materiales
          </span>
        </div>
      </div>

      {/* Lista de Recursos */}
      <div className="space-y-3">
        {resources.length === 0 && (
          <div className={`border-2 rounded-2xl p-8 sm:p-12 text-center space-y-3 shadow-xs ${
            isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-xl">
              📂
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold">No hay materiales cargados aún</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Agrega referencias del Manual Dr. Re, Manual Dr. Prieto, algoritmos, imágenes o notas de estudio compartidas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir mi primer material</span>
            </button>
          </div>
        )}

        {resources.map((res) => {
          const isVideo = res.type === "video";
          const isAiTelemetry = res.type === "ai_telemetry";
          const isManual = res.type === "manual" || Boolean(res.manualRef);
          const isImage = res.type === "image" || Boolean(res.imageUrl);
          const isPdf = res.type === "pdf" || (res.url && res.url.toLowerCase().endsWith(".pdf"));
          const hasUrl = Boolean(res.url);
          const ytEmbedUrl = isVideo ? getYouTubeEmbedUrl(res.url) : null;

          const isExpanded = expandedMap[res.id] !== false; // Abierto por defecto, permite contraer
          const cardFontSize = fontSizeMap[res.id] || "sm";
          const fontSizeStyles = {
            xs: { fontSize: "12px", lineHeight: "1.6" },
            sm: { fontSize: "14.5px", lineHeight: "1.65" },
            base: { fontSize: "16.5px", lineHeight: "1.7" },
            lg: { fontSize: "19px", lineHeight: "1.75" }
          };

          const comments = Array.isArray(res.comments) ? res.comments : [];
          const isCommentsOpen = openCommentsMap[res.id] || false;
          const reactions = res.reactions || {};
          const editCount = Array.isArray(res.editHistory) ? res.editHistory.length : 0;

          return (
            <div
              key={res.id}
              className={`border-2 rounded-2xl p-4 shadow-sm space-y-3 transition-all ${
                isAiTelemetry
                  ? isDark
                    ? "bg-slate-900 border-purple-600/70 text-white hover:border-purple-400"
                    : "bg-white border-purple-400 text-slate-900 hover:border-purple-500"
                  : isManual
                  ? isDark
                    ? "bg-slate-900 border-amber-600/70 text-white hover:border-amber-400"
                    : "bg-white border-amber-400 text-slate-900 hover:border-amber-500"
                  : isDark 
                  ? "bg-slate-900 border-slate-700 text-white hover:border-slate-500" 
                  : "bg-white border-slate-300 text-slate-900 hover:border-slate-400"
              }`}
            >
              {/* Encabezado del Recurso */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-2 rounded-xl text-white flex-shrink-0 ${
                    isAiTelemetry
                      ? "bg-gradient-to-tr from-purple-600 to-indigo-600"
                      : isManual
                      ? "bg-gradient-to-tr from-amber-600 to-orange-600"
                      : isImage
                      ? "bg-emerald-600"
                      : isVideo
                      ? "bg-rose-600"
                      : isPdf
                      ? "bg-blue-600"
                      : "bg-emerald-600"
                  }`}>
                    {isAiTelemetry ? (
                      <Sparkles className="w-4 h-4" />
                    ) : isManual ? (
                      <Bookmark className="w-4 h-4" />
                    ) : isImage ? (
                      <ImageIcon className="w-4 h-4" />
                    ) : isVideo ? (
                      <Video className="w-4 h-4" />
                    ) : isPdf ? (
                      <FileText className="w-4 h-4" />
                    ) : (
                      <BookOpen className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm sm:text-base font-extrabold leading-snug truncate">
                        {res.title}
                      </h4>
                      {isAiTelemetry && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
                          🤖 Telemetría IA
                        </span>
                      )}
                      {isManual && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                          📖 Manual
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] opacity-75 flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span>Por <strong className="text-blue-600 dark:text-cyan-400">{res.addedBy || "Compañero"}</strong></span>
                      <span>•</span>
                      <span>{res.date || "Hoy"}</span>
                      {editCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowHistoryModal(res)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                        >
                          <History className="w-3 h-3" />
                          <span>({editCount} edic.)</span>
                        </button>
                      )}
                    </span>
                  </div>
                </div>

                {/* Acciones principales de la tarjeta */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Selector de tamaño de letra */}
                  <button
                    type="button"
                    onClick={() => cycleFontSize(res.id)}
                    className="p-1.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                    title={`Cambiar tamaño de fuente (actual: ${cardFontSize})`}
                  >
                    <span className="text-[10px] font-black">A↕</span>
                  </button>

                  {/* Botón Editar */}
                  <button
                    type="button"
                    onClick={() => openEditModal(res)}
                    className="p-1.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                    title="Editar contenido / Manual"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {/* Vista Previa PDF */}
                  {isPdf && hasUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewPdfUrl(getEmbeddablePdfUrl(res.url));
                        setPreviewTitle(res.title);
                      }}
                      className="px-2 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 hover:bg-blue-100 cursor-pointer"
                      title="Vista previa del PDF"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Enlace externo */}
                  {hasUrl && !ytEmbedUrl && (
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      title="Abrir enlace"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {/* Colapsar / Expandir */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(res.id)}
                    className="p-1.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                    title={isExpanded ? "Colapsar material" : "Expandir material"}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {/* Eliminar */}
                  <button
                    type="button"
                    title="Eliminar recurso"
                    onClick={() => handleDeleteResource(res.id)}
                    disabled={deletingId === res.id}
                    className="p-1.5 rounded-xl text-xs font-semibold border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* WIDGET DE REFERENCIA A MANUAL FÍSICO / DR RE / DR PRIETO */}
              {res.manualRef && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-2 border-amber-300 dark:border-amber-700/60 text-amber-950 dark:text-amber-200">
                  <Bookmark className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <div className="text-xs font-bold flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                      {res.manualRef.manualName || "Manual de Estudio"}:
                    </span>
                    {res.manualRef.pages && (
                      <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 font-mono text-amber-900 dark:text-amber-200">
                        Pág. {res.manualRef.pages}
                      </span>
                    )}
                    {res.manualRef.chapter && (
                      <span className="text-slate-700 dark:text-slate-300">
                        Capítulo: {res.manualRef.chapter}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* REPRODUCTOR EMBEBIDO DE YOUTUBE */}
              {ytEmbedUrl && (
                <div className="aspect-video w-full rounded-2xl overflow-hidden border-2 border-slate-300 dark:border-slate-800 shadow-sm bg-black">
                  <iframe
                    src={ytEmbedUrl}
                    title={res.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              )}

              {/* IMAGEN / ALGORITMO PEGADO */}
              {res.imageUrl && (
                <div className="relative group rounded-2xl overflow-hidden border-2 border-slate-300 dark:border-slate-800 bg-slate-950/10">
                  <img
                    src={res.imageUrl}
                    alt={res.title}
                    className="w-full max-h-96 object-contain cursor-zoom-in"
                    onClick={() => setLightboxImage(res.imageUrl)}
                  />
                  <button
                    type="button"
                    onClick={() => setLightboxImage(res.imageUrl)}
                    className="absolute bottom-2 right-2 px-2.5 py-1 rounded-xl bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-bold flex items-center gap-1 shadow-sm opacity-90 hover:opacity-100 cursor-pointer"
                  >
                    <ZoomIn className="w-3 h-3" />
                    <span>Ver completa</span>
                  </button>
                </div>
              )}

              {/* VISTA PREVIA INFORMATIVA CUANDO ESTÁ COLAPSADO */}
              {!isExpanded && (
                <div 
                  onClick={() => toggleExpand(res.id)}
                  className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/40 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-all space-y-1.5"
                >
                  {res.content && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {res.content.replace(/[#*`_~\[\]]/g, "").slice(0, 160)}...
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 pt-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {res.content && (
                        <span>~{Math.max(1, Math.ceil(res.content.split(/\s+/).length / 130))} min de lectura</span>
                      )}
                      {res.manualRef?.manualName && (
                        <span className="text-amber-700 dark:text-amber-300 font-bold">
                          📖 {res.manualRef.manualName} (Pág. {res.manualRef.pages || "—"})
                        </span>
                      )}
                      {ytEmbedUrl && <span className="text-rose-600 font-bold">🎬 Video YouTube</span>}
                      {res.imageUrl && <span className="text-emerald-600 font-bold">🖼️ Algoritmo / Infografía</span>}
                    </div>
                    <span className="text-blue-600 dark:text-cyan-400 font-extrabold text-[10px] flex items-center gap-0.5">
                      Ver material completo ▼
                    </span>
                  </div>
                </div>
              )}

              {/* CUERPO EXPANDIDO (CONTENIDO MARKDOWN) */}
              {isExpanded && (
                <>
                  {/* Etiquetas estructuradas */}
                  {Array.isArray(res.tags) && res.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {res.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Contenido / Resumen con Markdown, fórmulas KaTeX y cajas Anki TSV */}
                  {res.content && (
                    <div 
                      style={fontSizeStyles[cardFontSize] || fontSizeStyles.sm}
                      className="p-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 overflow-x-auto transition-all"
                    >
                      <MarkdownRenderer
                        content={res.content}
                        onImportTsvCards={handleImportTsvFromResource}
                      />
                    </div>
                  )}

                  {/* BARRA DE REACCIONES Y COMENTARIOS */}
                  <div className="pt-2 border-t-2 border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
                    {/* Botones de Reacción */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {[
                        { emoji: "🔥", label: "Fuego" },
                        { emoji: "💡", label: "Perla" },
                        { emoji: "🧠", label: "FSRS" },
                        { emoji: "❤️", label: "Me gusta" },
                        { emoji: "👏", label: "Excelente" }
                      ].map((item) => {
                        const users = reactions[item.emoji] || [];
                        const hasReacted = users.includes(currentUser.name);
                        return (
                          <button
                            key={item.emoji}
                            type="button"
                            onClick={() => handleReaction(res.id, item.emoji)}
                            className={`px-2 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                              hasReacted
                                ? "bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-600 scale-105"
                                : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                            }`}
                            title={`${item.label} (${users.join(", ") || "Nadie aún"})`}
                          >
                            <span>{item.emoji}</span>
                            {users.length > 0 && <span className="text-[10px] font-mono">{users.length}</span>}
                          </button>
                        );
                      })}
                    </div>

                    {/* Botón de Comentarios */}
                    <button
                      type="button"
                      onClick={() => setOpenCommentsMap(prev => ({ ...prev, [res.id]: !prev[res.id] }))}
                      className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{comments.length > 0 ? `${comments.length} comentarios` : "Comentar"}</span>
                    </button>
                  </div>

                  {/* SECCIÓN DESPLEGABLE DE COMENTARIOS */}
                  {isCommentsOpen && (
                    <div className="space-y-2 p-3 rounded-xl bg-slate-100/60 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800">
                      {comments.length > 0 && (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {comments.map((comm) => (
                            <div key={comm.id} className="text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                                <strong className="text-blue-600 dark:text-cyan-400">{comm.author}</strong>
                                <span>{comm.date}</span>
                              </div>
                              <p className="text-slate-800 dark:text-slate-200 font-medium">{comm.text}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Input para agregar comentario */}
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder="Escribe un apunte o duda clínica..."
                          value={commentInputMap[res.id] || ""}
                          onChange={(e) => setCommentInputMap(prev => ({ ...prev, [res.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddComment(res.id);
                            }
                          }}
                          className={`flex-1 rounded-xl px-3 py-1.5 text-xs border-2 focus:outline-hidden focus:border-cyan-500 ${
                            isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => handleAddComment(res.id)}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          <span>Enviar</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Checklist / Botón de Fase Completada */}
      <div className={`border-2 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
        isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
      }`}>
        <div>
          <h4 className="text-xs sm:text-sm font-extrabold">¿Concluiste la lectura de tus conceptos débiles?</h4>
          <p className="text-[11px] opacity-70">Suma +50 XP a tu perfil y actualiza el avance de Sonia.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleMarkComplete}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isCompleted
                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-500/40"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs active:scale-95"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isCompleted ? "Lectura Completada ✓" : "Completar (+50 XP)"}</span>
          </button>

          <button
            type="button"
            onClick={onProceedToAnki}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
          >
            <span>Ir a Fase 2: Anki</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal Visor de PDF Integrado */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-3 sm:p-4 border-b-2 border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <h3 className="font-extrabold text-sm sm:text-base truncate text-slate-900 dark:text-white">
                  Vista Previa: {previewTitle}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir completo</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewPdfUrl(null)}
                  className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-1">
              <iframe
                src={previewPdfUrl}
                title={previewTitle}
                className="w-full h-full rounded-2xl border-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Lightbox de Imagen Completa */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh]">
            <img src={lightboxImage} alt="Ampliación" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute top-2 right-2 p-2 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Bitácora de Edición */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className={`border-2 rounded-3xl w-full max-w-md p-5 shadow-2xl space-y-3 ${
            isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
          }`}>
            <div className="flex items-center justify-between border-b pb-2.5 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-500" />
                <h3 className="font-black text-sm">Bitácora de Modificaciones</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(null)}
                className="p-1 rounded-lg opacity-60 hover:opacity-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Historial de ediciones realizadas sobre: <strong>{showHistoryModal.title}</strong>
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              <div className="text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <strong className="text-emerald-600 dark:text-emerald-400">Creación original:</strong> por {showHistoryModal.addedBy} ({showHistoryModal.date || "Fecha inicial"})
              </div>

              {Array.isArray(showHistoryModal.editHistory) && showHistoryModal.editHistory.map((h, i) => (
                <div key={i} className="text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="font-bold text-blue-600 dark:text-cyan-400">Modificado por {h.user}</div>
                  <div className="text-[10px] text-slate-500">{h.date}</div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowHistoryModal(null)}
              className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal para Editar Recurso */}
      {editingResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className={`border-2 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${
            isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
          }`}>
            <div className="flex items-center justify-between border-b pb-2.5 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-500" />
                <h3 className="font-black text-base">Editar Material</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingResource(null)}
                className="p-1 rounded-lg opacity-60 hover:opacity-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold block mb-1">Título del Material</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs border-2 focus:outline-hidden focus:border-cyan-500 ${
                    isDark ? "bg-slate-950 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                />
              </div>

              {/* Si es de tipo manual, permitir editar páginas y capítulo */}
              {(editingResource.type === "manual" || editingResource.manualRef) && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border-2 border-amber-300 dark:border-amber-700 space-y-2">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block">Referencia al Manual</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold block mb-0.5">Manual</label>
                      <select
                        value={editManualName}
                        onChange={(e) => setEditManualName(e.target.value)}
                        className={`w-full rounded-xl px-2.5 py-1.5 text-xs border font-bold ${
                          isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300"
                        }`}
                      >
                        <option value="Manual Dr. Re">Manual Dr. Re</option>
                        <option value="Manual Dr. Prieto">Manual Dr. Prieto</option>
                        <option value="Manual CTO">Manual CTO</option>
                        <option value="Otro Manual">Otro Manual</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold block mb-0.5">Páginas</label>
                      <input
                        type="text"
                        placeholder="ej. 45 - 52"
                        value={editManualPages}
                        onChange={(e) => setEditManualPages(e.target.value)}
                        className={`w-full rounded-xl px-2.5 py-1.5 text-xs border ${
                          isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300"
                        }`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold block mb-0.5">Capítulo / Sección</label>
                    <input
                      type="text"
                      placeholder="ej. Cetoacidosis y Estado Hiperosmolar"
                      value={editManualChapter}
                      onChange={(e) => setEditManualChapter(e.target.value)}
                      className={`w-full rounded-xl px-2.5 py-1.5 text-xs border ${
                        isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300"
                      }`}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold block mb-1">URL (YouTube, Drive o PDF)</label>
                <input
                  type="url"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs border-2 focus:outline-hidden focus:border-cyan-500 ${
                    isDark ? "bg-slate-950 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold block">Contenido / Notas (Soporta Markdown y LaTeX $$...$$)</label>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text && text.trim()) {
                          setEditContent(text);
                          showToast("¡Texto pegado desde el portapapeles!", "success");
                        } else {
                          showToast("El portapapeles está vacío", "info");
                        }
                      } catch (err) {
                        showToast("No se pudo acceder al portapapeles. Pégalo manualmente.", "error");
                      }
                    }}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-black border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                  >
                    <Clipboard className="w-3 h-3" />
                    <span>Pegar Portapapeles</span>
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs border-2 font-mono focus:outline-hidden focus:border-cyan-500 ${
                    isDark ? "bg-slate-950 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingResource(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold opacity-70 hover:opacity-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                >
                  {isUpdating ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para añadir nuevo recurso */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className={`border-2 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${
            isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
          }`}>
            <div className="flex items-center justify-between border-b pb-2.5 border-slate-200 dark:border-slate-800">
              <h3 className="font-black text-base">Añadir Recurso Compartido</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg opacity-60 hover:opacity-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddResource} className="space-y-3.5">
              {/* Selector de tipo */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {[
                  { id: "note", label: "Apunte" },
                  { id: "manual", label: "📖 Manual" },
                  { id: "image", label: "🖼️ Imagen" },
                  { id: "video", label: "🎥 Video" },
                  { id: "pdf", label: "📄 PDF" },
                  { id: "ai_telemetry", label: "🤖 IA" }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setNewType(t.id)}
                    className={`py-2 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer ${
                      newType === t.id
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs scale-102"
                        : "bg-slate-100 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700 opacity-70"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Título</label>
                <input
                  type="text"
                  required={newType !== "manual" && newType !== "ai_telemetry"}
                  placeholder={newType === "manual" ? "Ej. Manejo CAD en Manual Dr. Re" : "Ej. Resumen de Criterios de Osmolaridad"}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs border-2 focus:outline-hidden focus:border-cyan-500 ${
                    isDark ? "bg-slate-950 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                />
              </div>

              {/* CAMPOS ESPECÍFICOS DE MANUAL (DR RE / DR PRIETO) */}
              {newType === "manual" && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border-2 border-amber-300 dark:border-amber-700 space-y-2.5">
                  <span className="text-xs font-extrabold text-amber-900 dark:text-amber-300 block">
                    📖 Localización en Manuales Físicos / Resúmenes
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold block mb-0.5">Manual</label>
                      <select
                        value={newManualName}
                        onChange={(e) => setNewManualName(e.target.value)}
                        className={`w-full rounded-xl px-2.5 py-1.5 text-xs border-2 font-bold ${
                          isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300"
                        }`}
                      >
                        <option value="Manual Dr. Re">Manual Dr. Re</option>
                        <option value="Manual Dr. Prieto">Manual Dr. Prieto</option>
                        <option value="Manual CTO">Manual CTO</option>
                        <option value="Manual AMIR">Manual AMIR</option>
                        <option value="Otro Manual">Otro Manual</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold block mb-0.5">Páginas</label>
                      <input
                        type="text"
                        placeholder="ej. pág. 112 - 118"
                        value={newManualPages}
                        onChange={(e) => setNewManualPages(e.target.value)}
                        className={`w-full rounded-xl px-2.5 py-1.5 text-xs border-2 ${
                          isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300"
                        }`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold block mb-0.5">Capítulo / Sección</label>
                    <input
                      type="text"
                      placeholder="ej. Endocrinología - Cetoacidosis Diabética"
                      value={newManualChapter}
                      onChange={(e) => setNewManualChapter(e.target.value)}
                      className={`w-full rounded-xl px-2.5 py-1.5 text-xs border-2 ${
                        isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300"
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* CAMPOS DE IMAGEN / PEGAR IMAGEN */}
              {newType === "image" && (
                <div 
                  className="p-3.5 rounded-2xl border-2 border-dashed border-emerald-400 dark:border-emerald-600 bg-emerald-500/5 space-y-2 text-center"
                  onPaste={handlePasteImage}
                  tabIndex={0}
                >
                  <ImageIcon className="w-8 h-8 mx-auto text-emerald-500" />
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Pega aquí tu imagen con <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">Ctrl+V</kbd> o sube un archivo
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                    >
                      Seleccionar archivo
                    </button>
                    {newImageUrl && (
                      <button
                        type="button"
                        onClick={() => setNewImageUrl("")}
                        className="px-3 py-1.5 rounded-xl bg-rose-100 text-rose-700 text-xs font-bold cursor-pointer"
                      >
                        Quitar imagen
                      </button>
                    )}
                  </div>
                  {newImageUrl && (
                    <div className="mt-2 rounded-xl overflow-hidden border max-h-40">
                      <img src={newImageUrl} alt="Preview" className="w-full h-40 object-contain bg-black/10" />
                    </div>
                  )}
                </div>
              )}

              {/* URL para Videos, PDFs o Links */}
              {(newType === "video" || newType === "pdf" || newType === "note") && (
                <div>
                  <label className="text-xs font-bold block mb-1">
                    {newType === "video" ? "Enlace de YouTube" : "URL (Drive, YouTube o enlace PDF)"}
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs border-2 focus:outline-hidden focus:border-cyan-500 ${
                      isDark ? "bg-slate-950 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold block">
                    Contenido / Notas (Soporta Markdown y LaTeX $$...$$)
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text && text.trim()) {
                          setNewContent(text);
                          showToast("¡Texto pegado desde el portapapeles!", "success");
                        } else {
                          showToast("El portapapeles está vacío", "info");
                        }
                      } catch (err) {
                        showToast("No se pudo acceder al portapapeles. Pégalo manualmente.", "error");
                      }
                    }}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-black border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                  >
                    <Clipboard className="w-3 h-3" />
                    <span>Pegar Portapapeles</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  placeholder="Escribe notas, perlas clínicas, fórmulas como $$\text{Osm} = 2\text{Na} + \text{Gluc}/18$$..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  onPaste={handlePasteImage}
                  className={`w-full rounded-xl px-3 py-2 text-xs border-2 font-mono focus:outline-hidden focus:border-cyan-500 ${
                    isDark ? "bg-slate-950 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold opacity-70 hover:opacity-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-xs font-bold hover:opacity-95 cursor-pointer"
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
