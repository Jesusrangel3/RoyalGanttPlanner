"use client";

import { useEffect, useState } from "react";
import { Search, UserPlus, ChevronDown, AlertTriangle, Camera } from "lucide-react";
import { User, AuthUser } from "@/types";
import { getSessionUser, saveSessionUser } from "@/lib/auth";

function Avatar({ user, size = 36 }: { user: User; size?: number }) {
  if (user.imageUrl) {
    return (
      <img
        src={user.imageUrl}
        alt={user.name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, background: user.color, fontSize: size * 0.32 }}
    >
      {user.initials}
    </div>
  );
}

const ROLE_OPTIONS = [
  "Project Manager", "Frontend Developer", "Backend Developer",
  "UX/UI Designer", "DevOps Engineer", "Systems Architect", "QA Engineer", "Analista", "Observer"
];
const CONTRACT_OPTIONS = ["Por hora", "Fijo", "Freelance", "Consultor"];

interface UsersViewProps {
  Tasks_Gantt: any[];
  users_Gantt: AuthUser[];
  setUsers: (users_Gantt: AuthUser[] | ((prev: AuthUser[]) => AuthUser[])) => void;
  currentUser: AuthUser | null;
  setCurrentUser: (u: AuthUser | null) => void;
}

export default function UsersView({ 
  Tasks_Gantt, 
  users_Gantt, 
  setUsers,
  currentUser,
  setCurrentUser
}: UsersViewProps) {
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<AuthUser | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  // Estados para nuevo usuario
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: ROLE_OPTIONS[0],
    contractType: CONTRACT_OPTIONS[0],
    imageUrl: "",
    availableHours: 40,
    skillsStr: "",
  });

  // Estado temporal para editar skills de usuario
  const [editSkillsStr, setEditSkillsStr] = useState("");

  useEffect(() => {
    if (editUser) {
      setEditSkillsStr((editUser.skills || []).join(", "));
    }
  }, [editUser]);

  const isPM = currentUser?.role === "Project Manager";

  const filtered = users_Gantt.filter((u) => {
    if (u.status === "pending" && !isPM) return false;
    return u.name.toLowerCase().includes(search.toLowerCase()) ||
           u.email.toLowerCase().includes(search.toLowerCase());
  });

  function getTaskCount(userId: string) {
    return Tasks_Gantt.filter((t) => (t.assigneeIds && t.assigneeIds.includes(userId)) || t.assigneeId === userId).length;
  }

  function getCompletedCount(userId: string) {
    return Tasks_Gantt.filter((t) => ((t.assigneeIds && t.assigneeIds.includes(userId)) || t.assigneeId === userId) && t.status === "done").length;
  }

  function getUserWorkload(userId: string, availableHours: number) {
    const activeTasks = Tasks_Gantt.filter((t) => ((t.assigneeIds && t.assigneeIds.includes(userId)) || t.assigneeId === userId) && t.status !== "done");
    const estimated = activeTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    return {
      estimated,
      isOverloaded: estimated > availableHours,
    };
  }

  const [addingUser, setAddingUser] = useState(false);
  const [addUserError, setAddUserError] = useState("");

  async function addUser() {
    if (!newUser.name.trim() || !newUser.email.trim()) return;
    setAddingUser(true);
    setAddUserError("");
    try {
      const parsedSkills = newUser.skillsStr.split(",").map((s) => s.trim()).filter(Boolean);
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUser.name.trim(),
          email: newUser.email.trim().toLowerCase(),
          role: newUser.role,
          contractType: newUser.contractType,
          availableHours: Number(newUser.availableHours) || 40,
          skills: parsedSkills,
          imageUrl: newUser.imageUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) { setAddUserError(data.error || 'Error al crear usuario'); return; }
      setUsers((prev) => [...prev, data.user as AuthUser]);
      alert(`Usuario creado. Contraseña temporal: Royal1234\nEl usuario deberá cambiarla en su primer inicio de sesión.`);
      setNewUser({ name: "", email: "", role: ROLE_OPTIONS[0], contractType: CONTRACT_OPTIONS[0], imageUrl: "", availableHours: 40, skillsStr: "" });
      setShowInvite(false);
    } catch {
      setAddUserError('Error de conexión');
    } finally {
      setAddingUser(false);
    }
  }

  async function updateUser(u: AuthUser) {
    const parsedSkills = editSkillsStr.split(",").map((s) => s.trim()).filter(Boolean);
    const updated = { ...u, skills: parsedSkills };

    // Persist to DB
    try {
      await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch { /* fallback: at least update local */ }

    setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
    if (currentUser && u.id === currentUser.id) {
      saveSessionUser(updated);
      setCurrentUser(updated);
    }
    setEditUser(null);
  }

  async function removeUser(id: string) {
    if (!confirm("¿Eliminar este usuario del sistema?")) return;
    try {
      await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
    } catch { /* fallback */ }
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setEditUser(null);
  }

  return (
    <div className="h-full flex flex-col bg-[#0f1117]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#2e3352] bg-[#1a1d27] flex-shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b93b8]" />
          <input
            className="bg-[#22263a] border border-[#2e3352] text-[#e8eaf6] rounded-lg pl-8 pr-3 py-1.5 text-xs w-56 focus:outline-none focus:border-[#4f7cff]"
            placeholder="Buscar por nombre o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="text-[10px] text-[#8b93b8] bg-[#22263a] border border-[#2e3352] rounded px-2 py-1">
          {filtered.length} miembro{filtered.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={() => setShowInvite(true)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-[#4f7cff] text-white text-xs font-medium rounded-lg hover:bg-[#3a6be0] transition-colors cursor-pointer"
        >
          <UserPlus size={13} /> Invitar miembro
        </button>
      </div>

      {/* Description */}
      <div className="px-4 py-3 border-b border-[#2e3352] text-xs text-[#8b93b8] bg-[#1a1d27] flex-shrink-0">
        Gestión de recursos humanos para proyectos. Supervise horas disponibles frente a carga asignada, y administre capacidades técnicas del equipo.
      </div>

      {/* Aprobaciones Pendientes para el PM */}
      {isPM && users_Gantt.filter(u => u.status === "pending").length > 0 && (
        <div className="bg-[#1e2230] border border-yellow-500/20 rounded-xl p-4 m-4 mb-2 flex-shrink-0">
          <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-yellow-500" />
            Aprobaciones Pendientes ({users_Gantt.filter(u => u.status === "pending").length})
          </h3>
          <div className="space-y-2">
            {users_Gantt.filter(u => u.status === "pending").map((u) => (
              <div key={u.id} className="flex items-center justify-between bg-[#11151f] border border-[#2e3352] rounded-lg p-2.5">
                <div className="flex items-center gap-2.5">
                  <Avatar user={u} size={28} />
                  <div>
                    <p className="text-xs font-semibold text-white">{u.name}</p>
                    <p className="text-[10px] text-[#8b93b8]">{u.email} • Rol: {u.role}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => removeUser(u.id)}
                    className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-[#ff5c5c] rounded text-[10px] font-semibold border border-red-500/20 transition cursor-pointer"
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={() => {
                      const nextUsers = users_Gantt.map(x => x.id === u.id ? { ...x, status: "active" as const } : x);
                      setUsers(nextUsers);
                    }}
                    className="px-2.5 py-1 bg-[#3ecf8e]/10 hover:bg-[#3ecf8e]/20 text-[#3ecf8e] rounded text-[10px] font-semibold border border-[#3ecf8e]/20 transition cursor-pointer"
                  >
                    Aprobar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {/* Table header */}
        <div className="grid text-[10px] font-semibold text-[#8b93b8] uppercase tracking-wider border-b border-[#2e3352] px-4 py-2.5 bg-[#1a1d27] sticky top-0 z-10" style={{ gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr auto" }}>
          <span>Usuario</span>
          <span>Correo</span>
          <span>Rol y Habilidades</span>
          <span>Disponibilidad</span>
          <span>Tareas / Carga</span>
          <span></span>
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-[#8b93b8]">
            <div className="text-4xl mb-3 opacity-30">👥</div>
            <p className="text-sm">No se encontraron usuarios</p>
          </div>
        )}

        {filtered.map((user) => {
          const workload = getUserWorkload(user.id, user.availableHours || 40);
          return (
            <div
              key={user.id}
              className="grid items-center px-4 py-3 border-b border-[#2e3352] hover:bg-white/[0.02] transition-colors group"
              style={{ gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr auto" }}
            >
              {/* User */}
              <div className="flex items-center gap-3">
                <Avatar user={user} size={34} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-[#e8eaf6]">{user.name}</p>
                    {user.status === "pending" && (
                      <span className="text-[8px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-1 rounded font-bold uppercase">
                        Pendiente
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#8b93b8]">{user.initials}</p>
                </div>
              </div>

              {/* Email */}
              <p className="text-xs text-[#8b93b8] truncate pr-4">{user.email}</p>

              {/* Role & Skills */}
              <div className="flex flex-col gap-1 pr-2">
                <span className="text-xs text-[#e8eaf6]">{user.role}</span>
                {user.skills && user.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {user.skills.map((skill, sIdx) => (
                      <span key={sIdx} className="text-[8px] bg-[#7c5cfc]/10 border border-[#7c5cfc]/20 text-[#7c5cfc] px-1.5 py-0.2 rounded font-semibold">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Availability */}
              <div className="text-xs text-[#e8eaf6]">
                {user.availableHours || 40} h/semana
              </div>

              {/* Tasks_Gantt & Workload */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-xs text-[#8b93b8]">
                  <span>{getTaskCount(user.id)} tareas</span>
                  {getCompletedCount(user.id) > 0 && (
                    <span className="text-[9px] text-[#3ecf8e] bg-[#3ecf8e]/10 rounded px-1 py-0.2">{getCompletedCount(user.id)} ✓</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] font-semibold ${workload.isOverloaded ? "text-[#ff5c5c] flex items-center gap-1" : "text-[#8b93b8]"}`}>
                    Asignado: {workload.estimated}h
                    {workload.isOverloaded && (
                      <span title="¡Usuario sobrecargado!">
                        <AlertTriangle size={11} className="text-[#ff5c5c]" />
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditUser(user)}
                  className="text-[10px] text-[#4f7cff] hover:bg-[#4f7cff]/10 rounded px-1.5 py-0.5 transition-colors"
                >
                  Editar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={() => setShowInvite(false)}>
          <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 w-80 max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-4">Invitar colaborador</h3>
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="relative group w-12 h-12 rounded-full overflow-hidden cursor-pointer border border-[#2e3352]/50 hover:border-[#4f7cff] transition flex-shrink-0"
                onClick={() => document.getElementById("new-avatar-file-input")?.click()}
                title="Subir foto de perfil"
              >
                {newUser.imageUrl ? (
                  <img
                    src={newUser.imageUrl}
                    alt={newUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-white font-bold"
                    style={{
                      background: "#4f7cff",
                      fontSize: 16
                    }}
                  >
                    {newUser.name ? newUser.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) : "+"}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                  <Camera size={16} className="text-white" />
                </div>
                <input
                  id="new-avatar-file-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      resizeImage(file, 256, 256, (base64) => {
                        setNewUser((p) => ({ ...p, imageUrl: base64 }));
                      });
                    }
                  }}
                />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{newUser.name || "Nuevo Miembro"}</h3>
                <p className="text-[10px] text-[#8b93b8]">{newUser.email || "correo@royaltransport.com.mx"}</p>
              </div>
            </div>
            <div className="space-y-3">
              <Field label="Nombre completo">
                <input className={INP} value={newUser.name} onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))} placeholder="Ej: Juan Pérez" />
              </Field>
              <Field label="Correo electrónico">
                <input className={INP} value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} placeholder="juan@royaltransport.com.mx" />
              </Field>
              <div className="flex gap-2">
                <Field label="Rol" className="flex-1">
                  <select className={INP} value={newUser.role} onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}>
                    {ROLE_OPTIONS.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </Field>
                <Field label="Tipo contrato" className="flex-1">
                  <select className={INP} value={newUser.contractType} onChange={(e) => setNewUser((p) => ({ ...p, contractType: e.target.value }))}>
                    {CONTRACT_OPTIONS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Horas de Disponibilidad Semanal">
                <input type="number" className={INP} min={1} value={newUser.availableHours} onChange={(e) => setNewUser((p) => ({ ...p, availableHours: Number(e.target.value) }))} />
              </Field>
              <Field label="Skills (separados por coma)">
                <input className={INP} value={newUser.skillsStr} onChange={(e) => setNewUser((p) => ({ ...p, skillsStr: e.target.value }))} placeholder="React, Node.js, QA" />
              </Field>
            </div>
            {addUserError && (
              <p className="text-xs text-red-400 mt-2 text-right">{addUserError}</p>
            )}
            <div className="flex gap-2 justify-end mt-4">
              <button className={BTN} onClick={() => { setShowInvite(false); setAddUserError(""); }}>Cancelar</button>
              <button className={BTN_P} onClick={addUser} disabled={addingUser}>
                {addingUser ? "Guardando..." : "Agregar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={() => setEditUser(null)}>
          <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 w-85 max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="relative group w-12 h-12 rounded-full overflow-hidden cursor-pointer border border-[#2e3352]/50 hover:border-[#4f7cff] transition flex-shrink-0"
                onClick={() => document.getElementById("edit-avatar-file-input")?.click()}
                title="Cambiar foto de perfil"
              >
                <Avatar user={editUser} size={48} />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                  <Camera size={16} className="text-white" />
                </div>
                <input
                  id="edit-avatar-file-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      resizeImage(file, 256, 256, (base64) => {
                        setEditUser((u) => u ? { ...u, imageUrl: base64 } : u);
                      });
                    }
                  }}
                />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{editUser.name}</h3>
                <p className="text-[10px] text-[#8b93b8]">{editUser.email}</p>
              </div>
            </div>
            <div className="space-y-3">
              <Field label="Disponibilidad Semanal (Horas)">
                <input
                  type="number"
                  className={INP}
                  min={1}
                  value={editUser.availableHours || 40}
                  onChange={(e) => setEditUser((u) => u ? { ...u, availableHours: Number(e.target.value) } : u)}
                />
              </Field>
              <Field label="Skills (separados por comas)">
                <input
                  className={INP}
                  value={editSkillsStr}
                  onChange={(e) => setEditSkillsStr(e.target.value)}
                  placeholder="React, CSS, SQL"
                />
              </Field>
              <div className="flex gap-2">
                <Field label="Rol" className="flex-1">
                  <select className={INP} value={editUser.role} onChange={(e) => setEditUser((u) => u ? { ...u, role: e.target.value as any } : u)}>
                    {ROLE_OPTIONS.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </Field>
                <Field label="Tipo Contrato" className="flex-1">
                  <select className={INP} value={editUser.contractType} onChange={(e) => setEditUser((u) => u ? { ...u, contractType: e.target.value as any } : u)}>
                    {CONTRACT_OPTIONS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button className="px-3 py-1.5 rounded-lg border border-[#ff5c5c] text-[#ff5c5c] text-xs hover:bg-[#ff5c5c]/10 transition-colors cursor-pointer" onClick={() => removeUser(editUser.id)}>
                Eliminar
              </button>
              <div className="ml-auto flex gap-2">
                <button className={BTN} onClick={() => setEditUser(null)}>Cancelar</button>
                <button className={BTN_P} onClick={() => updateUser(editUser)}>Guardar</button>
              </div>
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

const INP = "bg-[#22263a] border border-[#2e3352] text-[#e8eaf6] rounded-lg px-3 py-1.5 text-xs font-[inherit] w-full focus:outline-none focus:border-[#4f7cff]";
const BTN = "px-3 py-1.5 rounded-lg border border-[#2e3352] bg-[#22263a] text-[#e8eaf6] text-xs font-medium hover:border-[#4f7cff] transition-colors cursor-pointer";
const BTN_P = "px-3 py-1.5 rounded-lg bg-[#4f7cff] text-white text-xs font-medium hover:bg-[#3a6be0] transition-colors cursor-pointer";

function resizeImage(file: File, maxWidth: number, maxHeight: number, callback: (base64: string) => void) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7); // 70% quality jpeg
        callback(dataUrl);
      }
    };
    img.src = e.target?.result as string;
  };
  reader.readAsDataURL(file);
}
