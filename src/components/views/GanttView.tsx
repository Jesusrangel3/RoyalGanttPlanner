"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Plus, Download, RotateCcw, ChevronRight, AlertTriangle } from "lucide-react";
import { mockPhases } from "@/lib/mockData";
import { AuthUser, getSessionUser } from "@/lib/auth";
import { Task, TaskStatus, Milestone, Phase, Project } from "@/types";
import { getDaysInRange, isWeekend, isToday, parseDate, STATUS_COLORS } from "@/lib/utils";


const COL_W = 36;
const ROW_H = 38;
const LEFT_W = 300;
const MONTHS_SHOWN = 6;

type ViewMode = "month" | "week" | "quarter";

function getWeeksInRange(start: Date, weeksCount: number): Date[] {
  const weeks: Date[] = [];
  const d = new Date(start);
  const day = d.getDay();
  // Adjust to nearest Monday
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  
  for (let i = 0; i < weeksCount; i++) {
    weeks.push(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i * 7));
  }
  return weeks;
}

function getMonthsInRange(start: Date, monthsCount: number): Date[] {
  const months: Date[] = [];
  for (let i = 0; i < monthsCount; i++) {
    months.push(new Date(start.getFullYear(), start.getMonth() + i, 1));
  }
  return months;
}

function getWeekNumber(d: Date): number {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function addScaleUnits(dateStr: string, delta: number, viewMode: ViewMode): string {
  const d = parseDate(dateStr);
  if (viewMode === "month") {
    d.setDate(d.getDate() + delta);
  } else if (viewMode === "week") {
    d.setDate(d.getDate() + delta * 7);
  } else {
    d.setMonth(d.getMonth() + delta);
  }
  return d.toISOString().split("T")[0];
}

// ── Avatar ──────────────────────────────────────────
function Avatar({ userId, size = 24, users_Gantt }: { userId: string; size?: number; users_Gantt: AuthUser[] }) {
  const user = users_Gantt.find((u) => u.id === userId);
  if (!user) return null;
  if (user.imageUrl) {
    return (
      <img
        src={user.imageUrl}
        alt={user.name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        title={`${user.name} (${user.role})`}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, background: user.color, fontSize: size * 0.36 }}
      title={`${user.name} (${user.role})`}
    >
      {user.initials}
    </div>
  );
}

import TaskModal from "@/components/TaskModal";

const INPUT = "bg-[#22263a] border border-[#2e3352] text-[#e8eaf6] rounded-lg px-3 py-1.5 text-xs font-[inherit] w-full focus:outline-none focus:border-[#4f7cff]";
const BTN = "px-3 py-1.5 rounded-lg border border-[#2e3352] bg-[#22263a] text-[#e8eaf6] text-xs font-medium hover:border-[#4f7cff] transition-colors cursor-pointer";
const BTN_PRIMARY = "px-3 py-1.5 rounded-lg bg-[#4f7cff] border border-[#4f7cff] text-white text-xs font-medium hover:bg-[#3a6be0] transition-colors cursor-pointer";


// ── Confirm dialog ──
function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={onCancel}>
      <div className="bg-[#1a1d27] border border-[#ff5c5c] rounded-xl p-6 w-72 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="text-2xl mb-3">🗑️</div>
        <h3 className="font-semibold text-sm mb-1">¿Eliminar?</h3>
        <p className="text-[#8b93b8] text-xs mb-5">{message}</p>
        <div className="flex gap-2 justify-center">
          <button className={BTN} onClick={onCancel}>Cancelar</button>
          <button className="px-3 py-1.5 rounded-lg bg-[#ff5c5c] text-white text-xs font-medium hover:bg-red-600 transition-colors cursor-pointer" onClick={onConfirm}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}

// ── Componente GanttView Principal ──
interface GanttViewProps {
  Tasks_Gantt: Task[];
  setTasks: (Tasks_Gantt: Task[] | ((prev: Task[]) => Task[])) => void;
  Phases_Gantt: Phase[];
  setPhases_Gantt: (Phases_Gantt: Phase[] | ((prev: Phase[]) => Phase[])) => void;
  Milestones_Gantt: Milestone[];
  setMilestones_Gantt: (Milestones_Gantt: Milestone[] | ((prev: Milestone[]) => Milestone[])) => void;
  Projects_Gantt: Project[];
  setProjects_Gantt: (Projects_Gantt: Project[] | ((prev: Project[]) => Project[])) => void;
  users_Gantt: AuthUser[];
  openTaskId?: string | null;
  onClearOpenTaskId?: () => void;
}

