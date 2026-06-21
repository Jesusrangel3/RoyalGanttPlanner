"use client";

import { useState, useEffect } from "react";
import { Printer, TrendingUp, Edit3, Target, BarChart2, Users, Flag, CheckCircle, AlertTriangle, Activity } from "lucide-react";
import { Task, Project, Milestone, Phase, AuthUser } from "@/types";

interface ReportsViewProps {
  Tasks_Gantt: Task[];
  Projects_Gantt: Project[];
  setProjects_Gantt: (p: Project[] | ((prev: Project[]) => Project[])) => void;
  Milestones_Gantt: Milestone[];
  Phases_Gantt: Phase[];
  users_Gantt: AuthUser[];
  activeProjectId: string;
}

// ── SVG helpers ──────────────────────────────────────────────────────────────
function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = polarToXY(cx, cy, r, startDeg);
  const e = polarToXY(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

// ── Gauge semicircular ────────────────────────────────────────────────────────
function HealthGauge({ score }: { score: number }) {
  const cx = 110; const cy = 100; const r = 80; const stroke = 16;
  const clampedScore = Math.max(0, Math.min(100, score));
  const angleDeg = (clampedScore / 100) * 180;

  const zones = [
    { start: 0,   end: 60,  color: "#ff5c5c" },
    { start: 60,  end: 120, color: "#f5a623" },
    { start: 120, end: 180, color: "#3ecf8e" },
  ];

  const needleAngle = -90 + angleDeg;
  const nx = cx + (r - 8) * Math.cos((needleAngle * Math.PI) / 180);
  const ny = cy + (r - 8) * Math.sin((needleAngle * Math.PI) / 180);

  const label = score >= 70 ? "Saludable" : score >= 40 ? "En riesgo" : "Crítico";
  const labelColor = score >= 70 ? "#3ecf8e" : score >= 40 ? "#f5a623" : "#ff5c5c";

  return (
    <svg viewBox="0 0 220 115" className="w-full max-w-[220px]">
      {/* Track base */}
      <path d={arcPath(cx, cy, r, -90, 90)} fill="none" stroke="#2e3352" strokeWidth={stroke} strokeLinecap="round" />
      {/* Colored zones */}
      {zones.map((z, i) => (
        <path key={i} d={arcPath(cx, cy, r, z.start - 90, z.end - 90)} fill="none" stroke={z.color} strokeWidth={stroke} strokeLinecap={i === 0 ? "round" : i === 2 ? "round" : "butt"} opacity={0.25} />
      ))}
      {/* Active arc */}
      {clampedScore > 0 && (
        <path d={arcPath(cx, cy, r, -90, angleDeg - 90)} fill="none" stroke={labelColor} strokeWidth={stroke} strokeLinecap="round" />
      )}
      {/* Needle */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="white" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={5} fill="white" />
      {/* Score */}
      <text x={cx} y={cy - 18} textAnchor="middle" fill="white" fontSize={22} fontWeight="900">{score}</text>
      <text x={cx} y={cy - 4} textAnchor="middle" fill={labelColor} fontSize={9} fontWeight="700">{label.toUpperCase()}</text>
      {/* Labels */}
      <text x={28} y={108} fill="#8b93b8" fontSize={8}>Crítico</text>
      <text x={cx - 10} y={22} fill="#8b93b8" fontSize={8}>Óptimo</text>
      <text x={175} y={108} fill="#8b93b8" fontSize={8}>100</text>
    </svg>
  );
}

// ── Burndown SVG ──────────────────────────────────────────────────────────────
function BurndownChart({ projTasks, startDate, endDate }: { projTasks: Task[]; startDate: string; endDate: string }) {
  const W = 420; const H = 120; const PAD = { t: 10, r: 10, b: 30, l: 30 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;
  const total = projTasks.length;
  if (total === 0) return <p className="text-[10px] text-[#8b93b8] italic mt-4">Sin tareas para graficar.</p>;

  const start = new Date(startDate + "T00:00:00").getTime();
  const end   = new Date(endDate   + "T00:00:00").getTime();
  const span  = end - start || 1;
  const now   = Date.now();

  const POINTS = 10;
  const idealPts: [number, number][] = [];
  const actualPts: [number, number][] = [];

  for (let i = 0; i <= POINTS; i++) {
    const t = start + (span / POINTS) * i;
    const xPct = (t - start) / span;
    const x = PAD.l + xPct * cW;
    // Ideal: linear from total → 0
    const idealY = PAD.t + ((total - (total * i) / POINTS) / total) * cH;
    idealPts.push([x, idealY]);
    // Actual: count tasks NOT done by this time (estimate by endDate)
    if (t <= now) {
      const doneByT = projTasks.filter(t2 => {
        const ed = new Date(t2.endDate + "T00:00:00").getTime();
        return t2.status === "done" && ed <= t;
      }).length;
      const remaining = total - doneByT;
      const actualY = PAD.t + (remaining / total) * cH;
      actualPts.push([x, actualY]);
    }
  }

  const toPolyline = (pts: [number, number][]) => pts.map(([x, y]) => `${x},${y}`).join(" ");

  const nowX = Math.min(PAD.l + cW, Math.max(PAD.l, PAD.l + ((now - start) / span) * cW));

  const yLabels = [total, Math.round(total * 0.75), Math.round(total * 0.5), Math.round(total * 0.25), 0];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Grid horizontales */}
      {yLabels.map((v, i) => {
        const y = PAD.t + (i / 4) * cH;
        return (
          <g key={i}>
            <line x1={PAD.l} y1={y} x2={PAD.l + cW} y2={y} stroke="#2e3352" strokeWidth={0.5} strokeDasharray="3 3" />
            <text x={PAD.l - 4} y={y + 3} fill="#8b93b8" fontSize={7} textAnchor="end">{v}</text>
          </g>
        );
      })}
      {/* Ejes */}
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + cH} stroke="#2e3352" strokeWidth={1} />
      <line x1={PAD.l} y1={PAD.t + cH} x2={PAD.l + cW} y2={PAD.t + cH} stroke="#2e3352" strokeWidth={1} />
      {/* Línea hoy */}
      {now >= start && now <= end && (
        <line x1={nowX} y1={PAD.t} x2={nowX} y2={PAD.t + cH} stroke="#f5a623" strokeWidth={1} strokeDasharray="4 2" />
      )}
      {/* Ideal */}
      <polyline points={toPolyline(idealPts)} fill="none" stroke="#4f7cff" strokeWidth={1.5} strokeDasharray="5 3" strokeLinecap="round" strokeLinejoin="round" />
      {/* Actual */}
      {actualPts.length > 1 && (
        <polyline points={toPolyline(actualPts)} fill="none" stroke="#3ecf8e" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {/* Leyenda */}
      <rect x={PAD.l + cW - 120} y={PAD.t} width={8} height={2} fill="#4f7cff" />
      <text x={PAD.l + cW - 108} y={PAD.t + 3} fill="#4f7cff" fontSize={7}>Ideal</text>
      <rect x={PAD.l + cW - 70} y={PAD.t} width={8} height={2} fill="#3ecf8e" />
      <text x={PAD.l + cW - 58} y={PAD.t + 3} fill="#3ecf8e" fontSize={7}>Real</text>
      <rect x={PAD.l + cW - 20} y={PAD.t - 1} width={1} height={4} fill="#f5a623" />
      <text x={PAD.l + cW - 18} y={PAD.t + 3} fill="#f5a623" fontSize={7}>Hoy</text>
      {/* Fechas eje X */}
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
        const d = new Date(start + span * f);
        return <text key={i} x={PAD.l + f * cW} y={H - 4} fill="#8b93b8" fontSize={7} textAnchor="middle">{d.toLocaleDateString("es-MX", { month: "short", day: "2-digit" })}</text>;
      })}
    </svg>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function ReportsView({
  Tasks_Gantt, Projects_Gantt, setProjects_Gantt,
  Milestones_Gantt, Phases_Gantt, users_Gantt, activeProjectId,
}: ReportsViewProps) {

  const activeProj = Projects_Gantt.find(p => p.id === activeProjectId) || Projects_Gantt[0] || {
    id: "proj1", name: "Royal Gantt Planner", description: "Gestión de proyectos",
    startDate: "2026-05-01", endDate: "2026-08-31", status: "active", leaderId: "u1"
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Project>({ id: "", name: "", description: "", startDate: "", endDate: "", status: "active", leaderId: "" });

  useEffect(() => { if (activeProj) setEditForm(activeProj); }, [activeProj, isEditing]);

  function handleSaveProject() {
    if (!editForm.name.trim() || !editForm.startDate || !editForm.endDate) return;
    setProjects_Gantt(prev => prev.map(p => p.id === activeProj.id ? { ...p, name: editForm.name.trim(), description: editForm.description?.trim(), startDate: editForm.startDate, endDate: editForm.endDate, status: editForm.status, leaderId: editForm.leaderId } : p));
    setIsEditing(false);
  }

  const projTasks    = Tasks_Gantt.filter(t => t.projectId === activeProj.id || !t.projectId);
  const projMilestones = Milestones_Gantt.filter(m => m.projectId === activeProj.id);
  const now = new Date();
  const nowMs = now.getTime();

  // ── Totales de estado ──
  const total      = projTasks.length;
  const doneCount  = projTasks.filter(t => t.status === "done").length;
  const inProgCount = projTasks.filter(t => t.status === "in_progress").length;
  const reviewCount = projTasks.filter(t => t.status === "review").length;
  const blockedCount = projTasks.filter(t => t.status === "blocked").length;
  const openCount  = projTasks.filter(t => t.status === "open").length;
  const pct = (n: number) => total ? Math.round((n / total) * 100) : 0;

  const avgProgress    = total ? Math.round(projTasks.reduce((s, t) => s + (t.progress || 0), 0) / total) : 0;
  const completionRate = pct(doneCount);

  // Tareas vencidas (endDate pasado y no terminada)
  const overdueTasks = projTasks.filter(t => {
    if (t.status === "done") return false;
    try { return new Date(t.endDate + "T00:00:00").getTime() < nowMs; } catch { return false; }
  });

  // ── Dona de tareas ──
  const openDeg   = total ? (openCount   / total) * 360 : 0;
  const inProgDeg = total ? (inProgCount / total) * 360 : 0;
  const reviewDeg = total ? (reviewCount / total) * 360 : 0;
  const doneDeg   = total ? (doneCount   / total) * 360 : 0;
  const d1 = openDeg; const d2 = d1+inProgDeg; const d3 = d2+reviewDeg; const d4 = d3+doneDeg;
  const donutGradient = total > 0
    ? `conic-gradient(#8b93b8 0deg ${d1}deg,#4f7cff ${d1}deg ${d2}deg,#f5a623 ${d2}deg ${d3}deg,#3ecf8e ${d3}deg ${d4}deg,#ff5c5c ${d4}deg 360deg)`
    : `conic-gradient(#2e3352 0deg 360deg)`;

  // ── Tareas por persona ──
  const tasksByUser = users_Gantt.map(u => {
    const mine = projTasks.filter(t => t.assigneeId === u.id || t.assigneeIds?.includes(u.id));
    return { user: u, total: mine.length, done: mine.filter(t => t.status === "done").length };
  }).filter(r => r.total > 0).sort((a, b) => b.total - a.total);
  const maxUserTasks = Math.max(...tasksByUser.map(r => r.total), 1);

  // ── Progreso por fase ──
  const phaseProgress = Phases_Gantt.map(ph => {
    const pt = projTasks.filter(t => t.phaseId === ph.id);
    const avg = pt.length ? Math.round(pt.reduce((s, t) => s + (t.progress || 0), 0) / pt.length) : 0;
    return { phase: ph, total: pt.length, done: pt.filter(t => t.status === "done").length, avg };
  }).filter(r => r.total > 0);

  // ── Prioridades ──
  const priCounts = {
    critica: projTasks.filter(t => t.priority === "critica").length,
    alta:    projTasks.filter(t => t.priority === "alta").length,
    media:   projTasks.filter(t => t.priority === "media").length,
    baja:    projTasks.filter(t => t.priority === "baja").length,
  };
  const priTotal = Object.values(priCounts).reduce((s, v) => s + v, 0);
  const p1 = priTotal ? (priCounts.critica / priTotal) * 360 : 0;
  const p2 = p1 + (priTotal ? (priCounts.alta  / priTotal) * 360 : 0);
  const p3 = p2 + (priTotal ? (priCounts.media / priTotal) * 360 : 0);
  const priDonut = priTotal > 0
    ? `conic-gradient(#ff5c5c 0deg ${p1}deg,#f5a623 ${p1}deg ${p2}deg,#4f7cff ${p2}deg ${p3}deg,#3ecf8e ${p3}deg 360deg)`
    : `conic-gradient(#2e3352 0deg 360deg)`;

  // ── Horas por persona ──
  const hoursByUser = users_Gantt.map(u => {
    const mine = projTasks.filter(t => t.assigneeId === u.id || t.assigneeIds?.includes(u.id));
    const estimated = mine.reduce((s, t) => s + (t.estimatedHours || 0), 0);
    const limit = u.availableHours || 40;
    return { user: u, estimated, limit, overloaded: estimated > limit };
  }).filter(r => r.estimated > 0);

  // ── Vencidas por responsable ──
  const overdueByUser = users_Gantt.map(u => ({
    user: u,
    count: overdueTasks.filter(t => t.assigneeId === u.id || t.assigneeIds?.includes(u.id)).length,
  })).filter(r => r.count > 0).sort((a, b) => b.count - a.count);
  const maxOverdue = Math.max(...overdueByUser.map(r => r.count), 1);

  // ── Índice de Salud ──
  const onTimePct   = total ? Math.round(((total - overdueTasks.length) / total) * 100) : 100;
  const noBlkPct    = total ? Math.round(((total - blockedCount) / total) * 100) : 100;
  const msAchPct    = projMilestones.length ? Math.round((projMilestones.filter(m => m.status === "achieved").length / projMilestones.length) * 100) : 100;
  const healthScore = Math.round(completionRate * 0.35 + onTimePct * 0.35 + noBlkPct * 0.15 + msAchPct * 0.15);

  // ── Equipo ──
  const leader = users_Gantt.find(u => u.id === activeProj.leaderId) || users_Gantt[0] || { name: "Sin Asignar", initials: "SA", color: "#8b93b8", role: "Project Manager" };
  const assignedIds = Array.from(new Set(projTasks.flatMap(t => t.assigneeIds?.length ? t.assigneeIds : [t.assigneeId]).filter(Boolean)));
  const teamMembers = users_Gantt.filter(u => assignedIds.includes(u.id));

  return (
    <div className="h-full overflow-y-auto bg-[#0f1117] text-[#e8eaf6] p-6 space-y-6 print:bg-white print:text-black">
      <style jsx global>{`@media print{body,html{background:white!important;color:black!important}header,nav,button,.no-print{display:none!important}.print-card{border:1px solid #ccc!important;background:white!important;color:black!important;box-shadow:none!important}}`}</style>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2e3352]/50 pb-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><BarChart2 size={22} className="text-[#7c5cfc]" />Dashboard del Proyecto</h1>
          <p className="text-xs text-[#8b93b8] mt-1">Métricas y analíticas en tiempo real.</p>
        </div>
        <button onClick={() => window.print()} className="no-print flex items-center gap-1.5 px-3 py-1.5 bg-[#22263a] border border-[#2e3352] hover:border-[#4f7cff] rounded-lg text-xs font-medium transition cursor-pointer">
          <Printer size={14} /> Imprimir / PDF
        </button>
      </div>

      {/* FILA 1 — Info proyecto */}
      <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 shadow-xl print-card">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#2e3352]/50">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider">Información del proyecto</h2>
            <button onClick={() => setIsEditing(true)} className="no-print flex items-center gap-1 px-2 py-0.5 bg-[#22263a] border border-[#2e3352] hover:border-[#4f7cff] rounded text-[10px] font-semibold transition cursor-pointer">
              <Edit3 size={10} /> Editar
            </button>
          </div>
          <span className="text-[10px] bg-[#3ecf8e]/10 text-[#3ecf8e] px-2 py-0.5 rounded-full font-bold uppercase">
            {activeProj.status === "active" ? "Activo" : activeProj.status === "completed" ? "Completado" : activeProj.status === "planning" ? "Planificación" : "En Espera"}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-4">
            <div>
              <div className="text-[10px] text-[#8b93b8] uppercase tracking-wider mb-1">Descripción</div>
              <p className="text-xs leading-relaxed bg-[#11151f] rounded-xl p-3 border border-[#2e3352]/30 italic">{activeProj.description || "Sin descripción."}</p>
            </div>
            <div className="flex gap-6">
              <div><div className="text-[10px] text-[#8b93b8] uppercase tracking-wider mb-0.5">Inicio</div><span className="font-semibold">{new Date(activeProj.startDate+"T00:00:00").toLocaleDateString("es",{day:"2-digit",month:"long",year:"numeric"})}</span></div>
              <div><div className="text-[10px] text-[#8b93b8] uppercase tracking-wider mb-0.5">Fin</div><span className="font-semibold">{new Date(activeProj.endDate+"T00:00:00").toLocaleDateString("es",{day:"2-digit",month:"long",year:"numeric"})}</span></div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex gap-6">
              <div>
                <div className="text-[10px] text-[#8b93b8] uppercase tracking-wider mb-1">Propietario</div>
                <div className="flex items-center gap-2">
                  {leader.imageUrl ? <img src={leader.imageUrl} alt={leader.name} className="w-7 h-7 rounded-full object-cover" /> : <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{background:leader.color}}>{leader.initials}</div>}
                  <div><span className="font-semibold block">{leader.name}</span><span className="text-[9px] text-[#8b93b8]">{leader.role}</span></div>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#8b93b8] uppercase tracking-wider mb-1.5">Equipo ({teamMembers.length})</div>
                <div className="flex -space-x-2">
                  {teamMembers.map(m => m.imageUrl
                    ? <img key={m.id} src={m.imageUrl} alt={m.name} className="w-6 h-6 rounded-full border-2 border-[#1a1d27] object-cover" title={`${m.name} (${m.role})`} />
                    : <div key={m.id} className="w-6 h-6 rounded-full border-2 border-[#1a1d27] flex items-center justify-center text-white text-[8px] font-bold" style={{background:m.color}} title={`${m.name} (${m.role})`}>{m.initials}</div>
                  )}
                </div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-[#8b93b8] uppercase tracking-wider mb-1"><span>Progreso General</span><span className="font-bold text-[#e8eaf6]">{avgProgress}%</span></div>
              <div className="h-4 bg-[#11151f] rounded-full overflow-hidden border border-[#2e3352]/50 p-0.5">
                <div className="h-full rounded-full bg-gradient-to-r from-[#4f7cff] to-[#7c5cfc] transition-all" style={{width:`${avgProgress}%`}} />
              </div>
              <div className="flex justify-between text-[9px] text-[#8b93b8] mt-1"><span>Actualizado: {now.toLocaleDateString("es-MX")}</span><span>{completionRate}% terminadas</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* FILA 2 — Dona + Gauge salud */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Dona de tareas */}
        <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 shadow-xl print-card">
          <h2 className="text-xs font-bold uppercase tracking-wider mb-4 border-b border-[#2e3352]/50 pb-2">Tareas por estado</h2>
          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4">
            <div className="relative w-36 h-36 rounded-full flex-shrink-0" style={{background:donutGradient}}>
              <div className="absolute inset-0 m-[18px] rounded-full bg-[#1a1d27] flex flex-col items-center justify-center">
                <span className="text-2xl font-black">{total}</span>
                <span className="text-[9px] text-[#8b93b8] uppercase font-bold">Total</span>
              </div>
            </div>
            <div className="space-y-2.5 w-full max-w-[200px]">
              {[
                {label:"Iniciado",    count:openCount,    p:pct(openCount),    color:"#8b93b8"},
                {label:"En desarrollo",count:inProgCount, p:pct(inProgCount),  color:"#4f7cff"},
                {label:"En revisión", count:reviewCount,  p:pct(reviewCount),  color:"#f5a623"},
                {label:"Terminado",   count:doneCount,    p:pct(doneCount),    color:"#3ecf8e"},
                {label:"Bloqueado",   count:blockedCount, p:pct(blockedCount), color:"#ff5c5c"},
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded" style={{background:row.color}}/><span style={{color:row.color}}>{row.label}</span></div>
                  <span className="font-semibold">{row.count} ({row.p}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Índice de Salud */}
        <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 shadow-xl print-card">
          <h2 className="text-xs font-bold uppercase tracking-wider mb-4 border-b border-[#2e3352]/50 pb-2 flex items-center gap-1.5">
            <Activity size={13} className="text-[#3ecf8e]" /> Índice de salud del proyecto
          </h2>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-shrink-0">
              <HealthGauge score={healthScore} />
            </div>
            <div className="space-y-3 flex-1 text-xs">
              {[
                {label:"Tareas completadas",  val:completionRate, color:"#3ecf8e", weight:"35%"},
                {label:"Tareas a tiempo",      val:onTimePct,     color:"#4f7cff", weight:"35%"},
                {label:"Sin bloqueos",         val:noBlkPct,      color:"#f5a623", weight:"15%"},
                {label:"Hitos logrados",       val:msAchPct,      color:"#7c5cfc", weight:"15%"},
              ].map(row => (
                <div key={row.label}>
                  <div className="flex justify-between mb-1"><span className="text-[#8b93b8]">{row.label}</span><span className="font-bold" style={{color:row.color}}>{row.val}%</span></div>
                  <div className="h-1.5 bg-[#11151f] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${row.val}%`,background:row.color}}/></div>
                </div>
              ))}
              <p className="text-[9px] text-[#8b93b8] italic mt-1">Ponderación: completadas 35% · a tiempo 35% · sin bloqueos 15% · hitos 15%</p>
            </div>
          </div>
        </div>

      </div>

      {/* FILA 3 — Burndown */}
      <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 shadow-xl print-card">
        <h2 className="text-xs font-bold uppercase tracking-wider mb-3 border-b border-[#2e3352]/50 pb-2 flex items-center gap-1.5">
          <TrendingUp size={13} className="text-[#4f7cff]" /> Burndown — tareas restantes en el tiempo
        </h2>
        <BurndownChart projTasks={projTasks} startDate={activeProj.startDate} endDate={activeProj.endDate} />
        <p className="text-[9px] text-[#8b93b8] italic mt-1">La línea azul es el ritmo ideal; la verde muestra el avance real basado en tareas con estado "Terminado".</p>
      </div>

      {/* FILA 4 — Progreso por fase + Prioridades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Progreso por fase */}
        <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 shadow-xl print-card">
          <h2 className="text-xs font-bold uppercase tracking-wider mb-4 border-b border-[#2e3352]/50 pb-2 flex items-center gap-1.5">
            <CheckCircle size={13} className="text-[#3ecf8e]" /> Progreso por fase
          </h2>
          {phaseProgress.length === 0
            ? <p className="text-[10px] text-[#8b93b8] italic mt-4">Sin fases con tareas.</p>
            : <div className="space-y-4 mt-2">
                {phaseProgress.map(r => (
                  <div key={r.phase.id}>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:r.phase.color}}/><span className="font-semibold truncate max-w-[160px]">{r.phase.name}</span></div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] text-[#8b93b8]">{r.done}/{r.total}</span>
                        <span className="text-[10px] font-bold" style={{color:r.avg===100?"#3ecf8e":r.avg>50?"#4f7cff":"#f5a623"}}>{r.avg}%</span>
                      </div>
                    </div>
                    <div className="h-3 bg-[#11151f] rounded-full overflow-hidden border border-[#2e3352]/20">
                      <div className="h-full rounded-full transition-all duration-500" style={{width:`${r.avg}%`,background:r.phase.color+"cc"}}/>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Distribución por prioridad */}
        <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 shadow-xl print-card">
          <h2 className="text-xs font-bold uppercase tracking-wider mb-4 border-b border-[#2e3352]/50 pb-2 flex items-center gap-1.5">
            <Flag size={13} className="text-[#f5a623]" /> Distribución por prioridad
          </h2>
          <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
            <div className="relative w-28 h-28 rounded-full flex-shrink-0" style={{background:priDonut}}>
              <div className="absolute rounded-full bg-[#1a1d27] flex flex-col items-center justify-center" style={{top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:44,height:44}}>
                <span className="text-sm font-black">{priTotal}</span>
                <span className="text-[7px] text-[#8b93b8]">tareas</span>
              </div>
            </div>
            <div className="space-y-3 flex-1">
              {[
                {label:"Crítica",count:priCounts.critica,color:"#ff5c5c"},
                {label:"Alta",   count:priCounts.alta,   color:"#f5a623"},
                {label:"Media",  count:priCounts.media,  color:"#4f7cff"},
                {label:"Baja",   count:priCounts.baja,   color:"#3ecf8e"},
              ].map(row => {
                const w = priTotal ? Math.round((row.count/priTotal)*100) : 0;
                return (
                  <div key={row.label}>
                    <div className="flex justify-between text-xs mb-1"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{background:row.color}}/><span className="text-[#8b93b8]">{row.label}</span></div><span className="font-semibold">{row.count} ({w}%)</span></div>
                    <div className="h-1.5 bg-[#11151f] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${w}%`,background:row.color}}/></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* FILA 5 — Tareas por persona + Vencidas por persona */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Tareas por persona */}
        <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 shadow-xl print-card">
          <h2 className="text-xs font-bold uppercase tracking-wider mb-4 border-b border-[#2e3352]/50 pb-2 flex items-center gap-1.5">
            <Users size={13} className="text-[#4f7cff]" /> Tareas asignadas por persona
          </h2>
          {tasksByUser.length === 0
            ? <p className="text-[10px] text-[#8b93b8] italic mt-4">Sin tareas asignadas.</p>
            : <div className="space-y-3 mt-2">
                {tasksByUser.map(r => {
                  const barPct = Math.round((r.total/maxUserTasks)*100);
                  const donePct2 = r.total ? Math.round((r.done/r.total)*100) : 0;
                  return (
                    <div key={r.user.id}>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold" style={{background:r.user.color}}>{r.user.initials}</div><span className="font-semibold truncate max-w-[130px]">{r.user.name}</span></div>
                        <span className="text-[10px] text-[#8b93b8]">{r.done}/{r.total}</span>
                      </div>
                      <div className="h-4 bg-[#11151f] rounded-full overflow-hidden border border-[#2e3352]/20 relative">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#4f7cff]/60 to-[#4f7cff]" style={{width:`${barPct}%`}}/>
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#3ecf8e]/50 to-[#3ecf8e]" style={{width:`${Math.round(barPct*donePct2/100)}%`}}/>
                      </div>
                    </div>
                  );
                })}
                <div className="flex gap-4 mt-2 pt-2 border-t border-[#2e3352]/30">
                  <div className="flex items-center gap-1.5 text-[10px] text-[#8b93b8]"><div className="w-2.5 h-2 rounded bg-[#4f7cff]"/>Total</div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#8b93b8]"><div className="w-2.5 h-2 rounded bg-[#3ecf8e]"/>Completado</div>
                </div>
              </div>
          }
        </div>

        {/* Tareas vencidas por responsable */}
        <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 shadow-xl print-card">
          <h2 className="text-xs font-bold uppercase tracking-wider mb-4 border-b border-[#2e3352]/50 pb-2 flex items-center gap-1.5">
            <AlertTriangle size={13} className="text-[#ff5c5c]" /> Tareas vencidas por responsable
          </h2>
          {overdueByUser.length === 0
            ? <div className="flex flex-col items-center justify-center h-32 text-[#3ecf8e]">
                <CheckCircle size={28} className="mb-2 opacity-70"/>
                <p className="text-xs font-semibold">¡Sin tareas vencidas!</p>
                <p className="text-[10px] text-[#8b93b8] mt-1">Todas las tareas están al día.</p>
              </div>
            : <div className="space-y-3 mt-2">
                {overdueByUser.map(r => {
                  const barPct = Math.round((r.count/maxOverdue)*100);
                  return (
                    <div key={r.user.id}>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold" style={{background:r.user.color}}>{r.user.initials}</div><span className="font-semibold truncate max-w-[130px]">{r.user.name}</span></div>
                        <span className="text-[10px] font-bold text-[#ff5c5c]">{r.count} vencida{r.count>1?"s":""}</span>
                      </div>
                      <div className="h-4 bg-[#11151f] rounded-full overflow-hidden border border-[#ff5c5c]/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-red-800/70 to-[#ff5c5c]" style={{width:`${barPct}%`}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </div>

      </div>

      {/* FILA 6 — Horas por persona */}
      <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 shadow-xl print-card">
        <h2 className="text-xs font-bold uppercase tracking-wider mb-4 border-b border-[#2e3352]/50 pb-2 flex items-center gap-1.5">
          <TrendingUp size={13} className="text-[#7c5cfc]" /> Capacidad de horas por persona
        </h2>
        {hoursByUser.length === 0
          ? <p className="text-[10px] text-[#8b93b8] italic">Sin horas estimadas registradas.</p>
          : <div className="space-y-3">
              {hoursByUser.map(r => {
                const pctBar = Math.min(100, Math.round((r.estimated/r.limit)*100));
                return (
                  <div key={r.user.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{background:r.user.color}}/><span className="font-semibold">{r.user.name}</span><span className="text-[9px] text-[#8b93b8]">({r.user.role})</span></div>
                      <span className={`font-semibold ${r.overloaded?"text-[#ff5c5c]":"text-[#8b93b8]"}`}>{r.estimated}h / {r.limit}h ({pctBar}%)</span>
                    </div>
                    <div className="h-3 bg-[#11151f] rounded-full overflow-hidden border border-[#2e3352]/20 relative">
                      <div className={`h-full rounded-full transition-all ${r.overloaded?"bg-gradient-to-r from-red-600 to-rose-400":"bg-gradient-to-r from-[#4f7cff] to-[#7c5cfc]"}`} style={{width:`${pctBar}%`}}/>
                      {r.overloaded && <div className="absolute right-2 top-0 bottom-0 flex items-center text-[8px] font-black text-white">⚠ SOBRECARGA</div>}
                    </div>
                  </div>
                );
              })}
            </div>
        }
      </div>

      {/* FILA 7 — Roadmap */}
      <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 shadow-xl print-card">
        <h2 className="text-xs font-bold uppercase tracking-wider mb-4 border-b border-[#2e3352]/50 pb-2 flex items-center gap-1.5">
          <Target size={13} className="text-[#f5a623]" /> Roadmap estratégico de metas
        </h2>
        <div className="relative pl-5 border-l border-[#2e3352] space-y-5 py-2">
          {projMilestones.length === 0
            ? <p className="text-[10px] text-[#8b93b8] italic">Sin metas declaradas para este proyecto.</p>
            : projMilestones.map(ms => {
                const target   = new Date(ms.targetDate + "T00:00:00");
                const diffDays = Math.round((target.getTime() - nowMs) / 86400000);
                const isOverdue = diffDays < 0 && ms.status !== "achieved";
                const dotColor  = ms.status === "achieved" ? "#3ecf8e" : ms.status === "missed" ? "#ff5c5c" : isOverdue ? "#ff5c5c" : "#f5a623";
                const badge     = ms.status === "achieved" ? {text:"Logrado",bg:"#3ecf8e"} : ms.status === "missed" ? {text:"Fallido",bg:"#ff5c5c"} : {text:isOverdue?"Vencido":"Pendiente",bg:isOverdue?"#ff5c5c":"#f5a623"};
                const daysLabel = ms.status==="achieved" ? null : isOverdue ? `Vencido hace ${Math.abs(diffDays)} días` : diffDays===0 ? "Vence hoy" : `Faltan ${diffDays} días`;
                return (
                  <div key={ms.id} className="relative">
                    <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full border-2 border-[#1a1d27]" style={{background:dotColor}}/>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5 flex-1">
                        <span className="text-xs font-bold">{ms.name}</span>
                        <p className="text-[10px] text-[#8b93b8]">Límite: {target.toLocaleDateString("es-MX",{day:"2-digit",month:"short",year:"numeric"})}</p>
                        {ms.description && <p className="text-[10px] text-[#8b93b8] italic">"{ms.description}"</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white" style={{background:badge.bg+"cc"}}>{badge.text}</span>
                        {daysLabel && <span className="text-[9px] font-semibold" style={{color:isOverdue?"#ff5c5c":diffDays===0?"#f5a623":"#3ecf8e"}}>{daysLabel}</span>}
                      </div>
                    </div>
                  </div>
                );
              })
          }
        </div>
      </div>

      {/* Modal editar */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={() => setIsEditing(false)}>
          <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 w-96 max-w-[95vw] shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-4">Editar Proyecto</h3>
            <div className="space-y-3">
              <Field label="Nombre"><input className="bg-[#22263a] border border-[#2e3352] text-[#e8eaf6] rounded-lg px-3 py-1.5 text-xs w-full focus:outline-none focus:border-[#4f7cff]" value={editForm.name} onChange={e=>setEditForm(p=>({...p,name:e.target.value}))}/></Field>
              <Field label="Descripción"><textarea className="bg-[#22263a] border border-[#2e3352] text-[#e8eaf6] rounded-lg px-3 py-1.5 text-xs w-full focus:outline-none focus:border-[#4f7cff] resize-none" rows={3} value={editForm.description||""} onChange={e=>setEditForm(p=>({...p,description:e.target.value}))}/></Field>
              <div className="flex gap-2">
                <Field label="Inicio" className="flex-1"><input type="date" className="bg-[#22263a] border border-[#2e3352] text-[#e8eaf6] rounded-lg px-2 py-1.5 text-xs w-full focus:outline-none" value={editForm.startDate} onChange={e=>setEditForm(p=>({...p,startDate:e.target.value}))}/></Field>
                <Field label="Fin" className="flex-1"><input type="date" className="bg-[#22263a] border border-[#2e3352] text-[#e8eaf6] rounded-lg px-2 py-1.5 text-xs w-full focus:outline-none" value={editForm.endDate} onChange={e=>setEditForm(p=>({...p,endDate:e.target.value}))}/></Field>
              </div>
              <div className="flex gap-2">
                <Field label="Estado" className="flex-1">
                  <select className="bg-[#22263a] border border-[#2e3352] text-[#e8eaf6] rounded-lg px-2 py-1.5 text-xs w-full focus:outline-none" value={editForm.status} onChange={e=>setEditForm(p=>({...p,status:e.target.value as Project["status"]}))}>
                    <option value="planning">Planificación</option><option value="active">Activo</option><option value="completed">Completado</option><option value="on_hold">En Espera</option>
                  </select>
                </Field>
                <Field label="Propietario" className="flex-1">
                  <select className="bg-[#22263a] border border-[#2e3352] text-[#e8eaf6] rounded-lg px-2 py-1.5 text-xs w-full focus:outline-none" value={editForm.leaderId} onChange={e=>setEditForm(p=>({...p,leaderId:e.target.value}))}>
                    {users_Gantt.map(u=><option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                  </select>
                </Field>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button className="px-3 py-1.5 rounded-lg border border-[#2e3352] bg-[#22263a] text-xs font-medium hover:border-[#4f7cff] transition cursor-pointer" onClick={()=>setIsEditing(false)}>Cancelar</button>
              <button className="px-3 py-1.5 rounded-lg bg-[#4f7cff] text-white text-xs font-medium hover:bg-[#3a6be0] transition cursor-pointer" onClick={handleSaveProject}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({label,children,className=""}:{label:string;children:React.ReactNode;className?:string}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-[10px] text-[#8b93b8] uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}
