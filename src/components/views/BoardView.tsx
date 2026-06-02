"use client";
 
import { useState } from "react";
import { Plus, Check } from "lucide-react";
import { Task, TaskStatus, Phase, Milestone, AuthUser } from "@/types";
import { STATUS_LABELS } from "@/lib/utils";
import TaskModal from "@/components/TaskModal";
import { getSessionUser } from "@/lib/auth";
 
const COLUMNS: { id: TaskStatus; label: string; color: string; bg: string }[] = [
  { id: "open",        label: "Inicio y Planificación (25%)",       color: "#8b93b8", bg: "border-[#8b93b8]/30" },
  { id: "in_progress", label: "Diseño y Arquitectura (50%)",  color: "#4f7cff", bg: "border-[#4f7cff]/30" },
  { id: "review",      label: "Desarrollo (75%)",    color: "#f5a623", bg: "border-[#f5a623]/30" },
  { id: "done",        label: "Pruebas y Entrega (100%)",     color: "#3ecf8e", bg: "border-[#3ecf8e]/30" },
  { id: "blocked",     label: "Bloqueado",            color: "#ff5c5c", bg: "border-[#ff5c5c]/30" },
];
 
function Avatar({ userId, users }: { userId: string; users: AuthUser[] }) {
  const user = users.find((u) => u.id === userId);
  if (!user) return null;
  if (user.imageUrl) {
    return (
      <img
        src={user.imageUrl}
        alt={user.name}
        className="w-6 h-6 rounded-full object-cover flex-shrink-0"
        title={`${user.name} (${user.role})`}
      />
    );
  }
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[9px] flex-shrink-0"
      style={{ background: user.color }}
      title={`${user.name} (${user.role})`}
    >
      {user.initials}
    </div>
  );
}
 
interface TaskCardProps {
  task: Task;
  onDragStart: (id: string) => void;
  onDropOnCard: (targetTaskId: string) => void;
  onToggleComplete: (task: Task) => void;
  onClick: () => void;
  users: AuthUser[];
  phases: Phase[];
}
 
function TaskCard({ task, onDragStart, onDropOnCard, onToggleComplete, onClick, users, phases }: TaskCardProps) {
  const phase = phases.find((p) => p.id === task.phaseId);
  const assignee = users.find((u) => u.id === task.assigneeId);
  const currentUser = getSessionUser();
  const isPM = currentUser?.role === "Project Manager";
  const isAssignee = currentUser && (task.assigneeIds?.includes(currentUser.id) || task.assigneeId === currentUser.id);
  const canDrag = isPM || isAssignee;
 
  return (
    <div
      draggable={!!canDrag}
      onDragStart={() => canDrag && onDragStart(task.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.stopPropagation();
        onDropOnCard(task.id);
      }}
      onClick={onClick}
      className={`bg-[#22263a] border border-[#2e3352] rounded-lg p-3 cursor-pointer hover:border-[#4f7cff]/50 transition-all hover:bg-[#22263a]/80 group ${!canDrag ? "select-none" : ""}`}
    >
      {/* Phase label */}
      {phase && (
        <div className="text-[9px] font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: phase.color }} />
          <span style={{ color: phase.color }}>{phase.name}</span>
        </div>
      )}
 
      {/* Title & Checkbox */}
      <div className="flex items-start gap-2 mb-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(task);
          }}
          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
            task.status === "done"
              ? "bg-[#3ecf8e] border-[#3ecf8e] text-white opacity-100"
              : "border-[#8b93b8] hover:border-[#3ecf8e] text-transparent hover:text-[#3ecf8e]/40 opacity-0 group-hover:opacity-100"
          }`}
          title={task.status === "done" ? "Marcar como pendiente" : "Marcar como completada"}
        >
          <Check size={9} className="stroke-[3]" />
        </button>
        <p className={`text-xs font-medium text-[#e8eaf6] leading-relaxed flex-1 ${task.status === "done" ? "line-through text-[#8b93b8]" : ""}`}>
          {task.title}
        </p>
      </div>
 
      {/* Date */}
      <div className="text-[10px] text-[#8b93b8] mb-2 pl-6">
        {new Date(task.startDate + "T00:00:00").toLocaleDateString("es", { day: "2-digit", month: "2-digit", year: "numeric" })}
        {task.endDate !== task.startDate && (
          <> → {new Date(task.endDate + "T00:00:00").toLocaleDateString("es", { day: "2-digit", month: "2-digit", year: "numeric" })}</>
        )}
      </div>
 
      {/* Progress bar */}
      {task.progress > 0 && (
        <div className="mb-2 pl-6">
          <div className="flex justify-between text-[9px] text-[#8b93b8] mb-0.5">
            <span>Progreso</span><span>{task.progress}%</span>
          </div>
          <div className="h-1 bg-[#2e3352] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${task.progress}%`, background: phase?.color || "#4f7cff" }} />
          </div>
        </div>
      )}
 
      {/* Footer */}
      <div className="flex items-center justify-between mt-1 pl-6">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <div className="flex -space-x-1.5 overflow-hidden flex-shrink-0">
            {(task.assigneeIds && task.assigneeIds.length > 0 ? task.assigneeIds : [task.assigneeId]).map((uid) => (
              <Avatar key={uid} userId={uid} users={users} />
            ))}
          </div>
          <span className="text-[10px] text-[#8b93b8] truncate" title={
            task.assigneeIds && task.assigneeIds.length > 0 
              ? users.filter(u => task.assigneeIds?.includes(u.id)).map(u => u.name).join(", ")
              : assignee?.name
          }>
            {task.assigneeIds && task.assigneeIds.length > 0 
              ? users.filter(u => task.assigneeIds?.includes(u.id)).map(u => u.name.split(" ")[0]).join(", ")
              : assignee?.name.split(" ")[0]}
          </span>
        </div>
        {task.notes && (
          <span className="text-[9px] text-[#8b93b8] bg-[#2e3352] rounded px-1.5 py-0.5">Nota</span>
        )}
      </div>
    </div>
  );
}
 
