"use client";

import { useState, useEffect } from "react";
import { Printer, TrendingUp, DollarSign, Clock, Package, Milestone as StoneIcon, CheckCircle, AlertTriangle, User, Edit3 } from "lucide-react";
import { Task, Project, Milestone, AuthUser } from "@/types";

interface ReportsViewProps {
  Tasks_Gantt: Task[];
  Projects_Gantt: Project[];
  setProjects_Gantt: (Projects_Gantt: Project[] | ((prev: Project[]) => Project[])) => void;
  Milestones_Gantt: Milestone[];
  users_Gantt: AuthUser[];
  activeProjectId: string;
}

export default function ReportsView({
  Tasks_Gantt,
  Projects_Gantt,
  setProjects_Gantt,
  Milestones_Gantt,
  users_Gantt,
  activeProjectId,
}: ReportsViewProps) {
  const activeProj = Projects_Gantt.find((p) => p.id === activeProjectId) || Projects_Gantt[0] || {
    id: "proj1",
    name: "Royal Gantt Planner",
    description: "Gestión de proyectos con Gantt y recursos",
    startDate: "2026-05-01",
    endDate: "2026-08-31",
    status: "active",
    leaderId: "u1"
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Project>({
    id: "",
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    status: "active",
    leaderId: ""
  });

  useEffect(() => {
    if (activeProj) {
      setEditForm(activeProj);
    }
  }, [activeProj, isEditing]);

  function handleSaveProject() {
    if (!editForm.name.trim() || !editForm.startDate || !editForm.endDate) return;
    setProjects_Gantt((prev) => prev.map((p) => p.id === activeProj.id ? {
      ...p,
      name: editForm.name.trim(),
      description: editForm.description ? editForm.description.trim() : undefined,
      startDate: editForm.startDate,
      endDate: editForm.endDate,
      status: editForm.status,
      leaderId: editForm.leaderId,
    } : p));
    setIsEditing(false);
  }

  // Filtrar tareas y metas de este proyecto
  const projTasks = Tasks_Gantt.filter(t => t.projectId === activeProj.id || !t.projectId);
  const projMilestones_Gantt = Milestones_Gantt.filter(m => m.projectId === activeProj.id);

  // Cálculos dinámicos de tareas
  const totalTasksCount = projTasks.length;
  const doneTasks = projTasks.filter(t => t.status === "done");
  const inProgTasks = projTasks.filter(t => t.status === "in_progress");
  const reviewTasks = projTasks.filter(t => t.status === "review");
  const blockedTasks = projTasks.filter(t => t.status === "blocked");
  const openTasks = projTasks.filter(t => t.status === "open");

  const completionRate = totalTasksCount ? Math.round((doneTasks.length / totalTasksCount) * 100) : 0;
  const avgProgress = totalTasksCount ? Math.round(projTasks.reduce((sum, t) => sum + (t.progress || 0), 0) / totalTasksCount) : 0;

  // Estatus de tareas para Gráfico de Dona
  const openCount = openTasks.length;
  const inProgCount = inProgTasks.length;
  const reviewCount = reviewTasks.length;
  const doneCount = doneTasks.length;
  const blockedCount = blockedTasks.length;

  const openPct = totalTasksCount ? Math.round((openCount / totalTasksCount) * 100) : 0;
  const inProgPct = totalTasksCount ? Math.round((inProgCount / totalTasksCount) * 100) : 0;
  const reviewPct = totalTasksCount ? Math.round((reviewCount / totalTasksCount) * 100) : 0;
  const donePct = totalTasksCount ? Math.round((doneCount / totalTasksCount) * 100) : 0;
  const blockedPct = totalTasksCount ? 100 - openPct - inProgPct - reviewPct - donePct : 0;

  const openDeg = totalTasksCount ? (openCount / totalTasksCount) * 360 : 0;
  const inProgDeg = totalTasksCount ? (inProgCount / totalTasksCount) * 360 : 0;
  const reviewDeg = totalTasksCount ? (reviewCount / totalTasksCount) * 360 : 0;
  const doneDeg = totalTasksCount ? (doneCount / totalTasksCount) * 360 : 0;

  const d1 = openDeg;
  const d2 = d1 + inProgDeg;
  const d3 = d2 + reviewDeg;
  const d4 = d3 + doneDeg;

  const donutGradient = totalTasksCount > 0 
    ? `conic-gradient(#8b93b8 0deg ${d1}deg, #4f7cff ${d1}deg ${d2}deg, #f5a623 ${d2}deg ${d3}deg, #3ecf8e ${d3}deg ${d4}deg, #ff5c5c ${d4}deg 360deg)`
    : `conic-gradient(#2e3352 0deg 360deg)`;

  // Financiero
  const totalEstimatedBudget = projTasks.reduce((sum, t) => sum + (t.estimatedBudget || 0), 0);
  const totalActualCost = projTasks.reduce((sum, t) => sum + (t.actualCost || 0), 0);
  const budgetVariance = totalEstimatedBudget - totalActualCost;
  const isBudgetOverrun = budgetVariance < 0;

  // Horas
  const totalEstimatedHours = projTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
  const totalActualHours = projTasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);
  const hoursDeviation = totalActualHours - totalEstimatedHours;

  // Progreso Planificado vs Progreso Actual (Calendario)
  const now = new Date();
  let totalPlannedProgress = 0;
  projTasks.forEach(t => {
    try {
      const start = new Date(t.startDate + "T00:00:00").getTime();
      const end = new Date(t.endDate + "T00:00:00").getTime();
      const current = now.getTime();
      if (isNaN(start) || isNaN(end)) {
        totalPlannedProgress += t.progress;
      } else if (current >= end) {
        totalPlannedProgress += 100;
      } else if (current <= start) {
        totalPlannedProgress += 0;
      } else {
        totalPlannedProgress += Math.round(((current - start) / (end - start)) * 100);
      }
    } catch {
      totalPlannedProgress += t.progress;
    }
  });
  const avgPlannedProgress = totalTasksCount ? Math.round(totalPlannedProgress / totalTasksCount) : 0;
  const progressDiff = avgProgress - avgPlannedProgress; // Positivo es antelación (adelantado), negativo retraso

  // Miembros del equipo
  const leader = users_Gantt.find(u => u.id === activeProj.leaderId) || users_Gantt[0] || { name: "Sin Asignar", initials: "SA", color: "#8b93b8", role: "Project Manager" };
  const assignedUserIds = Array.from(new Set(projTasks.flatMap(t => t.assigneeIds && t.assigneeIds.length > 0 ? t.assigneeIds : [t.assigneeId]).filter(Boolean)));
  const teamMembers = users_Gantt.filter(u => assignedUserIds.includes(u.id));

  // Materiales asignados
  const materialAllocations: { material: string; taskTitle: string }[] = [];
  projTasks.forEach(t => {
    if (t.materials && t.materials.length > 0) {
      t.materials.forEach(m => {
        materialAllocations.push({ material: m, taskTitle: t.title });
      });
    }
  });

  // Hitos logrados vs pendientes
  const achievedMS = projMilestones_Gantt.filter(m => m.status === "achieved").length;

  // Escala para gráficos de barra vertical (Horas)
  const maxHours = Math.max(totalEstimatedHours, totalActualHours, 1);
  const hourSteps = [
    Math.round(maxHours),
    Math.round(maxHours * 0.75),
    Math.round(maxHours * 0.5),
    Math.round(maxHours * 0.25),
    0
  ];
  const estHoursPct = (totalEstimatedHours / maxHours) * 100;
  const actHoursPct = (totalActualHours / maxHours) * 100;
  const devHoursPct = (Math.abs(hoursDeviation) / maxHours) * 100;

  // Escala para gráficos de barra vertical (Presupuesto)
  const maxBudget = Math.max(totalEstimatedBudget, totalActualCost, 1);
  const budgetSteps = [
    Math.round(maxBudget),
    Math.round(maxBudget * 0.75),
    Math.round(maxBudget * 0.5),
    Math.round(maxBudget * 0.25),
    0
  ];
  const estBudgetPct = (totalEstimatedBudget / maxBudget) * 100;
  const actCostPct = (totalActualCost / maxBudget) * 100;
  const devCostPct = (Math.abs(budgetVariance) / maxBudget) * 100;

  return (
    <div className="h-full overflow-y-auto bg-[#0f1117] text-[#e8eaf6] p-6 space-y-6 print:bg-white print:text-black print:p-0">
      
      {/* Estilos CSS para Impresión */}
      <style jsx global>{`
        @media print {
          body, html {
            background: white !important;
            color: black !important;
          }
          header, nav, button, .no-print {
            display: none !important;
          }
          .print-card {
            border: 1px solid #ccc !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Header Dashboard */}
      <div className="flex items-center justify-between border-b border-[#2e3352]/50 pb-4 print:border-b-2 print:border-black">
        <div>
          <h1 className="text-xl font-bold text-[#e8eaf6] tracking-tight flex items-center gap-2 print:text-black">
            <TrendingUp size={22} className="text-[#7c5cfc] print:text-black" />
            Panel de Control y Analíticas de Proyecto
          </h1>
          <p className="text-xs text-[#8b93b8] mt-1 print:text-black">
            Informes detallados y desempeño del proyecto maestro en tiempo real.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="no-print flex items-center gap-1.5 px-3 py-1.5 bg-[#22263a] border border-[#2e3352] hover:border-[#4f7cff] rounded-lg text-xs font-medium text-[#e8eaf6] transition-all cursor-pointer"
        >
          <Printer size={14} /> Imprimir Reporte / Guardar PDF
        </button>
      </div>

      {/* ── SECCIÓN 1: Información sobre el proyecto y descripción ── */}
      <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 shadow-xl print-card">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#2e3352]/50">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-[#e8eaf6] uppercase tracking-wider print:text-black">
              Información sobre el proyecto y descripción
            </h2>
            <button
              onClick={() => setIsEditing(true)}
              className="no-print flex items-center gap-1 px-2 py-0.5 bg-[#22263a] border border-[#2e3352] hover:border-[#4f7cff] rounded text-[10px] font-semibold text-[#e8eaf6] transition cursor-pointer"
            >
              <Edit3 size={10} /> Editar
            </button>
          </div>
          <span className="text-[10px] bg-[#3ecf8e]/10 text-[#3ecf8e] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            {activeProj.status === "active" ? "Activo" : activeProj.status === "completed" ? "Completado" : activeProj.status === "planning" ? "Planificación" : "En Espera"}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Columna Izquierda: Descripción y Fechas */}
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
                <span className="font-semibold text-[#e8eaf6] print:text-black">
                  {new Date(activeProj.startDate + "T00:00:00").toLocaleDateString("es", { day: "2-digit", month: "long", year: "numeric" })}
                </span>
              </div>
              <div>
                <div className="text-[10px] text-[#8b93b8] uppercase tracking-wider mb-0.5">Fecha Final</div>
                <span className="font-semibold text-[#e8eaf6] print:text-black">
                  {new Date(activeProj.endDate + "T00:00:00").toLocaleDateString("es", { day: "2-digit", month: "long", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Propietario, Equipo y Progreso */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-6">
              <div>
                <div className="text-[10px] text-[#8b93b8] uppercase tracking-wider mb-1">Propietario del Proyecto</div>
                <div className="flex items-center gap-2">
                  {leader.imageUrl ? (
                    <img
                      src={leader.imageUrl}
                      alt={leader.name}
                      className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ background: leader.color }}
                    >
                      {leader.initials}
                    </div>
                  )}
                  <div>
                    <span className="font-semibold text-[#e8eaf6] block leading-tight">{leader.name}</span>
                    <span className="text-[9px] text-[#8b93b8]">{leader.role}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[10px] text-[#8b93b8] uppercase tracking-wider mb-1.5">Equipo ({teamMembers.length})</div>
                <div className="flex -space-x-2 overflow-hidden">
                  {teamMembers.map((m) => (
                    m.imageUrl ? (
                      <img
                        key={m.id}
                        src={m.imageUrl}
                        alt={m.name}
                        className="w-6 h-6 rounded-full border-2 border-[#1a1d27] object-cover flex-shrink-0"
                        title={`${m.name} (${m.role})`}
                      />
                    ) : (
                      <div
                        key={m.id}
                        className="w-6 h-6 rounded-full border-2 border-[#1a1d27] flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0"
                        style={{ background: m.color }}
                        title={`${m.name} (${m.role})`}
                      >
                        {m.initials}
                      </div>
                    )
                  ))}
                  {teamMembers.length === 0 && (
                    <span className="text-[10px] text-[#8b93b8] italic">Sin asignar</span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-[10px] text-[#8b93b8] uppercase tracking-wider mb-1">
                <span>Progreso General</span>
                <span className="font-bold text-[#e8eaf6]">{avgProgress}%</span>
              </div>
              <div className="h-4 bg-[#11151f] rounded-full overflow-hidden border border-[#2e3352]/50 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#4f7cff] to-[#7c5cfc] transition-all duration-300"
                  style={{ width: `${avgProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-[#8b93b8] mt-1">
                <span>Último cambio: {new Date().toLocaleDateString("es-MX")}</span>
                <span>{completionRate}% de tareas listas</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECCIÓN 2: Tareas y Tiempo en tareas (Dashboard Fila 1) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card: Tareas (Donut Chart) */}
        <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 shadow-xl flex flex-col justify-between print-card">
          <div>
            <h2 className="text-xs font-bold text-[#e8eaf6] uppercase tracking-wider mb-4 border-b border-[#2e3352]/50 pb-2 print:text-black">
              Tareas
            </h2>
            
            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4">
              {/* Conic Gradient Donut */}
              <div className="relative w-36 h-36 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: donutGradient }}>
                <div className="absolute w-24 h-24 rounded-full bg-[#1a1d27] flex flex-col items-center justify-center print:bg-white">
                  <span className="text-2xl font-black text-[#e8eaf6] print:text-black">{totalTasksCount}</span>
                  <span className="text-[9px] text-[#8b93b8] uppercase font-bold tracking-wider">Tareas Totales</span>
                </div>
              </div>

              {/* Leyenda y Estadísticas */}
              <div className="space-y-2.5 w-full max-w-[200px]">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded bg-[#8b93b8]" />
                    <span className="text-[#8b93b8]">Iniciado</span>
                  </div>
                  <span className="font-semibold text-[#e8eaf6] print:text-black">{openCount} ({openPct}%)</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded bg-[#4f7cff]" />
                    <span className="text-[#4f7cff]">En desarrollo</span>
                  </div>
                  <span className="font-semibold text-[#e8eaf6] print:text-black">{inProgCount} ({inProgPct}%)</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded bg-[#f5a623]" />
                    <span className="text-[#f5a623]">En revisión</span>
                  </div>
                  <span className="font-semibold text-[#e8eaf6] print:text-black">{reviewCount} ({reviewPct}%)</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded bg-[#3ecf8e]" />
                    <span className="text-[#3ecf8e]">Terminado</span>
                  </div>
                  <span className="font-semibold text-[#e8eaf6] print:text-black">{doneCount} ({donePct}%)</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded bg-[#ff5c5c]" />
                    <span className="text-[#ff5c5c]">Bloqueado</span>
                  </div>
                  <span className="font-semibold text-[#e8eaf6] print:text-black">{blockedCount} ({blockedPct}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card: Tiempo en tareas (Bar Chart) */}
        <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 shadow-xl flex flex-col justify-between print-card">
          <div>
            <div className="flex justify-between items-center mb-4 border-b border-[#2e3352]/50 pb-2">
              <h2 className="text-xs font-bold text-[#e8eaf6] uppercase tracking-wider print:text-black">
                Tiempo en tareas
              </h2>
              <span className="text-[9px] bg-[#22263a] border border-[#2e3352] px-2 py-0.5 rounded text-[#8b93b8] font-bold">
                ACTUAL A PLANIFICADO
              </span>
            </div>

            <div className="flex h-40 gap-8 mt-6">
              {/* Eje Y de Horas */}
              <div className="flex flex-col justify-between text-[9px] text-[#8b93b8] h-full text-right w-8 select-none">
                {hourSteps.map((s, idx) => (
                  <div key={idx}>{s}h</div>
                ))}
              </div>

              {/* Grid de Columnas */}
              <div className="flex-1 flex justify-around items-end h-full border-b border-[#2e3352] relative px-4">
                {/* Gridlines horizontales */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-full border-t border-[#2e3352]/20" />
                  ))}
                </div>

                {/* Columna 1: Estimación Total */}
                <div className="flex flex-col items-center w-12 group z-10">
                  <div className="text-[10px] font-bold text-[#e8eaf6] mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {totalEstimatedHours}h
                  </div>
                  <div className="h-24 w-8 flex items-end">
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-[#4f7cff]/40 to-[#4f7cff] hover:brightness-110 transition-all duration-300"
                      style={{ height: `${estHoursPct}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-[#8b93b8] mt-2 whitespace-nowrap text-center">Estimación total</div>
                </div>

                {/* Columna 2: Tiempo Real Registrado */}
                <div className="flex flex-col items-center w-12 group z-10">
                  <div className="text-[10px] font-bold text-[#e8eaf6] mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {totalActualHours}h
                  </div>
                  <div className="h-24 w-8 flex items-end">
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-[#7c5cfc]/40 to-[#7c5cfc] hover:brightness-110 transition-all duration-300"
                      style={{ height: `${actHoursPct}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-[#8b93b8] mt-2 whitespace-nowrap text-center">Tiempo registrado</div>
                </div>

                {/* Columna 3: Desviación */}
                <div className="flex flex-col items-center w-12 group z-10">
                  <div className={`text-[10px] font-bold mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${hoursDeviation > 0 ? "text-[#ff5c5c]" : "text-[#3ecf8e]"}`}>
                    {hoursDeviation > 0 ? `+${hoursDeviation}` : hoursDeviation}h
                  </div>
                  <div className="h-24 w-8 flex items-end">
                    <div
                      className={`w-full rounded-t hover:brightness-110 transition-all duration-300 ${
                        hoursDeviation > 0 
                          ? "bg-gradient-to-t from-[#ff5c5c]/40 to-[#ff5c5c]" 
                          : hoursDeviation < 0 
                            ? "bg-gradient-to-t from-[#3ecf8e]/40 to-[#3ecf8e]" 
                            : "bg-transparent border border-dashed border-[#2e3352]"
                      }`}
                      style={{ height: `${devHoursPct}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-[#8b93b8] mt-2 whitespace-nowrap text-center">Desviación</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── SECCIÓN 3: Calendario y Presupuesto (Dashboard Fila 2) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card: Línea de tiempo de avance (SVG) */}
        <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 shadow-xl flex flex-col print-card">
          <div className="flex justify-between items-center mb-4 border-b border-[#2e3352]/50 pb-2">
            <h2 className="text-xs font-bold text-[#e8eaf6] uppercase tracking-wider print:text-black">
              Avance semanal
            </h2>
            <span className="text-[9px] bg-[#22263a] border border-[#2e3352] px-2 py-0.5 rounded text-[#8b93b8] font-bold">
              REAL VS IDEAL
            </span>
          </div>
          {(() => {
            const W = 360; const H = 140;
            const PAD = { t: 12, r: 16, b: 28, l: 28 };
            const cW = W - PAD.l - PAD.r;
            const cH = H - PAD.t - PAD.b;
            const projStart = new Date(activeProj.startDate + "T00:00:00").getTime();
            const projEnd   = new Date(activeProj.endDate   + "T00:00:00").getTime();
            const span = projEnd - projStart || 1;
            const WEEK = 7 * 24 * 60 * 60 * 1000;
            const weeks = Math.max(2, Math.ceil(span / WEEK));
            const nowMs = now.getTime();

            const idealPts: string[] = [];
            const actualPts: string[] = [];

            for (let i = 0; i <= weeks; i++) {
              const t = projStart + (span / weeks) * i;
              const xPct = (t - projStart) / span;
              const x = PAD.l + xPct * cW;
              // Ideal: 0→100 lineal
              const idealY = PAD.t + (1 - i / weeks) * cH;
              idealPts.push(`${x},${idealY}`);
              // Real: sólo hasta hoy
              if (t <= nowMs + WEEK) {
                const snapshot = projTasks.length
                  ? projTasks.reduce((s, task) => {
                      try {
                        const end = new Date(task.endDate + "T00:00:00").getTime();
                        if (task.status === "done" && end <= t) return s + 100;
                        if (t >= end) return s + (task.progress || 0);
                        const start = new Date(task.startDate + "T00:00:00").getTime();
                        if (t < start) return s;
                        return s + Math.round(((t - start) / (end - start)) * (task.progress || 0));
                      } catch { return s + (task.progress || 0); }
                    }, 0) / projTasks.length
                  : 0;
                const actualY = PAD.t + (1 - snapshot / 100) * cH;
                actualPts.push(`${x},${actualY}`);
              }
            }

            const nowX = PAD.l + Math.min(1, Math.max(0, (nowMs - projStart) / span)) * cW;
            const yLabels = [100, 75, 50, 25, 0];

            return (
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
                {/* Grid + etiquetas Y */}
                {yLabels.map((v, i) => {
                  const y = PAD.t + (i / 4) * cH;
                  return (
                    <g key={v}>
                      <line x1={PAD.l} y1={y} x2={PAD.l + cW} y2={y} stroke="#2e3352" strokeWidth={0.5} strokeDasharray="3 3" />
                      <text x={PAD.l - 4} y={y + 3} fill="#8b93b8" fontSize={7} textAnchor="end">{v}%</text>
                    </g>
                  );
                })}
                {/* Ejes */}
                <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + cH} stroke="#2e3352" strokeWidth={1} />
                <line x1={PAD.l} y1={PAD.t + cH} x2={PAD.l + cW} y2={PAD.t + cH} stroke="#2e3352" strokeWidth={1} />
                {/* Hoy */}
                {nowMs >= projStart && nowMs <= projEnd && (
                  <line x1={nowX} y1={PAD.t} x2={nowX} y2={PAD.t + cH} stroke="#f5a623" strokeWidth={1} strokeDasharray="4 2" />
                )}
                {/* Área relleno ideal */}
                <polyline points={idealPts.join(" ")} fill="none" stroke="#4f7cff" strokeWidth={1.5} strokeDasharray="5 3" strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
                {/* Área relleno real */}
                {actualPts.length > 1 && (
                  <polyline points={actualPts.join(" ")} fill="none" stroke="#3ecf8e" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                )}
                {/* Puntos de datos reales */}
                {actualPts.map((pt, i) => {
                  const [px, py] = pt.split(",").map(Number);
                  return <circle key={i} cx={px} cy={py} r={2.5} fill="#3ecf8e" />;
                })}
                {/* Leyenda */}
                <line x1={PAD.l + cW - 110} y1={PAD.t + 4} x2={PAD.l + cW - 96} y2={PAD.t + 4} stroke="#4f7cff" strokeWidth={1.5} strokeDasharray="4 2" />
                <text x={PAD.l + cW - 93} y={PAD.t + 7} fill="#4f7cff" fontSize={7}>Ideal</text>
                <line x1={PAD.l + cW - 60} y1={PAD.t + 4} x2={PAD.l + cW - 46} y2={PAD.t + 4} stroke="#3ecf8e" strokeWidth={2} />
                <text x={PAD.l + cW - 43} y={PAD.t + 7} fill="#3ecf8e" fontSize={7}>Real</text>
                {/* Fechas X */}
                {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
                  const d = new Date(projStart + span * f);
                  return <text key={i} x={PAD.l + f * cW} y={H - 4} fill="#8b93b8" fontSize={6.5} textAnchor="middle">{d.toLocaleDateString("es-MX", { month: "short", day: "2-digit" })}</text>;
                })}
              </svg>
            );
          })()}
          <div className="flex gap-4 mt-2 text-[9px] text-[#8b93b8]">
            <span>🟦 Línea ideal = progreso esperado por tiempo transcurrido</span>
          </div>
        </div>

        {/* Card: Presupuesto (Vertical Bar Chart) */}
        <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 shadow-xl flex flex-col justify-between print-card">
          <div>
            <div className="flex justify-between items-center mb-4 border-b border-[#2e3352]/50 pb-2">
              <h2 className="text-xs font-bold text-[#e8eaf6] uppercase tracking-wider print:text-black">
                Presupuesto
              </h2>
              <span className="text-[9px] bg-[#22263a] border border-[#2e3352] px-2 py-0.5 rounded text-[#8b93b8] font-bold">
                ACTUAL A PLANIFICADO
              </span>
            </div>

            <div className="flex h-40 gap-8 mt-6">
              {/* Eje Y de Dinero */}
              <div className="flex flex-col justify-between text-[9px] text-[#8b93b8] h-full text-right w-10 select-none">
                {budgetSteps.map((s, idx) => (
                  <div key={idx} className="truncate">${s >= 1000 ? `${(s / 1000).toFixed(0)}k` : s}</div>
                ))}
              </div>

              {/* Grid de Columnas */}
              <div className="flex-1 flex justify-around items-end h-full border-b border-[#2e3352] relative px-4">
                {/* Gridlines horizontales */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-full border-t border-[#2e3352]/20" />
                  ))}
                </div>

                {/* Columna 1: Presupuesto Estimado */}
                <div className="flex flex-col items-center w-12 group z-10">
                  <div className="text-[10px] font-bold text-[#e8eaf6] mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    ${totalEstimatedBudget.toLocaleString()}
                  </div>
                  <div className="h-24 w-8 flex items-end">
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-emerald-600/40 to-emerald-500 hover:brightness-110 transition-all duration-300"
                      style={{ height: `${estBudgetPct}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-[#8b93b8] mt-2 whitespace-nowrap text-center">Presupuesto</div>
                </div>

                {/* Columna 2: Costo Real */}
                <div className="flex flex-col items-center w-12 group z-10">
                  <div className="text-[10px] font-bold text-[#e8eaf6] mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    ${totalActualCost.toLocaleString()}
                  </div>
                  <div className="h-24 w-8 flex items-end">
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-[#4f7cff]/40 to-[#4f7cff] hover:brightness-110 transition-all duration-300"
                      style={{ height: `${actCostPct}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-[#8b93b8] mt-2 whitespace-nowrap text-center">Costo real</div>
                </div>

                {/* Columna 3: Desviación */}
                <div className="flex flex-col items-center w-12 group z-10">
                  <div className={`text-[10px] font-bold mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${budgetVariance < 0 ? "text-[#ff5c5c]" : "text-[#3ecf8e]"}`}>
                    {budgetVariance < 0 ? `-$${Math.abs(budgetVariance).toLocaleString()}` : `+$${budgetVariance.toLocaleString()}`}
                  </div>
                  <div className="h-24 w-8 flex items-end">
                    <div
                      className={`w-full rounded-t hover:brightness-110 transition-all duration-300 ${
                        budgetVariance < 0 
                          ? "bg-gradient-to-t from-[#ff5c5c]/40 to-[#ff5c5c]" 
                          : budgetVariance > 0 
                            ? "bg-gradient-to-t from-[#3ecf8e]/40 to-[#3ecf8e]" 
                            : "bg-transparent border border-dashed border-[#2e3352]"
                      }`}
                      style={{ height: `${devCostPct}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-[#8b93b8] mt-2 whitespace-nowrap text-center">Desviación</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── SECCIÓN 4: Recursos y Materiales (Dashboard Fila 3) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Carga de tareas activas por persona */}
        <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 print-card">
          <h2 className="text-xs font-bold text-[#e8eaf6] uppercase tracking-wider mb-4 border-b border-[#2e3352]/50 pb-2 flex items-center gap-1.5 print:text-black">
            <User size={14} className="text-[#4f7cff] print:text-black" />
            Carga activa por persona
          </h2>
          {(() => {
            const activeStatuses = ["in_progress", "review"] as const;
            const rows = users_Gantt.map(u => {
              const active  = projTasks.filter(t => (t.assigneeId === u.id || t.assigneeIds?.includes(u.id)) && activeStatuses.includes(t.status as any));
              const inProg  = active.filter(t => t.status === "in_progress").length;
              const inRev   = active.filter(t => t.status === "review").length;
              return { u, total: active.length, inProg, inRev };
            }).filter(r => r.total > 0).sort((a, b) => b.total - a.total);

            const maxActive = Math.max(...rows.map(r => r.total), 1);

            if (rows.length === 0) return (
              <p className="text-[10px] text-[#8b93b8] italic">Ningún miembro tiene tareas activas en este momento.</p>
            );

            return (
              <div className="space-y-3">
                {rows.map(({ u, total, inProg, inRev }) => {
                  const barW = Math.round((total / maxActive) * 100);
                  const inProgW = Math.round((inProg / maxActive) * 100);
                  const inRevW  = Math.round((inRev  / maxActive) * 100);
                  return (
                    <div key={u.id} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: u.color }} />
                          <span className="font-semibold text-[#e8eaf6]">{u.name}</span>
                          <span className="text-[9px] text-[#8b93b8]">({u.role})</span>
                        </div>
                        <div className="flex items-center gap-2 text-[9px]">
                          <span className="text-[#4f7cff] font-semibold">{inProg} desar.</span>
                          <span className="text-[#f5a623] font-semibold">{inRev} rev.</span>
                          <span className="text-[#e8eaf6] font-bold">{total} total</span>
                        </div>
                      </div>
                      <div className="h-3 bg-[#11151f] rounded-full overflow-hidden border border-[#2e3352]/20 flex">
                        <div className="h-full bg-gradient-to-r from-[#4f7cff]/80 to-[#4f7cff] transition-all" style={{ width: `${inProgW}%` }} />
                        <div className="h-full bg-gradient-to-r from-[#f5a623]/80 to-[#f5a623] transition-all" style={{ width: `${inRevW}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="flex gap-4 mt-1 pt-2 border-t border-[#2e3352]/30">
                  <div className="flex items-center gap-1.5 text-[9px] text-[#8b93b8]"><div className="w-2.5 h-2 rounded bg-[#4f7cff]" /> En desarrollo</div>
                  <div className="flex items-center gap-1.5 text-[9px] text-[#8b93b8]"><div className="w-2.5 h-2 rounded bg-[#f5a623]" /> En revisión</div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Recursos Materiales e Infraestructura */}
        <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 print-card">
          <h2 className="text-xs font-bold text-[#e8eaf6] uppercase tracking-wider mb-4 border-b border-[#2e3352]/50 pb-2 flex items-center gap-1.5 print:text-black">
            <Package size={14} className="text-[#e879f9] print:text-black" />
            Inventario de Recursos Materiales
          </h2>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {materialAllocations.length === 0 ? (
              <p className="text-[10px] text-[#8b93b8] italic">
                No hay recursos materiales (equipamiento, licencias, etc.) asignados a las tareas de este proyecto.
              </p>
            ) : (
              materialAllocations.map((alloc, idx) => (
                <div key={idx} className="flex justify-between items-start gap-2 bg-[#22263a] border border-[#2e3352]/50 rounded-lg p-2 hover:border-[#e879f9]/30 transition">
                  <div className="flex items-center gap-2">
                    <Package size={13} className="text-[#e879f9]" />
                    <span className="text-xs font-bold">{alloc.material}</span>
                  </div>
                  <span className="text-[9px] text-[#8b93b8] text-right truncate max-w-[120px]" title={alloc.taskTitle}>
                    {alloc.taskTitle}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ── SECCIÓN 5: Timeline horizontal de hitos ── */}
      <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 shadow-xl print-card">
        <h2 className="text-xs font-bold text-[#e8eaf6] uppercase tracking-wider mb-4 border-b border-[#2e3352]/50 pb-2 flex items-center gap-1.5 print:text-black">
          <StoneIcon size={14} className="text-[#f5a623] print:text-black" />
          Timeline de metas del proyecto
        </h2>

        {projMilestones_Gantt.length === 0 ? (
          <p className="text-[10px] text-[#8b93b8] italic">No hay metas declaradas para este proyecto.</p>
        ) : (() => {
          const projStart = new Date(activeProj.startDate + "T00:00:00").getTime();
          const projEnd   = new Date(activeProj.endDate   + "T00:00:00").getTime();
          const span      = projEnd - projStart || 1;
          const nowPct    = Math.min(100, Math.max(0, ((now.getTime() - projStart) / span) * 100));

          const msWithPct = projMilestones_Gantt.map(ms => {
            const t = new Date(ms.targetDate + "T00:00:00").getTime();
            const pct = Math.min(100, Math.max(0, ((t - projStart) / span) * 100));
            const color = ms.status === "achieved" ? "#3ecf8e" : ms.status === "missed" ? "#ff5c5c" : "#f5a623";
            const label = ms.status === "achieved" ? "Logrado" : ms.status === "missed" ? "Fallido" : "Pendiente";
            return { ...ms, pct, color, label };
          });

          return (
            <div className="space-y-6 py-2">
              {/* Barra del timeline */}
              <div className="relative mx-4">
                {/* Carril base */}
                <div className="h-1.5 bg-[#2e3352] rounded-full relative">
                  {/* Progreso actual hasta hoy */}
                  <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#4f7cff] to-[#7c5cfc] rounded-full"
                    style={{ width: `${nowPct}%` }}
                  />
                  {/* Marcador de hoy */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#f5a623] border-2 border-[#1a1d27] z-10"
                    style={{ left: `${nowPct}%`, transform: "translate(-50%, -50%)" }}
                    title="Hoy"
                  />
                  {/* Puntos de hitos */}
                  {msWithPct.map((ms, idx) => (
                    <div
                      key={ms.id}
                      className="absolute top-1/2 z-20"
                      style={{ left: `${ms.pct}%`, transform: "translate(-50%, -50%)" }}
                    >
                      <div
                        className="w-4 h-4 rounded-full border-2 border-[#1a1d27] shadow-lg"
                        style={{ background: ms.color }}
                        title={ms.name}
                      />
                    </div>
                  ))}
                </div>

                {/* Etiquetas de inicio y fin */}
                <div className="flex justify-between text-[9px] text-[#8b93b8] mt-2">
                  <span>{new Date(activeProj.startDate + "T00:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}</span>
                  <span className="text-[#f5a623] font-semibold">HOY</span>
                  <span>{new Date(activeProj.endDate + "T00:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}</span>
                </div>
              </div>

              {/* Lista de hitos con detalle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {msWithPct.map(ms => {
                  const diffDays = Math.round((new Date(ms.targetDate + "T00:00:00").getTime() - now.getTime()) / 86400000);
                  const daysLabel = ms.status === "achieved" ? "✓ Completado"
                    : diffDays < 0  ? `Vencido hace ${Math.abs(diffDays)} días`
                    : diffDays === 0 ? "Vence hoy"
                    : `Faltan ${diffDays} días`;
                  return (
                    <div key={ms.id} className="flex items-start gap-3 bg-[#11151f] rounded-lg p-3 border border-[#2e3352]/40">
                      <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ background: ms.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#e8eaf6] truncate">{ms.name}</span>
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase flex-shrink-0" style={{ background: ms.color + "22", color: ms.color }}>{ms.label}</span>
                        </div>
                        <p className="text-[9px] text-[#8b93b8] mt-0.5">{new Date(ms.targetDate + "T00:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}</p>
                        <p className="text-[9px] font-semibold mt-0.5" style={{ color: ms.status === "achieved" ? "#3ecf8e" : diffDays < 0 ? "#ff5c5c" : diffDays === 0 ? "#f5a623" : "#8b93b8" }}>{daysLabel}</p>
                        {ms.description && <p className="text-[9px] text-[#8b93b8] italic mt-0.5 truncate">"{ms.description}"</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Modal para editar proyecto maestro */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={() => setIsEditing(false)}>
          <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 w-85 max-w-[95vw] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-4">Editar Proyecto Maestro</h3>
            <div className="space-y-3">
              <Field label="Nombre del Proyecto">
                <input
                  className="bg-[#22263a] border border-[#2e3352] text-[#e8eaf6] rounded-lg px-3 py-1.5 text-xs w-full focus:outline-none focus:border-[#4f7cff] focus:bg-[#1e2235]"
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                />
              </Field>
              <Field label="Descripción">
                <textarea
                  className="bg-[#22263a] border border-[#2e3352] text-[#e8eaf6] rounded-lg px-3 py-1.5 text-xs w-full focus:outline-none focus:border-[#4f7cff] focus:bg-[#1e2235] resize-none"
                  rows={3}
                  value={editForm.description || ""}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                />
              </Field>
              <div className="flex gap-2">
                <Field label="Fecha Inicio" className="flex-1">
                  <input
                    type="date"
                    className="bg-[#22263a] border border-[#2e3352] text-[#e8eaf6] rounded-lg px-2 py-1.5 text-xs w-full focus:outline-none focus:bg-[#1e2235]"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm((p) => ({ ...p, startDate: e.target.value }))}
                  />
                </Field>
                <Field label="Fecha Fin" className="flex-1">
                  <input
                    type="date"
                    className="bg-[#22263a] border border-[#2e3352] text-[#e8eaf6] rounded-lg px-2 py-1.5 text-xs w-full focus:outline-none focus:bg-[#1e2235]"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm((p) => ({ ...p, endDate: e.target.value }))}
                  />
                </Field>
              </div>
              <div className="flex gap-2">
                <Field label="Estado" className="flex-1">
                  <select
                    className="bg-[#22263a] border border-[#2e3352] text-[#e8eaf6] rounded-lg px-2 py-1.5 text-xs w-full focus:outline-none focus:bg-[#1e2235]"
                    value={editForm.status}
                    onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value as any }))}
                  >
                    <option value="planning">Planificación</option>
                    <option value="active">Activo</option>
                    <option value="completed">Completado</option>
                    <option value="on_hold">En Espera</option>
                  </select>
                </Field>
                <Field label="Propietario / Líder" className="flex-1">
                  <select
                    className="bg-[#22263a] border border-[#2e3352] text-[#e8eaf6] rounded-lg px-2 py-1.5 text-xs w-full focus:outline-none focus:bg-[#1e2235]"
                    value={editForm.leaderId}
                    onChange={(e) => setEditForm((p) => ({ ...p, leaderId: e.target.value }))}
                  >
                    {users_Gantt.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button
                className="px-3 py-1.5 rounded-lg border border-[#2e3352] bg-[#22263a] text-[#e8eaf6] text-xs font-medium hover:border-[#4f7cff] transition-all cursor-pointer"
                onClick={() => setIsEditing(false)}
              >
                Cancelar
              </button>
              <button
                className="px-3 py-1.5 rounded-lg bg-[#4f7cff] text-white text-xs font-medium hover:bg-[#3a6be0] transition-all cursor-pointer"
                onClick={handleSaveProject}
              >
                Guardar Cambios
              </button>
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
