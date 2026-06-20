"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronUp, ChevronDown, Search, Download, Plus, Trash2, List, CheckSquare, Square, X } from "lucide-react";
import { Task, TaskStatus, TaskPriority, Project, AuthUser } from "@/types";

interface ListViewProps {
  Tasks_Gantt: Task[];
  setTasks: (fn: (prev: Task[]) => Task[]) => void;
  Projects_Gantt: Project[];
  users_Gantt: AuthUser[];
  activeProjectId?: string;
}

type SortField = "title" | "status" | "priority" | "assigneeId" | "startDate" | "endDate" | "progress";

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  open:        { label: "Pendiente",   color: "#8b93b8", bg: "rgba(139,147,184,0.15)" },
  in_progress: { label: "En progreso", color: "#4f7cff", bg: "rgba(79,124,255,0.15)"  },
  review:      { label: "En revisión", color: "#f5a623", bg: "rgba(245,166,35,0.15)"  },
  done:        { label: "Completado",  color: "#3ecf8e", bg: "rgba(62,207,142,0.15)"  },
  blocked:     { label: "Bloqueado",   color: "#ff5c5c", bg: "rgba(255,92,92,0.15)"   },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  critica: { label: "Crítica", color: "#ff5c5c" },
  alta:    { label: "Alta",    color: "#f5a623" },
  media:   { label: "Media",   color: "#f5d623" },
  baja:    { label: "Baja",    color: "#8b93b8" },
};

const SEL_CLASS = "bg-[#1a1d27] border border-[#4f7cff]/40 rounded px-1 py-0.5 text-xs text-[#e8eaf6] outline-none w-full";
const INPUT_CLASS = "bg-[#4f7cff]/10 border border-[#4f7cff]/40 rounded px-2 py-0.5 text-xs text-[#e8eaf6] outline-none w-full";

