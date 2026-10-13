// src/components/Library/GlobalLibraryView.jsx
// Sección Centralizada de Biblioteca de Recursos Médicos ENARMCITO
// Permite buscar, filtrar por tipo (GPC, Resúmenes, Manuales Dr. Re/Prieto, PDFs, Algoritmos, Comentarios, Imágenes, Videos YouTube),
// previsualizar y subir nuevos materiales compartidos con etiquetado ordenado, soporte LaTeX y bitácora de ediciones.

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useUser } from "../../context/UserContext";
import { useToast } from "../Common/ToastAndConfirm";
import { PRESEASON_SCHEDULE } from "../../data/preseasonSchedule";
import { 
  addSharedResource, 
  deleteSharedResource, 
  getTopic, 
  appendFlashcardsToTopic,
  updateSharedResource,
  toggleResourceReaction,
  addResourceComment
} from "../../firebase/firestoreService";
import { analyzeAiTelemetryMarkdown } from "../../services/telemetryEngine";
import { MarkdownRenderer } from "../Common/MarkdownRenderer";
import { 
  BookOpen, 
  Search, 
  Filter, 
  FileText, 
  Image as ImageIcon, 
  FileCode, 
  ExternalLink, 
  Plus, 
  Trash2, 
  Eye, 
  Download, 
  X, 
  Tag, 
  Calendar, 
  MessageSquare, 
  Sparkles,
  Layers,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Users,
  Video,
  Bookmark,
  Edit3,
  Send,
  History,
  ZoomIn
} from "lucide-react";

function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/;
  const match = url.match(regExp);
  return match && match[1] ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
}

