"use client";

import { useState } from "react";
import { Plus, Award, Calendar, AlertCircle, Trash2, CheckCircle2, Flag, Target } from "lucide-react";
import { Project, Milestone, Task } from "@/types";

interface ProjectHeaderProps {
  projects: Project[];
  setProjects: (p: Project[] | ((prev: Project[]) => Project[])) => void;
  milestones: Milestone[];
  setMilestones: (m: Milestone[] | ((prev: Milestone[]) => Milestone[])) => void;
  tasks: Task[];
}

export default function ProjectHeader({
  projects,
  setProjects,
  milestones,
  setMilestones,
  tasks,
}: ProjectHeaderProps) {
  const activeProj = projects[0] || {
    id: "proj1",
    name: "Royal Gantt Planner",
    description: "Gestión de proyectos con Gantt y recursos",
    startDate: "2026-05-01",
    endDate: "2026-08-31",
    status: "active",
    leaderId: "u1"
  };

  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMS, setNewMS] = useState({ name: "", targetDate: "", description: "" });

  // Calcular progreso promedio dinámico de las tareas
  const activeTasks = tasks.filter(t => t.projectId === activeProj.id || !t.projectId);
  const avgProgress = activeTasks.length
    ? Math.round(activeTasks.reduce((sum, t) => sum + (t.progress || 0), 0) / activeTasks.length)
    : 0;

  // Filtrar metas de este proyecto
  const projMilestones = milestones.filter(m => m.projectId === activeProj.id);

  function handleAddMilestone() {
    if (!newMS.name.trim() || !newMS.targetDate) return;
    const milestone: Milestone = {
      id: "ms" + Date.now(),
      projectId: activeProj.id,
      name: newMS.name.trim(),
      targetDate: newMS.targetDate,
      description: newMS.description.trim() || undefined,
      status: "pending",
    };
    setMilestones(prev => [...prev, milestone]);
    setNewMS({ name: "", targetDate: "", description: "" });
    setShowAddMilestone(false);
  }

  function handleRemoveMilestone(id: string) {
    setMilestones(prev => prev.filter(m => m.id !== id));
  }

  function toggleMilestoneStatus(id: string, current: Milestone["status"]) {
    const nextStatusMap: Record<Milestone["status"], Milestone["status"]> = {
      pending: "achieved",
      achieved: "missed",
      missed: "pending",
    };
    setMilestones(prev =>
      prev.map(m => (m.id === id ? { ...m, status: nextStatusMap[current] } : m))
    );
  }

  const statusLabel = {
    planning: "Planificación",
    active: "Activo",
    completed: "Completado",
    on_hold: "En Pausa",
  };

  return (
    <div className="bg-[#151821] border-b border-[#2e3352] p-4 flex flex-col gap-4 flex-shrink-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Información del Proyecto */}
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Target size={18} className="text-[#7c5cfc]" />
              {activeProj.name}
            </h2>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#4f7cff]/10 text-[#4f7cff] border border-[#4f7cff]/20">
              {statusLabel[activeProj.status]}
            </span>
          </div>
          {activeProj.description && (
            <p className="text-xs text-[#8b93b8] mt-1 max-w-xl">{activeProj.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-[10px] text-[#8b93b8]">
            <span className="flex items-center gap-1">
              <Calendar size={12} /> {activeProj.startDate} al {activeProj.endDate}
            </span>
            <span>•</span>
            <span>{activeTasks.length} Tareas Totales</span>
          </div>
        </div>

        {/* Progreso del Proyecto */}
        <div className="flex items-center gap-4 bg-[#1e2230] border border-[#2e3352] rounded-xl px-4 py-3 min-w-[200px]">
          <div className="flex-1">
            <div className="flex justify-between text-[11px] font-semibold text-[#8b93b8] mb-1">
              <span>AVANCE GENERAL</span>
              <span className="text-white">{avgProgress}%</span>
            </div>
            <div className="h-2 bg-[#11151f] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#7c5cfc] to-[#4f7cff] rounded-full transition-all duration-500"
                style={{ width: `${avgProgress}%` }}
              />
            </div>
          </div>
          <div className="text-2xl font-black text-[#7c5cfc] opacity-80">{avgProgress}%</div>
        </div>
      </div>

      {/* Sección de Metas / Milestones */}
      <div className="border-t border-[#2e3352]/50 pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-[#8b93b8] uppercase tracking-wider flex items-center gap-1.5">
            <Flag size={12} className="text-[#3ecf8e]" />
            Metas y Objetivos del Proyecto ({projMilestones.length})
          </span>
          <button
            onClick={() => setShowAddMilestone(!showAddMilestone)}
            className="flex items-center gap-1 text-[10px] font-medium text-[#4f7cff] hover:text-[#3a6be0] transition-colors"
          >
            <Plus size={12} /> Nueva Meta
          </button>
        </div>

        {/* Formulario Agregar Meta */}
        {showAddMilestone && (
          <div className="bg-[#1e2230] border border-[#2e3352] rounded-lg p-3 mb-3 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[9px] text-[#8b93b8] uppercase tracking-wider block mb-1">Título de la Meta</label>
              <input
                className="bg-[#11151f] border border-[#2e3352] text-[#e8eaf6] rounded-md px-3 py-1 text-xs w-full focus:outline-none focus:border-[#4f7cff]"
                value={newMS.name}
                onChange={e => setNewMS(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Lanzar versión Alpha"
              />
            </div>
            <div className="w-36">
              <label className="text-[9px] text-[#8b93b8] uppercase tracking-wider block mb-1">Fecha Límite</label>
              <input
                type="date"
                className="bg-[#11151f] border border-[#2e3352] text-[#e8eaf6] rounded-md px-3 py-1 text-xs w-full focus:outline-none focus:border-[#4f7cff]"
                value={newMS.targetDate}
                onChange={e => setNewMS(prev => ({ ...prev, targetDate: e.target.value }))}
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-[9px] text-[#8b93b8] uppercase tracking-wider block mb-1">Descripción</label>
              <input
                className="bg-[#11151f] border border-[#2e3352] text-[#e8eaf6] rounded-md px-3 py-1 text-xs w-full focus:outline-none focus:border-[#4f7cff]"
                value={newMS.description}
                onChange={e => setNewMS(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Notas adicionales..."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddMilestone(false)}
                className="px-3 py-1 bg-[#22263a] border border-[#2e3352] rounded text-[10px] hover:border-[#ff5c5c] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddMilestone}
                className="px-3 py-1 bg-[#4f7cff] text-white rounded text-[10px] font-medium hover:bg-[#3a6be0] transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        )}

        {/* Listado de Metas */}
        <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1">
          {projMilestones.length === 0 ? (
            <p className="text-[10px] text-[#8b93b8] italic">No hay metas definidas para este proyecto.</p>
          ) : (
            projMilestones.map(ms => {
              const statusColor = {
                pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
                achieved: "bg-[#3ecf8e]/10 text-[#3ecf8e] border-[#3ecf8e]/20",
                missed: "bg-[#ff5c5c]/10 text-[#ff5c5c] border-[#ff5c5c]/20",
              };
              const statusLabelMS = {
                pending: "Pendiente",
                achieved: "Alcanzada",
                missed: "Incumplida",
              };
              return (
                <div
                  key={ms.id}
                  className="flex items-center gap-2 px-2.5 py-1 bg-[#1e2230] border border-[#2e3352] rounded-lg group select-none hover:border-[#4f7cff]/40 transition"
                >
                  <button
                    onClick={() => toggleMilestoneStatus(ms.id, ms.status)}
                    title="Haga clic para cambiar estado"
                    className="focus:outline-none"
                  >
                    {ms.status === "achieved" ? (
                      <CheckCircle2 size={13} className="text-[#3ecf8e]" />
                    ) : ms.status === "missed" ? (
                      <AlertCircle size={13} className="text-[#ff5c5c]" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-yellow-500/60" />
                    )}
                  </button>

                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold text-[#e8eaf6] truncate max-w-[150px] leading-tight">
                      {ms.name}
                    </span>
                    <span className="text-[9px] text-[#8b93b8] leading-none">
                      Vence: {ms.targetDate}
                    </span>
                  </div>

                  <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 rounded border ${statusColor[ms.status]}`}>
                    {statusLabelMS[ms.status]}
                  </span>

                  <button
                    onClick={() => handleRemoveMilestone(ms.id)}
                    className="opacity-0 group-hover:opacity-100 text-[#ff5c5c] hover:bg-[#ff5c5c]/10 p-0.5 rounded transition"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