export default function ListView({
  Tasks_Gantt,
  setTasks,
  Projects_Gantt,
  users_Gantt,
  activeProjectId,
}: ListViewProps) {
  const [search, setSearch]               = useState("");
  const [filterStatus, setFilterStatus]   = useState<TaskStatus | "">("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [sort, setSort]                   = useState<{ field: SortField; dir: "asc" | "desc" }>({ field: "startDate", dir: "asc" });
  const [editingCell, setEditingCell]     = useState<{ taskId: string; field: string } | null>(null);
  const [editValue, setEditValue]         = useState("");
  const [newRow, setNewRow]               = useState<Partial<Task> | null>(null);
  const [saving, setSaving]               = useState(false);
  const [checklistPopover, setChecklistPopover] = useState<{ taskId: string; top: number; left: number } | null>(null);
  const [popoverNewText, setPopoverNewText]     = useState("");
  const [popoverNewDue, setPopoverNewDue]       = useState("");
  const [popoverNewAssignee, setPopoverNewAssignee] = useState("");
  const [popoverNewPriority, setPopoverNewPriority] = useState<"high"|"medium"|"low">("medium");
  const [expandedItem, setExpandedItem]         = useState<string | null>(null);
  const [showTemplates, setShowTemplates]       = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const FLETE_TEMPLATES: Record<string, { id: string; text: string; priority: "high"|"medium"|"low" }[]> = {
    "Revisión Pre-Viaje": [
      { id:"t1", text:"Revisar nivel de aceite y líquidos", priority:"high" },
      { id:"t2", text:"Verificar presión de neumáticos", priority:"high" },
      { id:"t3", text:"Comprobar luces y señales", priority:"high" },
      { id:"t4", text:"Inspeccionar frenos", priority:"high" },
      { id:"t5", text:"Validar documentación del conductor", priority:"medium" },
      { id:"t6", text:"Verificar seguro y permisos de circulación", priority:"medium" },
    ],
    "Carga y Despacho": [
      { id:"c1", text:"Confirmar peso y dimensiones de la carga", priority:"high" },
      { id:"c2", text:"Revisar embalaje y sujeción", priority:"high" },
      { id:"c3", text:"Tomar fotos del estado inicial de la carga", priority:"medium" },
      { id:"c4", text:"Firmar carta de porte / guía de remisión", priority:"high" },
      { id:"c5", text:"Confirmar dirección y contacto de entrega", priority:"medium" },
    ],
    "Entrega de Mercancía": [
      { id:"e1", text:"Verificar integridad de la carga al llegar", priority:"high" },
      { id:"e2", text:"Tomar fotos de entrega", priority:"medium" },
      { id:"e3", text:"Obtener firma de recepción", priority:"high" },
      { id:"e4", text:"Entregar facturas y documentos al receptor", priority:"high" },
      { id:"e5", text:"Reportar cualquier incidencia al supervisor", priority:"medium" },
    ],
    "Mantenimiento Vehículo": [
      { id:"m1", text:"Cambio de aceite y filtros", priority:"high" },
      { id:"m2", text:"Revisión de frenos y pastillas", priority:"high" },
      { id:"m3", text:"Inspección de neumáticos (desgaste/presión)", priority:"high" },
      { id:"m4", text:"Verificar sistema eléctrico", priority:"medium" },
      { id:"m5", text:"Limpiar y desinfectar cabina", priority:"low" },
    ],
  };

  useEffect(() => {
    if (!checklistPopover) return;
    function handler(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setChecklistPopover(null);
        setPopoverNewText("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [checklistPopover]);

  async function saveTaskChecklist(updated: Task) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    try {
      await fetch("/api/tasks", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
    } catch (e) { console.error(e); }
  }

  function popoverTask() {
    return checklistPopover ? Tasks_Gantt.find(t => t.id === checklistPopover.taskId) : null;
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  const isEditing = (taskId: string, field: string) =>
    editingCell?.taskId === taskId && editingCell?.field === field;

  function startEdit(taskId: string, field: string, value: string) {
    setEditingCell({ taskId, field });
    setEditValue(value);
  }

  async function commitEdit() {
    if (!editingCell) return;
    const { taskId, field } = editingCell;
    const task = Tasks_Gantt.find(t => t.id === taskId);
    if (!task) { setEditingCell(null); return; }

    const value: any = field === "progress"
      ? Math.min(100, Math.max(0, Number(editValue)))
      : editValue;

    const updated: Task = { ...task, [field]: value, updatedAt: new Date().toISOString() };
    setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
    setEditingCell(null);

    try {
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.error("Error guardando tarea:", err);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter")  { e.preventDefault(); commitEdit(); }
    if (e.key === "Escape") setEditingCell(null);
  }

  // ── Filtering & Sorting ────────────────────────────────────────────────
  const filtered = Tasks_Gantt
    .filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus && t.status !== filterStatus) return false;
      if (filterPriority && t.priority !== filterPriority) return false;
      if (filterAssignee && t.assigneeId !== filterAssignee) return false;
      return true;
    })
    .sort((a, b) => {
      const av = String((a as any)[sort.field] ?? "");
      const bv = String((b as any)[sort.field] ?? "");
      const cmp = av.localeCompare(bv, "es", { numeric: true });
      return sort.dir === "asc" ? cmp : -cmp;
    });

  function toggleSort(field: SortField) {
    setSort(prev =>
      prev.field === field
        ? { field, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" }
    );
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sort.field !== field) return <ChevronUp size={11} className="opacity-20" />;
    return sort.dir === "asc"
      ? <ChevronUp size={11} className="text-[#4f7cff]" />
      : <ChevronDown size={11} className="text-[#4f7cff]" />;
  }

  // ── Add New Task ───────────────────────────────────────────────────────
  function initNewRow() {
    const today = new Date().toISOString().slice(0, 10);
    const defaultPhaseId = Tasks_Gantt[0]?.phaseId
      || (activeProjectId ? `${activeProjectId}_init` : "p1");
    setNewRow({
      title: "", status: "open", priority: "media",
      assigneeId: users_Gantt[0]?.id || "",
      startDate: today, endDate: today, progress: 0,
      phaseId: defaultPhaseId, projectId: activeProjectId,
    });
  }

  async function saveNewRow() {
    if (!newRow?.title?.trim()) { setNewRow(null); return; }
    setSaving(true);
    const task: Task = {
      id: `task_${Date.now()}`,
      title: newRow.title!.trim(),
      status: (newRow.status as TaskStatus) || "open",
      priority: (newRow.priority as TaskPriority) || "media",
      assigneeId: newRow.assigneeId || users_Gantt[0]?.id || "",
      startDate: newRow.startDate || new Date().toISOString().slice(0, 10),
      endDate:   newRow.endDate   || new Date().toISOString().slice(0, 10),
      progress:  newRow.progress  || 0,
      phaseId:   newRow.phaseId   || "p1",
      projectId: activeProjectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      const res  = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      });
      const data = await res.json();
      if (data.success) {
        setTasks(prev => [...prev, task]);
        setNewRow(null);
      }
    } catch (err) {
      console.error("Error creando tarea:", err);
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────
  async function deleteTask(id: string) {
    if (!confirm("¿Eliminar esta tarea?")) return;
    setTasks(prev => prev.filter(t => t.id !== id));
    try { await fetch(`/api/tasks?id=${id}`, { method: "DELETE" }); }
    catch (err) { console.error("Error eliminando tarea:", err); }
  }

  // ── Export ─────────────────────────────────────────────────────────────
  function exportCsv() {
    window.open(
      `/api/export?type=Tasks_Gantt${activeProjectId ? `&projectId=${activeProjectId}` : ""}`,
      "_blank"
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-[#0f1117] overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#2e3352] bg-[#1a1d27] flex-shrink-0 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8b93b8]" />
          <input
            className="w-full bg-[#0f1117] border border-[#2e3352] rounded-lg pl-7 pr-3 py-1.5 text-xs text-[#e8eaf6] outline-none focus:border-[#4f7cff] placeholder:text-[#8b93b8]"
            placeholder="Buscar tarea..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="bg-[#0f1117] border border-[#2e3352] rounded-lg px-2 py-1.5 text-xs text-[#8b93b8] outline-none focus:border-[#4f7cff]"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as any)}
        >
          <option value="">Estado</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select
          className="bg-[#0f1117] border border-[#2e3352] rounded-lg px-2 py-1.5 text-xs text-[#8b93b8] outline-none focus:border-[#4f7cff]"
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
        >
          <option value="">Prioridad</option>
          {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select
          className="bg-[#0f1117] border border-[#2e3352] rounded-lg px-2 py-1.5 text-xs text-[#8b93b8] outline-none focus:border-[#4f7cff]"
          value={filterAssignee}
          onChange={e => setFilterAssignee(e.target.value)}
        >
          <option value="">Responsable</option>
          {users_Gantt.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>

        <div className="flex gap-1.5 ml-auto">
          <button
            onClick={exportCsv}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold rounded-lg border border-[#2e3352] bg-[#1a1d27] text-[#8b93b8] hover:text-white hover:border-[#4f7cff] transition"
          >
            <Download size={12} /> Exportar CSV
          </button>
          <button
            onClick={initNewRow}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-[#4f7cff] text-white hover:bg-[#3a6be0] transition"
          >
            <Plus size={12} /> Nueva tarea
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse min-w-[860px]">
          <thead className="sticky top-0 z-10 bg-[#1a1d27] border-b border-[#2e3352]">
            <tr>
              <th className="w-8 px-3 py-2 text-left text-[#8b93b8] font-semibold">#</th>
              {([
                ["title",      "Tarea",        ""],
                ["status",     "Estado",        "w-32"],
                ["priority",   "Prioridad",     "w-24"],
                ["assigneeId", "Responsable",   "w-36"],
                ["startDate",  "Inicio",        "w-24"],
                ["endDate",    "Fecha límite",  "w-28"],
                ["progress",   "Progreso",      "w-36"],
              ] as [SortField, string, string][]).map(([field, label, w]) => (
                <th
                  key={field}
                  className={`${w} px-3 py-2 text-left text-[#8b93b8] font-semibold cursor-pointer hover:text-white select-none`}
                  onClick={() => toggleSort(field)}
                >
                  <div className="flex items-center gap-1">
                    {label} <SortIcon field={field} />
                  </div>
                </th>
              ))}
              <th className="w-28 px-3 py-2 text-left text-[#8b93b8] font-semibold">
                <div className="flex items-center gap-1"><CheckSquare size={11} /> Checklist</div>
              </th>
              <th className="w-10 px-3 py-2" />
            </tr>
          </thead>

          <tbody>
            {/* Empty state */}
            {filtered.length === 0 && !newRow && (
              <tr>
                <td colSpan={9} className="py-16 text-center text-[#8b93b8]">
                  <List size={32} className="mx-auto opacity-20 mb-2" />
                  <p className="text-sm font-medium">No hay tareas</p>
                  <p className="text-[10px] opacity-60 mt-1">
                    {search || filterStatus || filterPriority || filterAssignee
                      ? "Ajusta los filtros para ver resultados"
                      : "Crea tu primera tarea con el botón de arriba"}
                  </p>
                </td>
              </tr>
            )}

            {/* Task rows */}
            {filtered.map((task, idx) => {
              const assignee = users_Gantt.find(u => u.id === task.assigneeId);
              const st = STATUS_CONFIG[task.status] || STATUS_CONFIG.open;
              const pr = PRIORITY_CONFIG[task.priority || "media"] || PRIORITY_CONFIG.media;
              const isOverdue = task.status !== "done" && task.endDate < today;

              return (
                <tr
                  key={task.id}
                  className="border-b border-[#2e3352]/50 hover:bg-white/[0.015] group transition-colors"
                >
                  {/* # */}
                  <td className="px-3 py-2 text-[#8b93b8] text-center">{idx + 1}</td>

                  {/* Tarea */}
                  <td className="px-3 py-2 font-medium text-[#e8eaf6] max-w-[260px]">
                    {isEditing(task.id, "title") ? (
                      <input
                        autoFocus
                        className={INPUT_CLASS}
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={onKeyDown}
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:text-white transition-colors block truncate"
                        onClick={() => startEdit(task.id, "title", task.title)}
                        title={task.title}
                      >
                        {task.title}
                      </span>
                    )}
                  </td>

                  {/* Estado */}
                  <td className="px-3 py-2">
                    {isEditing(task.id, "status") ? (
                      <select
                        autoFocus
                        className={SEL_CLASS}
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={onKeyDown}
                      >
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap"
                        style={{ color: st.color, backgroundColor: st.bg }}
                        onClick={() => startEdit(task.id, "status", task.status)}
                      >
                        {st.label}
                      </span>
                    )}
                  </td>

                  {/* Prioridad */}
                  <td className="px-3 py-2">
                    {isEditing(task.id, "priority") ? (
                      <select
                        autoFocus
                        className={SEL_CLASS}
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={onKeyDown}
                      >
                        {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => startEdit(task.id, "priority", task.priority || "media")}
                      >
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: pr.color }} />
                        <span style={{ color: pr.color }}>{pr.label}</span>
                      </span>
                    )}
                  </td>

                  {/* Responsable */}
                  <td className="px-3 py-2">
                    {isEditing(task.id, "assigneeId") ? (
                      <select
                        autoFocus
                        className={SEL_CLASS}
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={onKeyDown}
                      >
                        {users_Gantt.map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className="flex items-center gap-1.5 cursor-pointer group/a"
                        onClick={() => startEdit(task.id, "assigneeId", task.assigneeId)}
                      >
                        {assignee?.imageUrl ? (
                          <img src={assignee.imageUrl} className="w-5 h-5 rounded-full object-cover flex-shrink-0" alt="" />
                        ) : (
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[8px] flex-shrink-0"
                            style={{ backgroundColor: assignee?.color || "#4f7cff" }}
                          >
                            {assignee?.initials || "?"}
                          </span>
                        )}
                        <span className="text-[#e8eaf6] group-hover/a:text-white transition-colors truncate max-w-[90px]">
                          {assignee?.name || "Sin asignar"}
                        </span>
                      </span>
                    )}
                  </td>

                  {/* Inicio */}
                  <td className="px-3 py-2 text-[#8b93b8]">
                    {isEditing(task.id, "startDate") ? (
                      <input
                        autoFocus
                        type="date"
                        className="bg-[#1a1d27] border border-[#4f7cff]/40 rounded px-1 py-0.5 text-xs text-[#e8eaf6] outline-none"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={onKeyDown}
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:text-white transition-colors"
                        onClick={() => startEdit(task.id, "startDate", task.startDate)}
                      >
                        {task.startDate
                          ? new Date(task.startDate + "T00:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" })
                          : "—"}
                      </span>
                    )}
                  </td>

                  {/* Fecha límite */}
                  <td className="px-3 py-2">
                    {isEditing(task.id, "endDate") ? (
                      <input
                        autoFocus
                        type="date"
                        className="bg-[#1a1d27] border border-[#4f7cff]/40 rounded px-1 py-0.5 text-xs text-[#e8eaf6] outline-none"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={onKeyDown}
                      />
                    ) : (
                      <span
                        className={`cursor-pointer hover:opacity-80 transition-opacity ${isOverdue ? "text-[#ff5c5c] font-semibold" : "text-[#8b93b8]"}`}
                        onClick={() => startEdit(task.id, "endDate", task.endDate)}
                      >
                        {task.endDate
                          ? new Date(task.endDate + "T00:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" })
                          : "—"}
                        {isOverdue && <span className="ml-1 text-[8px]">⚠</span>}
                      </span>
                    )}
                  </td>

                  {/* Progreso */}
                  <td className="px-3 py-2">
                    {isEditing(task.id, "progress") ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          type="number"
                          min={0}
                          max={100}
                          className="w-14 bg-[#1a1d27] border border-[#4f7cff]/40 rounded px-1 py-0.5 text-xs text-[#e8eaf6] outline-none"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={onKeyDown}
                        />
                        <span className="text-[#8b93b8] text-[10px]">%</span>
                      </div>
                    ) : (
                      <div
                        className="flex items-center gap-2 cursor-pointer group/p"
                        onClick={() => startEdit(task.id, "progress", String(task.progress))}
                      >
                        <div className="flex-1 h-1.5 rounded-full bg-[#2e3352] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${task.progress}%`,
                              backgroundColor:
                                task.progress === 100 ? "#3ecf8e"
                                : task.progress >= 60 ? "#4f7cff"
                                : task.progress >= 30 ? "#f5a623"
                                : "#8b93b8",
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-[#8b93b8] w-7 text-right group-hover/p:text-white transition-colors">
                          {task.progress}%
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Checklist — abre popover al clic */}
                  <td className="px-3 py-2">
                    {(() => {
                      const items = task.checklist || [];
                      const done  = items.filter(i => i.done).length;
                      const total = items.length;
                      const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
                      const color = pct === 100 ? "#3ecf8e" : pct > 0 ? "#f5a623" : "#8b93b8";
                      return (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setChecklistPopover({ taskId: task.id, top: rect.bottom + 6, left: rect.left });
                            setPopoverNewText("");
                          }}
                          className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                        >
                          {total === 0 ? (
                            <span className="text-[10px] text-[#8b93b8] hover:text-[#4f7cff] transition-colors">+ Agregar</span>
                          ) : (
                            <>
                              <div className="w-12 h-1.5 rounded-full bg-[#2e3352] overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                              </div>
                              <span className="text-[10px] font-semibold tabular-nums" style={{ color }}>{done}/{total}</span>
                            </>
                          )}
                        </button>
                      );
                    })()}
                  </td>

                  {/* Delete */}
                  <td className="px-3 py-2">
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#ff5c5c]/20 text-[#ff5c5c] transition-all"
                      title="Eliminar"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}

            {/* New row */}
            {newRow !== null && (
              <tr className="border-b border-[#4f7cff]/30 bg-[#4f7cff]/5">
                <td className="px-3 py-2 text-[#4f7cff]"><Plus size={12} /></td>

                <td className="px-3 py-2">
                  <input
                    autoFocus
                    className={INPUT_CLASS}
                    placeholder="Nombre de la tarea..."
                    value={newRow.title || ""}
                    onChange={e => setNewRow(p => ({ ...p, title: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === "Enter") saveNewRow();
                      if (e.key === "Escape") setNewRow(null);
                    }}
                  />
                </td>

                <td className="px-3 py-2">
                  <select
                    className={SEL_CLASS}
                    value={newRow.status || "open"}
                    onChange={e => setNewRow(p => ({ ...p, status: e.target.value as TaskStatus }))}
                  >
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </td>

                <td className="px-3 py-2">
                  <select
                    className={SEL_CLASS}
                    value={newRow.priority || "media"}
                    onChange={e => setNewRow(p => ({ ...p, priority: e.target.value as TaskPriority }))}
                  >
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </td>

                <td className="px-3 py-2">
                  <select
                    className={SEL_CLASS}
                    value={newRow.assigneeId || ""}
                    onChange={e => setNewRow(p => ({ ...p, assigneeId: e.target.value }))}
                  >
                    {users_Gantt.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </td>

                <td className="px-3 py-2">
                  <input
                    type="date"
                    className="bg-[#1a1d27] border border-[#2e3352] rounded px-1 py-0.5 text-xs text-[#e8eaf6] outline-none"
                    value={newRow.startDate || ""}
                    onChange={e => setNewRow(p => ({ ...p, startDate: e.target.value }))}
                  />
                </td>

                <td className="px-3 py-2">
                  <input
                    type="date"
                    className="bg-[#1a1d27] border border-[#2e3352] rounded px-1 py-0.5 text-xs text-[#e8eaf6] outline-none"
                    value={newRow.endDate || ""}
                    onChange={e => setNewRow(p => ({ ...p, endDate: e.target.value }))}
                  />
                </td>

                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="w-14 bg-[#1a1d27] border border-[#2e3352] rounded px-1 py-0.5 text-xs text-[#e8eaf6] outline-none"
                      value={newRow.progress ?? 0}
                      onChange={e => setNewRow(p => ({ ...p, progress: Number(e.target.value) }))}
                    />
                    <span className="text-[#8b93b8] text-[10px]">%</span>
                  </div>
                </td>

                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <button
                      onClick={saveNewRow}
                      disabled={saving}
                      className="px-2 py-0.5 bg-[#4f7cff] text-white text-[10px] font-bold rounded hover:bg-[#3a6be0] transition disabled:opacity-50"
                    >
                      {saving ? "…" : "✓"}
                    </button>
                    <button
                      onClick={() => setNewRow(null)}
                      className="px-1.5 py-0.5 text-[#8b93b8] hover:text-white text-[10px] rounded transition"
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Footer summary */}
        {filtered.length > 0 && (
          <div className="sticky bottom-0 border-t border-[#2e3352] bg-[#1a1d27] px-4 py-2 flex items-center gap-3 text-[10px] text-[#8b93b8] flex-wrap">
            <span>{filtered.length} tarea{filtered.length !== 1 ? "s" : ""}</span>
            <span className="opacity-30">·</span>
            <span className="text-[#3ecf8e]">
              {filtered.filter(t => t.status === "done").length} completadas
            </span>
            <span className="opacity-30">·</span>
            <span className="text-[#ff5c5c]">
              {filtered.filter(t => t.status === "blocked").length} bloqueadas
            </span>
            <span className="opacity-30">·</span>
            <span className="text-[#f5a623]">
              {filtered.filter(t => t.status !== "done" && t.endDate < today).length} vencidas
            </span>
            <span className="opacity-30">·</span>
            <span className="text-[#4f7cff]">
              {Math.round(filtered.reduce((s, t) => s + t.progress, 0) / filtered.length)}% promedio
            </span>
          </div>
        )}
      </div>

      {/* ── Checklist Formal ── */}
      {checklistPopover && (() => {
        const taskRaw = popoverTask();
        if (!taskRaw) return null;
        const task  = taskRaw as import("@/types").Task;
        const items = task.checklist || [];
        const done  = items.filter(i => i.status === "done" || i.done).length;
        const noOk  = items.filter(i => i.status === "blocked").length;
        const pct   = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
        const barColor = pct === 100 ? "#3ecf8e" : pct > 60 ? "#4f7cff" : pct > 0 ? "#f5a623" : "#2e3352";

        function setVerified(item: typeof items[0], val: "done" | "blocked" | "pending") {
          saveTaskChecklist({ ...task, checklist: task.checklist?.map(i =>
            i.id === item.id ? { ...i, status: val, done: val === "done" } : i
          )});
        }

        function setObs(item: typeof items[0], obs: string) {
          saveTaskChecklist({ ...task, checklist: task.checklist?.map(i =>
            i.id === item.id ? { ...i, notes: obs } : i
          )});
        }

        function addItem() {
          if (!popoverNewText.trim()) return;
          saveTaskChecklist({ ...task, checklist: [...items, { id: `chk_${Date.now()}`, text: popoverNewText.trim(), done: false, status: "pending" }] });
          setPopoverNewText("");
        }

        return (
          <div
            ref={popoverRef}
            className="fixed z-50 flex flex-col overflow-hidden rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
            style={{
              top: checklistPopover.top,
              left: Math.min(checklistPopover.left, window.innerWidth - 620),
              width: 600,
              maxHeight: "84vh",
              background: "linear-gradient(160deg,#1e2235 0%,#161928 100%)",
              border: "1px solid rgba(79,124,255,0.18)",
            }}
          >
            {/* Línea de acento superior */}
            <div className="h-[3px] w-full flex-shrink-0" style={{ background: "linear-gradient(90deg,#4f7cff,#7c5fff,#3ecf8e)" }} />

            {/* ── CABECERA ── */}
            <div className="px-5 pt-4 pb-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(46,51,82,0.8)" }}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] text-[#4f7cff] uppercase tracking-[0.18em] font-bold mb-1">Checklist de verificación</p>
                  <p className="text-[15px] font-bold text-white leading-tight truncate">{task.title}</p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  {/* Indicador circular de progreso */}
                  <div className="relative flex-shrink-0">
                    <svg width="44" height="44" viewBox="0 0 44 44">
                      <circle cx="22" cy="22" r="18" fill="none" stroke="#2e3352" strokeWidth="3.5" />
                      <circle cx="22" cy="22" r="18" fill="none" stroke={barColor} strokeWidth="3.5"
                        strokeDasharray={`${(pct / 100) * 113} 113`}
                        strokeLinecap="round"
                        transform="rotate(-90 22 22)"
                        style={{ transition: "stroke-dasharray 0.5s ease" }}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color: barColor }}>{pct}%</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-bold text-white">{done}<span className="text-[#8b93b8] font-normal">/{items.length}</span></p>
                    <p className="text-[9px] text-[#8b93b8]">completados</p>
                  </div>
                  <button onClick={() => setChecklistPopover(null)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[#8b93b8] hover:text-white hover:bg-white/10 transition-all">
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Barra de progreso lineal */}
              <div className="mt-3.5 h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(46,51,82,0.8)" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: pct === 100 ? "#3ecf8e" : "linear-gradient(90deg,#4f7cff,#7c5fff)" }} />
              </div>

              {noOk > 0 && (
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#ff5c5c]" />
                  <p className="text-[9px] text-[#ff5c5c] font-semibold">{noOk} ítem{noOk !== 1 ? "s" : ""} marcado{noOk !== 1 ? "s" : ""} como No cumplido</p>
                </div>
              )}
            </div>

            {/* ── ENCABEZADO DE COLUMNAS ── */}
            <div className="grid flex-shrink-0 px-1"
              style={{ gridTemplateColumns: "40px 1fr 100px 170px 36px", background: "rgba(15,17,23,0.6)", borderBottom: "1px solid rgba(46,51,82,0.6)" }}>
              <div className="px-3 py-2 text-[8.5px] font-bold text-[#4f7cff] uppercase tracking-widest text-center">#</div>
              <div className="px-3 py-2 text-[8.5px] font-bold text-[#4f7cff] uppercase tracking-widest">Ítem a verificar</div>
              <div className="px-3 py-2 text-[8.5px] font-bold text-[#4f7cff] uppercase tracking-widest text-center">Verificado</div>
              <div className="px-3 py-2 text-[8.5px] font-bold text-[#4f7cff] uppercase tracking-widest">Observaciones</div>
              <div />
            </div>

            {/* ── FILAS DE ÍTEMS ── */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {items.length === 0 && (
                <div className="flex flex-col items-center py-10 text-[#8b93b8]">
                  <CheckSquare size={32} className="opacity-10 mb-3" />
                  <p className="text-[12px] font-medium opacity-60">Sin ítems — agrega el primero</p>
                </div>
              )}

              {items.map((item, idx) => {
                const s         = item.status || (item.done ? "done" : "pending");
                const isDone    = s === "done";
                const isNoCumpl = s === "blocked";
                const isOdd     = idx % 2 === 1;

                return (
                  <div key={item.id}
                    className={`grid items-center px-1 group transition-colors ${isDone ? "bg-[#3ecf8e]/[0.06]" : isNoCumpl ? "bg-[#ff5c5c]/[0.06]" : isOdd ? "bg-white/[0.015]" : ""} hover:bg-white/[0.04]`}
                    style={{ gridTemplateColumns: "40px 1fr 100px 170px 36px", borderBottom: "1px solid rgba(46,51,82,0.3)", minHeight: 46 }}>

                    {/* Número */}
                    <div className="px-3 text-center">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold"
                        style={{
                          background: isDone ? "rgba(62,207,142,0.15)" : isNoCumpl ? "rgba(255,92,92,0.15)" : "rgba(79,124,255,0.12)",
                          color: isDone ? "#3ecf8e" : isNoCumpl ? "#ff5c5c" : "#4f7cff",
                        }}>
                        {idx + 1}
                      </span>
                    </div>

                    {/* Texto del ítem */}
                    <div className="px-3 py-3">
                      <span className={`text-[12px] leading-snug ${isDone ? "line-through opacity-50 text-[#8b93b8]" : isNoCumpl ? "text-[#ff9090]" : "text-[#dde1f5]"}`}>
                        {item.text}
                      </span>
                    </div>

                    {/* ✓ / ✗ */}
                    <div className="px-3 flex items-center justify-center gap-2">
                      <button onClick={() => setVerified(item, isDone ? "pending" : "done")} title="Cumplido"
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-[13px] font-bold transition-all duration-200 ${
                          isDone
                            ? "bg-[#3ecf8e] text-white shadow-[0_0_12px_rgba(62,207,142,0.4)]"
                            : "bg-transparent border border-[#2e3352] text-[#8b93b8] hover:border-[#3ecf8e] hover:text-[#3ecf8e] hover:bg-[#3ecf8e]/10"
                        }`}>✓</button>
                      <button onClick={() => setVerified(item, isNoCumpl ? "pending" : "blocked")} title="No cumplido"
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-[13px] font-bold transition-all duration-200 ${
                          isNoCumpl
                            ? "bg-[#ff5c5c] text-white shadow-[0_0_12px_rgba(255,92,92,0.4)]"
                            : "bg-transparent border border-[#2e3352] text-[#8b93b8] hover:border-[#ff5c5c] hover:text-[#ff5c5c] hover:bg-[#ff5c5c]/10"
                        }`}>✗</button>
                    </div>

                    {/* Observaciones */}
                    <div className="px-3">
                      <input
                        className="w-full bg-transparent text-[11px] text-[#c8cde8] placeholder-[#3a4066] outline-none pb-0.5 transition-colors"
                        style={{ borderBottom: "1px solid rgba(46,51,82,0.6)" }}
                        onFocus={e => (e.target.style.borderBottomColor = "rgba(79,124,255,0.5)")}
                        onBlur={e => (e.target.style.borderBottomColor = "rgba(46,51,82,0.6)")}
                        placeholder="Observación..."
                        value={item.notes || ""}
                        onChange={e => setObs(item, e.target.value)}
                      />
                    </div>

                    {/* Eliminar */}
                    <div className="flex items-center justify-center">
                      <button onClick={() => saveTaskChecklist({ ...task, checklist: task.checklist?.filter(i => i.id !== item.id) })}
                        className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center text-[#8b93b8] hover:text-[#ff5c5c] hover:bg-[#ff5c5c]/10 transition-all">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── AGREGAR ÍTEM ── */}
            <div className="flex-shrink-0 px-4 py-3" style={{ borderTop: "1px solid rgba(46,51,82,0.8)", background: "rgba(15,17,23,0.5)" }}>
              <div className="flex gap-2 items-center">
                <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2 transition-all"
                  style={{ background: "rgba(46,51,82,0.3)", border: "1px solid rgba(46,51,82,0.8)" }}>
                  <Plus size={13} className="text-[#4f7cff] flex-shrink-0" />
                  <input
                    autoFocus
                    className="flex-1 bg-transparent text-[12px] text-[#e8eaf6] placeholder-[#4a5280] outline-none"
                    placeholder="Nuevo ítem a verificar... (Enter)"
                    value={popoverNewText}
                    onChange={e => setPopoverNewText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addItem(); if (e.key === "Escape") setChecklistPopover(null); }}
                  />
                </div>
                <button onClick={addItem} disabled={!popoverNewText.trim()}
                  className="px-4 py-2 rounded-xl text-[11px] font-bold text-white transition-all flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ background: popoverNewText.trim() ? "linear-gradient(135deg,#4f7cff,#7c5fff)" : "#2e3352" }}>
                  Agregar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
