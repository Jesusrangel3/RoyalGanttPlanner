"use client";

import { useState } from "react";
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, ChevronUp, ChevronDown, Download } from "lucide-react";
import { Task, Project, AuthUser } from "@/types";

interface BudgetViewProps {
  Tasks_Gantt: Task[];
  setTasks: (fn: (prev: Task[]) => Task[]) => void;
  Projects_Gantt: Project[];
  users_Gantt: AuthUser[];
  activeProjectId?: string;
}

type SortField = "title" | "estimatedBudget" | "actualCost" | "diff" | "pct";

function fmt(n?: number) {
  if (n === undefined || n === null) return "—";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}

function Card({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-4 flex flex-col gap-1 min-w-[160px]">
      <span className="text-[10px] text-[#8b93b8] uppercase tracking-wider font-semibold">{label}</span>
      <span className="text-xl font-bold" style={{ color }}>{value}</span>
      {sub && <span className="text-[10px] text-[#8b93b8]">{sub}</span>}
    </div>
  );
}

export default function BudgetView({
  Tasks_Gantt,
  setTasks,
  Projects_Gantt,
  users_Gantt,
  activeProjectId,
}: BudgetViewProps) {
  const [sort, setSort] = useState<{ field: SortField; dir: "asc" | "desc" }>({ field: "estimatedBudget", dir: "desc" });
  const [editingCell, setEditingCell] = useState<{ taskId: string; field: "estimatedBudget" | "actualCost" } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Solo tareas con algún valor de presupuesto, o todas
  const tasksWithBudget = Tasks_Gantt.filter(t =>
    (t.estimatedBudget !== undefined && t.estimatedBudget !== null) ||
    (t.actualCost !== undefined && t.actualCost !== null)
  );
  const allTasks = Tasks_Gantt;

  // Totales
  const totalEst  = allTasks.reduce((s, t) => s + (t.estimatedBudget || 0), 0);
  const totalReal = allTasks.reduce((s, t) => s + (t.actualCost || 0), 0);
  const diff      = totalEst - totalReal;
  const pctExec   = totalEst > 0 ? Math.round((totalReal / totalEst) * 100) : 0;

  // Ordenar
  function getVal(t: Task, field: SortField) {
    if (field === "title") return t.title;
    if (field === "estimatedBudget") return t.estimatedBudget || 0;
    if (field === "actualCost") return t.actualCost || 0;
    if (field === "diff") return (t.estimatedBudget || 0) - (t.actualCost || 0);
    if (field === "pct") return t.estimatedBudget ? Math.round(((t.actualCost || 0) / t.estimatedBudget) * 100) : 0;
    return 0;
  }

  const sorted = [...allTasks].sort((a, b) => {
    const av = getVal(a, sort.field);
    const bv = getVal(b, sort.field);
    const cmp = typeof av === "string" ? av.localeCompare(String(bv), "es") : (Number(av) - Number(bv));
    return sort.dir === "asc" ? cmp : -cmp;
  });

  function toggleSort(field: SortField) {
    setSort(prev => prev.field === field
      ? { field, dir: prev.dir === "asc" ? "desc" : "asc" }
      : { field, dir: "desc" }
    );
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sort.field !== field) return <ChevronUp size={11} className="opacity-20" />;
    return sort.dir === "asc" ? <ChevronUp size={11} className="text-[#4f7cff]" /> : <ChevronDown size={11} className="text-[#4f7cff]" />;
  }

  function isEditing(taskId: string, field: string) {
    return editingCell?.taskId === taskId && editingCell?.field === field;
  }

  function startEdit(taskId: string, field: "estimatedBudget" | "actualCost", value?: number) {
    setEditingCell({ taskId, field });
    setEditValue(value !== undefined && value !== null ? String(value) : "");
  }

  async function commitEdit() {
    if (!editingCell) return;
    const { taskId, field } = editingCell;
    const task = Tasks_Gantt.find(t => t.id === taskId);
    if (!task) { setEditingCell(null); return; }
    const value = editValue === "" ? undefined : Number(editValue);
    const updated = { ...task, [field]: value, updatedAt: new Date().toISOString() };
    setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
    setEditingCell(null);
    try {
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.error("Error guardando presupuesto:", err);
    }
  }

  function exportCsv() {
    window.open(`/api/export?type=Tasks_Gantt${activeProjectId ? `&projectId=${activeProjectId}` : ""}`, "_blank");
  }

  const CELL = "bg-[#4f7cff]/10 border border-[#4f7cff]/40 rounded px-2 py-0.5 text-xs text-[#e8eaf6] outline-none w-28";

  return (
    <div className="h-full flex flex-col bg-[#0f1117] overflow-hidden">

      {/* ── Resumen KPI ── */}
      <div className="flex gap-3 px-5 py-4 border-b border-[#2e3352] bg-[#1a1d27] flex-shrink-0 flex-wrap">
        <Card label="Total presupuestado" value={fmt(totalEst)} color="#4f7cff" />
        <Card label="Total gastado" value={fmt(totalReal)} sub={`${pctExec}% ejecutado`} color={pctExec > 100 ? "#ff5c5c" : "#3ecf8e"} />
        <Card
          label="Diferencia"
          value={fmt(Math.abs(diff))}
          sub={diff >= 0 ? "bajo presupuesto" : "sobre presupuesto"}
          color={diff >= 0 ? "#3ecf8e" : "#ff5c5c"}
        />

        {/* Barra de ejecución */}
        <div className="flex-1 min-w-[200px] bg-[#1a1d27] border border-[#2e3352] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex justify-between text-[10px] text-[#8b93b8] mb-2">
            <span className="font-semibold uppercase tracking-wider">Ejecución presupuestal</span>
            <span className="font-bold" style={{ color: pctExec > 100 ? "#ff5c5c" : "#4f7cff" }}>{pctExec}%</span>
          </div>
          <div className="h-3 rounded-full bg-[#2e3352] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(pctExec, 100)}%`,
                backgroundColor: pctExec > 100 ? "#ff5c5c" : pctExec > 80 ? "#f5a623" : "#4f7cff",
              }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-[#8b93b8] mt-1.5">
            <span>$0</span>
            <span>{fmt(totalEst)}</span>
          </div>
        </div>

        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold rounded-lg border border-[#2e3352] bg-[#0f1117] text-[#8b93b8] hover:text-white hover:border-[#4f7cff] transition self-end"
        >
          <Download size={12} /> Exportar
        </button>
      </div>

      {/* ── Tabla ── */}
      <div className="flex-1 overflow-auto">
        {allTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-[#8b93b8]">
            <DollarSign size={36} className="opacity-20 mb-2" />
            <p className="text-sm font-medium">No hay tareas en este proyecto</p>
            <p className="text-[10px] opacity-60 mt-1">Crea tareas y asígnales un presupuesto estimado</p>
          </div>
        ) : (
          <table className="w-full text-xs border-collapse min-w-[700px]">
            <thead className="sticky top-0 z-10 bg-[#1a1d27] border-b border-[#2e3352]">
              <tr>
                <th className="w-8 px-3 py-2 text-left text-[#8b93b8] font-semibold">#</th>
                <th className="px-3 py-2 text-left text-[#8b93b8] font-semibold cursor-pointer hover:text-white" onClick={() => toggleSort("title")}>
                  <div className="flex items-center gap-1">Tarea <SortIcon field="title" /></div>
                </th>
                <th className="w-36 px-3 py-2 text-right text-[#8b93b8] font-semibold cursor-pointer hover:text-white" onClick={() => toggleSort("estimatedBudget")}>
                  <div className="flex items-center justify-end gap-1">Presupuesto <SortIcon field="estimatedBudget" /></div>
                </th>
                <th className="w-36 px-3 py-2 text-right text-[#8b93b8] font-semibold cursor-pointer hover:text-white" onClick={() => toggleSort("actualCost")}>
                  <div className="flex items-center justify-end gap-1">Costo Real <SortIcon field="actualCost" /></div>
                </th>
                <th className="w-32 px-3 py-2 text-right text-[#8b93b8] font-semibold cursor-pointer hover:text-white" onClick={() => toggleSort("diff")}>
                  <div className="flex items-center justify-end gap-1">Diferencia <SortIcon field="diff" /></div>
                </th>
                <th className="w-40 px-3 py-2 text-left text-[#8b93b8] font-semibold cursor-pointer hover:text-white" onClick={() => toggleSort("pct")}>
                  <div className="flex items-center gap-1">% Ejecutado <SortIcon field="pct" /></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((task, idx) => {
                const est  = task.estimatedBudget || 0;
                const real = task.actualCost || 0;
                const d    = est - real;
                const pct  = est > 0 ? Math.round((real / est) * 100) : 0;
                const over = est > 0 && real > est;

                return (
                  <tr key={task.id} className="border-b border-[#2e3352]/50 hover:bg-white/[0.015] group transition-colors">
                    <td className="px-3 py-2.5 text-[#8b93b8] text-center">{idx + 1}</td>

                    <td className="px-3 py-2.5 font-medium text-[#e8eaf6] max-w-[280px]">
                      <div className="truncate">{task.title}</div>
                      <div className="text-[10px] text-[#8b93b8] mt-0.5">
                        {users_Gantt.find(u => u.id === task.assigneeId)?.name || "Sin asignar"}
                      </div>
                    </td>

                    {/* Presupuesto estimado (editable) */}
                    <td className="px-3 py-2.5 text-right">
                      {isEditing(task.id, "estimatedBudget") ? (
                        <input
                          autoFocus
                          type="number"
                          className={CELL}
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingCell(null); }}
                          placeholder="0"
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:text-[#4f7cff] transition-colors text-[#e8eaf6]"
                          onClick={() => startEdit(task.id, "estimatedBudget", task.estimatedBudget)}
                          title="Click para editar"
                        >
                          {task.estimatedBudget !== undefined && task.estimatedBudget !== null
                            ? fmt(task.estimatedBudget)
                            : <span className="text-[#8b93b8] italic">+ Agregar</span>}
                        </span>
                      )}
                    </td>

                    {/* Costo real (editable) */}
                    <td className="px-3 py-2.5 text-right">
                      {isEditing(task.id, "actualCost") ? (
                        <input
                          autoFocus
                          type="number"
                          className={CELL}
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingCell(null); }}
                          placeholder="0"
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:text-[#3ecf8e] transition-colors text-[#e8eaf6]"
                          onClick={() => startEdit(task.id, "actualCost", task.actualCost)}
                          title="Click para editar"
                        >
                          {task.actualCost !== undefined && task.actualCost !== null
                            ? fmt(task.actualCost)
                            : <span className="text-[#8b93b8] italic">+ Agregar</span>}
                        </span>
                      )}
                    </td>

                    {/* Diferencia */}
                    <td className="px-3 py-2.5 text-right">
                      {est > 0 ? (
                        <span className="flex items-center justify-end gap-1 font-semibold" style={{ color: d >= 0 ? "#3ecf8e" : "#ff5c5c" }}>
                          {d >= 0 ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                          {fmt(Math.abs(d))}
                        </span>
                      ) : <span className="text-[#8b93b8]">—</span>}
                    </td>

                    {/* % ejecutado */}
                    <td className="px-3 py-2.5">
                      {est > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-[#2e3352] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(pct, 100)}%`,
                                backgroundColor: over ? "#ff5c5c" : pct > 80 ? "#f5a623" : "#4f7cff",
                              }}
                            />
                          </div>
                          <span className="text-[10px] w-8 text-right" style={{ color: over ? "#ff5c5c" : "#8b93b8" }}>
                            {pct}%
                            {over && <AlertCircle size={9} className="inline ml-0.5" />}
                          </span>
                        </div>
                      ) : <span className="text-[#8b93b8] text-[10px]">Sin presupuesto</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Fila de totales */}
            <tfoot className="sticky bottom-0 bg-[#1a1d27] border-t-2 border-[#2e3352]">
              <tr>
                <td className="px-3 py-2.5" colSpan={2}>
                  <span className="text-[10px] font-bold text-[#8b93b8] uppercase tracking-wider">TOTAL</span>
                </td>
                <td className="px-3 py-2.5 text-right font-bold text-[#4f7cff]">{fmt(totalEst)}</td>
                <td className="px-3 py-2.5 text-right font-bold text-[#3ecf8e]">{fmt(totalReal)}</td>
                <td className="px-3 py-2.5 text-right font-bold" style={{ color: diff >= 0 ? "#3ecf8e" : "#ff5c5c" }}>
                  {fmt(Math.abs(diff))}
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-[10px] font-bold" style={{ color: pctExec > 100 ? "#ff5c5c" : "#4f7cff" }}>
                    {pctExec}% ejecutado
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