export function GlobalLibraryView() {
  const { currentUserId, currentUser, theme, schedule } = useUser();
  const { showToast, confirmAction } = useToast();
  const isDark = theme === "dark";
  const isExam = theme === "enarm-cifrhs";

  // Búsqueda y Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all"); // "all" | "ai_telemetry" | "manual" | "pdf" | "note" | "image" | "video" | "link" | "gpc"
  const [selectedSpecialty, setSelectedSpecialty] = useState("all"); // "all" | "MI" | "PED" | "GYO" | "CIR"
  const [selectedTopicCode, setSelectedTopicCode] = useState("all");

  // Estado de recursos globales agregados
  const [allResources, setAllResources] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados interactivos por recurso
  const [expandedMap, setExpandedMap] = useState({});
  const [fontSizeMap, setFontSizeMap] = useState({});
  const [openCommentsMap, setOpenCommentsMap] = useState({});
  const [commentInputMap, setCommentInputMap] = useState({});
  const [lightboxImage, setLightboxImage] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(null);

  // Modal para agregar nuevo recurso
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetTopicCode, setTargetTopicCode] = useState("D01");
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("ai_telemetry"); // "ai_telemetry" | "manual" | "pdf" | "note" | "image" | "video" | "link" | "gpc"
  const [newUrl, setNewUrl] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newManualName, setNewManualName] = useState("Manual Dr. Re");
  const [newManualPages, setNewManualPages] = useState("");
  const [newManualChapter, setNewManualChapter] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal de edición
  const [editingResource, setEditingResource] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editManualName, setEditManualName] = useState("Manual Dr. Re");
  const [editManualPages, setEditManualPages] = useState("");
  const [editManualChapter, setEditManualChapter] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Modal de vista previa completa
  const [previewResource, setPreviewResource] = useState(null);

  const fileInputRef = useRef(null);

  // Manejador de pegado de imágenes (Ctrl+V)
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
          if (!newTitle) setNewTitle(`Imagen / Algoritmo (${targetTopicCode})`);
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

  // Cargar recursos de todos los temas configurados
  const loadAllResources = async () => {
    setLoading(true);
    try {
      const compiled = [];

      // Cargar PDFs oficiales de Dr. Re del cronograma
      schedule.forEach(day => {
        if (day.drRePdfs) {
          day.drRePdfs.forEach(pdf => {
            compiled.push({
              id: `dr_re_${day.code}_${pdf.name}`,
              title: pdf.label || pdf.name,
              type: "pdf",
              url: "",
              content: `Material oficial del Dr. Re asignado al día ${day.code}: ${day.title}.`,
              tags: ["Dr. Re", "Flashcards PDF", day.specialty],
              topicCode: day.code,
              topicTitle: day.title,
              specialty: day.specialty,
              addedBy: "Dr. Re (Oficial)",
              date: "Pretemporada 2026",
              isOfficial: true
            });
          });
        }
      });

      // Leer recursos personalizados y Reportes de Telemetría IA guardados en todos los días del cronograma
      const topicPromises = schedule.map(async (day) => {
        try {
          const t = await getTopic(day.code);
          if (t && Array.isArray(t.resources) && t.resources.length > 0) {
            return t.resources.map((r) => ({
              ...r,
              topicCode: day.code,
              topicTitle: day.title,
              specialty: day.specialty
            }));
          }
        } catch (e) {}
        return [];
      });

      const resolvedTopicResources = await Promise.all(topicPromises);
      resolvedTopicResources.forEach((items) => {
        compiled.unshift(...items);
      });

      setAllResources(compiled);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllResources();
    const handleSync = () => {
      loadAllResources();
    };
    window.addEventListener("enarmcito_topic_sync", handleSync);
    return () => window.removeEventListener("enarmcito_topic_sync", handleSync);
  }, [schedule]);

  // Importar tarjetas TSV Anki directamente desde un bloque Markdown
  const handleImportTsvFromLibrary = async (topicCode, tsvText) => {
    try {
      const res = await appendFlashcardsToTopic(topicCode || "D01", tsvText, currentUser?.name || "Médico");
      if (res.addedCount > 0) {
        showToast(`¡${res.addedCount} tarjetas importadas al mazo Anki de ${topicCode || "D01"}!`, "success");
      } else {
        showToast("Las tarjetas de esta caja ya estaban en el mazo Anki del tema", "info");
      }
    } catch (err) {
      console.error(err);
      showToast("Error al importar tarjetas Anki", "error");
    }
  };

  // Filtrado de recursos
  const filteredResources = useMemo(() => {
    return allResources.filter(res => {
      const matchSearch = 
        !searchTerm.trim() ||
        res.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        res.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        res.topicTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        res.addedBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        res.manualRef?.manualName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (Array.isArray(res.tags) && res.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));

      const matchType = selectedType === "all" || res.type === selectedType || (selectedType === "manual" && Boolean(res.manualRef));
      const matchSpecialty = selectedSpecialty === "all" || res.specialty === selectedSpecialty;
      const matchTopic = selectedTopicCode === "all" || res.topicCode === selectedTopicCode;

      return matchSearch && matchType && matchSpecialty && matchTopic;
    });
  }, [allResources, searchTerm, selectedType, selectedSpecialty, selectedTopicCode]);

  // Guardar nuevo recurso en el tema seleccionado
  const handleCreateResource = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() && newType !== "ai_telemetry" && newType !== "manual") return;

    setIsSubmitting(true);
    try {
      const targetDay = schedule.find((d) => d.code === targetTopicCode) || {
        code: targetTopicCode,
        title: targetTopicCode,
        specialty: "MI"
      };
      const manualTags = newTags.split(",").map(t => t.trim()).filter(Boolean);
      const analysis =
        newType === "ai_telemetry"
          ? analyzeAiTelemetryMarkdown(newContent, targetDay, currentUser.name)
          : null;

      let manualData = null;
      if (newType === "manual") {
        manualData = {
          manualName: newManualName,
          pages: newManualPages.trim(),
          chapter: newManualChapter.trim()
        };
      }

      const mergedTags = Array.from(
        new Set([...(analysis?.tags || []), ...manualTags])
      );

      const newRes = {
        title: newTitle.trim() || (newType === "manual" ? `${newManualName} — ${newManualPages ? `Pág. ${newManualPages}` : targetDay.title}` : analysis?.suggestedTitle || `Reporte Telemetría IA — ${targetDay.code}`),
        type: newType,
        url: newUrl.trim(),
        imageUrl: newImageUrl || null,
        content: newContent.trim(),
        manualRef: manualData,
        tags: mergedTags.length > 0 ? mergedTags : [targetDay.code, targetDay.specialty, "Público Dúo"],
        isPublic: true,
        analysisSummary: analysis
          ? {
              sectionCount: analysis.sectionCount,
              sections: analysis.sections,
              tableCount: analysis.tableCount,
              codeBlockCount: analysis.codeBlockCount,
              inlineCodeCount: analysis.inlineCodeCount,
              tsvCardsCount: analysis.tsvCardsCount
            }
          : null,
        addedBy: currentUser.name,
        authorId: currentUserId,
        editHistory: [],
        date: new Date().toLocaleDateString("es-MX", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit"
        })
      };

      await addSharedResource(targetTopicCode, newRes);
      showToast("Material guardado y etiquetado para Donato y Sonia", "success");
      setShowAddModal(false);
      setNewTitle("");
      setNewUrl("");
      setNewContent("");
      setNewTags("");
      setNewImageUrl("");
      setNewManualPages("");
      setNewManualChapter("");
      loadAllResources();
    } catch (err) {
      console.error(err);
      showToast("Error guardando el recurso", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reacciones
  const handleReaction = async (res, emoji) => {
    try {
      await toggleResourceReaction(res.topicCode, res.id, emoji, currentUser.name);
      loadAllResources();
    } catch (err) {
      console.error(err);
      showToast("Error al reaccionar", "error");
    }
  };

  // Comentarios
  const handleAddComment = async (res) => {
    const commentText = commentInputMap[res.id];
    if (!commentText || !commentText.trim()) return;

    try {
      await addResourceComment(res.topicCode, res.id, commentText.trim(), currentUser.name);
      setCommentInputMap(prev => ({ ...prev, [res.id]: "" }));
      loadAllResources();
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

      await updateSharedResource(
        editingResource.topicCode,
        editingResource.id,
        updatedFields,
        currentUser.name
      );

      setEditingResource(null);
      loadAllResources();
      showToast("Recurso actualizado con bitácora registrada", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al actualizar recurso", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  // Eliminar recurso
  const handleDeleteResource = async (res) => {
    if (res.isOfficial) {
      showToast("No se puede eliminar un recurso oficial del temario", "info");
      return;
    }
    const confirmed = await confirmAction({
      title: "¿Eliminar material?",
      message: `¿Estás seguro de eliminar "${res.title}"?`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      isDestructive: true
    });
    if (!confirmed) return;

    try {
      await deleteSharedResource(res.topicCode, res.id);
      showToast("Material eliminado", "info");
      loadAllResources();
      if (previewResource && previewResource.id === res.id) {
        setPreviewResource(null);
      }
    } catch (e) {
      showToast("Error al eliminar", "error");
    }
  };

  const cycleFontSize = (id) => {
    setFontSizeMap(prev => {
      const current = prev[id] || "xs";
      const next = current === "xs" ? "sm" : current === "sm" ? "base" : current === "base" ? "lg" : "xs";
      return { ...prev, [id]: next };
    });
  };

  const toggleExpand = (id) => {
    setExpandedMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const typeIcons = {
    ai_telemetry: <Sparkles className="w-4 h-4 text-purple-500" />,
    manual: <Bookmark className="w-4 h-4 text-amber-500" />,
    pdf: <FileText className="w-4 h-4 text-rose-500" />,
    note: <MessageSquare className="w-4 h-4 text-blue-500" />,
    image: <ImageIcon className="w-4 h-4 text-emerald-500" />,
    video: <Video className="w-4 h-4 text-red-500" />,
    link: <ExternalLink className="w-4 h-4 text-indigo-500" />,
    gpc: <BookOpen className="w-4 h-4 text-teal-500" />
  };

  const typeLabels = {
    ai_telemetry: "Telemetría IA (Dúo)",
    manual: "Manual Físico / Dr. Re",
    pdf: "PDF / Guía",
    note: "Resumen / Nota",
    image: "Algoritmo / Imagen",
    video: "Video YouTube",
    link: "Enlace",
    gpc: "GPC CENETEC"
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-6">
      {/* Cabecera y Controles */}
      <div className={`border-2 rounded-2xl p-4 sm:p-5 shadow-xs transition-all ${
        isExam 
          ? "bg-white border-black text-black"
          : isDark 
          ? "bg-slate-900 border-slate-700 text-white" 
          : "bg-white border-slate-300 text-slate-900"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black leading-tight">
                  Biblioteca Clínica, Manuales Dr. Re & Reportes IA (Dúo)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black border-2 border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {filteredResources.length} materiales
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black border border-purple-400/50 bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 inline-flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>Donato & Sonia</span>
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Manuales Dr. Re / Dr. Prieto, fórmulas LaTeX, videos YouTube, imágenes y telemetría IA clasificados por día
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-95 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Subir Material / Manual / IA</span>
          </button>
        </div>

        {/* Barra de Búsqueda y Filtros */}
        <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          {/* Campo de búsqueda */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por título, Dr. Re, página, fórmula o etiqueta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-transparent text-xs focus:border-emerald-500 outline-hidden"
            />
          </div>

          {/* Filtro por tipo de recurso */}
          <div className="sm:col-span-3">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-transparent text-xs font-bold focus:border-emerald-500 outline-hidden"
            >
              <option value="all">Todos los formatos</option>
              <option value="manual">📖 Manuales (Dr. Re / Dr. Prieto)</option>
              <option value="ai_telemetry">🤖 Reportes Telemetría IA</option>
              <option value="image">🖼️ Imágenes / Algoritmos</option>
              <option value="video">🎥 Videos YouTube</option>
              <option value="pdf">📑 PDFs / Guías</option>
              <option value="note">📝 Resúmenes / Notas</option>
              <option value="link">🔗 Enlaces</option>
              <option value="gpc">🏛️ GPC CENETEC</option>
            </select>
          </div>

          {/* Filtro por Especialidad */}
          <div className="sm:col-span-3">
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-transparent text-xs font-bold focus:border-emerald-500 outline-hidden"
            >
              <option value="all">Todas las especialidades</option>
              <option value="MI">Medicina Interna (MI)</option>
              <option value="PED">Pediatría (PED)</option>
              <option value="GYO">Ginecología & Obstetricia (GYO)</option>
              <option value="CIR">Cirugía & Trauma (CIR)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Recursos en Tarjetas Nítidas de Alto Contraste */}
      {filteredResources.length === 0 ? (
        <div className={`border-2 rounded-2xl p-8 text-center ${
          isExam ? "bg-white border-black text-black" : isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-700"
        }`}>
          <BookOpen className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-50" />
          <h4 className="font-bold text-sm">No se encontraron materiales con esos filtros</h4>
          <p className="text-xs text-slate-500 mt-1">
            Puedes agregar referencias de manuales, imágenes o reportes IA haciendo clic en "Subir Material / Manual / IA".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredResources.map((res) => {
            const isAiTelemetry = res.type === "ai_telemetry";
            const isManual = res.type === "manual" || Boolean(res.manualRef);
            const isVideo = res.type === "video";
            const ytEmbedUrl = isVideo ? getYouTubeEmbedUrl(res.url) : null;
            const comments = Array.isArray(res.comments) ? res.comments : [];
            const isCommentsOpen = openCommentsMap[res.id] || false;
            const reactions = res.reactions || {};
            const editCount = Array.isArray(res.editHistory) ? res.editHistory.length : 0;
            const isExpanded = expandedMap[res.id] !== false; // Expandido por defecto, colapsable

            return (
              <div
                key={res.id}
                className={`border-2 rounded-2xl p-4 flex flex-col justify-between transition-all hover:shadow-md ${
                  isExam
                    ? "bg-white border-black text-black hover:border-blue-600"
                    : isAiTelemetry
                    ? isDark
                      ? "bg-slate-900 border-purple-600/70 text-white hover:border-purple-400"
                      : "bg-white border-purple-400 text-slate-900 hover:border-purple-500"
                    : isManual
                    ? isDark
                      ? "bg-slate-900 border-amber-600/70 text-white hover:border-amber-400"
                      : "bg-white border-amber-400 text-slate-900 hover:border-amber-500"
                    : isDark
                    ? "bg-slate-900 border-slate-700 text-white hover:border-emerald-500"
                    : "bg-white border-slate-300 text-slate-900 hover:border-emerald-500"
                }`}
              >
                <div>
                  {/* Cabecera del recurso */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="p-1.5 rounded-lg border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                        {typeIcons[res.type] || <FileText className="w-4 h-4 text-slate-500" />}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded border ${
                        isAiTelemetry
                          ? "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-700"
                          : isManual
                          ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700"
                          : "border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                      }`}>
                        {typeLabels[res.type] || res.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-cyan-300 border border-blue-300">
                        {res.topicCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleExpand(res.id)}
                        className="p-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        title={isExpanded ? "Colapsar tarjeta" : "Expandir tarjeta"}
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Título */}
                  <h4 className="font-black text-sm leading-tight text-slate-950 dark:text-white mb-1 line-clamp-2">
                    {res.title}
                  </h4>

                  {/* Widget Manual si aplica */}
                  {res.manualRef && (
                    <div className="my-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-[11px] font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5 flex-wrap">
                      <Bookmark className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      <span>{res.manualRef.manualName || "Manual"}:</span>
                      {res.manualRef.pages && (
                        <span className="px-1.5 py-0.2 bg-white dark:bg-slate-900 rounded border border-amber-300 dark:border-amber-700 font-mono">
                          Pág. {res.manualRef.pages}
                        </span>
                      )}
                      {res.manualRef.chapter && (
                        <span className="text-slate-600 dark:text-slate-400">
                          {res.manualRef.chapter}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Previsualización imagen si existe */}
                  {res.imageUrl && (
                    <div className="my-2 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-black/5 max-h-36">
                      <img 
                        src={res.imageUrl} 
                        alt={res.title} 
                        className="w-full h-36 object-contain cursor-zoom-in"
                        onClick={() => setLightboxImage(res.imageUrl)} 
                      />
                    </div>
                  )}

                  {/* Reproductor YouTube si aplica */}
                  {ytEmbedUrl && (
                    <div className="my-2 aspect-video rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-black">
                      <iframe
                        src={ytEmbedUrl}
                        title={res.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full border-0"
                      />
                    </div>
                  )}

                  {/* Contenido si está expandido */}
                  {isExpanded && res.content && (
                    <div className="text-xs text-slate-700 dark:text-slate-300 mb-2 line-clamp-4 font-medium clinical-case-text">
                      <MarkdownRenderer content={res.content} />
                    </div>
                  )}

                  {/* Etiquetas */}
                  {res.tags && res.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {res.tags.slice(0, 4).map((tag, i) => (
                        <span
                          key={i}
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pie de la tarjeta */}
                <div className="pt-2 border-t-2 border-slate-200 dark:border-slate-800 space-y-2">
                  {/* Reacciones compactas */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      {["🔥", "💡", "🧠", "❤️"].map((emoji) => {
                        const users = reactions[emoji] || [];
                        const hasReacted = users.includes(currentUser.name);
                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleReaction(res, emoji)}
                            className={`px-1.5 py-0.5 rounded text-[11px] font-bold border transition-all cursor-pointer ${
                              hasReacted
                                ? "bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-950/60 dark:text-amber-200"
                                : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                            }`}
                            title={`${users.join(", ") || "Reaccionar"}`}
                          >
                            <span>{emoji}</span>
                            {users.length > 0 && <span className="ml-0.5 font-mono text-[9px]">{users.length}</span>}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setOpenCommentsMap(prev => ({ ...prev, [res.id]: !prev[res.id] }))}
                      className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>{comments.length}</span>
                    </button>
                  </div>

                  {/* Acciones principales de lectura y edición */}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 text-[10px] font-medium truncate max-w-[120px]">
                      {res.addedBy} {editCount > 0 && `(${editCount} ed.)`}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(res)}
                        className="p-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                        title="Editar material"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreviewResource(res)}
                        className="px-2.5 py-1 rounded-lg border-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold flex items-center gap-1 text-xs cursor-pointer"
                        title="Leer completo"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Abrir</span>
                      </button>

                      {!res.isOfficial && (
                        <button
                          type="button"
                          onClick={() => handleDeleteResource(res)}
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Caja de comentarios desplegable */}
                  {isCommentsOpen && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                      {comments.map((c) => (
                        <div key={c.id} className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <div className="flex justify-between text-[9px] text-slate-500">
                            <strong>{c.author}</strong>
                            <span>{c.date}</span>
                          </div>
                          <p className="text-[11px] text-slate-800 dark:text-slate-200 font-medium">{c.text}</p>
                        </div>
                      ))}
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="Comentar..."
                          value={commentInputMap[res.id] || ""}
                          onChange={(e) => setCommentInputMap(prev => ({ ...prev, [res.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddComment(res);
                            }
                          }}
                          className="flex-1 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddComment(res)}
                          className="p-1 rounded-lg bg-blue-600 text-white cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL VISTA PREVIA DETALLADA CON MARKDOWN Y FÓRMULAS LATEX */}
      {previewResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className={`border-2 rounded-3xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl p-5 overflow-hidden ${
            isExam ? "bg-white border-black text-black" : isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
          }`}>
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  {typeIcons[previewResource.type] || <FileText className="w-5 h-5" />}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-black text-base truncate">
                      {previewResource.title}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
                      🌐 Público (Donato y Sonia)
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">
                    Asignado a: {previewResource.topicCode} • Subido por {previewResource.addedBy} • {previewResource.date}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewResource(null)}
                className="p-1.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 overflow-y-auto flex-1">
              {/* Widget Manual si aplica */}
              {previewResource.manualRef && (
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-amber-600" />
                  <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    <span>{previewResource.manualRef.manualName || "Manual"}: </span>
                    {previewResource.manualRef.pages && (
                      <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-amber-300 font-mono mr-2">
                        Pág. {previewResource.manualRef.pages}
                      </span>
                    )}
                    {previewResource.manualRef.chapter && (
                      <span>Capítulo: {previewResource.manualRef.chapter}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Imagen si aplica */}
              {previewResource.imageUrl && (
                <div className="rounded-2xl overflow-hidden border-2 border-slate-300 dark:border-slate-700">
                  <img src={previewResource.imageUrl} alt={previewResource.title} className="w-full max-h-96 object-contain" />
                </div>
              )}

              {/* Video YouTube si aplica */}
              {previewResource.type === "video" && getYouTubeEmbedUrl(previewResource.url) && (
                <div className="aspect-video w-full rounded-2xl overflow-hidden border-2 border-slate-300 dark:border-slate-700 bg-black">
                  <iframe
                    src={getYouTubeEmbedUrl(previewResource.url)}
                    title={previewResource.title}
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              )}

              {Array.isArray(previewResource.tags) && previewResource.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {previewResource.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {previewResource.content && (
                <div className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                  <MarkdownRenderer
                    content={previewResource.content}
                    onImportTsvCards={(tsv) => handleImportTsvFromLibrary(previewResource.topicCode, tsv)}
                  />
                </div>
              )}

              {previewResource.url && previewResource.type !== "video" && (
                <div className="p-3 rounded-xl border-2 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 flex items-center justify-between">
                  <span className="text-xs font-mono truncate max-w-md">
                    {previewResource.url}
                  </span>
                  <a
                    href={previewResource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white flex items-center gap-1 shadow-xs"
                  >
                    <span>Abrir Enlace</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Lightbox de Imagen */}
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

      {/* Modal Editar Material */}
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
                <label className="text-xs font-bold block mb-1">Título</label>
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
                    <label className="text-[10px] font-bold block mb-0.5">Capítulo</label>
                    <input
                      type="text"
                      placeholder="Capítulo"
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
                <label className="text-xs font-bold block mb-1">URL (YouTube o Enlace)</label>
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
                <label className="text-xs font-bold block mb-1">Contenido / Notas (Soporta LaTeX $$...$$)</label>
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

      {/* MODAL SUBIR NUEVO MATERIAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className={`border-2 rounded-3xl w-full max-w-2xl shadow-2xl p-5 max-h-[90vh] overflow-y-auto ${
            isExam ? "bg-white border-black text-black" : isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
          }`}>
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-200 dark:border-slate-800">
              <h4 className="font-black text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                <span>Agregar Material a la Biblioteca Pública Dúo</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-xl border-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateResource} className="py-4 space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">Tema del Cronograma *</label>
                <select
                  value={targetTopicCode}
                  onChange={(e) => setTargetTopicCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-transparent text-xs font-bold focus:border-emerald-500 outline-hidden"
                >
                  {schedule.map((day) => (
                    <option key={day.code} value={day.code}>
                      {day.code}: {day.title} ({day.specialty})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de formato */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {[
                  { id: "manual", label: "📖 Manual" },
                  { id: "image", label: "🖼️ Imagen" },
                  { id: "video", label: "🎥 Video" },
                  { id: "ai_telemetry", label: "🤖 IA" },
                  { id: "pdf", label: "📄 PDF" },
                  { id: "note", label: "📝 Nota" }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setNewType(t.id)}
                    className={`py-2 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer ${
                      newType === t.id
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700 opacity-70"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  Título del Recurso {newType === "ai_telemetry" || newType === "manual" ? "(Opcional)" : "*"}
                </label>
                <input
                  type="text"
                  required={newType !== "ai_telemetry" && newType !== "manual"}
                  placeholder={newType === "manual" ? "Ej. Manejo CAD en Manual Dr. Re" : "Ej. Resumen Cetoacidosis y Fórmulas"}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-transparent text-xs focus:border-emerald-500 outline-hidden"
                />
              </div>

              {/* Formulario de Manual si aplica */}
              {newType === "manual" && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border-2 border-amber-300 dark:border-amber-700 space-y-2.5">
                  <span className="text-xs font-extrabold text-amber-900 dark:text-amber-300 block">
                    📖 Localización en Manuales Dr. Re / Dr. Prieto
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
                        <option value="Otro Manual">Otro Manual</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold block mb-0.5">Páginas</label>
                      <input
                        type="text"
                        placeholder="ej. pág. 45 - 52"
                        value={newManualPages}
                        onChange={(e) => setNewManualPages(e.target.value)}
                        className={`w-full rounded-xl px-2.5 py-1.5 text-xs border-2 ${
                          isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300"
                        }`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold block mb-0.5">Capítulo</label>
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

              {/* Formulario de Imagen si aplica */}
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
                        Quitar
                      </button>
                    )}
                  </div>
                  {newImageUrl && (
                    <div className="mt-2 rounded-xl overflow-hidden border max-h-36">
                      <img src={newImageUrl} alt="Preview" className="w-full h-36 object-contain bg-black/10" />
                    </div>
                  )}
                </div>
              )}

              {/* URL */}
              {(newType === "video" || newType === "pdf" || newType === "link" || newType === "note") && (
                <div>
                  <label className="block text-xs font-bold mb-1">
                    {newType === "video" ? "Enlace de YouTube" : "URL (Drive, YouTube o PDF)"}
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-transparent text-xs focus:border-emerald-500 outline-hidden"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold mb-1">
                  Contenido en Markdown (Soporta fórmulas LaTeX $$...$$, cajas TSV Anki y tablas)
                </label>
                <textarea
                  rows={5}
                  placeholder="Escribe o pega aquí notas clínicas, fórmulas LaTeX como $$\text{Osmolaridad} = 2\text{Na} + \text{Gluc}/18$$ o telemetría..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  onPaste={handlePasteImage}
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-transparent text-xs font-mono focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border-2 border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  {isSubmitting ? "Guardando..." : "Guardar en Biblioteca"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
