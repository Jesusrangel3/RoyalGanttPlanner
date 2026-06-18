"use client";

import { useState, useEffect, useCallback } from "react";
import { Activity, Filter, RefreshCw, FileText, FolderOpen, Users, Layers, Flag, StickyNote } from "lucide-react";
import { ActivityLog, AuthUser } from "@/types";

interface ActivityViewProps {
  users: AuthUser[];
  currentUser: AuthUser | null;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  created:        { label: "Creó",           color: "#3ecf8e" },
  updated:        { label: "Actualizó",      color: "#4f7cff" },
  deleted:        { label: "Eliminó",        color: "#ff5c5c" },
  commented:      { label: "Comentó en",     color: "#7c5cfc" },
  login:          { label: "Inició sesión",  color: "#8b93b8" },
  status_changed: { label: "Cambió estado de", color: "#f5a623" },
};

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  task:      <FileText size={13} />,
  project:   <FolderOpen size={13} />,
  phase:     <Layers size={13} />,
  milestone: <Flag size={13} />,
  user:      <Users size={13} />,
  note:      <StickyNote size={13} />,
};

export default function ActivityView({ users, currentUser }: ActivityViewProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEntity, setFilterEntity] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");
  const isPM = currentUser?.role === "Project Manager";

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: "200" });
      if (filterEntity !== "all") params.set("entityType", filterEntity);
      const res = await fetch(`/api/activity?${params}`);
      const data = await res.json();
      if (data.success) setLogs(data.logs);
    } catch (err) {
      console.error("Error cargando actividad:", err);
    } finally {
      setLoading(false);
    }
  }, [filterEntity]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const filteredLogs = logs.filter((l) => {
    if (filterUser !== "all" && l.userId !== filterUser) return false;
    return true;
  });

  // Agrupar por fecha
  const groups: Record<string, ActivityLog[]> = {};
  filteredLogs.forEach((log) => {
    const dateKey = log.createdAt.split(",")[0] || log.createdAt.split(" ")[0];
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(log);
  });

  return (
    <div className="h-full flex flex-col bg-[#0f1117] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[#2e3352] bg-[#1a1d27] flex-shrink-0">
        <Activity size={15} className="text-[#4f7cff]" />
        <span className="font-bold text-sm text-white">Registro de Actividad</span>
        <span className="text-[10px] text-[#8b93b8] bg-[#0f1117] border border-[#2e3352] rounded-full px-2 py-0.5">
          {filteredLogs.length} eventos
        </span>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter size={11} className="text-[#8b93b8]" />
            <select
              value={filterEntity}
              onChange={(e) => setFilterEntity(e.target.value)}
              className="bg-[#0f1117] border border-[#2e3352] text-[#e8eaf6] text-xs rounded px-2 py-1 outline-none"
            >
              <option value="all">Todos los tipos</option>
              <option value="task">Tareas</option>
              <option value="project">Proyectos</option>
              <option value="phase">Fases</option>
              <option value="milestone">Hitos</option>
              <option value="user">Usuarios</option>
              <option value="note">Notas</option>
            </select>
          </div>

          {isPM && (
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="bg-[#0f1117] border border-[#2e3352] text-[#e8eaf6] text-xs rounded px-2 py-1 outline-none"
            >
              <option value="all">Todos los usuarios</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          )}

          <button
            onClick={loadLogs}
            className="p-1.5 border border-[#2e3352] rounded-lg text-[#8b93b8] hover:text-white hover:border-[#4f7cff] transition"
            title="Actualizar"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Log list */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-[#8b93b8] text-sm">Cargando actividad...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center text-[#8b93b8]">
            <Activity size={40} className="opacity-20 mb-3" />
            <p className="text-sm font-semibold">No hay actividad registrada</p>
            <p className="text-xs mt-1 opacity-70">Las acciones del equipo aparecerán aquí</p>
          </div>
        ) : (
          <div className="space-y-6 max-w-3xl mx-auto">
            {Object.entries(groups).map(([date, dateLogs]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px flex-1 bg-[#2e3352]" />
                  <span className="text-[10px] font-bold text-[#8b93b8] uppercase tracking-wider px-2">{date}</span>
                  <div className="h-px flex-1 bg-[#2e3352]" />
                </div>

                <div className="space-y-1">
                  {dateLogs.map((log) => {
                    const actionMeta = ACTION_LABELS[log.action] || { label: log.action, color: "#8b93b8" };
                    const entityIcon = ENTITY_ICONS[log.entityType] || <FileText size={13} />;
                    const logUser = users.find((u) => u.id === log.userId);

                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.02] transition group"
                      >
                        {/* Avatar */}
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: logUser?.color || "#4f7cff" }}
                          title={log.userName}
                        >
                          {logUser?.initials || log.userName?.slice(0, 2).toUpperCase()}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-[#e8eaf6]">{log.userName}</span>
                            <span className="text-xs" style={{ color: actionMeta.color }}>{actionMeta.label}</span>
                            <span className="text-[#8b93b8]" style={{ color: "#8b93b8" }}>{entityIcon}</span>
                            <span className="text-xs text-[#e8eaf6] font-medium truncate max-w-[200px]" title={log.entityTitle}>
                              "{log.entityTitle}"
                            </span>
                          </div>
                          {log.details && (
                            <p className="text-[10px] text-[#8b93b8] mt-0.5 leading-relaxed">{log.details}</p>
                          )}
                        </div>

                        {/* Time */}
                        <span className="text-[9px] text-[#8b93b8] flex-shrink-0 mt-1">
                          {log.createdAt.split(",")[1]?.trim() || log.createdAt}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