export default function GanttView({
  Tasks_Gantt,
  setTasks,
  Phases_Gantt,
  setPhases_Gantt,
  Milestones_Gantt,
  setMilestones_Gantt,
  Projects_Gantt,
  setProjects_Gantt,
  users_Gantt,
  openTaskId,
  onClearOpenTaskId,
}: GanttViewProps) {
  const currentUser = getSessionUser();
  const isPM = currentUser?.role === "Project Manager";

  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [startDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMember, setFilterMember] = useState("");
  const [filterPriority, setFilterPriority] = useState("");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function getRiskFlag(task: Task): "vencida" | "en_riesgo" | null {
    if (task.status === "done") return null;
    const end = new Date(task.endDate + "T00:00:00");
    if (end < today) return "vencida";
    const daysLeft = (end.getTime() - today.getTime()) / (1000 * 3600 * 24);
    if (daysLeft <= 2) return "en_riesgo";
    return null;
  }

  const PRIORITY_COLORS: Record<string, string> = {
    critica: "#ff5c5c",
    alta:    "#f5a623",
    media:   "#4f7cff",
    baja:    "#8b93b8",
  };

  const PRIORITY_LABELS: Record<string, string> = {
    critica: "C",
    alta:    "A",
    media:   "M",
    baja:    "B",
  };
  const [modalTask, setModalTask] = useState<Partial<Task> | null | false>(false);
  const [confirm, setConfirm] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => {
    if (openTaskId) {
      const task = Tasks_Gantt.find((t) => t.id === openTaskId);
      if (task) {
        setModalTask(task);
      }
      onClearOpenTaskId?.();
    }
  }, [openTaskId, Tasks_Gantt, onClearOpenTaskId]);

  // Dynamic parameters based on viewMode
  let days: Date[] = [];
  let colWidth = 36;
  
  if (viewMode === "month") {
    days = getDaysInRange(startDate, MONTHS_SHOWN);
    colWidth = 36;
  } else if (viewMode === "week") {
    days = getWeeksInRange(startDate, 26);
    colWidth = 64;
  } else {
    days = getMonthsInRange(startDate, 12);
    colWidth = 80;
  }

  const totalW = days.length * colWidth;

  const [resizing, setResizing] = useState<{
    taskId: string;
    side: "left" | "right";
    initialX: number;
    initialStart: string;
    initialEnd: string;
  } | null>(null);

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizing.initialX;
      const deltaCols = Math.round(deltaX / colWidth);

      if (deltaCols === 0) return;

      const task = Tasks_Gantt.find((t) => t.id === resizing.taskId);
      if (!task) return;

      if (resizing.side === "left") {
        const newStart = addScaleUnits(resizing.initialStart, deltaCols, viewMode);
        if (newStart <= resizing.initialEnd) {
          setTasks((prev) =>
            prev.map((t) => (t.id === resizing.taskId ? { ...t, startDate: newStart } : t))
          );
        }
      } else {
        const newEnd = addScaleUnits(resizing.initialEnd, deltaCols, viewMode);
        if (newEnd >= resizing.initialStart) {
          setTasks((prev) =>
            prev.map((t) => (t.id === resizing.taskId ? { ...t, endDate: newEnd } : t))
          );
        }
      }
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizing, colWidth, viewMode, Tasks_Gantt, setTasks]);

  const filteredTasks = Tasks_Gantt.filter((t) => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterMember && !(t.assigneeIds?.includes(filterMember) || t.assigneeId === filterMember)) return false;
    if (filterPriority && (t as any).priority !== filterPriority) return false;
    return true;
  });

  // Calcular la posición vertical de cada tarea en el timeline para dibujar dependencias
  let currentPos = 0;
  const taskRowPositions: Record<string, number> = {};

  Phases_Gantt.forEach((phase) => {
    const pTasks = filteredTasks.filter((t) => t.phaseId === phase.id);
    
    currentPos++; // Cabecera de la fase
    
    pTasks.forEach((task) => {
      taskRowPositions[task.id] = currentPos;
      currentPos++;
    });
  });

  const dragRef = useRef<{ task: Task; origStart: string; origEnd: string; startX: number } | null>(null);
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);

  const handleLeftScroll = () => {
    if (!leftScrollRef.current || !rightScrollRef.current) return;
    if (rightScrollRef.current.scrollTop !== leftScrollRef.current.scrollTop) {
      rightScrollRef.current.scrollTop = leftScrollRef.current.scrollTop;
    }
  };

  const handleRightScroll = () => {
    if (!leftScrollRef.current || !rightScrollRef.current) return;
    if (leftScrollRef.current.scrollTop !== rightScrollRef.current.scrollTop) {
      leftScrollRef.current.scrollTop = rightScrollRef.current.scrollTop;
    }
  };

  function dayIndex(dateStr: string): number {
    const d = parseDate(dateStr);
    if (viewMode === "month") {
      return days.findIndex((day) => day.toDateString() === d.toDateString());
    } else if (viewMode === "week") {
      return days.findIndex((weekStart, idx) => {
        const nextWeekStart = days[idx + 1] || new Date(weekStart.getTime() + 7 * 24 * 3600 * 1000);
        return d >= weekStart && d < nextWeekStart;
      });
    } else {
      return days.findIndex((monthStart, idx) => {
        const nextMonthStart = days[idx + 1] || new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
        return d >= monthStart && d < nextMonthStart;
      });
    }
  }

  function colToDateStr(col: number): string {
    const idx = Math.max(0, Math.min(col, days.length - 1));
    return days[idx].toISOString().split("T")[0];
  }

  const handleBarDrop = useCallback((e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    if (!dragRef.current || dragRef.current.task.id !== taskId) return;
    const { task, origStart, origEnd } = dragRef.current;
    const ganttEl = document.getElementById("gantt-scroll");
    if (!ganttEl) return;
    const rect = ganttEl.getBoundingClientRect();
    const scrollLeft = ganttEl.scrollLeft;
    const x = e.clientX - rect.left + scrollLeft;
    const newStartCol = Math.max(0, Math.floor(x / colWidth));
    const dur = dayIndex(origEnd) - dayIndex(origStart);
    const newStart = colToDateStr(newStartCol);
    const newEnd = colToDateStr(newStartCol + Math.max(0, dur));
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, startDate: newStart, endDate: newEnd } : t));
    dragRef.current = null;
  }, [days, setTasks, viewMode, colWidth]);

  const done = Tasks_Gantt.filter((t) => t.status === "done").length;
  const inProg = Tasks_Gantt.filter((t) => t.status === "in_progress").length;
  const review = Tasks_Gantt.filter((t) => t.status === "review").length;
  const blocked = Tasks_Gantt.filter((t) => t.status === "blocked").length;
  const globalProgress = Tasks_Gantt.length ? Math.round(Tasks_Gantt.reduce((a, t) => a + (t.progress || 0), 0) / Tasks_Gantt.length) : 0;

  const headerGroups: { label: string; count: number }[] = [];
  days.forEach((d) => {
    let lbl = "";
    if (viewMode === "quarter") {
      lbl = d.getFullYear().toString();
    } else {
      lbl = d.toLocaleString("es", { month: "short", year: "2-digit" }).toUpperCase();
    }
    const last = headerGroups[headerGroups.length - 1];
    if (last && last.label === lbl) last.count++;
    else headerGroups.push({ label: lbl, count: 1 });
  });

  function saveTask(t: Task) {
    setTasks((prev) => {
      const idx = prev.findIndex((x) => x.id === t.id);
      return idx >= 0 ? prev.map((x) => (x.id === t.id ? t : x)) : [...prev, t];
    });
    setModalTask(false);
  }

  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setConfirm(null);
    setModalTask(false);
  }

  const now = new Date();
  let todayIdx = -1;
  if (viewMode === "month") {
    todayIdx = days.findIndex((d) => isToday(d));
  } else if (viewMode === "week") {
    todayIdx = days.findIndex((weekStart, idx) => {
      const nextWeekStart = days[idx + 1] || new Date(weekStart.getTime() + 7 * 24 * 3600 * 1000);
      return now >= weekStart && now < nextWeekStart;
    });
  } else if (viewMode === "quarter") {
    todayIdx = days.findIndex((monthStart, idx) => {
      const nextMonthStart = days[idx + 1] || new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
      return now >= monthStart && now < nextMonthStart;
    });
  }

  return (
    <div className="flex flex-col h-full bg-[#0f1117]">


       {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#1a1d27] border-b border-[#2e3352] flex-shrink-0 flex-wrap">
        {isPM && (
          <button className={BTN_PRIMARY + " flex items-center gap-1"} onClick={() => setModalTask({ projectId: Projects_Gantt[0]?.id })}>
            <Plus size={13} /> Nueva tarea
          </button>
        )}
        <div className="flex items-center gap-2 ml-2">
          <span className="text-[11px] text-[#8b93b8]">Filtrar:</span>
          <select className={INPUT + " !w-auto"} value={filterMember} onChange={(e) => setFilterMember(e.target.value)}>
            <option value="">Todos los recursos</option>
            {users_Gantt.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select className={INPUT + " !w-auto"} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="open">Iniciado</option>
            <option value="in_progress">En desarrollo</option>
            <option value="review">En revisión</option>
            <option value="blocked">Bloqueado</option>
            <option value="done">Terminado</option>
          </select>
          <select className={INPUT + " !w-auto"} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="">Todas las prioridades</option>
            <option value="critica">🔴 Crítica</option>
            <option value="alta">🟠 Alta</option>
            <option value="media">🔵 Media</option>
            <option value="baja">⚪ Baja</option>
          </select>
          <span className="text-[11px] text-[#8b93b8] ml-2">Escala:</span>
          <select className={INPUT + " !w-auto"} value={viewMode} onChange={(e) => setViewMode(e.target.value as ViewMode)}>
            <option value="month">Mes</option>
            <option value="week">Semana</option>
            <option value="quarter">Trimestre</option>
          </select>
        </div>
        <div className="ml-auto flex gap-2">
          <button className={BTN + " flex items-center gap-1"} onClick={() => {
            const b = new Blob([JSON.stringify({ Tasks_Gantt, Phases_Gantt, Milestones_Gantt, Projects_Gantt }, null, 2)], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(b);
            a.download = "royal-gantt-backup.json";
            a.click();
          }}>
            <Download size={13} /> Exportar JSON
          </button>
        </div>
      </div>

      {/* Main Gantt Grid */}
      <div className="flex flex-1 overflow-hidden">
        {/* Panel Izquierdo: Lista de Tareas por Fases */}
        <div className="bg-[#1a1d27] border-r border-[#2e3352] flex flex-col overflow-hidden" style={{ width: LEFT_W, minWidth: LEFT_W }}>
          <div className="flex items-center justify-between px-3 border-b border-[#2e3352] flex-shrink-0" style={{ height: ROW_H + 1 }}>
            <span className="text-[10px] font-semibold text-[#8b93b8] uppercase tracking-wider">Tareas por Fase</span>
            <span className="text-[10px] text-[#8b93b8]">{filteredTasks.length} tareas</span>
          </div>
          <div className="bg-[#1a1d27] border-b border-[#2e3352] flex-shrink-0" style={{ height: 23 }} />
          <div ref={leftScrollRef} onScroll={handleLeftScroll} className="overflow-y-auto flex-1 no-scrollbar" style={{ scrollbarWidth: "none" }}>
            {Phases_Gantt.map((phase) => {
              const pTasks = filteredTasks.filter((t) => t.phaseId === phase.id);
              return (
                <div key={phase.id}>
                  {/* Fila de la Fase */}
                  <div className="flex items-center gap-2 px-2 bg-[#22263a] border-b border-[#2e3352] group" style={{ height: ROW_H }}>
                    <ChevronRight size={13} style={{ color: phase.color }} />
                    <span className="text-xs font-semibold flex-1 truncate" style={{ color: phase.color }}>{phase.name}</span>
                    {isPM && (
                      <button 
                        onClick={() => setModalTask({ phaseId: phase.id, projectId: Projects_Gantt[0]?.id })}
                        className="opacity-0 group-hover:opacity-100 text-[#4f7cff] hover:bg-[#4f7cff]/10 rounded p-1 transition-all cursor-pointer flex items-center justify-center"
                        title={`Añadir tarea a ${phase.name}`}
                      >
                        <Plus size={13} />
                      </button>
                    )}
                  </div>
                  {/* Fila de la Tarea */}
                  {pTasks.map((task) => {
                    const risk = getRiskFlag(task);
                    const priority = (task as any).priority || 'media';
                    return (
                    <div key={task.id} className={`flex items-center gap-2 px-2 border-b border-[#2e3352] hover:bg-white/[0.02] group ${risk === 'vencida' ? 'bg-red-500/5' : risk === 'en_riesgo' ? 'bg-yellow-500/5' : ''}`} style={{ height: ROW_H }}>
                      <div className="w-4 flex-shrink-0" />
                      {/* Prioridad badge */}
                      <div
                        className="w-3.5 h-3.5 rounded-sm flex items-center justify-center text-white font-black flex-shrink-0"
                        style={{ backgroundColor: PRIORITY_COLORS[priority], fontSize: 7 }}
                        title={`Prioridad: ${priority}`}
                      >
                        {PRIORITY_LABELS[priority]}
                      </div>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[task.status] }} />
                      <span className="flex-1 text-xs truncate cursor-pointer hover:text-[#4f7cff] transition-colors" onClick={() => setModalTask(task)}>{task.title}</span>
                      {/* Risk indicator */}
                      {risk && (
                        <span
                          className="text-[8px] font-bold px-1 rounded flex-shrink-0"
                          style={{ backgroundColor: risk === 'vencida' ? '#ff5c5c22' : '#f5a62322', color: risk === 'vencida' ? '#ff5c5c' : '#f5a623' }}
                          title={risk === 'vencida' ? 'Tarea vencida' : 'Tarea en riesgo (menos de 3 días)'}
                        >
                          {risk === 'vencida' ? 'VENCIDA' : 'RIESGO'}
                        </span>
                      )}
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {(task.assigneeIds && task.assigneeIds.length > 0 ? task.assigneeIds : [task.assigneeId]).map((uid) => (
                          <Avatar key={uid} userId={uid} size={22} users_Gantt={users_Gantt} />
                        ))}
                      </div>
                      {isPM && (
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                          <button className="text-[10px] text-[#4f7cff] hover:bg-[#4f7cff]/10 rounded px-1 transition-all" onClick={() => setModalTask(task)}>✏</button>
                          <button className="text-[10px] text-[#ff5c5c] hover:bg-[#ff5c5c]/10 rounded px-1 transition-all" onClick={() => setConfirm({ id: task.id, label: `"${task.title}"` })}>🗑</button>
                        </div>
                      )}
                    </div>
                  );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel Derecho: Timeline de Gantt */}
        <div id="gantt-scroll" ref={rightScrollRef} onScroll={handleRightScroll} className="flex-1 overflow-auto" onDragOver={(e) => e.preventDefault()}>
          <div style={{ width: totalW, minWidth: totalW, position: "relative" }}>
            {/* SVG para dibujar las líneas de dependencias */}
            <svg 
              className="absolute inset-0 pointer-events-none" 
              style={{ width: totalW, height: currentPos * ROW_H + 60, zIndex: 10 }}
            >
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 2 L 6 5 L 0 8 z" fill="#38bdf8" />
                </marker>
              </defs>
              {filteredTasks.map((t) => {
                if (!t.dependsOnTaskId) return null;
                const parent = Tasks_Gantt.find((p) => p.id === t.dependsOnTaskId);
                if (!parent) return null;

                const r1 = taskRowPositions[parent.id];
                const r2 = taskRowPositions[t.id];
                if (r1 === undefined || r2 === undefined) return null;

                const s1 = dayIndex(parent.startDate);
                const e1 = dayIndex(parent.endDate);
                const s2 = dayIndex(t.startDate);

                if (s1 < 0 && e1 < 0) return null;
                if (s2 < 0) return null;

                const x1 = (e1 >= 0 ? e1 + 1 : s1 + 1) * colWidth;
                const y1 = r1 * ROW_H + ROW_H / 2 + 60;
                const x2 = s2 * colWidth;
                const y2 = r2 * ROW_H + ROW_H / 2 + 60;

                const midX = x1 + 10;
                let path = "";
                if (x2 >= x1 + 8) {
                  path = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
                } else {
                  const backX = Math.min(x1, x2) - 12;
                  path = `M ${x1} ${y1} L ${x1 + 8} ${y1} L ${x1 + 8} ${(y1 + y2)/2} L ${backX} ${(y1 + y2)/2} L ${backX} ${y2} L ${x2} ${y2}`;
                }

                return (
                  <path
                    key={t.id}
                    d={path}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    markerEnd="url(#arrow)"
                    opacity="0.75"
                    className="hover:opacity-100 hover:stroke-cyan-400 transition"
                  />
                );
              })}
            </svg>
            {/* Month/Year Header */}
            <div className="flex sticky top-0 z-10 bg-[#1a1d27] border-b border-[#2e3352]">
              {headerGroups.map((m, i) => (
                <div key={i} className="flex items-center justify-center text-[10px] font-semibold text-[#8b93b8] border-r border-[#2e3352] uppercase tracking-wider flex-shrink-0" style={{ width: m.count * colWidth, height: ROW_H }}>
                  {m.label}
                </div>
              ))}
            </div>

            {/* Bottom scale headers (Days / Weeks / Months) */}
            <div className="flex sticky top-[38px] z-10 bg-[#1a1d27] border-b border-[#2e3352]">
              {days.map((d, i) => {
                const dayStr = d.toISOString().split("T")[0];
                
                // Active Milestones_Gantt for this column bucket
                const activeMilestones_Gantt = Milestones_Gantt.filter(m => {
                  const target = parseDate(m.targetDate);
                  if (viewMode === "month") {
                    return m.targetDate === dayStr;
                  } else if (viewMode === "week") {
                    const nextWeekStart = new Date(d.getTime() + 7 * 24 * 3600 * 1000);
                    return target >= d && target < nextWeekStart;
                  } else {
                    const nextMonthStart = new Date(d.getFullYear(), d.getMonth() + 1, 1);
                    return target >= d && target < nextMonthStart;
                  }
                });

                const isDayWeekend = viewMode === "month" && isWeekend(d);
                
                let isDayToday = false;
                if (viewMode === "month") {
                  isDayToday = isToday(d);
                } else if (viewMode === "week") {
                  const nextWeekStart = new Date(d.getTime() + 7 * 24 * 3600 * 1000);
                  isDayToday = now >= d && now < nextWeekStart;
                } else {
                  const nextMonthStart = new Date(d.getFullYear(), d.getMonth() + 1, 1);
                  isDayToday = now >= d && now < nextMonthStart;
                }

                let label = "";
                let tooltip = "";
                if (viewMode === "month") {
                  label = d.getDate().toString();
                  tooltip = d.toLocaleDateString("es", { day: "2-digit", month: "long", year: "numeric" });
                } else if (viewMode === "week") {
                  const weekNum = getWeekNumber(d);
                  const dateShort = d.getDate().toString().padStart(2, "0") + "/" + (d.getMonth() + 1).toString().padStart(2, "0");
                  label = `S${weekNum}`;
                  tooltip = `Semana ${weekNum} (Inicia lunes ${dateShort})`;
                } else {
                  label = d.toLocaleString("es", { month: "short" }).toUpperCase();
                  tooltip = d.toLocaleString("es", { month: "long", year: "numeric" }).toUpperCase();
                }

                return (
                  <div
                    key={i}
                    title={tooltip}
                    className={`flex flex-col items-center justify-center text-[10px] border-r border-[#2e3352]/50 flex-shrink-0 relative ${isDayWeekend ? "bg-white/[0.015]" : ""} ${isDayToday ? "bg-[#4f7cff]/20 text-[#4f7cff]" : "text-[#8b93b8]"}`}
                    style={{ width: colWidth, height: 22 }}
                  >
                    <span>{label}</span>
                    {activeMilestones_Gantt.length > 0 && (
                      <div
                        className="absolute bottom-0 w-2 h-2 rotate-45 border border-white z-20 cursor-pointer shadow-md"
                        style={{
                          background: activeMilestones_Gantt[0].status === "achieved" ? "#3ecf8e" : activeMilestones_Gantt[0].status === "missed" ? "#ff5c5c" : "#f5a623",
                          marginBottom: "-4px"
                        }}
                        title={`Hito de Proyecto: ${activeMilestones_Gantt.map(m => m.name).join(", ")}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Gantt rows */}
            {Phases_Gantt.map((phase) => {
              const pTasks = filteredTasks.filter((t) => t.phaseId === phase.id);
              return (
                <div key={phase.id}>
                  {/* Fila vacía para la cabecera de la fase */}
                  <div className="flex bg-[#22263a] border-b border-[#2e3352] relative" style={{ height: ROW_H, width: totalW }}>
                    {days.map((d, i) => {
                      const hasMilestone = Milestones_Gantt.some(m => {
                        const target = parseDate(m.targetDate);
                        if (viewMode === "month") {
                          return m.targetDate === d.toISOString().split("T")[0];
                        } else if (viewMode === "week") {
                          const nextWeekStart = new Date(d.getTime() + 7 * 24 * 3600 * 1000);
                          return target >= d && target < nextWeekStart;
                        } else {
                          const nextMonthStart = new Date(d.getFullYear(), d.getMonth() + 1, 1);
                          return target >= d && target < nextMonthStart;
                        }
                      });
                      return (
                        <div key={i} className={`border-r border-[#2e3352]/40 flex-shrink-0 ${viewMode === "month" && isWeekend(d) ? "bg-white/[0.015]" : ""}`} style={{ width: colWidth }}>
                          {hasMilestone && (
                            <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-500/20 border-l border-dashed border-yellow-500/40 pointer-events-none" style={{ left: colWidth / 2 - 1 }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Filas de tareas de la fase */}
                  {pTasks.map((task) => {
                    const s = dayIndex(task.startDate);
                    const e = dayIndex(task.endDate);
                    const cs = Math.max(0, s < 0 ? 0 : s);
                    const ce = e < 0 ? days.length - 1 : Math.min(e, days.length - 1);
                    const barW = Math.max((ce - cs + 1) * colWidth, colWidth);
                    const barL = cs * colWidth;
                    const phaseColor = phase.color;
                    const prog = Math.min(100, Math.max(0, task.progress || 0));
                    const taskRisk = getRiskFlag(task);
                    const barBorder = taskRisk === 'vencida' ? '2px solid #ff5c5c' : taskRisk === 'en_riesgo' ? '2px solid #f5a623' : 'none';

                    return (
                      <div key={task.id} className="flex border-b border-[#2e3352] hover:bg-white/[0.015] relative" style={{ height: ROW_H, width: totalW }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleBarDrop(e, task.id)}>
                        {days.map((d, i) => {
                          const hasMilestone = Milestones_Gantt.some(m => {
                            const target = parseDate(m.targetDate);
                            if (viewMode === "month") {
                              return m.targetDate === d.toISOString().split("T")[0];
                            } else if (viewMode === "week") {
                              const nextWeekStart = new Date(d.getTime() + 7 * 24 * 3600 * 1000);
                              return target >= d && target < nextWeekStart;
                            } else {
                              const nextMonthStart = new Date(d.getFullYear(), d.getMonth() + 1, 1);
                              return target >= d && target < nextMonthStart;
                            }
                          });

                          let isDayToday = false;
                          if (viewMode === "month") {
                            isDayToday = isToday(d);
                          } else if (viewMode === "week") {
                            const nextWeekStart = new Date(d.getTime() + 7 * 24 * 3600 * 1000);
                            isDayToday = now >= d && now < nextWeekStart;
                          } else {
                            const nextMonthStart = new Date(d.getFullYear(), d.getMonth() + 1, 1);
                            isDayToday = now >= d && now < nextMonthStart;
                          }

                          return (
                            <div key={i} className={`border-r border-[#2e3352]/40 flex-shrink-0 ${viewMode === "month" && isWeekend(d) ? "bg-white/[0.015]" : ""} ${isDayToday ? "bg-[#4f7cff]/[0.07]" : ""}`} style={{ width: colWidth }}>
                              {hasMilestone && (
                                <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-500/20 border-l border-dashed border-yellow-500/40 pointer-events-none" style={{ left: colWidth / 2 - 1 }} />
                              )}
                            </div>
                          );
                        })}
                        {/* Línea del día de hoy */}
                        {todayIdx >= 0 && (
                          <div className="absolute top-0 bottom-0 w-0.5 bg-[#4f7cff]/60 pointer-events-none z-10" style={{ left: todayIdx * colWidth + colWidth / 2 }} />
                        )}
                        {/* Barra de Gantt */}
                        {(s >= 0 || e >= 0) && s < days.length && (
                          <div
                            draggable={isPM && !resizing}
                            className={`absolute flex items-center px-2 text-[11px] font-medium text-white rounded select-none hover:brightness-110 shadow-sm group/bar ${isPM ? "cursor-grab" : "cursor-pointer"}`}
                            style={{ left: barL, width: barW, height: 22, top: (ROW_H - 22) / 2, background: phaseColor, opacity: task.status === "done" ? 0.65 : 1, border: barBorder, boxSizing: 'border-box' }}
                            onDragStart={(ev) => {
                              if (!isPM || resizing) {
                                ev.preventDefault();
                                return;
                              }
                              dragRef.current = { task, origStart: task.startDate, origEnd: task.endDate, startX: ev.clientX };
                              ev.dataTransfer.effectAllowed = "move";
                            }}
                            onClick={(ev) => {
                              if (!resizing) {
                                setModalTask(task);
                              }
                            }}
                          >
                            {/* Tirador Izquierdo (Inicio) */}
                            {isPM && (
                              <div
                                className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 group-hover/bar:opacity-100 bg-white/30 hover:bg-white/60 z-20 transition-opacity"
                                onMouseDown={(ev) => {
                                  ev.stopPropagation();
                                  ev.preventDefault();
                                  setResizing({
                                    taskId: task.id,
                                    side: "left",
                                    initialX: ev.clientX,
                                    initialStart: task.startDate,
                                    initialEnd: task.endDate,
                                  });
                                }}
                              />
                            )}

                            {/* Relleno de progreso */}
                            <div className="absolute left-0 top-0 h-full bg-white/20 pointer-events-none rounded" style={{ width: `${prog}%` }} />
                            <span className="relative z-10 truncate mx-1.5 pointer-events-none">{task.title}</span>

                            {/* Tirador Derecho (Fin) */}
                            {isPM && (
                              <div
                                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 group-hover/bar:opacity-100 bg-white/30 hover:bg-white/60 z-20 transition-opacity"
                                onMouseDown={(ev) => {
                                  ev.stopPropagation();
                                  ev.preventDefault();
                                  setResizing({
                                    taskId: task.id,
                                    side: "right",
                                    initialX: ev.clientX,
                                    initialStart: task.startDate,
                                    initialEnd: task.endDate,
                                  });
                                }}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 px-4 py-2 bg-[#1a1d27] border-t border-[#2e3352] flex-shrink-0 text-xs">
        <Stat label="Tareas" value={Tasks_Gantt.length} active={filterStatus === ""} onClick={() => setFilterStatus("")} />
        <Stat label="En desarrollo" value={inProg} color="#4f7cff" active={filterStatus === "in_progress"} onClick={() => setFilterStatus(filterStatus === "in_progress" ? "" : "in_progress")} />
        <Stat label="En revisión" value={review} color="#f5a623" active={filterStatus === "review"} onClick={() => setFilterStatus(filterStatus === "review" ? "" : "review")} />
        <Stat label="Bloqueadas" value={blocked} color="#ff5c5c" active={filterStatus === "blocked"} onClick={() => setFilterStatus(filterStatus === "blocked" ? "" : "blocked")} />
        <Stat label="Terminadas" value={done} color="#3ecf8e" active={filterStatus === "done"} onClick={() => setFilterStatus(filterStatus === "done" ? "" : "done")} />
        <div className="ml-auto text-right">
          <div className="text-xl font-bold text-[#e8eaf6]">{globalProgress}%</div>
          <div className="text-[10px] text-[#8b93b8] uppercase tracking-wider">Avance global</div>
        </div>
      </div>

      {/* Modals */}
      {modalTask !== false && (
        <TaskModal
          task={modalTask}
          users_Gantt={users_Gantt}
          Milestones_Gantt={Milestones_Gantt}
          Tasks_Gantt={Tasks_Gantt}
          Phases_Gantt={Phases_Gantt}
          onClose={() => setModalTask(false)}
          onSave={saveTask}
          onDelete={(id) => setConfirm({ id, label: `la tarea seleccionada` })}
        />
      )}
      {confirm && (
        <ConfirmDialog
          message={`${confirm.label} será eliminado permanentemente.`}
          onConfirm={() => {
            if (confirm.id.startsWith("phase:")) {
              const phaseId = confirm.id.replace("phase:", "");
              setTasks((prev) => prev.filter((t) => t.phaseId !== phaseId));
            } else {
              deleteTask(confirm.id);
            }
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function Stat({ label, value, color, active, onClick }: { label: string; value: number; color?: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left ${onClick ? "cursor-pointer" : "cursor-default"} ${active ? "ring-1 ring-[#4f7cff]/60 bg-white/5 rounded-xl" : ""} px-2 py-1 transition`}
    >
      <div className={`text-base font-bold ${color ? "" : "text-[#e8eaf6]"}`} style={color ? { color } : {}}>{value}</div>
      <div className="text-[10px] text-[#8b93b8] uppercase tracking-wider">{label}</div>
    </button>
  );
}
