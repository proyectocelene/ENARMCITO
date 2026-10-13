// src/components/Calendar/CalendarView.jsx
// Vista Interactiva de Calendario Mensual con Cuenta Regresiva al ENARM 2027,
// Mapeo de Temas Clínicos Oficiales y Gestión de Eventos Dúo (Compartidos o Privados)

import React, { useState, useEffect, useMemo } from "react";
import { useUser } from "../../context/UserContext";
import { useToast } from "../Common/ToastAndConfirm";
import { PRESEASON_SCHEDULE } from "../../data/preseasonSchedule";
import { 
  getCalendarEvents, 
  saveCalendarEvent, 
  deleteCalendarEvent 
} from "../../firebase/firestoreService";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  X, 
  Lock, 
  Users, 
  BookOpen, 
  Sparkles, 
  AlertCircle,
  Flag,
  CheckCircle2
} from "lucide-react";

// Fecha Oficial Estimada del ENARM 2027 (Última semana de Septiembre 2027)
const ENARM_2027_DATE = new Date("2027-09-28T08:00:00");

export function CalendarView({ onSelectDayTopic }) {
  const { currentUserId, currentUser, partnerUser, theme, switchDay } = useUser();
  const { showToast, confirmAction } = useToast();
  const isDark = theme === "dark";
  const isExam = theme === "enarm-cifrhs";

  // Fecha visible en el calendario (por defecto mes y año actual: Octubre 2026)
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 9, 1)); // Octubre 2026

  // Cuenta regresiva precisa al ENARM
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const diff = ENARM_2027_DATE.getTime() - now.getTime();
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Eventos de calendario cargados desde Firestore / LocalStorage
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Modal para agregar nuevo evento
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState("2026-10-12");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventPrivacy, setEventPrivacy] = useState("shared"); // "shared" | "private"
  const [eventType, setEventType] = useState("study"); // "study" | "guardia" | "exam" | "personal"
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal de detalles de un día
  const [dayDetailsModal, setDayDetailsModal] = useState(null);

  // Cargar eventos
  const loadEvents = async () => {
    setLoadingEvents(true);
    try {
      const data = await getCalendarEvents(currentUserId);
      setEvents(data);
    } catch (e) {
      console.error("Error cargando eventos:", e);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [currentUserId]);

  // Mapa de temas por fecha "YYYY-MM-DD"
  const scheduleByDate = useMemo(() => {
    const map = {};
    PRESEASON_SCHEDULE.forEach(item => {
      // D01 es 2026-10-12, etc.
      // Calcular fecha basada en dayNumber de octubre 2026
      // Semana 1: 12 al 17
      // Semana 2: 19 al 24
      // Semana 3: 26 al 31
      let dayOfMonth = 12;
      if (item.dayNumber <= 6) {
        dayOfMonth = 11 + item.dayNumber; // 12 a 17
      } else if (item.dayNumber <= 12) {
        dayOfMonth = 19 + (item.dayNumber - 7); // 19 a 24
      } else {
        dayOfMonth = 26 + (item.dayNumber - 13); // 26 a 31
      }
      const dateKey = `2026-10-${String(dayOfMonth).padStart(2, "0")}`;
      map[dateKey] = item;
    });
    return map;
  }, []);

  // Filtrar eventos visibles para el usuario (compartidos o creados por él mismo)
  const visibleEvents = useMemo(() => {
    return events.filter(e => e.privacy === "shared" || e.createdBy === currentUserId);
  }, [events, currentUserId]);

  // Navegar entre meses
  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Crear nuevo evento
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const newEv = {
        title: eventTitle.trim(),
        description: eventDescription.trim(),
        date: selectedDateStr,
        privacy: eventPrivacy,
        type: eventType,
        createdBy: currentUserId,
        authorName: currentUser.name
      };
      await saveCalendarEvent(newEv);
      showToast("Evento guardado correctamente", "success");
      setShowEventModal(false);
      setEventTitle("");
      setEventDescription("");
      loadEvents();
    } catch (err) {
      console.error(err);
      showToast("Error al guardar el evento", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eliminar evento
  const handleDeleteEvent = async (eventId) => {
    const confirmed = await confirmAction({
      title: "¿Eliminar evento?",
      message: "Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      isDestructive: true
    });
    if (!confirmed) return;

    try {
      await deleteCalendarEvent(eventId);
      showToast("Evento eliminado", "info");
      loadEvents();
      if (dayDetailsModal) {
        setDayDetailsModal(prev => ({
          ...prev,
          events: prev.events.filter(ev => ev.id !== eventId)
        }));
      }
    } catch (err) {
      showToast("No se pudo eliminar", "error");
    }
  };

  // Construir la matriz de días para el mes visible
  const monthDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 es Domingo
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Relleno días anteriores
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNumber: null, isCurrentMonth: false });
    }

    // Días del mes
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const topicItem = scheduleByDate[dateKey] || null;
      const dayEvents = visibleEvents.filter(ev => ev.date === dateKey);

      const today = new Date();
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

      days.push({
        dayNumber: d,
        dateKey,
        isCurrentMonth: true,
        topicItem,
        events: dayEvents,
        isToday
      });
    }

    return days;
  }, [currentMonth, scheduleByDate, visibleEvents]);

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-6">
      {/* 1. CUENTA REGRESIVA AL ENARM 2027 */}
      <div className={`border-2 rounded-2xl p-4 sm:p-5 shadow-sm transition-all ${
        isExam 
          ? "bg-white border-black text-black"
          : isDark 
          ? "bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-indigo-900/60 text-white" 
          : "bg-gradient-to-r from-blue-50 via-indigo-50/50 to-cyan-50 border-blue-300 text-slate-900"
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs">
                <Flag className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                  Cuenta Regresiva Oficial: ENARM 2027
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                  Objetivo Clínico: 28 de Septiembre de 2027 (Examen Nacional CIFRHS)
                </p>
              </div>
            </div>
          </div>

          {/* Bloques del Contador */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center">
            <div className="border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 sm:p-3 rounded-xl shadow-xs">
              <span className="block text-xl sm:text-3xl font-black font-mono text-blue-600 dark:text-cyan-400">
                {timeLeft.days}
              </span>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                Días
              </span>
            </div>

            <div className="border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 sm:p-3 rounded-xl shadow-xs">
              <span className="block text-xl sm:text-3xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                {String(timeLeft.hours).padStart(2, "0")}
              </span>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                Horas
              </span>
            </div>

            <div className="border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 sm:p-3 rounded-xl shadow-xs">
              <span className="block text-xl sm:text-3xl font-black font-mono text-purple-600 dark:text-purple-400">
                {String(timeLeft.minutes).padStart(2, "0")}
              </span>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                Min
              </span>
            </div>

            <div className="border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 sm:p-3 rounded-xl shadow-xs">
              <span className="block text-xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {String(timeLeft.seconds).padStart(2, "0")}
              </span>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                Seg
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CALENDARIO MENSUAL CON TEMAS Y EVENTOS */}
      <div className={`border-2 rounded-2xl p-4 sm:p-5 shadow-sm transition-all ${
        isExam 
          ? "bg-white border-black text-black"
          : isDark 
          ? "bg-slate-900 border-slate-700 text-white" 
          : "bg-white border-slate-300 text-slate-900"
      }`}>
        {/* Cabecera del Calendario */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h3 className="font-black text-lg">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
              Temario & Eventos Dúo
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Mes Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentMonth(new Date(2026, 9, 1))}
              className="px-2.5 py-1 text-xs font-bold rounded-xl border-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Octubre 2026
            </button>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Mes Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedDateStr("2026-10-12");
                setShowEventModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Evento</span>
            </button>
          </div>
        </div>

        {/* Nombres de los Días de la Semana */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mt-3 text-center text-xs font-black text-slate-500 uppercase">
          <div>Dom</div>
          <div>Lun</div>
          <div>Mar</div>
          <div>Mié</div>
          <div>Jue</div>
          <div>Vie</div>
          <div>Sáb</div>
        </div>

        {/* Matriz de Días */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mt-2">
          {monthDays.map((cell, idx) => {
            if (!cell.isCurrentMonth) {
              return (
                <div 
                  key={idx} 
                  className="min-h-[75px] sm:min-h-[95px] p-1.5 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800/40 opacity-20"
                />
              );
            }

            const hasTopic = !!cell.topicItem;
            const hasEvents = cell.events && cell.events.length > 0;

            return (
              <div
                key={idx}
                onClick={() => {
                  setDayDetailsModal(cell);
                }}
                className={`min-h-[75px] sm:min-h-[95px] p-1.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  cell.isToday
                    ? "border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 ring-2 ring-blue-400/50"
                    : hasTopic
                    ? "border-slate-300 dark:border-slate-700 hover:border-blue-400 bg-white dark:bg-slate-800/80 shadow-xs"
                    : "border-slate-200 dark:border-slate-800/80 hover:border-slate-400 bg-slate-50/50 dark:bg-slate-900/60"
                }`}
              >
                {/* Cabecera del Día */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black font-mono ${
                    cell.isToday ? "text-blue-600 dark:text-cyan-400" : ""
                  }`}>
                    {cell.dayNumber}
                  </span>

                  {cell.topicItem && (
                    <span className="text-[9px] font-black px-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-cyan-300 border border-blue-300 dark:border-blue-800">
                      {cell.topicItem.code}
                    </span>
                  )}
                </div>

                {/* Contenido del Día: Tema o Eventos */}
                <div className="space-y-1 my-1">
                  {cell.topicItem && (
                    <div 
                      className="text-[10px] font-bold leading-tight line-clamp-2 text-slate-800 dark:text-slate-200 hover:text-blue-600"
                      title={`${cell.topicItem.code}: ${cell.topicItem.title}`}
                    >
                      {cell.topicItem.title}
                    </div>
                  )}

                  {/* Indicador de Eventos */}
                  {hasEvents && (
                    <div className="flex flex-wrap gap-1">
                      {cell.events.map((ev) => (
                        <span
                          key={ev.id}
                          className={`text-[9px] font-bold px-1 py-0.5 rounded flex items-center gap-0.5 truncate max-w-full ${
                            ev.privacy === "shared"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 dark:border-purple-800"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                          }`}
                          title={`${ev.title} (${ev.privacy === "shared" ? "Compartido" : "Privado"})`}
                        >
                          {ev.privacy === "shared" ? <Users className="w-2.5 h-2.5 flex-shrink-0" /> : <Lock className="w-2.5 h-2.5 flex-shrink-0" />}
                          <span className="truncate">{ev.title}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pie del Día */}
                <div className="text-[9px] text-slate-400 text-right">
                  {hasTopic && <span className="font-semibold text-blue-600 dark:text-cyan-400">Ver temario</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. MODAL DETALLES DEL DÍA */}
      {dayDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className={`border-2 rounded-3xl w-full max-w-lg shadow-2xl p-5 overflow-hidden ${
            isExam ? "bg-white border-black text-black" : isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
          }`}>
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-200 dark:border-slate-800">
              <div>
                <h4 className="font-black text-base">
                  Día {dayDetailsModal.dayNumber} de {monthNames[currentMonth.getMonth()]}
                </h4>
                <span className="text-xs text-slate-500 font-mono">
                  {dayDetailsModal.dateKey}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDayDetailsModal(null)}
                className="p-1 rounded-xl border-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Tema Oficial del Día si existe */}
              {dayDetailsModal.topicItem ? (
                <div className="p-3.5 rounded-2xl border-2 border-blue-300 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-600 text-white">
                      {dayDetailsModal.topicItem.code}
                    </span>
                    <span className="text-xs font-bold text-blue-800 dark:text-cyan-300">
                      {dayDetailsModal.topicItem.normativa}
                    </span>
                  </div>
                  <h5 className="font-black text-sm text-slate-950 dark:text-white">
                    {dayDetailsModal.topicItem.title}
                  </h5>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {dayDetailsModal.topicItem.summary}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      switchDay(dayDetailsModal.topicItem.code);
                      setDayDetailsModal(null);
                      if (onSelectDayTopic) onSelectDayTopic();
                    }}
                    className="w-full py-2 px-3 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Estudiar este Tema ({dayDetailsModal.topicItem.code})</span>
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No hay tema del cronograma asignado para esta fecha.</p>
              )}

              {/* Eventos del Día */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Eventos del Día ({dayDetailsModal.events.length})
                  </h5>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDateStr(dayDetailsModal.dateKey);
                      setDayDetailsModal(null);
                      setShowEventModal(true);
                    }}
                    className="text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Agregar Evento</span>
                  </button>
                </div>

                {dayDetailsModal.events.length === 0 ? (
                  <p className="text-xs text-slate-400">Sin eventos agendados.</p>
                ) : (
                  dayDetailsModal.events.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-xl border-2 border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {ev.privacy === "shared" ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300">
                              Dúo Compartido
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                              Solo Yo
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">por {ev.authorName}</span>
                        </div>
                        <h6 className="font-bold text-xs text-slate-900 dark:text-white">
                          {ev.title}
                        </h6>
                        {ev.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {ev.description}
                          </p>
                        )}
                      </div>

                      {ev.createdBy === currentUserId && (
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Eliminar evento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL CREAR NUEVO EVENTO */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className={`border-2 rounded-3xl w-full max-w-md shadow-2xl p-5 overflow-hidden ${
            isExam ? "bg-white border-black text-black" : isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
          }`}>
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-200 dark:border-slate-800">
              <h4 className="font-black text-base flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                <span>Agendar Evento</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowEventModal(false)}
                className="p-1 rounded-xl border-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="py-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold mb-1">Título del Evento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Guardia Hospital / Repaso Código Infarto"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-transparent text-sm focus:border-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Fecha</label>
                <input
                  type="date"
                  required
                  value={selectedDateStr}
                  onChange={(e) => setSelectedDateStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-transparent text-sm focus:border-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Visibilidad</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEventPrivacy("shared")}
                    className={`py-2 px-3 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      eventPrivacy === "shared"
                        ? "border-purple-500 bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                        : "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Compartido Dúo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEventPrivacy("private")}
                    className={`py-2 px-3 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      eventPrivacy === "private"
                        ? "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                        : "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Privado (Solo Yo)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Notas o Detalles (Opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre pendientes, guardia o material..."
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-transparent text-sm focus:border-blue-500 outline-hidden"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 rounded-xl border-2 border-slate-300 dark:border-slate-700 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all"
                >
                  {isSubmitting ? "Guardando..." : "Guardar Evento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
