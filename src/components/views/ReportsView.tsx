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
        
        {/* Card: Calendario (Horizontal Bar Chart) */}
        <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 shadow-xl flex flex-col justify-between print-card">
          <div>
            <div className="flex justify-between items-center mb-4 border-b border-[#2e3352]/50 pb-2">
              <h2 className="text-xs font-bold text-[#e8eaf6] uppercase tracking-wider print:text-black">
                Calendario
              </h2>
              <span className="text-[9px] bg-[#22263a] border border-[#2e3352] px-2 py-0.5 rounded text-[#8b93b8] font-bold">
                ACTUAL A PLANIFICADO
              </span>
            </div>

            <div className="space-y-6 py-4">
              {/* Eje X de porcentajes (-100 a +100) */}
              <div className="relative">
                <div className="flex justify-between text-[8px] text-[#8b93b8] px-2 border-b border-[#2e3352]/30 pb-1">
                  <span>-100</span>
                  <span>-75</span>
                  <span>-50</span>
                  <span>-25</span>
                  <span className="text-[#e8eaf6] font-bold">0</span>
                  <span>25</span>
                  <span>50</span>
                  <span>75</span>
                  <span>100</span>
                </div>
                {/* Eje central vertical cero */}
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/30 border-l border-dashed border-white/20 pointer-events-none h-32" />

                {/* Contenedor de las barras horizontales */}
                <div className="space-y-4 pt-3 relative z-10">
                  {/* Barra 1: Progreso Planificado */}
                  <div className="flex items-center text-xs">
                    <span className="w-28 text-right pr-3 text-[#8b93b8] font-semibold text-[10px]">Progreso planificado</span>
                    <div className="flex-1 bg-[#11151f] h-5 rounded overflow-hidden relative border border-[#2e3352]/20">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600/70 to-blue-500 rounded-r"
                        style={{
                          width: `${avgPlannedProgress / 2}%`,
                          marginLeft: "50%"
                        }}
                      />
                      <span className="absolute left-[52%] top-1/2 -translate-y-1/2 text-[9px] font-bold text-white">{avgPlannedProgress}%</span>
                    </div>
                  </div>

                  {/* Barra 2: Progreso Actual */}
                  <div className="flex items-center text-xs">
                    <span className="w-28 text-right pr-3 text-[#8b93b8] font-semibold text-[10px]">Progreso actual</span>
                    <div className="flex-1 bg-[#11151f] h-5 rounded overflow-hidden relative border border-[#2e3352]/20">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-600/70 to-emerald-500 rounded-r"
                        style={{
                          width: `${avgProgress / 2}%`,
                          marginLeft: "50%"
                        }}
                      />
                      <span className="absolute left-[52%] top-1/2 -translate-y-1/2 text-[9px] font-bold text-white">{avgProgress}%</span>
                    </div>
                  </div>

                  {/* Barra 3: Antelación (Adelantado / Retrasado) */}
                  <div className="flex items-center text-xs">
                    <span className="w-28 text-right pr-3 text-[#8b93b8] font-semibold text-[10px]">Antelación</span>
                    <div className="flex-1 bg-[#11151f] h-5 rounded overflow-hidden relative border border-[#2e3352]/20">
                      {progressDiff >= 0 ? (
                        /* Adelantado - Barra va hacia la derecha */
                        <div
                          className="h-full bg-gradient-to-r from-[#f5a623]/80 to-[#f5a623] rounded-r"
                          style={{
                            width: `${Math.min(50, progressDiff / 2)}%`,
                            marginLeft: "50%"
                          }}
                        />
                      ) : (
                        /* Atrasado - Barra va hacia la izquierda */
                        <div
                          className="h-full bg-gradient-to-r from-red-600 to-rose-500 rounded-l"
                          style={{
                            width: `${Math.min(50, Math.abs(progressDiff) / 2)}%`,
                            marginLeft: `${50 - Math.min(50, Math.abs(progressDiff) / 2)}%`
                          }}
                        />
                      )}
                      <span className={`absolute top-1/2 -translate-y-1/2 text-[9px] font-bold ${progressDiff >= 0 ? "left-[52%] text-[#f5a623]" : "right-[52%] text-rose-500"}`}>
                        {progressDiff >= 0 ? `+${progressDiff}%` : `${progressDiff}%`}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
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
        
        {/* Distribución de Carga de Trabajo de Recursos */}
        <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 print-card">
          <h2 className="text-xs font-bold text-[#e8eaf6] uppercase tracking-wider mb-4 border-b border-[#2e3352]/50 pb-2 flex items-center gap-1.5 print:text-black">
            <Clock size={14} className="text-[#4f7cff] print:text-black" />
            Distribución de Horas y Capacidad por Recurso
          </h2>

          <div className="space-y-4">
            {users_Gantt.map(u => {
              const userTasks = projTasks.filter(t => (t.assigneeIds?.includes(u.id) || t.assigneeId === u.id) && t.status !== "done");
              const estimated = userTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
              const limit = u.availableHours || 40;
              const pct = Math.min(100, Math.round((estimated / limit) * 100));
              const isOverloaded = estimated > limit;

              return (
                <div key={u.id} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: u.color }} />
                      <span className="font-semibold text-[#e8eaf6]">{u.name}</span>
                      <span className="text-[9px] text-[#8b93b8]">({u.role})</span>
                    </div>
                    <span className={`font-semibold ${isOverloaded ? "text-[#ff5c5c]" : "text-[#8b93b8]"}`}>
                      {estimated}h / {limit}h ({pct}%)
                    </span>
                  </div>
                  <div className="h-3 bg-[#11151f] rounded-full overflow-hidden flex relative border border-[#2e3352]/20">
                    <div
                      className={`h-full rounded-full transition-all ${isOverloaded ? "bg-gradient-to-r from-red-600 to-rose-400" : "bg-gradient-to-r from-[#4f7cff] to-[#7c5cfc]"}`}
                      style={{ width: `${pct}%` }}
                    />
                    {isOverloaded && (
                      <div className="absolute right-3 top-0 bottom-0 flex items-center text-[8px] font-black text-[#e8eaf6] leading-none">
                        ⚠️ SOBRECARGA
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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

      {/* ── SECCIÓN 5: Roadmap Hitos (Dashboard Fila 4) ── */}
      <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 shadow-xl print-card">
        <h2 className="text-xs font-bold text-[#e8eaf6] uppercase tracking-wider mb-4 border-b border-[#2e3352]/50 pb-2 flex items-center gap-1.5 print:text-black">
          <StoneIcon size={14} className="text-[#f5a623] print:text-black" />
          Roadmap Estratégico de Metas
        </h2>

        <div className="relative pl-4 border-l border-[#2e3352] space-y-5 py-2">
          {projMilestones_Gantt.map(ms => {
            const colorMap = {
              pending: "bg-yellow-500",
              achieved: "bg-[#3ecf8e]",
              background: "bg-[#ff5c5c]", // Correct missing mapped key
              missed: "bg-[#ff5c5c]"
            };

            return (
              <div key={ms.id} className="relative">
                {/* Punto timeline */}
                <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-[#1a1d27] ${colorMap[ms.status]}`} />
                
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-[#e8eaf6] print:text-black">{ms.name}</span>
                    <span className={`text-[8px] font-bold px-1.5 rounded uppercase ${ms.status === "achieved" ? "bg-[#3ecf8e]/10 text-[#3ecf8e]" : ms.status === "missed" ? "bg-[#ff5c5c]/10 text-[#ff5c5c]" : "bg-yellow-500/10 text-yellow-500"}`}>
                      {ms.status === "achieved" ? "Listo" : ms.status === "missed" ? "Fallo" : "Pendiente"}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#8b93b8]">Fecha límite: {ms.targetDate}</p>
                  {ms.description && (
                    <p className="text-[10px] text-[#8b93b8] italic mt-1">"{ms.description}"</p>
                  )}
                </div>
              </div>
            );
          })}
          {projMilestones_Gantt.length === 0 && (
            <p className="text-[10px] text-[#8b93b8] italic">No hay metas declaradas para este proyecto.</p>
          )}
        </div>
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
