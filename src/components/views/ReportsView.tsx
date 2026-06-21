"use client";

import { useState, useEffect } from "react";
import { Printer, TrendingUp, Edit3, Target, BarChart2, Users, Flag, CheckCircle } from "lucide-react";
import { Task, Project, Milestone, Phase, AuthUser } from "@/types";

interface ReportsViewProps {
  Tasks_Gantt: Task[];
  Projects_Gantt: Project[];
  setProjects_Gantt: (Projects_Gantt: Project[] | ((prev: Project[]) => Project[])) => void;
  Milestones_Gantt: Milestone[];
  Phases_Gantt: Phase[];
  users_Gantt: AuthUser[];
  activeProjectId: string;
}

export default function ReportsView({
  Tasks_Gantt,
  Projects_Gantt,
  setProjects_Gantt,
  Milestones_Gantt,
  Phases_Gantt,
  users_Gantt,
  activeProjectId,
}: ReportsViewProps) {
  const activeProj = Projects_Gantt.find((p) => p.id === activeProjectId) || Projects_Gantt[0] || {
    id: "proj1", name: "Royal Gantt Planner", description: "Gestión de proyectos",
    startDate: "2026-05-01", endDate: "2026-08-31", status: "active", leaderId: "u1"
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Project>({
    id: "", name: "", description: "", startDate: "", endDate: "", status: "active", leaderId: ""
  });

  useEffect(() => {
    if (activeProj) setEditForm(activeProj);
  }, [activeProj, isEditing]);

  function handleSaveProject() {
    if (!editForm.name.trim() || !editForm.startDate || !editForm.endDate) return;
    setProjects_Gantt((prev) => prev.map((p) => p.id === activeProj.id ? {
      ...p, name: editForm.name.trim(),
      description: editForm.description ? editForm.description.trim() : undefined,
      startDate: editForm.startDate, endDate: editForm.endDate,
      status: editForm.status, leaderId: editForm.leaderId,
    } : p));
    setIsEditing(false);
  }

  const projTasks = Tasks_Gantt.filter(t => t.projectId === activeProj.id || !t.projectId);
  const projMilestones = Milestones_Gantt.filter(m => m.projectId === activeProj.id);
  const now = new Date();

  // ── Cálculos generales ──
  const totalTasksCount = projTasks.length;
  const doneCount    = projTasks.filter(t => t.status === "done").length;
  const inProgCount  = projTasks.filter(t => t.status === "in_progress").length;
  const reviewCount  = projTasks.filter(t => t.status === "review").length;
  const blockedCount = projTasks.filter(t => t.status === "blocked").length;
  const openCount    = projTasks.filter(t => t.status === "open").length;

  const pct = (n: number) => totalTasksCount ? Math.round((n / totalTasksCount) * 100) : 0;
  const openPct    = pct(openCount);
  const inProgPct  = pct(inProgCount);
  const reviewPct  = pct(reviewCount);
  const donePct    = pct(doneCount);
  const blockedPct = totalTasksCount ? 100 - openPct - inProgPct - reviewPct - donePct : 0;

  const avgProgress    = totalTasksCount ? Math.round(projTasks.reduce((s, t) => s + (t.progress || 0), 0) / totalTasksCount) : 0;
  const completionRate = totalTasksCount ? Math.round((doneCount / totalTasksCount) * 100) : 0;

  // Dona de tareas
  const openDeg    = totalTasksCount ? (openCount    / totalTasksCount) * 360 : 0;
  const inProgDeg  = totalTasksCount ? (inProgCount  / totalTasksCount) * 360 : 0;
  const reviewDeg  = totalTasksCount ? (reviewCount  / totalTasksCount) * 360 : 0;
  const doneDeg    = totalTasksCount ? (doneCount    / totalTasksCount) * 360 : 0;
  const d1 = openDeg; const d2 = d1 + inProgDeg; const d3 = d2 + reviewDeg; const d4 = d3 + doneDeg;
  const donutGradient = totalTasksCount > 0
    ? `conic-gradient(#8b93b8 0deg ${d1}deg,#4f7cff ${d1}deg ${d2}deg,#f5a623 ${d2}deg ${d3}deg,#3ecf8e ${d3}deg ${d4}deg,#ff5c5c ${d4}deg 360deg)`
    : `conic-gradient(#2e3352 0deg 360deg)`;

  // ── Carga de tareas por persona ──
  const tasksByUser = users_Gantt.map(u => {
    const mine = projTasks.filter(t => t.assigneeId === u.id || t.assigneeIds?.includes(u.id));
    const done = mine.filter(t => t.status === "done").length;
    return { user: u, total: mine.length, done };
  }).filter(r => r.total > 0).sort((a, b) => b.total - a.total);
  const maxUserTasks = Math.max(...tasksByUser.map(r => r.total), 1);

  // ── Progreso por fase ──
  const phaseProgress = Phases_Gantt.map(ph => {
    const phaseTasks = projTasks.filter(t => t.phaseId === ph.id);
    const phaseDone  = phaseTasks.filter(t => t.status === "done").length;
    const phaseAvg   = phaseTasks.length
      ? Math.round(phaseTasks.reduce((s, t) => s + (t.progress || 0), 0) / phaseTasks.length)
      : 0;
    return { phase: ph, total: phaseTasks.length, done: phaseDone, avg: phaseAvg };
  }).filter(r => r.total > 0);

  // ── Distribución por prioridad ──
  const priCounts = {
    critica: projTasks.filter(t => t.priority === "critica").length,
    alta:    projTasks.filter(t => t.priority === "alta").length,
    media:   projTasks.filter(t => t.priority === "media").length,
    baja:    projTasks.filter(t => t.priority === "baja").length,
  };
  const priTotal = Object.values(priCounts).reduce((s, v) => s + v, 0);
  const priDeg = {
    critica: priTotal ? (priCounts.critica / priTotal) * 360 : 0,
    alta:    priTotal ? (priCounts.alta    / priTotal) * 360 : 0,
    media:   priTotal ? (priCounts.media   / priTotal) * 360 : 0,
    baja:    priTotal ? (priCounts.baja    / priTotal) * 360 : 0,
  };
  const p1 = priDeg.critica;
  const p2 = p1 + priDeg.alta;
  const p3 = p2 + priDeg.media;
  const priDonut = priTotal > 0
    ? `conic-gradient(#ff5c5c 0deg ${p1}deg,#f5a623 ${p1}deg ${p2}deg,#4f7cff ${p2}deg ${p3}deg,#3ecf8e ${p3}deg 360deg)`
    : `conic-gradient(#2e3352 0deg 360deg)`;

  // ── Distribución de horas por persona ──
  const hoursByUser = users_Gantt.map(u => {
    const mine      = projTasks.filter(t => t.assigneeId === u.id || t.assigneeIds?.includes(u.id));
    const estimated = mine.reduce((s, t) => s + (t.estimatedHours || 0), 0);
    const limit     = u.availableHours || 40;
    const overloaded = estimated > limit;
    return { user: u, estimated, limit, overloaded };
  }).filter(r => r.estimated > 0 || tasksByUser.some(t => t.user.id === r.user.id));
  const maxHours = Math.max(...hoursByUser.map(r => r.limit), 1);

  // ── Propietario y equipo ──
  const leader = users_Gantt.find(u => u.id === activeProj.leaderId) || users_Gantt[0] || { name: "Sin Asignar", initials: "SA", color: "#8b93b8", role: "Project Manager" };
  const assignedIds = Array.from(new Set(projTasks.flatMap(t => t.assigneeIds?.length ? t.assigneeIds : [t.assigneeId]).filter(Boolean)));
  const teamMembers = users_Gantt.filter(u => assignedIds.includes(u.id));

  return (
    <div className="h-full overflow-y-auto bg-[#0f1117] text-[#e8eaf6] p-6 space-y-6 print:bg-white print:text-black print:p-0">

      <style jsx global>{`
        @media print {
          body,html{background:white!important;color:black!important}
          header,nav,button,.no-print{display:none!important}
          .print-card{border:1px solid #ccc!important;background:white!important;color:black!important;box-shadow:none!important}
        }
      `}</style>

      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-[#2e3352]/50 pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#e8eaf6] tracking-tight flex items-center gap-2">
            <BarChart2 size={22} className="text-[#7c5cfc]" />
            Dashboard del Proyecto
          </h1>
          <p className="text-xs text-[#8b93b8] mt-1">Métricas y analíticas del proyecto en tiempo real.</p>
        </div>
        <button
          onClick={() => window.print()}
          className="no-print flex items-center gap-1.5 px-3 py-1.5 bg-[#22263a] border border-[#2e3352] hover:border-[#4f7cff] rounded-lg text-xs font-medium text-[#e8eaf6] transition-all cursor-pointer"
        >
          <Printer size={14} /> Imprimir / Guardar PDF
        </button>
      </div>

      {/* ── FILA 1: Info del proyecto ── */}
      <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 shadow-xl print-card">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#2e3352]/50">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-[#e8eaf6] uppercase tracking-wider">Información del proyecto</h2>
            <button onClick={() => setIsEditing(true)} className="no-print flex items-center gap-1 px-2 py-0.5 bg-[#22263a] border border-[#2e3352] hover:border-[#4f7cff] rounded text-[10px] font-semibold text-[#e8eaf6] transition cursor-pointer">
              <Edit3 size={10} /> Editar
            </button>
          </div>
          <span className="text-[10px] bg-[#3ecf8e]/10 text-[#3ecf8e] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            {activeProj.status === "active" ? "Activo" : activeProj.status === "completed" ? "Completado" : activeProj.status === "planning" ? "Planificación" : "En Espera"}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-4">
            <div>
              <div className="text-[10px] text-[#8b93b8] uppercase tracking-wider mb-1">Descripción del Proyecto</div>
              <p className="text-[#e8eaf6] text-xs leading-relaxed bg-[#11151f] rounded-xl p-3 border border-[#2e3352]/30 italic">
                {activeProj.description || "Añadir descripción del proyecto..."}
              </p>
            </div>
            <div className="flex gap-6">
              <div>
                <div className="text-[10px] text-[#8b93b8] uppercase tracking-wider mb-0.5">Fecha de Inicio</div>
                <span className="font-semibold text-[#e8eaf6]">{new Date(activeProj.startDate + "T00:00:00").toLocaleDateString("es", { day: "2-digit", month: "long", year: "numeric" })}</span>
              </div>
              <div>
                <div className="text-[10px] text-[#8b93b8] uppercase tracking-wider mb-0.5">Fecha Final</div>
                <span className="font-semibold text-[#e8eaf6]">{new Date(activeProj.endDate + "T00:00:00").toLocaleDateString("es", { day: "2-digit", month: "long", year: "numeric" })}</span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-6">
              <div>
                <div className="text-[10px] text-[#8b93b8] uppercase tracking-wider mb-1">Propietario</div>
                <div className="flex items-center gap-2">
                  {leader.imageUrl
                    ? <img src={leader.imageUrl} alt={leader.name} className="w-7 h-7 rounded-full object-cover" />
                    : <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ background: leader.color }}>{leader.initials}</div>
                  }
                  <div>
                    <span className="font-semibold text-[#e8eaf6] block leading-tight">{leader.name}</span>
                    <span className="text-[9px] text-[#8b93b8]">{leader.role}</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#8b93b8] uppercase tracking-wider mb-1.5">Equipo ({teamMembers.length})</div>
                <div className="flex -space-x-2 overflow-hidden">
                  {teamMembers.map(m => m.imageUrl
                    ? <img key={m.id} src={m.imageUrl} alt={m.name} className="w-6 h-6 rounded-full border-2 border-[#1a1d27] object-cover" title={`${m.name} (${m.role})`} />
                    : <div key={m.id} className="w-6 h-6 rounded-full border-2 border-[#1a1d27] flex items-center justify-center text-white text-[8px] font-bold" style={{ background: m.color }} title={`${m.name} (${m.role})`}>{m.initials}</div>
                  )}
                  {teamMembers.length === 0 && <span className="text-[10px] text-[#8b93b8] italic">Sin asignar</span>}
                </div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center text-[10px] text-[#8b93b8] uppercase tracking-wider mb-1">
                <span>Progreso General</span>
                <span className="font-bold text-[#e8eaf6]">{avgProgress}%</span>
              </div>
              <div className="h-4 bg-[#11151f] rounded-full overflow-hidden border border-[#2e3352]/50 p-0.5">
                <div className="h-full rounded-full bg-gradient-to-r from-[#4f7cff] to-[#7c5cfc] transition-all duration-300" style={{ width: `${avgProgress}%` }} />
              </div>
              <div className="flex justify-between text-[9px] text-[#8b93b8] mt-1">
                <span>Actualizado: {now.toLocaleDateString("es-MX")}</span>
                <span>{completionRate}% de tareas terminadas</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FILA 2: Dona de tareas + Carga por persona ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Dona de tareas */}
        <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 shadow-xl print-card">
          <h2 className="text-xs font-bold text-[#e8eaf6] uppercase tracking-wider mb-4 border-b border-[#2e3352]/50 pb-2">Tareas por estado</h2>
          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4">
            <div className="relative w-36 h-36 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: donutGradient }}>
              <div className="absolute w-24 h-24 rounded-full bg-[#1a1d27] flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-[#e8eaf6]">{totalTasksCount}</span>
                <span className="text-[9px] text-[#8b93b8] uppercase font-bold tracking-wider">Total</span>
              </div>
            </div>
            <div className="space-y-2.5 w-full max-w-[200px]">
              {[
                { label: "Iniciado",     count: openCount,    pct: openPct,    color: "#8b93b8" },
                { label: "En desarrollo",count: inProgCount,  pct: inProgPct,  color: "#4f7cff" },
                { label: "En revisión",  count: reviewCount,  pct: reviewPct,  color: "#f5a623" },
                { label: "Terminado",    count: doneCount,    pct: donePct,    color: "#3ecf8e" },
                { label: "Bloqueado",    count: blockedCount, pct: blockedPct, color: "#ff5c5c" },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded" style={{ background: row.color }} />
                    <span style={{ color: row.color }}>{row.label}</span>
                  </div>
                  <span className="font-semibold text-[#e8eaf6]">{row.count} ({row.pct}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Carga de tareas por persona */}
        <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 shadow-xl print-card">
          <h2 className="text-xs font-bold text-[#e8eaf6] uppercase tracking-wider mb-4 border-b border-[#2e3352]/50 pb-2 flex items-center gap-1.5">
            <Users size={13} className="text-[#4f7cff]" /> Tareas por persona
          </h2>
          {tasksByUser.length === 0
            ? <p className="text-[10px] text-[#8b93b8] italic mt-4">No hay tareas asignadas.</p>
            : <div className="space-y-3 mt-2">
                {tasksByUser.map(r => {
                  const barPct = Math.round((r.total / maxUserTasks) * 100);
                  const donePct2 = r.total ? Math.round((r.done / r.total) * 100) : 0;
                  return (
                    <div key={r.user.id}>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0" style={{ background: r.user.color }}>{r.user.initials}</div>
                          <span className="font-semibold text-[#e8eaf6] truncate max-w-[120px]">{r.user.name}</span>
                        </div>
                        <span className="text-[10px] text-[#8b93b8]">{r.done}/{r.total} hechas</span>
                      </div>
                      <div className="h-4 bg-[#11151f] rounded-full overflow-hidden border border-[#2e3352]/20 relative">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#4f7cff]/60 to-[#4f7cff] transition-all" style={{ width: `${barPct}%` }} />
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#3ecf8e]/40 to-[#3ecf8e] transition-all" style={{ width: `${Math.round(barPct * donePct2 / 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="flex gap-4 mt-2 pt-2 border-t border-[#2e3352]/30">
                  <div className="flex items-center gap-1.5 text-[10px] text-[#8b93b8]"><div className="w-2.5 h-2 rounded bg-[#4f7cff]" /> Total asignado</div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#8b93b8]"><div className="w-2.5 h-2 rounded bg-[#3ecf8e]" /> Completado</div>
                </div>
              </div>
          }
        </div>

      </div>

      {/* ── FILA 3: Progreso por fase + Distribución por prioridad ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Progreso por fase */}
        <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 shadow-xl print-card">
          <h2 className="text-xs font-bold text-[#e8eaf6] uppercase tracking-wider mb-4 border-b border-[#2e3352]/50 pb-2 flex items-center gap-1.5">
            <CheckCircle size={13} className="text-[#3ecf8e]" /> Progreso por fase
          </h2>
          {phaseProgress.length === 0
            ? <p className="text-[10px] text-[#8b93b8] italic mt-4">No hay fases con tareas asignadas.</p>
            : <div className="space-y-4 mt-2">
                {phaseProgress.map(r => (
                  <div key={r.phase.id}>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.phase.color }} />
                        <span className="font-semibold text-[#e8eaf6] truncate max-w-[160px]">{r.phase.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] text-[#8b93b8]">{r.done}/{r.total} tareas</span>
                        <span className="text-[10px] font-bold" style={{ color: r.avg === 100 ? "#3ecf8e" : r.avg > 50 ? "#4f7cff" : "#f5a623" }}>{r.avg}%</span>
                      </div>
                    </div>
                    <div className="h-3 bg-[#11151f] rounded-full overflow-hidden border border-[#2e3352]/20">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${r.avg}%`, background: r.phase.color + "cc" }} />
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Distribución por prioridad */}
        <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 shadow-xl print-card">
          <h2 className="text-xs font-bold text-[#e8eaf6] uppercase tracking-wider mb-4 border-b border-[#2e3352]/50 pb-2 flex items-center gap-1.5">
            <Flag size={13} className="text-[#f5a623]" /> Distribución por prioridad
          </h2>
          <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
            <div className="relative w-28 h-28 rounded-full flex-shrink-0" style={{ background: priDonut }}>
              <div className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-[#1a1d27] flex flex-col items-center justify-center" style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)", position: "absolute" }}>
                <span className="text-lg font-black text-[#e8eaf6]">{priTotal}</span>
                <span className="text-[8px] text-[#8b93b8] uppercase">tareas</span>
              </div>
            </div>
            <div className="space-y-3 flex-1">
              {[
                { label: "Crítica", count: priCounts.critica, color: "#ff5c5c" },
                { label: "Alta",    count: priCounts.alta,    color: "#f5a623" },
                { label: "Media",   count: priCounts.media,   color: "#4f7cff" },
                { label: "Baja",    count: priCounts.baja,    color: "#3ecf8e" },
              ].map(row => {
                const w = priTotal ? Math.round((row.count / priTotal) * 100) : 0;
                return (
                  <div key={row.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: row.color }} />
                        <span className="text-[#8b93b8]">{row.label}</span>
                      </div>
                      <span className="font-semibold text-[#e8eaf6]">{row.count} ({w}%)</span>
                    </div>
                    <div className="h-1.5 bg-[#11151f] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${w}%`, background: row.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* ── FILA 4: Horas por persona ── */}
      <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 shadow-xl print-card">
        <h2 className="text-xs font-bold text-[#e8eaf6] uppercase tracking-wider mb-4 border-b border-[#2e3352]/50 pb-2 flex items-center gap-1.5">
          <TrendingUp size={13} className="text-[#7c5cfc]" /> Capacidad y carga de horas por persona
        </h2>
        {hoursByUser.length === 0
          ? <p className="text-[10px] text-[#8b93b8] italic">No hay horas estimadas registradas en las tareas.</p>
          : <div className="space-y-3">
              {hoursByUser.map(r => {
                const pctBar = Math.min(100, Math.round((r.estimated / r.limit) * 100));
                return (
                  <div key={r.user.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: r.user.color }} />
                        <span className="font-semibold text-[#e8eaf6]">{r.user.name}</span>
                        <span className="text-[9px] text-[#8b93b8]">({r.user.role})</span>
                      </div>
                      <span className={`font-semibold ${r.overloaded ? "text-[#ff5c5c]" : "text-[#8b93b8]"}`}>
                        {r.estimated}h / {r.limit}h ({pctBar}%)
                      </span>
                    </div>
                    <div className="h-3 bg-[#11151f] rounded-full overflow-hidden border border-[#2e3352]/20 relative">
                      <div className={`h-full rounded-full transition-all ${r.overloaded ? "bg-gradient-to-r from-red-600 to-rose-400" : "bg-gradient-to-r from-[#4f7cff] to-[#7c5cfc]"}`} style={{ width: `${pctBar}%` }} />
                      {r.overloaded && <div className="absolute right-2 top-0 bottom-0 flex items-center text-[8px] font-black text-white">⚠ SOBRECARGA</div>}
                    </div>
                  </div>
                );
              })}
            </div>
        }
      </div>

      {/* ── FILA 5: Roadmap de hitos ── */}
      <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 shadow-xl print-card">
        <h2 className="text-xs font-bold text-[#e8eaf6] uppercase tracking-wider mb-4 border-b border-[#2e3352]/50 pb-2 flex items-center gap-1.5">
          <Target size={13} className="text-[#f5a623]" /> Roadmap estratégico de metas
        </h2>
        <div className="relative pl-5 border-l border-[#2e3352] space-y-5 py-2">
          {projMilestones.length === 0
            ? <p className="text-[10px] text-[#8b93b8] italic">No hay metas declaradas para este proyecto.</p>
            : projMilestones.map(ms => {
                const target  = new Date(ms.targetDate + "T00:00:00");
                const diffMs  = target.getTime() - now.getTime();
                const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
                const isOverdue = diffDays < 0 && ms.status !== "achieved";
                const dotColor  = ms.status === "achieved" ? "#3ecf8e" : ms.status === "missed" ? "#ff5c5c" : isOverdue ? "#ff5c5c" : "#f5a623";
                const badge     = ms.status === "achieved" ? { text: "Logrado", bg: "#3ecf8e" }
                                : ms.status === "missed"   ? { text: "Fallido", bg: "#ff5c5c" }
                                : { text: isOverdue ? "Vencido" : "Pendiente", bg: isOverdue ? "#ff5c5c" : "#f5a623" };
                const daysLabel = ms.status === "achieved" ? null
                                : isOverdue  ? `Vencido hace ${Math.abs(diffDays)} días`
                                : diffDays === 0 ? "Vence hoy"
                                : `Faltan ${diffDays} días`;

                return (
                  <div key={ms.id} className="relative">
                    <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full border-2 border-[#1a1d27]" style={{ background: dotColor }} />
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5 flex-1">
                        <span className="text-xs font-bold text-[#e8eaf6]">{ms.name}</span>
                        <p className="text-[10px] text-[#8b93b8]">
                          Límite: {target.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                        {ms.description && <p className="text-[10px] text-[#8b93b8] italic">"{ms.description}"</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: badge.bg + "cc" }}>{badge.text}</span>
                        {daysLabel && (
                          <span className="text-[9px] font-semibold" style={{ color: isOverdue ? "#ff5c5c" : diffDays === 0 ? "#f5a623" : "#3ecf8e" }}>
                            {daysLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
          }
        </div>
      </div>

      {/* ── Modal editar proyecto ── */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={() => setIsEditing(false)}>
          <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 w-96 max-w-[95vw] shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-4">Editar Proyecto</h3>
            <div className="space-y-3">
              <Field label="Nombre">
                <input className="bg-[#22263a] border border-[#2e3352] text-[#e8eaf6] rounded-lg px-3 py-1.5 text-xs w-full focus:outline-none focus:border-[#4f7cff]" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
              </Field>
              <Field label="Descripción">
                <textarea className="bg-[#22263a] border border-[#2e3352] text-[#e8eaf6] rounded-lg px-3 py-1.5 text-xs w-full focus:outline-none focus:border-[#4f7cff] resize-none" rows={3} value={editForm.description || ""} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
              </Field>
              <div className="flex gap-2">
                <Field label="Inicio" className="flex-1">
                  <input type="date" className="bg-[#22263a] border border-[#2e3352] text-[#e8eaf6] rounded-lg px-2 py-1.5 text-xs w-full focus:outline-none" value={editForm.startDate} onChange={e => setEditForm(p => ({ ...p, startDate: e.target.value }))} />
                </Field>
                <Field label="Fin" className="flex-1">
                  <input type="date" className="bg-[#22263a] border border-[#2e3352] text-[#e8eaf6] rounded-lg px-2 py-1.5 text-xs w-full focus:outline-none" value={editForm.endDate} onChange={e => setEditForm(p => ({ ...p, endDate: e.target.value }))} />
                </Field>
              </div>
              <div className="flex gap-2">
                <Field label="Estado" className="flex-1">
                  <select className="bg-[#22263a] border border-[#2e3352] text-[#e8eaf6] rounded-lg px-2 py-1.5 text-xs w-full focus:outline-none" value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value as Project["status"] }))}>
                    <option value="planning">Planificación</option>
                    <option value="active">Activo</option>
                    <option value="completed">Completado</option>
                    <option value="on_hold">En Espera</option>
                  </select>
                </Field>
                <Field label="Propietario" className="flex-1">
                  <select className="bg-[#22263a] border border-[#2e3352] text-[#e8eaf6] rounded-lg px-2 py-1.5 text-xs w-full focus:outline-none" value={editForm.leaderId} onChange={e => setEditForm(p => ({ ...p, leaderId: e.target.value }))}>
                    {users_Gantt.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                  </select>
                </Field>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button className="px-3 py-1.5 rounded-lg border border-[#2e3352] bg-[#22263a] text-[#e8eaf6] text-xs font-medium hover:border-[#4f7cff] transition-all cursor-pointer" onClick={() => setIsEditing(false)}>Cancelar</button>
              <button className="px-3 py-1.5 rounded-lg bg-[#4f7cff] text-white text-xs font-medium hover:bg-[#3a6be0] transition-all cursor-pointer" onClick={handleSaveProject}>Guardar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-[10px] text-[#8b93b8] uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}
