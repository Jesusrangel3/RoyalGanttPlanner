"use client";

import { useState, useMemo } from "react";
import { Task, AuthUser, ChecklistItem } from "@/types";
import { CheckSquare, Square, CheckCheck, Filter, Search, ChevronDown, ChevronRight } from "lucide-react";

interface ChecklistViewProps {
  Tasks_Gantt: Task[];
  setTasks: (fn: (prev: Task[]) => Task[]) => void;
  users_Gantt: AuthUser[];
}

export default function ChecklistView({ Tasks_Gantt, setTasks, users_Gantt }: ChecklistViewProps) {
  const [search, setSearch] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterDone, setFilterDone] = useState<"all" | "pending" | "done">("all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Solo tareas que tienen checklist
  const tasksWithChecklist = useMemo(() =>
    Tasks_Gantt.filter(t => (t.checklist?.length || 0) > 0)
      .filter(t => !filterAssignee || t.assigneeId === filterAssignee)
      .filter(t => {
        if (!search) return true;
        return t.title.toLowerCase().includes(search.toLowerCase()) ||
          t.checklist?.some(i => i.text.toLowerCase().includes(search.toLowerCase()));
      }),
    [Tasks_Gantt, filterAssignee, search]
  );

  // Totales globales
  const totalItems = tasksWithChecklist.reduce((s, t) => s + (t.checklist?.length || 0), 0);
  const doneItems  = tasksWithChecklist.reduce((s, t) => s + (t.checklist?.filter(i => i.done).length || 0), 0);
  const pctGlobal  = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  async function toggleItem(task: Task, itemId: string) {
    const updated: Task = {
      ...task,
      checklist: task.checklist?.map(i => i.id === itemId ? { ...i, done: !i.done } : i),
    };
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    try {
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    } catch (e) { console.error(e); }
  }

  function toggleCollapse(taskId: string) {
    setCollapsed(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  }

  return (
    <div className="h-full flex flex-col bg-[#0f1117] overflow-hidden">

      {/* ── Resumen global ── */}
      <div className="flex gap-3 px-5 py-4 border-b border-[#2e3352] bg-[#1a1d27] flex-shrink-0 flex-wrap items-center">
        <div className="bg-[#0f1117] border border-[#2e3352] rounded-xl px-4 py-3 flex flex-col gap-0.5 min-w-[130px]">
          <span className="text-[10px] text-[#8b93b8] uppercase tracking-wider font-semibold">Completados</span>
          <span className="text-2xl font-bold text-[#3ecf8e]">{doneItems}<span className="text-sm text-[#8b93b8] font-normal">/{totalItems}</span></span>
        </div>
        <div className="bg-[#0f1117] border border-[#2e3352] rounded-xl px-4 py-3 flex flex-col gap-0.5 min-w-[130px]">
          <span className="text-[10px] text-[#8b93b8] uppercase tracking-wider font-semibold">Tareas con checklist</span>
          <span className="text-2xl font-bold text-[#4f7cff]">{tasksWithChecklist.length}</span>
        </div>
        <div className="flex-1 min-w-[200px] bg-[#0f1117] border border-[#2e3352] rounded-xl px-4 py-3">
          <div className="flex justify-between text-[10px] text-[#8b93b8] mb-1.5">
            <span className="font-semibold uppercase tracking-wider">Avance global</span>
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
            placeholder="Buscar tarea o paso..."
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

        <select
          className="bg-[#0f1117] border border-[#2e3352] rounded-lg px-3 py-1.5 text-xs text-[#e8eaf6] outline-none cursor-pointer"
          value={filterDone}
          onChange={e => setFilterDone(e.target.value as any)}
        >
          <option value="all">Todos los pasos</option>
          <option value="pending">Solo pendientes</option>
          <option value="done">Solo completados</option>
        </select>
      </div>

      {/* ── Lista de tareas con checklist ── */}
      <div className="flex-1 overflow-auto px-5 py-4 space-y-3">
        {tasksWithChecklist.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-[#8b93b8]">
            <CheckCheck size={36} className="opacity-20 mb-2" />
            <p className="text-sm font-medium">No hay checklists en este proyecto</p>
            <p className="text-[10px] opacity-60 mt-1">Abre una tarea → pestaña Checklist → agrega pasos</p>
          </div>
        ) : (
          tasksWithChecklist.map(task => {
            const done      = task.checklist?.filter(i => i.done).length || 0;
            const total     = task.checklist?.length || 0;
            const pct       = total > 0 ? Math.round((done / total) * 100) : 0;
            const color     = pct === 100 ? "#3ecf8e" : pct > 0 ? "#4f7cff" : "#8b93b8";
            const assignee  = users_Gantt.find(u => u.id === task.assigneeId);
            const isOpen    = !collapsed[task.id];

            const visibleItems = (task.checklist || []).filter(item => {
              if (filterDone === "pending") return !item.done;
              if (filterDone === "done")    return item.done;
              return true;
            });

            return (
              <div key={task.id} className="bg-[#1a1d27] border border-[#2e3352] rounded-xl overflow-hidden">

                {/* Cabecera de la tarea */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => toggleCollapse(task.id)}
                >
                  <button className="text-[#8b93b8] flex-shrink-0">
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>

                  <span className="flex-1 text-sm font-semibold text-[#e8eaf6] truncate">{task.title}</span>

                  {assignee && (
                    <div className="flex items-center gap-1.5 text-[10px] text-[#8b93b8]">
                      <div className="w-5 h-5 rounded-full bg-[#4f7cff]/20 flex items-center justify-center text-[8px] font-bold text-[#4f7cff]">
                        {assignee.name?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <span className="hidden sm:inline">{assignee.name?.split(" ")[0]}</span>
                    </div>
                  )}

                  {/* Mini barra de progreso */}
                  <div className="flex items-center gap-2 w-32 flex-shrink-0">
                    <div className="flex-1 h-1.5 rounded-full bg-[#2e3352] overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                    <span className="text-[10px] font-bold tabular-nums" style={{ color }}>
                      {done}/{total}
                    </span>
                  </div>
                </div>

                {/* Items del checklist */}
                {isOpen && (
                  <div className="border-t border-[#2e3352]/50 px-4 py-2 space-y-1">
                    {visibleItems.length === 0 ? (
                      <p className="text-[10px] text-[#8b93b8] py-2 italic">No hay pasos con ese filtro</p>
                    ) : (
                      visibleItems.map(item => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2.5 py-1.5 group cursor-pointer"
                          onClick={() => toggleItem(task, item.id)}
                        >
                          <span className="flex-shrink-0 text-[#8b93b8] group-hover:text-[#4f7cff] transition-colors">
                            {item.done
                              ? <CheckSquare size={14} className="text-[#3ecf8e]" />
                              : <Square size={14} />}
                          </span>
                          <span className={`text-xs flex-1 select-none ${item.done ? "line-through text-[#8b93b8]" : "text-[#e8eaf6]"}`}>
                            {item.text}
                          </span>
                          {item.done && (
                            <span className="text-[9px] text-[#3ecf8e] bg-[#3ecf8e]/10 px-1.5 py-0.5 rounded-full font-semibold">
                              Listo
                            </span>
                          )}
                        </div>
                      ))
                    )}
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
