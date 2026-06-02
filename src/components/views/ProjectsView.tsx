"use client";

import { useState } from "react";
import { Folder, Plus, Edit3, Trash2, Calendar, Target, Clock, DollarSign, Users, X, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Project, Task, AuthUser } from "@/types";

interface ProjectsViewProps {
  projects: Project[];
  setProjects: (projects: Project[] | ((prev: Project[]) => Project[])) => void;
  tasks: Task[];
  users: AuthUser[];
  currentUser: AuthUser;
  activeProjectId: string;
  setActiveProjectId: (id: string) => void;
  setActiveTab: (tab: any) => void;
}

const INPUT = "bg-[#22263a] border border-[#2e3352] text-[#e8eaf6] rounded-lg px-3 py-1.5 text-xs font-[inherit] w-full focus:outline-none focus:border-[#4f7cff] focus:bg-[#1e2235]";
const BTN = "px-3 py-1.5 rounded-lg border border-[#2e3352] bg-[#22263a] text-[#e8eaf6] text-xs font-medium hover:border-[#4f7cff] transition-all cursor-pointer flex items-center justify-center gap-1.5";
const BTN_PRIMARY = "px-3 py-1.5 rounded-lg bg-[#4f7cff] border border-[#4f7cff] text-white text-xs font-medium hover:bg-[#3a6be0] transition-all cursor-pointer flex items-center justify-center gap-1.5";

