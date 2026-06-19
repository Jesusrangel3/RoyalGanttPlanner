"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Task, Phase, Milestone, AuthUser } from "@/types";
import { getDaysInMonth } from "@/lib/utils";
import TaskModal from "@/components/TaskModal";
import { getSessionUser } from "@/lib/auth";

const WEEK_DAYS = ["LU", "MA", "MI", "JU", "VI", "SA", "DO"];

function getCalendarGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;
  const days = getDaysInMonth(year, month);
  const grid: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) grid.push(null);
  days.forEach((d) => grid.push(d));
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
}

function getTasksForDay(Tasks_Gantt: Task[], date: Date): Task[] {
  const d = date.toISOString().split("T")[0];
  return Tasks_Gantt.filter((t) => {
    const s = t.startDate;
    const e = t.endDate;
    return s <= d && d <= e;
  });
}

interface CalendarViewProps {
  Tasks_Gantt: Task[];
  setTasks: (Tasks_Gantt: Task[] | ((prev: Task[]) => Task[])) => void;
  Phases_Gantt: Phase[];
  Milestones_Gantt: Milestone[];
  users_Gantt: AuthUser[];
  activeProjectId: string;
}

export default function CalendarView({
  Tasks_Gantt,
  setTasks,
  Phases_Gantt,
  Milestones_Gantt,
  users_Gantt,
  activeProjectId,
}: CalendarViewProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [modalTask, setModalTask] = useState<Partial<Task> | null | false>(false);

  const currentUser = getSessionUser();
  const isPM = currentUser?.role === "Project Manager";

  // Estados para Drag & Drop visual feedback
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

  const grid = getCalendarGrid(year, month);
  const monthLabel = new Date(year, month, 1).toLocaleString("es", { month: "long", year: "numeric" });

  function prev() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function next() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }
  function goToday() { setYear(today.getFullYear()); setMonth(today.getMonth()); }

  function handleSaveTask(t: Task) {
    setTasks((prev) => {
      const idx = prev.findIndex((x) => x.id === t.id);
      return idx >= 0 ? prev.map((x) => (x.id === t.id ? t : x)) : [...prev, t];
    });
    setModalTask(false);
  }

  function handleDeleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setModalTask(false);
  }

  // ── Lógica de Arrastre y Reordenación ──
  function moveTask(draggedId: string, targetDateStr: string, hoverTaskId?: string) {
    setTasks((prev) => {
      const draggedIndex = prev.findIndex((t) => t.id === draggedId);
      if (draggedIndex === -1) return prev;
      const draggedTask = prev[draggedIndex];

      // Calcular duración original en días
      const start = new Date(draggedTask.startDate + "T00:00:00");
      const end = new Date(draggedTask.endDate + "T00:00:00");
      const duration = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));

      // Ajustar fechas
      const newStart = new Date(targetDateStr + "T00:00:00");
      const newEnd = new Date(newStart);
      newEnd.setDate(newEnd.getDate() + duration);

      const updatedTask: Task = {
        ...draggedTask,
        startDate: targetDateStr,
        endDate: newEnd.toISOString().split("T")[0]
      };

      const remaining = prev.filter((t) => t.id !== draggedId);

      if (hoverTaskId) {
        const targetIndex = remaining.findIndex((t) => t.id === hoverTaskId);
        if (targetIndex !== -1) {
          const next = [...remaining];
          next.splice(targetIndex, 0, updatedTask);
          return next;
        }
      }

      return [...remaining, updatedTask];
    });
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
    e.currentTarget.classList.add("opacity-50");
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("opacity-50");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    if (isPM) setHoveredDay(dateStr);
  };

  const handleDragLeave = () => {
    setHoveredDay(null);
  };

  const handleDayDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    setHoveredDay(null);
    if (!isPM) return;
    const draggedId = e.dataTransfer.getData("text/plain");
    if (draggedId) {
      moveTask(draggedId, dateStr);
    }
  };

  const handleTaskDragEnter = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPM) setHoveredTaskId(taskId);
  };

  const handleTaskDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setHoveredTaskId(null);
  };

  const handleTaskDrop = (e: React.DragEvent, targetTask: Task) => {
    e.preventDefault();
    e.stopPropagation();
    setHoveredTaskId(null);
    setHoveredDay(null);
    if (!isPM) return;
    const draggedId = e.dataTransfer.getData("text/plain");
    if (draggedId && draggedId !== targetTask.id) {
      moveTask(draggedId, targetTask.startDate, targetTask.id);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0f1117]">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-b border-[#2e3352] bg-[#1a1d27] flex-shrink-0">
        <button className="text-[#8b93b8] hover:text-[#e8eaf6] transition-colors p-1 rounded hover:bg-white/5" onClick={prev}><ChevronLeft size={16} /></button>
        <span className="text-sm font-semibold capitalize min-w-[180px] text-center">{monthLabel}</span>
        <button className="text-[#8b93b8] hover:text-[#e8eaf6] transition-colors p-1 rounded hover:bg-white/5" onClick={next}><ChevronRight size={16} /></button>
        <button className="text-xs px-3 py-1 border border-[#2e3352] rounded-lg bg-[#22263a] text-[#e8eaf6] hover:border-[#4f7cff] transition-colors cursor-pointer" onClick={goToday}>Hoy</button>
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b border-[#2e3352] flex-shrink-0 bg-[#151821]">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-[#8b93b8] py-2 uppercase tracking-wider border-r border-[#2e3352]/30 last:border-r-0">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 h-full" style={{ gridAutoRows: "minmax(100px, 1fr)" }}>
          {grid.map((day, i) => {
            const isCurrentDay = day && day.toDateString() === today.toDateString();
            const dayTasks = day ? getTasksForDay(Tasks_Gantt, day) : [];
            const dayStr = day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}` : "";

            return (
              <div
                key={i}
                onClick={() => day && isPM && setModalTask({ startDate: dayStr, endDate: dayStr, projectId: activeProjectId })}
                onDragOver={handleDragOver}
                onDragEnter={(e) => day && handleDragEnter(e, dayStr)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => day && handleDayDrop(e, dayStr)}
                className={`border-r border-b border-[#2e3352] p-1.5 min-h-[100px] flex flex-col justify-between ${
                  !day ? "bg-[#1a1d27]/20" : "hover:bg-white/[0.015] transition-colors cursor-pointer"
                } ${i % 7 === 6 ? "border-r-0" : ""} ${
                  day && hoveredDay === dayStr ? "bg-[#4f7cff]/10 border-[#4f7cff]" : ""
                }`}
              >
                {day && (
                  <>
                    <div className="flex justify-between items-center mb-1">
                      <div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isCurrentDay ? "bg-[#4f7cff] text-white" : "text-[#8b93b8]"}`}>
                        {day.getDate()}
                      </div>
                      {dayTasks.length > 0 && (
                        <span className="text-[9px] text-[#8b93b8] bg-[#22263a] px-1 rounded border border-[#2e3352]">
                          {dayTasks.length} act.
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 mt-1 overflow-hidden flex-1 justify-start">
                      {dayTasks.map((task) => {
                        const phase = Phases_Gantt.find((p) => p.id === task.phaseId);
                        const isAssignee = currentUser && (task.assigneeIds?.includes(currentUser.id) || task.assigneeId === currentUser.id);
                        const canDrag = !!isPM;

                        return (
                          <button
                            key={task.id}
                            draggable={canDrag}
                            onDragStart={(e) => canDrag && handleDragStart(e, task.id)}
                            onDragEnd={handleDragEnd}
                            onDragOver={handleDragOver}
                            onDragEnter={(e) => handleTaskDragEnter(e, task.id)}
                            onDragLeave={handleTaskDragLeave}
                            onDrop={(e) => handleTaskDrop(e, task)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setModalTask(task);
                            }}
                            className={`flex items-center gap-1 w-full text-left rounded px-1.5 py-0.5 text-[9px] font-medium text-white truncate hover:brightness-110 transition-all border ${
                              hoveredTaskId === task.id ? "border-white border-dashed scale-[1.03] shadow-lg" : "border-black/10"
                            } focus:outline-none ${canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
                            style={{ background: phase?.color || "#4f7cff" }}
                            title={task.title}
                          >
                            <span className="truncate">{task.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Shared TaskModal */}
      {modalTask !== false && (
        <TaskModal
          task={modalTask}
          users_Gantt={users_Gantt}
          Milestones_Gantt={Milestones_Gantt}
          Tasks_Gantt={Tasks_Gantt}
          Phases_Gantt={Phases_Gantt}
          onClose={() => setModalTask(false)}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
}
