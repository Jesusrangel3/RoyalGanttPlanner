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

      {/* ── Popover de Checklist Avanzado ── */}
      {checklistPopover && (() => {
        const taskRaw = popoverTask();
        if (!taskRaw) return null;
        const task = taskRaw as import("@/types").Task;
        const items    = task.checklist || [];
        const today    = new Date().toISOString().split("T")[0];
        const cntDone  = items.filter(i => i.status === "done" || i.done).length;
        const cntProg  = items.filter(i => i.status === "in_progress").length;
        const cntBlock = items.filter(i => i.status === "blocked").length;
        const cntOver  = items.filter(i => i.dueDate && i.dueDate < today && i.status !== "done" && !i.done).length;
        const pct = items.length > 0 ? Math.round((cntDone / items.length) * 100) : 0;
        const barColor = pct === 100 ? "#3ecf8e" : pct > 60 ? "#4f7cff" : pct > 0 ? "#f5a623" : "#2e3352";

        const PRIORITY_COLORS: Record<string, string> = { high: "#ff5c5c", medium: "#f5a623", low: "#3ecf8e" };
        const PRIORITY_LABELS: Record<string, string> = { high: "Alta", medium: "Media", low: "Baja" };

        function cycleStatus(item: typeof items[0]) {
          const cycle: Array<typeof item.status> = ["pending", "in_progress", "done", "blocked"];
          const curr = item.status || (item.done ? "done" : "pending");
          const next = cycle[(cycle.indexOf(curr) + 1) % cycle.length];
          saveTaskChecklist({ ...task, checklist: task.checklist?.map(i => i.id === item.id ? { ...i, status: next, done: next === "done" } : i) });
        }

        function StatusIcon({ item }: { item: typeof items[0] }) {
          const s = item.status || (item.done ? "done" : "pending");
          if (s === "done")       return <CheckSquare size={14} className="text-[#3ecf8e]" />;
          if (s === "in_progress") return <div className="w-3.5 h-3.5 rounded-full border-2 border-[#4f7cff] border-t-transparent animate-spin" />;
          if (s === "blocked")    return <div className="w-3.5 h-3.5 rounded border-2 border-[#ff5c5c] bg-[#ff5c5c]/20 flex items-center justify-center"><span className="text-[8px] text-[#ff5c5c] font-black">!</span></div>;
          return <Square size={14} className="text-[#8b93b8]" />;
        }

        function addItem() {
          if (!popoverNewText.trim()) return;
          saveTaskChecklist({
            ...task,
            checklist: [...items, {
              id: `chk_${Date.now()}`,
              text: popoverNewText.trim(),
              done: false,
              status: "pending",
              dueDate: popoverNewDue || undefined,
              assigneeId: popoverNewAssignee || undefined,
              priority: popoverNewPriority,
            }],
          });
          setPopoverNewText(""); setPopoverNewDue(""); setPopoverNewAssignee(""); setPopoverNewPriority("medium");
        }

        function applyTemplate(name: string) {
          const tpl = FLETE_TEMPLATES[name];
          const newItems = tpl.map(t => ({ id: `chk_${Date.now()}_${t.id}`, text: t.text, done: false, status: "pending" as const, priority: t.priority }));
          saveTaskChecklist({ ...task, checklist: [...items, ...newItems] });
          setShowTemplates(false);
        }

        return (
          <div
            ref={popoverRef}
            className="fixed z-50 bg-[#1a1d27] border border-[#2e3352] rounded-xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col"
            style={{ top: checklistPopover.top, left: Math.min(checklistPopover.left, window.innerWidth - 420), width: 400, maxHeight: "80vh" }}
          >

            {/* ── CABECERA ── */}
            <div className="px-4 pt-3 pb-2.5 border-b border-[#2e3352] flex-shrink-0">
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-[#e8eaf6] truncate">{task.title}</p>
                  <p className="text-[10px] text-[#8b93b8]">{items.length} paso{items.length !== 1 ? "s" : ""} · {pct}% completado</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => { setShowTemplates(v => !v); }}
                    className="text-[9px] font-semibold px-2 py-1 rounded bg-[#2e3352] text-[#8b93b8] hover:text-[#4f7cff] hover:bg-[#4f7cff]/10 transition-all whitespace-nowrap"
                  >
                    Plantillas
                  </button>
                  <button onClick={() => { setChecklistPopover(null); setShowTemplates(false); }}
                    className="text-[#8b93b8] hover:text-white transition-colors">
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="h-1.5 rounded-full bg-[#0f1117] overflow-hidden mb-2">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: barColor }} />
              </div>

              {/* Stats row */}
              <div className="flex gap-2">
                {[
                  { label: "Completados", val: cntDone,  color: "#3ecf8e" },
                  { label: "En progreso", val: cntProg,  color: "#4f7cff" },
                  { label: "Bloqueados",  val: cntBlock, color: "#ff5c5c" },
                  { label: "Vencidos",    val: cntOver,  color: "#f5a623" },
                ].map(s => (
                  <div key={s.label} className="flex-1 text-center">
                    <div className="text-sm font-bold" style={{ color: s.val > 0 ? s.color : "#2e3352" }}>{s.val}</div>
                    <div className="text-[8px] text-[#8b93b8] leading-tight">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── PLANTILLAS DROPDOWN ── */}
            {showTemplates && (
              <div className="border-b border-[#2e3352] bg-[#0f1117] px-3 py-2 flex-shrink-0">
                <p className="text-[9px] text-[#8b93b8] font-semibold uppercase tracking-wider mb-1.5">Plantillas de fletes</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(FLETE_TEMPLATES).map(name => (
                    <button key={name} onClick={() => applyTemplate(name)}
                      className="text-[10px] px-2.5 py-1 rounded-full bg-[#2e3352] text-[#e8eaf6] hover:bg-[#4f7cff]/20 hover:text-[#4f7cff] transition-all border border-[#2e3352] hover:border-[#4f7cff]/40">
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── LISTA DE PASOS ── */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 min-h-0">
              {items.length === 0 && !showTemplates && (
                <div className="flex flex-col items-center py-6 text-[#8b93b8]">
                  <CheckSquare size={24} className="opacity-20 mb-2" />
                  <p className="text-[11px] italic">Sin pasos — agrega uno abajo o usa una plantilla</p>
                </div>
              )}

              {items.map(item => {
                const isExpanded = expandedItem === item.id;
                const isOver = item.dueDate && item.dueDate < today && item.status !== "done" && !item.done;
                const assignee = users_Gantt.find(u => u.id === item.assigneeId);
                const statusVal = item.status || (item.done ? "done" : "pending");

                return (
                  <div key={item.id} className={`rounded-lg border transition-all ${isOver ? "border-[#f5a623]/40 bg-[#f5a623]/5" : "border-[#2e3352]/60 bg-[#0f1117]/40"}`}>
                    <div className="flex items-center gap-2 px-2.5 py-1.5 group">

                      {/* Status toggle */}
                      <button onClick={() => cycleStatus(item)} title="Cambiar estado" className="flex-shrink-0">
                        <StatusIcon item={item} />
                      </button>

                      {/* Text */}
                      <span className={`flex-1 text-[11px] leading-tight min-w-0 ${statusVal === "done" ? "line-through text-[#8b93b8]" : "text-[#e8eaf6]"}`}>
                        {item.text}
                      </span>

                      {/* Priority badge */}
                      {item.priority && item.priority !== "medium" && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0"
                          style={{ color: PRIORITY_COLORS[item.priority], borderColor: `${PRIORITY_COLORS[item.priority]}40`, backgroundColor: `${PRIORITY_COLORS[item.priority]}15` }}>
                          {PRIORITY_LABELS[item.priority]}
                        </span>
                      )}

                      {/* Due date */}
                      {item.dueDate && (
                        <span className={`text-[9px] flex-shrink-0 ${isOver ? "text-[#f5a623] font-semibold" : "text-[#8b93b8]"}`}>
                          {isOver ? "⚠ " : ""}{item.dueDate.slice(5)}
                        </span>
                      )}

                      {/* Assignee avatar */}
                      {assignee && (
                        <div className="w-4 h-4 rounded-full bg-[#4f7cff]/20 flex items-center justify-center text-[7px] font-bold text-[#4f7cff] flex-shrink-0"
                          title={assignee.name}>
                          {assignee.name?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                      )}

                      {/* Expand / Delete */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                        <button onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                          className="text-[#8b93b8] hover:text-[#4f7cff] transition-colors text-[9px] px-1">
                          {isExpanded ? "▲" : "▼"}
                        </button>
                        <button onClick={() => saveTaskChecklist({ ...task, checklist: task.checklist?.filter(i => i.id !== item.id) })}
                          className="text-[#ff5c5c] hover:text-[#ff5c5c]/70 transition-colors">
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>

                    {/* Expanded: notes + edit fields */}
                    {isExpanded && (
                      <div className="px-3 pb-2.5 pt-1 border-t border-[#2e3352]/40 space-y-2">
                        <textarea
                          className="w-full bg-[#0f1117] border border-[#2e3352] rounded px-2 py-1 text-[10px] text-[#e8eaf6] placeholder-[#8b93b8] outline-none resize-none"
                          rows={2}
                          placeholder="Notas / descripción del paso..."
                          value={item.notes || ""}
                          onChange={e => saveTaskChecklist({ ...task, checklist: task.checklist?.map(i => i.id === item.id ? { ...i, notes: e.target.value } : i) })}
                        />
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-[8px] text-[#8b93b8] uppercase font-semibold">Fecha límite</label>
                            <input type="date" className="w-full bg-[#0f1117] border border-[#2e3352] rounded px-1.5 py-0.5 text-[10px] text-[#e8eaf6] outline-none mt-0.5"
                              value={item.dueDate || ""}
                              onChange={e => saveTaskChecklist({ ...task, checklist: task.checklist?.map(i => i.id === item.id ? { ...i, dueDate: e.target.value || undefined } : i) })}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[8px] text-[#8b93b8] uppercase font-semibold">Responsable</label>
                            <select className="w-full bg-[#0f1117] border border-[#2e3352] rounded px-1.5 py-0.5 text-[10px] text-[#e8eaf6] outline-none mt-0.5"
                              value={item.assigneeId || ""}
                              onChange={e => saveTaskChecklist({ ...task, checklist: task.checklist?.map(i => i.id === item.id ? { ...i, assigneeId: e.target.value || undefined } : i) })}
                            >
                              <option value="">Sin asignar</option>
                              {users_Gantt.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                          </div>
                          <div className="flex-1">
                            <label className="text-[8px] text-[#8b93b8] uppercase font-semibold">Prioridad</label>
                            <select className="w-full bg-[#0f1117] border border-[#2e3352] rounded px-1.5 py-0.5 text-[10px] text-[#e8eaf6] outline-none mt-0.5"
                              value={item.priority || "medium"}
                              onChange={e => saveTaskChecklist({ ...task, checklist: task.checklist?.map(i => i.id === item.id ? { ...i, priority: e.target.value as any } : i) })}
                            >
                              <option value="high">Alta</option>
                              <option value="medium">Media</option>
                              <option value="low">Baja</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── AGREGAR PASO ── */}
            <div className="border-t border-[#2e3352] px-3 pt-2.5 pb-3 flex-shrink-0 space-y-2">
              <input
                autoFocus
                className="w-full bg-[#0f1117] border border-[#2e3352] focus:border-[#4f7cff]/60 rounded-lg px-3 py-1.5 text-[11px] text-[#e8eaf6] placeholder-[#8b93b8] outline-none transition-colors"
                placeholder="Descripción del paso... (Enter para agregar)"
                value={popoverNewText}
                onChange={e => setPopoverNewText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addItem(); if (e.key === "Escape") { setChecklistPopover(null); setShowTemplates(false); } }}
              />
              <div className="flex gap-2 items-center">
                <input type="date" className="flex-1 bg-[#0f1117] border border-[#2e3352] rounded px-2 py-1 text-[10px] text-[#e8eaf6] outline-none"
                  value={popoverNewDue} onChange={e => setPopoverNewDue(e.target.value)} />
                <select className="flex-1 bg-[#0f1117] border border-[#2e3352] rounded px-2 py-1 text-[10px] text-[#e8eaf6] outline-none"
                  value={popoverNewAssignee} onChange={e => setPopoverNewAssignee(e.target.value)}>
                  <option value="">Sin asignar</option>
                  {users_Gantt.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <select className="bg-[#0f1117] border border-[#2e3352] rounded px-2 py-1 text-[10px] text-[#e8eaf6] outline-none"
                  value={popoverNewPriority} onChange={e => setPopoverNewPriority(e.target.value as any)}>
                  <option value="high">Alta</option>
                  <option value="medium">Media</option>
                  <option value="low">Baja</option>
                </select>
                <button onClick={addItem} disabled={!popoverNewText.trim()}
                  className="px-3 py-1 rounded-lg bg-[#4f7cff] text-white text-[10px] font-bold hover:bg-[#4f7cff]/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0">
                  <Plus size={13} />
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