export default function ProjectsView({
  projects,
  setProjects,
  tasks,
  users,
  currentUser,
  activeProjectId,
  setActiveProjectId,
  setActiveTab,
}: ProjectsViewProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  // Form states
  const [form, setForm] = useState({
    name: "",
    description: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    status: "planning" as Project["status"],
    leaderId: currentUser.id || "u1",
  });

  const isPM = currentUser.role === "Project Manager";

  function handleCreate() {
    if (!form.name.trim() || !form.startDate || !form.endDate) return;
    const newProj: Project = {
      id: "proj" + Date.now(),
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      startDate: form.startDate,
      endDate: form.endDate,
      status: form.status,
      leaderId: form.leaderId,
    };
    setProjects((prev) => [...prev, newProj]);
    setShowAddModal(false);
    // Reset form
    setForm({
      name: "",
      description: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
      status: "planning",
      leaderId: currentUser.id || "u1",
    });
  }

  function handleUpdate() {
    if (!editingProject || !editingProject.name.trim() || !editingProject.startDate || !editingProject.endDate) return;
    setProjects((prev) =>
      prev.map((p) => (p.id === editingProject.id ? editingProject : p))
    );
    setEditingProject(null);
  }

  function handleDelete(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setDeletingProjectId(null);
    if (activeProjectId === id) {
      const remaining = projects.filter((p) => p.id !== id);
      if (remaining.length > 0) {
        setActiveProjectId(remaining[0].id);
      }
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-[#0f1117] text-[#e8eaf6] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2e3352]/50 pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#e8eaf6] tracking-tight flex items-center gap-2">
            <Folder size={22} className="text-[#7c5cfc]" />
            Portafolio de Proyectos Maestros
          </h1>
          <p className="text-xs text-[#8b93b8] mt-1">
            Gestione y supervise el avance, presupuestos y recursos de todos los proyectos de la organización.
          </p>
        </div>
        {isPM && (
          <button onClick={() => {
            setForm({
              name: "",
              description: "",
              startDate: new Date().toISOString().split("T")[0],
              endDate: new Date().toISOString().split("T")[0],
              status: "planning",
              leaderId: currentUser.id || "u1",
            });
            setShowAddModal(true);
          }} className={BTN_PRIMARY}>
            <Plus size={14} /> Nuevo Proyecto
          </button>
        )}
      </div>

      {/* Grid of Projects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((proj) => {
          // Calculate project specific statistics
          const projTasks = tasks.filter((t) => t.projectId === proj.id || (!t.projectId && proj.id === "proj1"));
          const totalTasks = projTasks.length;
          const completedTasks = projTasks.filter((t) => t.status === "done").length;
          const progress = totalTasks
            ? Math.round(projTasks.reduce((sum, t) => sum + (t.progress || 0), 0) / totalTasks)
            : 0;

          const estimatedBudget = projTasks.reduce((sum, t) => sum + (t.estimatedBudget || 0), 0);
          const actualCost = projTasks.reduce((sum, t) => sum + (t.actualCost || 0), 0);
          const budgetVariance = estimatedBudget - actualCost;
          const isOverBudget = budgetVariance < 0;

          const leader = users.find((u) => u.id === proj.leaderId) || {
            id: "",
            name: "Sin Asignar",
            initials: "SA",
            color: "#8b93b8",
            role: "Project Manager" as const,
            contractType: "Fijo" as const,
            email: "",
          } as AuthUser;

          // Get unique assignees in this project
          const assignedIds = Array.from(
            new Set(
              projTasks.flatMap((t) =>
                t.assigneeIds && t.assigneeIds.length > 0 ? t.assigneeIds : [t.assigneeId]
              ).filter(Boolean)
            )
          );
          const team = users.filter((u) => assignedIds.includes(u.id));

          const statusLabels = {
            planning: { text: "Planificación", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
            active: { text: "Activo", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
            completed: { text: "Completado", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
            on_hold: { text: "En Pausa", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
          };

          const activeBorder = activeProjectId === proj.id 
            ? "border-[#4f7cff] shadow-lg shadow-[#4f7cff]/5 bg-[#1b1f32]"
            : "border-[#2e3352]/70 hover:border-[#4f7cff]/40 bg-[#1a1d27]";

          return (
            <div
              key={proj.id}
              className={`border rounded-xl p-5 flex flex-col justify-between transition-all duration-200 group relative ${activeBorder}`}
            >
              {/* Active project badge indicator */}
              {activeProjectId === proj.id && (
                <div className="absolute -top-2.5 left-5 bg-[#4f7cff] text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider border border-[#0f1117]">
                  Espacio de Trabajo Activo
                </div>
              )}

              <div className="space-y-4">
                {/* Header card */}
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-[#e8eaf6] group-hover:text-[#4f7cff] transition-colors line-clamp-1">
                      {proj.name}
                    </h3>
                    <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${statusLabels[proj.status].color}`}>
                      {statusLabels[proj.status].text}
                    </span>
                  </div>
                  {isPM && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProject(proj);
                        }}
                        className="p-1 text-[#8b93b8] hover:text-white hover:bg-white/5 rounded transition"
                        title="Editar Proyecto"
                      >
                        <Edit3 size={12} />
                      </button>
                      {projects.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingProjectId(proj.id);
                          }}
                          className="p-1 text-[#ff5c5c] hover:bg-red-500/10 rounded transition"
                          title="Eliminar Proyecto"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="text-[11px] text-[#8b93b8] line-clamp-2 min-h-[32px] italic">
                  {proj.description || "Sin descripción proporcionada."}
                </p>

                {/* Date range */}
                <div className="flex items-center gap-1.5 text-[10px] text-[#8b93b8]">
                  <Calendar size={12} className="text-[#7c5cfc]" />
                  <span>
                    {proj.startDate} al {proj.endDate}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-[#8b93b8] font-medium uppercase tracking-wider">Avance Global</span>
                    <span className="font-bold text-[#e8eaf6]">{progress}%</span>
                  </div>
                  <div className="h-2 bg-[#11151f] rounded-full overflow-hidden border border-[#2e3352]/40">
                    <div
                      className="h-full bg-gradient-to-r from-[#4f7cff] to-[#7c5cfc] rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-[#8b93b8]">
                    <span>{completedTasks} de {totalTasks} tareas listas</span>
                  </div>
                </div>

                {/* Project Leader info */}
                <div className="flex items-center gap-2 bg-[#11151f]/40 border border-[#2e3352]/30 rounded-lg p-2">
                  {leader.imageUrl ? (
                    <img src={leader.imageUrl} alt={leader.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-bold"
                      style={{ background: leader.color }}
                    >
                      {leader.initials}
                    </div>
                  )}
                  <div className="truncate">
                    <span className="text-[10px] text-[#8b93b8] block leading-none">Líder de Proyecto</span>
                    <span className="text-xs font-semibold text-[#e8eaf6] truncate block">{leader.name}</span>
                  </div>
                </div>

                {/* Team members */}
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-[#8b93b8] uppercase font-bold tracking-wider">Equipo ({team.length})</span>
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {team.slice(0, 5).map((m) =>
                      m.imageUrl ? (
                        <img
                          key={m.id}
                          src={m.imageUrl}
                          alt={m.name}
                          className="w-5 h-5 rounded-full border border-[#1a1d27] object-cover flex-shrink-0"
                          title={m.name}
                        />
                      ) : (
                        <div
                          key={m.id}
                          className="w-5 h-5 rounded-full border border-[#1a1d27] flex items-center justify-center text-white text-[7px] font-bold flex-shrink-0"
                          style={{ background: m.color }}
                          title={m.name}
                        >
                          {m.initials}
                        </div>
                      )
                    )}
                    {team.length > 5 && (
                      <div className="w-5 h-5 rounded-full border border-[#1a1d27] bg-[#22263a] flex items-center justify-center text-white text-[7px] font-bold flex-shrink-0">
                        +{team.length - 5}
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="flex items-center justify-between border-t border-[#2e3352]/40 pt-3">
                  <div className="text-left">
                    <span className="text-[9px] text-[#8b93b8] uppercase font-bold tracking-wider block">Presupuesto</span>
                    <span className="text-xs font-bold text-[#e8eaf6]">${estimatedBudget.toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-[#8b93b8] uppercase font-bold tracking-wider block">Costo Real</span>
                    <span className={`text-xs font-bold ${isOverBudget ? "text-[#ff5c5c]" : "text-[#3ecf8e]"}`}>
                      ${actualCost.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Enter project button */}
              <div className="mt-4 pt-3 border-t border-[#2e3352]/40 flex gap-2">
                <button
                  onClick={() => {
                    setActiveProjectId(proj.id);
                    setActiveTab("gantt");
                  }}
                  className="flex-1 text-xs py-1.5 bg-[#4f7cff]/10 hover:bg-[#4f7cff]/20 text-[#4f7cff] border border-[#4f7cff]/20 hover:border-[#4f7cff]/40 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Abrir Gantt <ArrowRight size={12} />
                </button>
                {activeProjectId !== proj.id && (
                  <button
                    onClick={() => setActiveProjectId(proj.id)}
                    className="px-2.5 text-xs py-1.5 bg-[#22263a] border border-[#2e3352] text-[#8b93b8] hover:text-white hover:border-[#4f7cff] rounded-lg font-semibold transition cursor-pointer"
                  >
                    Activar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={() => setShowAddModal(false)}>
          <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-6 w-[360px] max-w-[95vw] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-[#e8eaf6] flex items-center gap-1.5">
                <Folder size={16} className="text-[#4f7cff]" /> Nuevo Proyecto Maestro
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#8b93b8] hover:text-[#e8eaf6]">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[#8b93b8] uppercase tracking-wider">Nombre del Proyecto</label>
                <input
                  className={INPUT}
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ej: Logística Distribución Sur"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[#8b93b8] uppercase tracking-wider">Descripción</label>
                <textarea
                  className={INPUT + " resize-none"}
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Detalles sobre los objetivos y alcance del proyecto..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-[#8b93b8] uppercase tracking-wider">Fecha Inicio</label>
                  <input
                    type="date"
                    className={INPUT}
                    value={form.startDate}
                    onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-[#8b93b8] uppercase tracking-wider">Fecha Final</label>
                  <input
                    type="date"
                    className={INPUT}
                    value={form.endDate}
                    onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-[#8b93b8] uppercase tracking-wider">Estatus</label>
                  <select
                    className={INPUT}
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as any }))}
                  >
                    <option value="planning">Planificación</option>
                    <option value="active">Activo</option>
                    <option value="on_hold">En Pausa</option>
                    <option value="completed">Completado</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-[#8b93b8] uppercase tracking-wider">Responsable / PM</label>
                  <select
                    className={INPUT}
                    value={form.leaderId}
                    onChange={(e) => setForm((p) => ({ ...p, leaderId: e.target.value }))}
                  >
                    {users.filter(u => u.role?.toString().trim().toLowerCase() === "project manager").map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                    {users.filter(u => u.role?.toString().trim().toLowerCase() === "project manager").every(u => u.id !== currentUser.id) && currentUser.role?.toString().trim().toLowerCase() === "project manager" && (
                      <option key={currentUser.id} value={currentUser.id}>
                        {currentUser.name}
                      </option>
                    )}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6 pt-3 border-t border-[#2e3352]/40">
              <button onClick={() => setShowAddModal(false)} className={BTN}>
                Cancelar
              </button>
              <button onClick={handleCreate} className={BTN_PRIMARY}>
                Crear Proyecto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={() => setEditingProject(null)}>
          <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-6 w-[360px] max-w-[95vw] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-[#e8eaf6] flex items-center gap-1.5">
                <Folder size={16} className="text-[#4f7cff]" /> Editar Proyecto Maestro
              </h3>
              <button onClick={() => setEditingProject(null)} className="text-[#8b93b8] hover:text-[#e8eaf6]">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[#8b93b8] uppercase tracking-wider">Nombre del Proyecto</label>
                <input
                  className={INPUT}
                  value={editingProject.name}
                  onChange={(e) => setEditingProject((p) => p ? { ...p, name: e.target.value } : null)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[#8b93b8] uppercase tracking-wider">Descripción</label>
                <textarea
                  className={INPUT + " resize-none"}
                  rows={3}
                  value={editingProject.description || ""}
                  onChange={(e) => setEditingProject((p) => p ? { ...p, description: e.target.value } : null)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-[#8b93b8] uppercase tracking-wider">Fecha Inicio</label>
                  <input
                    type="date"
                    className={INPUT}
                    value={editingProject.startDate}
                    onChange={(e) => setEditingProject((p) => p ? { ...p, startDate: e.target.value } : null)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-[#8b93b8] uppercase tracking-wider">Fecha Final</label>
                  <input
                    type="date"
                    className={INPUT}
                    value={editingProject.endDate}
                    onChange={(e) => setEditingProject((p) => p ? { ...p, endDate: e.target.value } : null)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-[#8b93b8] uppercase tracking-wider">Estatus</label>
                  <select
                    className={INPUT}
                    value={editingProject.status}
                    onChange={(e) => setEditingProject((p) => p ? { ...p, status: e.target.value as any } : null)}
                  >
                    <option value="planning">Planificación</option>
                    <option value="active">Activo</option>
                    <option value="on_hold">En Pausa</option>
                    <option value="completed">Completado</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-[#8b93b8] uppercase tracking-wider">Responsable / PM</label>
                  <select
                    className={INPUT}
                    value={editingProject.leaderId}
                    onChange={(e) => setEditingProject((p) => p ? { ...p, leaderId: e.target.value } : null)}
                  >
                    {users.filter(u => u.role?.toString().trim().toLowerCase() === "project manager").map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                    {users.filter(u => u.role?.toString().trim().toLowerCase() === "project manager").every(u => u.id !== currentUser.id) && currentUser.role?.toString().trim().toLowerCase() === "project manager" && (
                      <option key={currentUser.id} value={currentUser.id}>
                        {currentUser.name}
                      </option>
                    )}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6 pt-3 border-t border-[#2e3352]/40">
              <button onClick={() => setEditingProject(null)} className={BTN}>
                Cancelar
              </button>
              <button onClick={handleUpdate} className={BTN_PRIMARY}>
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProjectId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={() => setDeletingProjectId(null)}>
          <div className="bg-[#1a1d27] border border-[#ff5c5c] rounded-xl p-6 w-80 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="text-2xl mb-3">🗑️</div>
            <h3 className="font-semibold text-sm mb-1 text-[#e8eaf6]">¿Eliminar Proyecto Maestro?</h3>
            <p className="text-[#8b93b8] text-xs mb-5">
              Se eliminará este proyecto del portafolio. Las tareas asociadas continuarán existiendo pero perderán su vinculación a este proyecto.
            </p>
            <div className="flex gap-2 justify-center">
              <button className={BTN} onClick={() => setDeletingProjectId(null)}>
                Cancelar
              </button>
              <button
                className="px-3 py-1.5 rounded-lg bg-[#ff5c5c] text-white text-xs font-medium hover:bg-red-600 transition-colors cursor-pointer"
                onClick={() => handleDelete(deletingProjectId)}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
