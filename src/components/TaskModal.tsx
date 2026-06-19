"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, MessageSquare, ListTodo, Send, Package, DollarSign, Calendar, Clock, Plus, Trash2, Flag } from "lucide-react";
import { Task, TaskStatus, TaskPriority, Milestone, Phase, AuthUser, TimeEntry } from "@/types";
import { getSessionUser } from "@/lib/auth";

interface TaskModalProps {
  task: Partial<Task> | null;
  onClose: () => void;
  onSave: (t: Task) => void;
  onDelete?: (id: string) => void;
  users_Gantt: AuthUser[];
  Milestones_Gantt: Milestone[];
  Tasks_Gantt: Task[];
  Phases_Gantt: Phase[];
}

export function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-[10px] text-[#8b93b8] uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

const INPUT = "bg-[#22263a] border border-[#2e3352] text-[#e8eaf6] rounded-lg px-3 py-1.5 text-xs font-[inherit] w-full focus:outline-none focus:border-[#4f7cff] focus:bg-[#1e2235]";
const BTN = "px-3 py-1.5 rounded-lg border border-[#2e3352] bg-[#22263a] text-[#e8eaf6] text-xs font-medium hover:border-[#4f7cff] transition-colors cursor-pointer";
const BTN_PRIMARY = "px-3 py-1.5 rounded-lg bg-[#4f7cff] border border-[#4f7cff] text-white text-xs font-medium hover:bg-[#3a6be0] transition-colors cursor-pointer";

export default function TaskModal({
  task,
  onClose,
  onSave,
  onDelete,
  users_Gantt,
  Milestones_Gantt,
  Tasks_Gantt,
  Phases_Gantt,
}: TaskModalProps) {
  const currentUser = getSessionUser();
  const isPM = currentUser?.role === "Project Manager";

  const [activeTab, setActiveTab] = useState<"details" | "comments" | "time">("details");
  const [TimeEntries_Gantt, setTimeEntries_Gantt] = useState<TimeEntry[]>([]);
  const [newHours, setNewHours] = useState("");
  const [newHoursDesc, setNewHoursDesc] = useState("");
  const [newHoursDate, setNewHoursDate] = useState(new Date().toISOString().split("T")[0]);
  const [loadingTime, setLoadingTime] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);


  const [form, setForm] = useState<Partial<Task>>(() => {
    const base = {
      title: "",
      phaseId: Phases_Gantt[0]?.id || "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
      assigneeId: users_Gantt[0]?.id || "",
      assigneeIds: users_Gantt[0]?.id ? [users_Gantt[0].id] : [],
      status: "open" as TaskStatus,
      progress: 0,
      priority: "media" as TaskPriority,
      Notes_Gantt: "",
      estimatedHours: 0,
      actualHours: 0,
      requiredSkills: [],
      dependsOnTaskId: "",
      milestoneId: "",
      estimatedBudget: 0,
      actualCost: 0,
      materials: [],
      comments: [],
      ...task,
    };
    
    // Automatically set default progress based on status if it's a new task
    if (!task?.id) {
      const initialStatus = task?.status || base.status;
      if (initialStatus === "open") base.progress = 25;
      else if (initialStatus === "in_progress") base.progress = 50;
      else if (initialStatus === "review") base.progress = 75;
      else if (initialStatus === "done") base.progress = 100;
    }

    if (base.assigneeId && (!base.assigneeIds || base.assigneeIds.length === 0)) {
      base.assigneeIds = [base.assigneeId];
    }
    if (base.assigneeIds && base.assigneeIds.length > 0 && !base.assigneeId) {
      base.assigneeId = base.assigneeIds[0];
    }
    return base;
  });

  const isAssignee = currentUser && (form.assigneeIds?.includes(currentUser.id) || form.assigneeId === currentUser.id);
  const canEditProgress = isPM || isAssignee;

  const [skillsStr, setSkillsStr] = useState(() => (task?.requiredSkills || []).join(", "));
  const [materialsStr, setMaterialsStr] = useState(() => (task?.materials || []).join(", "));
  const [commentText, setCommentText] = useState("");
  const isEdit = !!task?.id;

  useEffect(() => {
    if (isEdit && task?.id) {
      fetch(`/api/time-entries?taskId=${task.id}`)
        .then(r => r.json())
        .then(d => { if (d.success) setTimeEntries_Gantt(d.entries); })
        .catch(() => {});
    }
  }, [isEdit, task?.id]);


  function set(k: keyof Task, v: unknown) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function toggleAssignee(userId: string) {
    const currentIds = form.assigneeIds || (form.assigneeId ? [form.assigneeId] : []);
    let nextIds: string[];
    if (currentIds.includes(userId)) {
      nextIds = currentIds.filter(id => id !== userId);
    } else {
      nextIds = [...currentIds, userId];
    }
    setForm(prev => ({
      ...prev,
      assigneeIds: nextIds,
      assigneeId: nextIds[0] || ""
    }));
  }

  function handleSave() {
    if (!form.title?.trim()) return;
    const finalSkills = skillsStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const finalMaterials = materialsStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    onSave({
      id: form.id || "t" + Date.now(),
      ...form,
      accepted: true,
      requiredSkills: finalSkills,
      materials: finalMaterials,
    } as Task);
  }

  async function handleAddTimeEntry() {
    if (!newHours || isNaN(Number(newHours)) || Number(newHours) <= 0 || !task?.id) return;
    setLoadingTime(true);
    try {
      const res = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, hours: Number(newHours), description: newHoursDesc, date: newHoursDate }),
      });
      const data = await res.json();
      if (data.success) {
        const refetch = await fetch(`/api/time-entries?taskId=${task.id}`);
        const refData = await refetch.json();
        if (refData.success) setTimeEntries_Gantt(refData.entries);
        setNewHours("");
        setNewHoursDesc("");
        setNewHoursDate(new Date().toISOString().split("T")[0]);
      }
    } finally {
      setLoadingTime(false);
    }
  }

  async function handleDeleteTimeEntry(id: string) {
    await fetch(`/api/time-entries?id=${id}`, { method: 'DELETE' });
    setTimeEntries_Gantt(prev => prev.filter(e => e.id !== id));
  }

  function handleAddComment() {
    if (!commentText.trim() || !currentUser) return;
    const newComment = {
      id: "c" + Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      userColor: currentUser.color,
      content: commentText.trim(),
      createdAt: new Date().toLocaleString("es", { dateStyle: "short", timeStyle: "short" }),
    };
    setForm((prev) => ({
      ...prev,
      comments: [...(prev.comments || []), newComment],
    }));
    setCommentText("");
  }

  // ── Lógica de Rescheduling de Dependencias ──
  const parentTask = form.dependsOnTaskId ? Tasks_Gantt.find((t) => t.id === form.dependsOnTaskId) : null;
  const isDependencyViolated = parentTask && form.startDate && form.startDate < parentTask.endDate;

  function handleAutoAdjustDates() {
    if (!parentTask || !form.startDate || !form.endDate) return;

    // Calcular duración original en días
    const start = new Date(form.startDate + "T00:00:00");
    const end = new Date(form.endDate + "T00:00:00");
    const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));

    // Nueva fecha de inicio = fin de parentTask + 1 día
    const parentEnd = new Date(parentTask.endDate + "T00:00:00");
    const newStart = new Date(parentEnd);
    newStart.setDate(newStart.getDate() + 1);

    // Nueva fecha de fin
    const newEnd = new Date(newStart);
    newEnd.setDate(newEnd.getDate() + durationDays);

    setForm((prev) => ({
      ...prev,
      startDate: newStart.toISOString().split("T")[0],
      endDate: newEnd.toISOString().split("T")[0],
    }));
  }

  // ── Validaciones en Tiempo Real (Recursos) ──
  const resourceAlerts: string[] = [];
  const assignedUserIds = form.assigneeIds || (form.assigneeId ? [form.assigneeId] : []);

  assignedUserIds.forEach((uid) => {
    const assignedUser = users_Gantt.find((u) => u.id === uid);
    if (!assignedUser) return;

    // 1. Disponibilidad de horas
    const activeUserTasks = Tasks_Gantt.filter(
      (t) => (t.assigneeIds?.includes(assignedUser.id) || t.assigneeId === assignedUser.id) && t.status !== "done" && t.id !== form.id
    );
    const totalAssignedHours = activeUserTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const newTotal = totalAssignedHours + (Number(form.estimatedHours) || 0);
    const limit = assignedUser.availableHours || 40;

    if (newTotal > limit) {
      resourceAlerts.push(
        `Carga: ${assignedUser.name} tiene ${totalAssignedHours}h asignadas. Superará su capacidad de ${limit}h/semana.`
      );
    }

    // 2. Validación de Habilidades
    const userSkills = (assignedUser.skills || []).map((s) => s.toLowerCase());
    const taskSkills = skillsStr
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const missing = taskSkills.filter((s) => !userSkills.includes(s));

    if (missing.length > 0) {
      resourceAlerts.push(
        `${assignedUser.name} no cuenta con habilidades necesarias: ${missing.join(", ")}.`
      );
    }
  });

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-[#1a1d27] border border-[#2e3352] rounded-xl w-[460px] max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tabs header */}
        <div className="flex bg-[#151821] border-b border-[#2e3352] px-3 pt-2 text-xs font-semibold text-[#8b93b8]">
          <button
            onClick={() => setActiveTab("details")}
            className={`flex items-center gap-1.5 px-4 py-2 border-b-2 transition ${activeTab === "details" ? "border-[#4f7cff] text-[#e8eaf6] bg-[#1a1d27]" : "border-transparent hover:text-[#e8eaf6]"}`}
          >
            <ListTodo size={14} /> Detalles de Tarea
          </button>
          <button
            onClick={() => setActiveTab("comments")}
            className={`flex items-center gap-1.5 px-4 py-2 border-b-2 transition relative ${activeTab === "comments" ? "border-[#4f7cff] text-[#e8eaf6] bg-[#1a1d27]" : "border-transparent hover:text-[#e8eaf6]"}`}
          >
            <MessageSquare size={14} /> Comentarios
            {form.comments && form.comments.length > 0 && (
              <span className="ml-1 bg-[#4f7cff] text-white text-[9px] px-1.5 rounded-full">
                {form.comments.length}
              </span>
            )}
          </button>
          {isEdit && (
            <button
              onClick={() => setActiveTab("time")}
              className={`flex items-center gap-1.5 px-4 py-2 border-b-2 transition relative ${activeTab === "time" ? "border-[#3ecf8e] text-[#e8eaf6] bg-[#1a1d27]" : "border-transparent hover:text-[#e8eaf6]"}`}
            >
              <Clock size={14} /> Horas
              {TimeEntries_Gantt.length > 0 && (
                <span className="ml-1 bg-[#3ecf8e] text-white text-[9px] px-1.5 rounded-full">
                  {TimeEntries_Gantt.reduce((s, e) => s + e.hours, 0).toFixed(1)}h
                </span>
              )}
            </button>
          )}
        </div>

        {/* Modal body scroll area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {activeTab === "details" ? (
            // PESTAÑA DETALLES
            <div className="space-y-3">
              <Field label="Nombre">
                <input className={INPUT} value={form.title || ""} onChange={(e) => set("title", e.target.value)} placeholder="Nombre de la tarea" disabled={!isPM} />
              </Field>

              <div className="flex gap-3">
                <Field label="Fase" className="flex-1">
                  <select className={INPUT} value={form.phaseId || ""} onChange={(e) => set("phaseId", e.target.value)} disabled={!isPM}>
                    {Phases_Gantt
                      .filter((p) => !p.projectId || p.projectId === form.projectId)
                      .map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Field>
                <Field label="Meta / Objetivo" className="flex-1">
                  <select className={INPUT} value={form.milestoneId || ""} onChange={(e) => set("milestoneId", e.target.value)} disabled={!isPM}>
                    <option value="">Ninguna meta</option>
                    {Milestones_Gantt.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </Field>
              </div>

              <div className="flex gap-3">
                <Field label="Inicio" className="flex-1">
                  <input type="date" className={INPUT} value={form.startDate || ""} onChange={(e) => set("startDate", e.target.value)} disabled={!isPM} />
                </Field>
                <Field label="Fin" className="flex-1">
                  <input type="date" className={INPUT} value={form.endDate || ""} onChange={(e) => set("endDate", e.target.value)} disabled={!isPM} />
                </Field>
              </div>

              <div className="flex gap-3">
                <Field label="Asignado a" className="flex-1 relative">
                  <button
                    type="button"
                    disabled={!isPM}
                    onClick={() => isPM && setShowAssigneeDropdown(!showAssigneeDropdown)}
                    className={`${INPUT} text-left flex items-center justify-between min-h-[30px]`}
                  >
                    <span className="truncate flex items-center gap-1.5">
                      {(() => {
                        const currentAssignees = users_Gantt.filter(u => (form.assigneeIds || (form.assigneeId ? [form.assigneeId] : [])).includes(u.id));
                        if (currentAssignees.length > 0) {
                          return (
                            <span className="flex items-center gap-1.5">
                              <span className="flex -space-x-1.5 overflow-hidden flex-shrink-0">
                                {currentAssignees.slice(0, 3).map(u => (
                                  u.imageUrl ? (
                                    <img key={u.id} src={u.imageUrl} alt={u.name} className="w-4 h-4 rounded-full object-cover flex-shrink-0 border border-[#1a1d27]" />
                                  ) : (
                                    <span key={u.id} className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white border border-[#1a1d27]" style={{ backgroundColor: u.color }}>
                                      {u.initials}
                                    </span>
                                  )
                                ))}
                              </span>
                              {currentAssignees.length > 3 && <span className="text-[10px] text-[#8b93b8]">+{currentAssignees.length - 3}</span>}
                              <span className="text-xs truncate max-w-[150px]">{currentAssignees.map(u => u.name.split(" ")[0]).join(", ")}</span>
                            </span>
                          );
                        }
                        return <span className="text-[#8b93b8]">Sin asignar</span>;
                      })()}
                    </span>
                    <span className="text-[10px] text-[#8b93b8]">{showAssigneeDropdown ? "▲" : "▼"}</span>
                  </button>

                  {showAssigneeDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowAssigneeDropdown(false)} />
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e2235] border border-[#2e3352] rounded-lg shadow-xl max-h-48 overflow-y-auto z-20 p-1.5 space-y-1">
                        {users_Gantt.map((u) => {
                          const isChecked = (form.assigneeIds || (form.assigneeId ? [form.assigneeId] : [])).includes(u.id);
                          return (
                            <label
                              key={u.id}
                              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#22263a] cursor-pointer text-xs select-none transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleAssignee(u.id)}
                                className="accent-[#4f7cff] rounded"
                              />
                              {u.imageUrl ? (
                                <img src={u.imageUrl} alt={u.name} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: u.color }}>
                                  {u.initials}
                                </div>
                              )}
                              <div className="flex-1 truncate">
                                <div className="font-medium text-[#e8eaf6] truncate">{u.name}</div>
                                <div className="text-[9px] text-[#8b93b8] truncate">{u.role}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </>
                  )}
                </Field>

                <Field label="Estado" className="flex-1">
                  <select
                    className={INPUT}
                    value={form.status || "open"}
                    disabled={!canEditProgress}
                    onChange={(e) => {
                      const nextStatus = e.target.value as TaskStatus;
                      setForm(prev => {
                        const next = { ...prev, status: nextStatus };
                        if (nextStatus === "open") next.progress = 25;
                        else if (nextStatus === "in_progress") next.progress = 50;
                        else if (nextStatus === "review") next.progress = 75;
                        else if (nextStatus === "done") next.progress = 100;
                        return next;
                      });
                    }}
                  >
                    <option value="open">Iniciado</option>
                    <option value="in_progress">En desarrollo</option>
                    <option value="review">En revisión</option>
                    <option value="blocked">Bloqueado</option>
                    <option value="done">Terminado</option>
                  </select>
                </Field>

                <Field label="Prioridad" className="w-28 flex-shrink-0">
                  <div className="relative">
                    <Flag size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{
                      color: (form as any).priority === 'critica' ? '#ff5c5c' : (form as any).priority === 'alta' ? '#f5a623' : (form as any).priority === 'media' ? '#4f7cff' : '#8b93b8'
                    }} />
                    <select
                      className={INPUT + " pl-6"}
                      value={(form as any).priority || "media"}
                      onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value as TaskPriority }))}
                      disabled={!isPM}
                    >
                      <option value="critica">Crítica</option>
                      <option value="alta">Alta</option>
                      <option value="media">Media</option>
                      <option value="baja">Baja</option>
                    </select>
                  </div>
                </Field>

                <Field label="Progreso %" className="w-20 flex-shrink-0">
                  <input 
                    type="number" 
                    className={INPUT} 
                    min={0} 
                    max={100} 
                    value={form.progress || 0} 
                    disabled={!canEditProgress}
                    onChange={(e) => set("progress", Number(e.target.value))} 
                  />
                </Field>
              </div>

              {/* Gestión de Recursos y Finanzas */}
              <div className="border-t border-[#2e3352]/40 pt-3 mt-3">
                <span className="text-[9px] font-bold text-[#8b93b8] uppercase tracking-wider block mb-2">Finanzas y Horas de Tarea</span>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <Field label="Presupuesto ($)">
                    <div className="relative">
                      <DollarSign size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8b93b8]" />
                      <input type="number" className={INPUT + " pl-5"} min={0} value={form.estimatedBudget || 0} onChange={(e) => set("estimatedBudget", Number(e.target.value))} disabled={!isPM} />
                    </div>
                  </Field>
                  <Field label="Costo Real ($)">
                    <div className="relative">
                      <DollarSign size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8b93b8]" />
                      <input type="number" className={INPUT + " pl-5"} min={0} value={form.actualCost || 0} onChange={(e) => set("actualCost", Number(e.target.value))} disabled={!isPM} />
                    </div>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Horas Estimadas">
                    <input type="number" className={INPUT} min={0} value={form.estimatedHours || 0} onChange={(e) => set("estimatedHours", Number(e.target.value))} disabled={!isPM} />
                  </Field>
                  <Field label="Horas Reales (Invertidas)">
                    <input type="number" className={INPUT} min={0} value={form.actualHours || 0} onChange={(e) => set("actualHours", Number(e.target.value))} disabled={!canEditProgress} />
                  </Field>
                </div>
              </div>

              {/* Habilidades y Recursos Materiales */}
              <div className="border-t border-[#2e3352]/40 pt-3 mt-3">
                <span className="text-[9px] font-bold text-[#8b93b8] uppercase tracking-wider block mb-2">Habilidades y Materiales</span>
                <div className="space-y-2">
                  <Field label="Skills Requeridos (separados por coma)">
                    <input className={INPUT} value={skillsStr} onChange={(e) => setSkillsStr(e.target.value)} placeholder="Ej: React, Node.js, QA" disabled={!isPM} />
                  </Field>
                  <Field label="Recursos Materiales (separados por coma)">
                    <div className="relative">
                      <Package size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8b93b8]" />
                      <input className={INPUT + " pl-6"} value={materialsStr} onChange={(e) => setMaterialsStr(e.target.value)} placeholder="Ej: Laptop, Servidor AWS, Licencia Figma" disabled={!isPM} />
                    </div>
                  </Field>
                </div>
              </div>

              {/* Dependencias y Predecesores */}
              <div className="border-t border-[#2e3352]/40 pt-3 mt-3">
                <Field label="Tarea Predecesora (Dependencia)">
                  <select className={INPUT} value={form.dependsOnTaskId || ""} onChange={(e) => set("dependsOnTaskId", e.target.value)} disabled={!isPM}>
                    <option value="">Ninguna</option>
                    {Tasks_Gantt.filter(t => t.id !== form.id).map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Notas">
                <textarea className={INPUT + " resize-none"} rows={2} value={form.notes || ""} onChange={(e) => set("Notes_Gantt", e.target.value)} placeholder="Notas de la tarea..." disabled={!isPM} />
              </Field>

              {/* Alertas de Dependencias */}
              {isDependencyViolated && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-[#ff5c5c] rounded-lg p-2.5 flex flex-col gap-2 mt-2">
                  <div className="flex items-start gap-1.5 text-[10px] leading-relaxed font-semibold">
                    <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                    <span>Rescheduling Requerido: Inicia antes del fin de su predecesora "{parentTask?.title}" ({parentTask?.endDate}).</span>
                  </div>
                  {isPM && (
                    <button
                      onClick={handleAutoAdjustDates}
                      className="flex items-center justify-center gap-1.5 bg-[#ff5c5c]/20 hover:bg-[#ff5c5c]/30 text-white rounded py-1 text-[10px] font-semibold transition"
                    >
                      <Calendar size={11} /> Auto-ajustar Fechas de Tarea
                    </button>
                  )}
                </div>
              )}

              {/* Advertencias de Carga y Habilidades */}
              {resourceAlerts.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-lg p-2.5 space-y-1.5 mt-2">
                  {resourceAlerts.map((alert, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-[10px] leading-relaxed font-medium">
                      <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                      <span>{alert}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === "time" ? (
            // PESTAÑA REGISTRO DE HORAS
            <div className="space-y-4 flex flex-col">
              <div className="bg-[#22263a] border border-[#2e3352] rounded-lg p-3 space-y-2">
                <span className="text-[10px] font-bold text-[#8b93b8] uppercase tracking-wider">Registrar horas trabajadas</span>
                <div className="flex gap-2">
                  <div className="flex flex-col gap-1 w-20 flex-shrink-0">
                    <label className="text-[9px] text-[#8b93b8] uppercase">Horas</label>
                    <input type="number" step="0.5" min="0.5" className={INPUT} value={newHours} onChange={e => setNewHours(e.target.value)} placeholder="2.5" />
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <label className="text-[9px] text-[#8b93b8] uppercase">Fecha</label>
                    <input type="date" className={INPUT} value={newHoursDate} onChange={e => setNewHoursDate(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-[9px] text-[#8b93b8] uppercase">Descripción</label>
                    <input className={INPUT} value={newHoursDesc} onChange={e => setNewHoursDesc(e.target.value)} placeholder="¿Qué hiciste?" />
                  </div>
                  <div className="flex flex-col justify-end">
                    <button onClick={handleAddTimeEntry} disabled={loadingTime || !newHours} className="p-1.5 bg-[#3ecf8e] hover:bg-[#2db87a] text-white rounded-lg transition disabled:opacity-50">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Resumen */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex flex-col">
                  <span className="text-[9px] text-[#8b93b8] uppercase">Estimadas</span>
                  <span className="font-bold text-[#e8eaf6]">{form.estimatedHours || 0}h</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-[#8b93b8] uppercase">Registradas</span>
                  <span className="font-bold text-[#3ecf8e]">{TimeEntries_Gantt.reduce((s, e) => s + e.hours, 0).toFixed(1)}h</span>
                </div>
                {form.estimatedHours && TimeEntries_Gantt.length > 0 && (
                  <div className="flex-1">
                    <div className="h-1.5 bg-[#2e3352] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (TimeEntries_Gantt.reduce((s, e) => s + e.hours, 0) / (form.estimatedHours || 1)) * 100)}%`,
                          backgroundColor: TimeEntries_Gantt.reduce((s, e) => s + e.hours, 0) > (form.estimatedHours || 0) ? '#ff5c5c' : '#3ecf8e'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Lista de registros */}
              <div className="space-y-1 max-h-[220px] overflow-y-auto">
                {TimeEntries_Gantt.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-[#8b93b8]">
                    <Clock size={28} className="opacity-20 mb-2" />
                    <p className="text-xs">Sin registros de horas todavía</p>
                  </div>
                ) : (
                  TimeEntries_Gantt.map(entry => (
                    <div key={entry.id} className="flex items-center gap-2 bg-[#22263a] border border-[#2e3352]/50 rounded-lg px-3 py-2 group">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0" style={{ backgroundColor: entry.userColor || '#4f7cff' }}>
                        {entry.userName?.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#3ecf8e]">{entry.hours}h</span>
                          <span className="text-[10px] text-[#8b93b8]">{entry.date}</span>
                          <span className="text-[10px] text-[#e8eaf6] truncate">{entry.description}</span>
                        </div>
                        <span className="text-[9px] text-[#8b93b8]">{entry.userName}</span>
                      </div>
                      {(currentUser?.id === entry.userId || isPM) && (
                        <button onClick={() => handleDeleteTimeEntry(entry.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-[#ff5c5c] transition text-[#8b93b8]">
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            // PESTAÑA COMENTARIOS / COLABORACIÓN
            <div className="space-y-4 flex flex-col h-[320px]">
              {/* Comentarios list */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {(!form.comments || form.comments.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-[#8b93b8]">
                    <MessageSquare size={32} className="opacity-20 mb-2" />
                    <p className="text-xs font-medium">No hay comentarios en esta tarea.</p>
                    <p className="text-[10px] opacity-75 mt-0.5">Escribe un comentario a continuación para iniciar la comunicación.</p>
                  </div>
                ) : (
                  form.comments.map((comm) => {
                    const commenter = users_Gantt.find((u) => u.id === comm.userId);
                    return (
                      <div key={comm.id} className="flex items-start gap-2.5">
                        {commenter?.imageUrl ? (
                          <img
                            src={commenter.imageUrl}
                            alt={comm.userName}
                            className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5"
                          />
                        ) : (
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5"
                            style={{ background: comm.userColor }}
                          >
                            {comm.userName.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0, 2)}
                          </div>
                        )}
                        <div className="bg-[#22263a] border border-[#2e3352]/70 rounded-xl px-3 py-2 flex-1">
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-[10px] font-bold text-[#e8eaf6]">{comm.userName}</span>
                            <span className="text-[9px] text-[#8b93b8]">{comm.createdAt}</span>
                          </div>
                          <p className="text-xs text-[#e8eaf6] whitespace-pre-wrap leading-relaxed">{comm.content}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Comentario Input */}
              <div className="flex gap-2 pt-2 border-t border-[#2e3352]/40">
                <input
                  className={INPUT}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                  placeholder="Añadir comentario..."
                />
                <button
                  onClick={handleAddComment}
                  className="p-2 bg-[#4f7cff] hover:bg-[#3a6be0] text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                  title="Enviar comentario"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal footer actions */}
        <div className="bg-[#151821] border-t border-[#2e3352] px-5 py-3 flex gap-2">
          {isEdit && onDelete && isPM && (
            <button className="px-3 py-1.5 rounded-lg border border-[#ff5c5c] text-[#ff5c5c] text-xs font-medium hover:bg-[#ff5c5c]/10 transition-colors" onClick={() => { onDelete(task!.id!); onClose(); }}>
              Eliminar
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button className={BTN} onClick={onClose}>Cancelar</button>
            <button 
              className={BTN_PRIMARY} 
              onClick={handleSave}
              disabled={!canEditProgress}
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
