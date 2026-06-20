"use client";

import { useState } from "react";
import { Task, AuthUser, Project } from "@/types";
import { CheckCircle2, XCircle, Clock, AlertTriangle, ThumbsUp, ThumbsDown, ClipboardCheck } from "lucide-react";

interface ApprovalsViewProps {
  Tasks_Gantt: Task[];
  setTasks: (fn: (prev: Task[]) => Task[]) => void;
  Projects_Gantt: Project[];
  users_Gantt: AuthUser[];
  currentUser: AuthUser;
}

const PRIORITY_COLORS: Record<string, string> = {
  critica: "#ff5c5c",
  alta:    "#f5a623",
  media:   "#4f7cff",
  baja:    "#3ecf8e",
};

function daysSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86400000);
}

export default function ApprovalsView({
  Tasks_Gantt,
  setTasks,
  Projects_Gantt,
  users_Gantt,
  currentUser,
}: ApprovalsViewProps) {
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const pending = Tasks_Gantt.filter(t => t.status === "review");
  const recentlyApproved = Tasks_Gantt.filter(t => t.status === "done").slice(0, 5);

  async function approve(task: Task) {
    setLoading(task.id);
    const updated: Task = { ...task, status: "done", progress: 100 };
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    try {
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    } catch (e) {
      console.error(e);
    }
    setLoading(null);
  }

  async function reject(task: Task) {
    setLoading(task.id);
    const updated: Task = {
      ...task,
      status: "in_progress",
      notes: rejectNote
        ? `[Rechazado por ${currentUser.name}: ${rejectNote}]\n${task.notes || ""}`
        : task.notes,
    };
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    try {
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    } catch (e) {
      console.error(e);
    }
    setLoading(null);
    setRejectId(null);
    setRejectNote("");
  }

  return (
    <div className="h-full flex flex-col bg-[#0f1117] overflow-hidden">

      {/* ── Resumen ── */}
      <div className="flex gap-3 px-5 py-4 border-b border-[#2e3352] bg-[#1a1d27] flex-shrink-0 flex-wrap">
        <div className="bg-[#0f1117] border border-[#2e3352] rounded-xl px-4 py-3 flex flex-col gap-0.5 min-w-[140px]">
          <span className="text-[10px] text-[#8b93b8] uppercase tracking-wider font-semibold">Pendientes</span>
          <span className="text-2xl font-bold" style={{ color: pending.length > 0 ? "#f5a623" : "#3ecf8e" }}>{pending.length}</span>
        </div>
        <div className="bg-[#0f1117] border border-[#2e3352] rounded-xl px-4 py-3 flex flex-col gap-0.5 min-w-[140px]">
          <span className="text-[10px] text-[#8b93b8] uppercase tracking-wider font-semibold">Aprobadas</span>
          <span className="text-2xl font-bold text-[#3ecf8e]">{Tasks_Gantt.filter(t => t.status === "done").length}</span>
        </div>
        <div className="flex-1 flex items-center bg-[#0f1117] border border-[#2e3352] rounded-xl px-4 py-3 gap-2 min-w-[240px]">
          <ClipboardCheck size={18} className="text-[#4f7cff] flex-shrink-0" />
          <p className="text-[11px] text-[#8b93b8] leading-relaxed">
            Las tareas marcadas como <span className="text-[#f5a623] font-semibold">"En Revisión"</span> aparecen aquí.
            El gerente las aprueba para cerrarlas o las devuelve con un comentario.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-5 py-4 space-y-6">

        {/* ── Pendientes de aprobación ── */}
        <section>
          <h3 className="text-[11px] font-bold text-[#8b93b8] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock size={13} className="text-[#f5a623]" />
            Pendientes de aprobación
            {pending.length > 0 && (
              <span className="bg-[#f5a623] text-white text-[9px] px-2 rounded-full">{pending.length}</span>
            )}
          </h3>

          {pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-[#8b93b8] border border-dashed border-[#2e3352] rounded-xl">
              <CheckCircle2 size={28} className="text-[#3ecf8e] mb-2 opacity-60" />
              <p className="text-sm font-medium text-[#3ecf8e]">Todo aprobado</p>
              <p className="text-[10px] opacity-50 mt-1">No hay tareas esperando revisión</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pending.map(task => {
                const assignee = users_Gantt.find(u => u.id === task.assigneeId);
                const project  = Projects_Gantt.find(p => p.id === task.projectId);
                const isOverdue = new Date(task.endDate) < new Date();
                const days = daysSince(task.endDate);
                const isRejecting = rejectId === task.id;

                return (
                  <div key={task.id} className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-4 hover:border-[#4f7cff]/30 transition-colors">
                    <div className="flex items-start gap-3">

                      {/* Info principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[#e8eaf6] text-sm truncate">{task.title}</span>
                          {task.priority && (
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border"
                              style={{ color: PRIORITY_COLORS[task.priority], borderColor: `${PRIORITY_COLORS[task.priority]}40`, backgroundColor: `${PRIORITY_COLORS[task.priority]}10` }}>
                              {task.priority}
                            </span>
                          )}
                          {isOverdue && (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold text-[#ff5c5c]">
                              <AlertTriangle size={9} /> Vencida hace {days}d
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[#8b93b8] flex-wrap">
                          {project  && <span>📁 {project.name}</span>}
                          {assignee && <span>👤 {assignee.name}</span>}
                          <span>📅 Fin: {new Date(task.endDate).toLocaleDateString("es-MX")}</span>
                          {task.progress > 0 && <span>⚡ {task.progress}% avance</span>}
                        </div>

                        {task.notes && (
                          <p className="text-[10px] text-[#8b93b8] mt-1.5 italic line-clamp-2 bg-[#0f1117] rounded px-2 py-1">
                            "{task.notes}"
                          </p>
                        )}

                        {/* Formulario de rechazo */}
                        {isRejecting && (
                          <div className="mt-2 space-y-2">
                            <textarea
                              autoFocus
                              className="w-full bg-[#0f1117] border border-[#ff5c5c]/40 rounded-lg px-3 py-2 text-xs text-[#e8eaf6] placeholder-[#8b93b8] outline-none resize-none focus:border-[#ff5c5c]"
                              placeholder="Motivo del rechazo (opcional)..."
                              rows={2}
                              value={rejectNote}
                              onChange={e => setRejectNote(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => reject(task)}
                                disabled={loading === task.id}
                                className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-semibold rounded-lg bg-[#ff5c5c]/10 text-[#ff5c5c] border border-[#ff5c5c]/30 hover:bg-[#ff5c5c]/20 transition"
                              >
                                <XCircle size={11} /> Confirmar rechazo
                              </button>
                              <button
                                onClick={() => { setRejectId(null); setRejectNote(""); }}
                                className="px-3 py-1.5 text-[10px] font-semibold rounded-lg bg-[#2e3352] text-[#8b93b8] hover:text-white transition"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Botones */}
                      {!isRejecting && (
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => approve(task)}
                            disabled={loading === task.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold rounded-lg bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/30 hover:bg-[#3ecf8e]/20 transition"
                          >
                            <ThumbsUp size={11} /> Aprobar
                          </button>
                          <button
                            onClick={() => { setRejectId(task.id); setRejectNote(""); }}
                            disabled={loading === task.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold rounded-lg bg-[#ff5c5c]/10 text-[#ff5c5c] border border-[#ff5c5c]/30 hover:bg-[#ff5c5c]/20 transition"
                          >
                            <ThumbsDown size={11} /> Rechazar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Aprobadas recientemente ── */}
        {recentlyApproved.length > 0 && (
          <section>
            <h3 className="text-[11px] font-bold text-[#8b93b8] uppercase tracking-wider mb-3 flex items-center gap-2">
              <CheckCircle2 size={13} className="text-[#3ecf8e]" />
              Aprobadas recientemente
            </h3>
            <div className="space-y-1.5">
              {recentlyApproved.map(task => {
                const assignee = users_Gantt.find(u => u.id === task.assigneeId);
                return (
                  <div key={task.id} className="flex items-center gap-3 bg-[#1a1d27] border border-[#2e3352] rounded-lg px-3 py-2.5 opacity-70">
                    <CheckCircle2 size={13} className="text-[#3ecf8e] flex-shrink-0" />
                    <span className="flex-1 text-xs text-[#e8eaf6] truncate">{task.title}</span>
                    {assignee && <span className="text-[10px] text-[#8b93b8]">{assignee.name}</span>}
                    <span className="text-[9px] font-bold uppercase text-[#3ecf8e] bg-[#3ecf8e]/10 px-2 py-0.5 rounded-full">Aprobada</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
