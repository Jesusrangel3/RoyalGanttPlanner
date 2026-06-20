"use client";

import { useState, useMemo } from "react";
import { Task, AuthUser } from "@/types";
import { CheckSquare, Square, ChevronDown, ChevronRight, Plus, Search, Trash2 } from "lucide-react";

interface ChecklistViewProps {
  Tasks_Gantt: Task[];
  setTasks: (fn: (prev: Task[]) => Task[]) => void;
  users_Gantt: AuthUser[];
}

export default function ChecklistView({ Tasks_Gantt, setTasks, users_Gantt }: ChecklistViewProps) {
  const [search, setSearch]           = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [collapsed, setCollapsed]     = useState<Record<string, boolean>>({});
  const [newText, setNewText]         = useState<Record<string, string>>({});

  const filtered = useMemo(() =>
    Tasks_Gantt
      .filter(t => !filterAssignee || t.assigneeId === filterAssignee)
      .filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase())),
    [Tasks_Gantt, filterAssignee, search]
  );

  // Totales globales
  const totalItems = Tasks_Gantt.reduce((s, t) => s + (t.checklist?.length || 0), 0);
  const doneItems  = Tasks_Gantt.reduce((s, t) => s + (t.checklist?.filter(i => i.done).length || 0), 0);
  const pctGlobal  = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  async function save(updated: Task) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    try {
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    } catch (e) { console.error(e); }
  }

  function toggleItem(task: Task, itemId: string) {
    save({
      ...task,
      checklist: task.checklist?.map(i => i.id === itemId ? { ...i, done: !i.done } : i),
    });
  }

  function addItem(task: Task) {
    const text = (newText[task.id] || "").trim();
    if (!text) return;
    save({
      ...task,
      checklist: [...(task.checklist || []), { id: `chk_${Date.now()}`, text, done: false }],
    });
    setNewText(prev => ({ ...prev, [task.id]: "" }));
  }

  function removeItem(task: Task, itemId: string) {
    save({
      ...task,
      checklist: task.checklist?.filter(i => i.id !== itemId),
    });
  }

  function toggleCollapse(taskId: string) {
    setCollapsed(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  }

  return (
    <div className="h-full flex flex-col bg-[#0f1117] overflow-hidden">

      {/* ── Resumen global ── */}
      <div className="flex gap-3 px-5 py-4 border-b border-[#2e3352] bg-[#1a1d27] flex-shrink-0 flex-wrap items-center">
        <div className="bg-[#0f1117] border border-[#2e3352] rounded-xl px-4 py-3 flex flex-col gap-0.5 min-w-[130px]">
          <span className="text-[10px] text-[#8b93b8] uppercase tracking-wider font-semibold">Pasos completados</span>
          <span className="text-2xl font-bold text-[#3ecf8e]">
            {doneItems}<span className="text-sm text-[#8b93b8] font-normal">/{totalItems}</span>
          </span>
        </div>
        <div className="bg-[#0f1117] border border-[#2e3352] rounded-xl px-4 py-3 flex flex-col gap-0.5 min-w-[130px]">
          <span className="text-[10px] text-[#8b93b8] uppercase tracking-wider font-semibold">Actividades</span>
          <span className="text-2xl font-bold text-[#4f7cff]">{Tasks_Gantt.length}</span>
        </div>
        <div className="flex-1 min-w-[200px] bg-[#0f1117] border border-[#2e3352] rounded-xl px-4 py-3">
          <div className="flex justify-between text-[10px] text-[#8b93b8] mb-1.5">
            <span className="font-semibold uppercase tracking-wider">Avance global de checklists</span>
            <span className="font-bold" style={{ color: pctGlobal === 100 ? "#3ecf8e" : "#4f7cff" }}>{pctGlobal}%</span>
          </div>
          <div className="h-2 rounded-full bg-[#2e3352] overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${pctGlobal}%`, backgroundColor: pctGlobal === 100 ? "#3ecf8e" : pctGlobal > 50 ? "#4f7cff" : "#f5a623" }} />
          </div>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="flex gap-2 px-5 py-3 border-b border-[#2e3352] bg-[#1a1d27] flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-[#0f1117] border border-[#2e3352] rounded-lg px-3 py-1.5">
          <Search size={13} className="text-[#8b93b8]" />
          <input
            className="flex-1 bg-transparent text-xs text-[#e8eaf6] placeholder-[#8b93b8] outline-none"
            placeholder="Buscar actividad..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-[#0f1117] border border-[#2e3352] rounded-lg px-3 py-1.5 text-xs text-[#e8eaf6] outline-none cursor-pointer"
          value={filterAssignee}
          onChange={e => setFilterAssignee(e.target.value)}
        >
          <option value="">Todos los responsables</option>
          {users_Gantt.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>

      {/* ── Lista de actividades ── */}
      <div className="flex-1 overflow-auto px-5 py-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-[#8b93b8]">
            <CheckSquare size={36} className="opacity-20 mb-2" />
            <p className="text-sm font-medium">No hay actividades en este proyecto</p>
          </div>
        ) : (
          filtered.map(task => {
            const items  = task.checklist || [];
            const done   = items.filter(i => i.done).length;
            const total  = items.length;
            const pct    = total > 0 ? Math.round((done / total) * 100) : 0;
            const color  = pct === 100 ? "#3ecf8e" : pct > 0 ? "#4f7cff" : "#8b93b8";
            const isOpen = !collapsed[task.id];
            const assignee = users_Gantt.find(u => u.id === task.assigneeId);

            return (
              <div key={task.id} className="bg-[#1a1d27] border border-[#2e3352] rounded-xl overflow-hidden transition-all hover:border-[#2e3352]/80">

                {/* ── Cabecera de la actividad ── */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-white/[0.02] transition-colors"
                  onClick={() => toggleCollapse(task.id)}
                >
                  <span className="text-[#8b93b8] flex-shrink-0">
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>

                  <span className="flex-1 text-sm font-semibold text-[#e8eaf6] truncate">{task.title}</span>

                  {assignee && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="w-5 h-5 rounded-full bg-[#4f7cff]/20 flex items-center justify-center text-[8px] font-bold text-[#4f7cff]">
                        {assignee.name?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <span className="text-[10px] text-[#8b93b8] hidden sm:inline">{assignee.name?.split(" ")[0]}</span>
                    </div>
                  )}

                  {/* Progreso del checklist */}
                  <div className="flex items-center gap-2 w-28 flex-shrink-0">
                    {total > 0 ? (
                      <>
                        <div className="flex-1 h-1.5 rounded-full bg-[#2e3352] overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                        <span className="text-[10px] font-bold tabular-nums w-8 text-right" style={{ color }}>
                          {done}/{total}
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] text-[#2e3352] italic">sin pasos</span>
                    )}
                  </div>
                </div>

                {/* ── Pasos del checklist ── */}
                {isOpen && (
                  <div className="border-t border-[#2e3352]/50 px-4 pt-2 pb-3 space-y-1">
                    {items.map(item => (
                      <div key={item.id} className="flex items-center gap-2.5 py-1 group">
                        <button
                          onClick={() => toggleItem(task, item.id)}
                          className="flex-shrink-0 text-[#8b93b8] hover:text-[#4f7cff] transition-colors"
                        >
                          {item.done
                            ? <CheckSquare size={14} className="text-[#3ecf8e]" />
                            : <Square size={14} />}
                        </button>
                        <span className={`flex-1 text-xs ${item.done ? "line-through text-[#8b93b8]" : "text-[#e8eaf6]"}`}>
                          {item.text}
                        </span>
                        <button
                          onClick={() => removeItem(task, item.id)}
                          className="opacity-0 group-hover:opacity-100 text-[#ff5c5c] hover:text-[#ff5c5c]/70 transition-all"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}

                    {/* ── Input para agregar paso ── */}
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#2e3352]/40">
                      <Plus size={12} className="text-[#8b93b8] flex-shrink-0" />
                      <input
                        className="flex-1 bg-transparent text-xs text-[#e8eaf6] placeholder-[#8b93b8] outline-none"
                        placeholder="Agregar paso..."
                        value={newText[task.id] || ""}
                        onChange={e => setNewText(prev => ({ ...prev, [task.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter") addItem(task); }}
                        onClick={e => e.stopPropagation()}
                      />
                      {(newText[task.id] || "").trim() && (
                        <button
                          onClick={e => { e.stopPropagation(); addItem(task); }}
                          className="text-[10px] font-semibold text-[#4f7cff] hover:text-white transition-colors px-2 py-0.5 rounded bg-[#4f7cff]/10 hover:bg-[#4f7cff]/20"
                        >
                          Agregar
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