interface BoardViewProps {
  tasks: Task[];
  setTasks: (tasks: Task[] | ((prev: Task[]) => Task[])) => void;
  phases: Phase[];
  milestones: Milestone[];
  users: AuthUser[];
  activeProjectId: string;
}
 
export default function BoardView({
  tasks,
  setTasks,
  phases,
  milestones,
  users,
  activeProjectId,
}: BoardViewProps) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [modalTask, setModalTask] = useState<Partial<Task> | null | false>(false);
  const currentUser = getSessionUser();
  const isPM = currentUser?.role === "Project Manager";
 
  function handleDrop(status: TaskStatus) {
    if (!dragging) return;
    const task = tasks.find((t) => t.id === dragging);
    if (!task) return;
 
    const isAssignee = currentUser && (task.assigneeIds?.includes(currentUser.id) || task.assigneeId === currentUser.id);
    if (!isPM && !isAssignee) return;
 
    setTasks((prev) => {
      if (task.status === status) return prev;
 
      const otherTasks = prev.filter(t => t.id !== dragging);
      
      // Obtener y mapear inmutablemente las tareas de la columna destino
      const targetColTasks = otherTasks
        .filter(t => t.status === status)
        .sort((a, b) => (a.boardOrder || 0) - (b.boardOrder || 0))
        .map((t, idx) => ({ ...t, boardOrder: idx }));
 
      let newProgress = task.progress;
      if (status === "open")        newProgress = 25;
      if (status === "in_progress") newProgress = 50;
      if (status === "review")      newProgress = 75;
      if (status === "done")        newProgress = 100;
 
      const updatedTask = {
        ...task,
        status,
        progress: newProgress,
        boardOrder: targetColTasks.length
      };
 
      // Obtener y mapear inmutablemente las tareas de la columna origen
      const sourceColTasks = otherTasks
        .filter(t => t.status === task.status)
        .sort((a, b) => (a.boardOrder || 0) - (b.boardOrder || 0))
        .map((t, idx) => ({ ...t, boardOrder: idx }));
 
      return prev.map(t => {
        if (t.id === dragging) return updatedTask;
        
        const inTarget = targetColTasks.find(x => x.id === t.id);
        if (inTarget) return inTarget;
        
        const inSource = sourceColTasks.find(x => x.id === t.id);
        if (inSource) return inSource;
        
        return t;
      });
    });
 
    setDragging(null);
  }
 
  function handleDropOnCard(targetTaskId: string) {
    if (!dragging || dragging === targetTaskId) return;
    
    const draggedTask = tasks.find(t => t.id === dragging);
    const targetTask = tasks.find(t => t.id === targetTaskId);
    if (!draggedTask || !targetTask) return;
 
    const isAssignee = currentUser && (draggedTask.assigneeIds?.includes(currentUser.id) || draggedTask.assigneeId === currentUser.id);
    if (!isPM && !isAssignee) return;
 
    const targetStatus = targetTask.status;
 
    setTasks((prev) => {
      const otherTasks = prev.filter(t => t.id !== dragging);
      
      const targetColTasks = otherTasks
        .filter(t => t.status === targetStatus)
        .sort((a, b) => (a.boardOrder || 0) - (b.boardOrder || 0));
      
      const targetIdx = targetColTasks.findIndex(t => t.id === targetTaskId);
      
      let newProgress = draggedTask.progress;
      if (targetStatus === "open")        newProgress = 25;
      if (targetStatus === "in_progress") newProgress = 50;
      if (targetStatus === "review")      newProgress = 75;
      if (targetStatus === "done")        newProgress = 100;
      
      const updatedDragged = {
        ...draggedTask,
        status: targetStatus,
        progress: newProgress
      };
 
      const isSameStatus = draggedTask.status === targetStatus;
      const draggedOriginalIdx = prev.findIndex(t => t.id === dragging);
      const targetOriginalIdx = prev.findIndex(t => t.id === targetTaskId);
 
      let insertIdx = targetIdx;
      if (isSameStatus && draggedOriginalIdx < targetOriginalIdx) {
        insertIdx = targetIdx + 1;
      }
 
      const newTargetColTasks = [...targetColTasks];
      if (targetIdx !== -1) {
        newTargetColTasks.splice(insertIdx, 0, updatedDragged);
      } else {
        newTargetColTasks.push(updatedDragged);
      }
 
      // Reindexar inmutablemente la columna destino
      const finalTargetTasks = newTargetColTasks.map((t, i) => ({
        ...t,
        boardOrder: i
      }));
 
      // Reindexar inmutablemente la columna origen si cambió de columna
      let finalSourceTasks: Task[] = [];
      if (draggedTask.status !== targetStatus) {
        finalSourceTasks = otherTasks
          .filter(t => t.status === draggedTask.status)
          .sort((a, b) => (a.boardOrder || 0) - (b.boardOrder || 0))
          .map((t, idx) => ({
            ...t,
            boardOrder: idx
          }));
      }
 
      return prev.map(t => {
        if (t.id === dragging) {
          return finalTargetTasks.find(x => x.id === dragging) || updatedDragged;
        }
        
        const inTarget = finalTargetTasks.find(x => x.id === t.id);
        if (inTarget) return inTarget;
 
        if (draggedTask.status !== targetStatus) {
          const inSource = finalSourceTasks.find(x => x.id === t.id);
          if (inSource) return inSource;
        }
 
        return t;
      });
    });
 
    setDragging(null);
  }
 
  function handleToggleComplete(task: Task) {
    const isAssignee = currentUser && (task.assigneeIds?.includes(currentUser.id) || task.assigneeId === currentUser.id);
    if (!isPM && !isAssignee) return;
 
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== task.id) return t;
        const isDone = t.status === "done";
        const nextStatus: TaskStatus = isDone ? "open" : "done";
        const nextProgress = isDone ? 25 : 100;
        
        const targetColTasks = prev
          .filter((x) => x.status === nextStatus && x.id !== t.id)
          .sort((a, b) => (a.boardOrder || 0) - (b.boardOrder || 0));
          
        return {
          ...t,
          status: nextStatus,
          progress: nextProgress,
          boardOrder: targetColTasks.length,
        };
      })
    );
  }
 
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
 
  return (
    <div className="h-full flex flex-col bg-[#0f1117]">
      {/* Sub-toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[#2e3352] bg-[#1a1d27] flex-shrink-0">
        <span className="text-xs text-[#8b93b8]">Agrupar por: <span className="text-[#e8eaf6] font-medium">Estado</span></span>
        <span className="text-[10px] text-[#8b93b8] bg-[#22263a] border border-[#2e3352] rounded px-2 py-0.5">
          {tasks.length} tareas
        </span>
      </div>
 
      {/* Columns */}
      <div className="flex gap-4 flex-1 overflow-x-auto p-4 items-start">
        {COLUMNS.map((col) => {
          const colTasks = tasks
            .filter((t) => t.status === col.id)
            .sort((a, b) => (a.boardOrder || 0) - (b.boardOrder || 0));
          return (
            <div
              key={col.id}
              className={`flex flex-col rounded-xl border bg-[#1a1d27] flex-shrink-0 max-h-full ${col.bg}`}
              style={{ width: 280 }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(col.id)}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#2e3352]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
                  <span className="text-xs font-semibold" style={{ color: col.color }}>{col.label}</span>
                  <span className="text-[10px] text-[#8b93b8] bg-[#22263a] rounded-full px-1.5">{colTasks.length}</span>
                </div>
                {isPM && (
                  <button
                    onClick={() => setModalTask({ status: col.id, projectId: activeProjectId })}
                    className="text-[#8b93b8] hover:text-[#4f7cff] transition-colors focus:outline-none"
                    title={`Añadir tarea en estado ${col.label}`}
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>
 
              {/* Cards list */}
              <div className="flex flex-col gap-2 p-2 overflow-y-auto flex-1 min-h-[150px]">
                {colTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-[#8b93b8]">
                    <div className="text-2xl mb-2 opacity-30">📋</div>
                    <p className="text-[10px]">Sin tareas</p>
                  </div>
                )}
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    users={users}
                    phases={phases}
                    onDragStart={setDragging}
                    onDropOnCard={handleDropOnCard}
                    onToggleComplete={handleToggleComplete}
                    onClick={() => setModalTask(task)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
 
      {/* TaskModal for creation and modification */}
      {modalTask !== false && (
        <TaskModal
          task={modalTask}
          users={users}
          milestones={milestones}
          tasks={tasks}
          phases={phases}
          onClose={() => setModalTask(false)}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
}
