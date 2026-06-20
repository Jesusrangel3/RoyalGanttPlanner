"use client";

import { useMemo, useEffect, useState } from "react";
import { Task, AuthUser } from "@/types";
import { User, CheckCircle2, Clock, AlertTriangle, Minus, Settings } from "lucide-react";

interface WorkloadViewProps {
  Tasks_Gantt: Task[];
  users_Gantt: AuthUser[];
}

interface Thresholds { max_normal: number; max_cargado: number; }

function getWorkload(active: number, t: Thresholds): { label: string; color: string; bg: string; bar: string } {
  if (active === 0)          return { label: "Libre",        color: "#3ecf8e", bg: "bg-[#3ecf8e]/10", bar: "#3ecf8e" };
  if (active <= t.max_normal) return { label: "Normal",       color: "#4f7cff", bg: "bg-[#4f7cff]/10", bar: "#4f7cff" };
  if (active <= t.max_cargado)return { label: "Cargado",      color: "#f5a623", bg: "bg-[#f5a623]/10", bar: "#f5a623" };
  return                            { label: "Sobrecargado", color: "#ff5c5c", bg: "bg-[#ff5c5c]/10", bar: "#ff5c5c" };
}

export default function WorkloadView({ Tasks_Gantt, users_Gantt }: WorkloadViewProps) {
  const [thresholds, setThresholds] = useState<Thresholds>({ max_normal: 3, max_cargado: 6 });
  const [showConfig, setShowConfig] = useState(false);
  const [configEdit, setConfigEdit] = useState<Thresholds>({ max_normal: 3, max_cargado: 6 });

  useEffect(() => {
    fetch("/api/workload-config")
      .then(r => r.json())
      .then(d => { if (d.success && d.config) setThresholds({ max_normal: d.config.max_normal ?? 3, max_cargado: d.config.max_cargado ?? 6 }); })
      .catch(() => {});
  }, []);

  async function saveConfig() {
    await Promise.all([
      fetch("/api/workload-config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ configKey: "max_normal",  configValue: configEdit.max_normal }) }),
      fetch("/api/workload-config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ configKey: "max_cargado", configValue: configEdit.max_cargado }) }),
    ]);
    setThresholds(configEdit);
    setShowConfig(false);
  }
  const rows = useMemo(() => {
    return users_Gantt.map(user => {
      const mine = Tasks_Gantt.filter(t =>
        t.assigneeId === user.id || t.assigneeIds?.includes(user.id)
      );
      const active    = mine.filter(t => t.status !== "done").length;
      const done      = mine.filter(t => t.status === "done").length;
      const blocked   = mine.filter(t => t.status === "blocked").length;
      const review    = mine.filter(t => t.status === "review").length;
      const estHours  = mine.reduce((s, t) => s + (t.estimatedHours || 0), 0);
      const realHours = mine.reduce((s, t) => s + (t.actualHours  || 0), 0);
      const overdue   = mine.filter(t => t.status !== "done" && new Date(t.endDate) < new Date()).length;
      const workload  = getWorkload(active, thresholds);
      return { user, active, done, blocked, review, estHours, realHours, overdue, workload, total: mine.length };
    }).sort((a, b) => b.active - a.active);
  }, [Tasks_Gantt, users_Gantt, thresholds]);

  const totalActive  = rows.reduce((s, r) => s + r.active, 0);
  const totalOverdue = rows.reduce((s, r) => s + r.overdue, 0);
  const overloaded   = rows.filter(r => r.active > 6).length;
  const free         = rows.filter(r => r.active === 0).length;

  return (
    <div className="h-full flex flex-col bg-[#0f1117] overflow-hidden">

      {/* ── Resumen superior ── */}
      <div className="flex gap-3 px-5 py-4 border-b border-[#2e3352] bg-[#1a1d27] flex-shrink-0 flex-wrap items-start">
        {[
          { label: "Tareas activas", value: totalActive,  color: "#4f7cff" },
          { label: "Vencidas",       value: totalOverdue, color: "#ff5c5c" },
          { label: "Sobrecargados",  value: overloaded,   color: "#f5a623" },
          { label: "Disponibles",    value: free,         color: "#3ecf8e" },
        ].map(c => (
          <div key={c.label} className="bg-[#0f1117] border border-[#2e3352] rounded-xl px-4 py-3 flex flex-col gap-0.5 min-w-[130px]">
            <span className="text-[10px] text-[#8b93b8] uppercase tracking-wider font-semibold">{c.label}</span>
            <span className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</span>
          </div>
        ))}

        {/* Leyenda de umbrales + botón config */}
        <div className="flex-1 bg-[#0f1117] border border-[#2e3352] rounded-xl px-4 py-3 flex flex-col gap-1 min-w-[200px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#8b93b8] uppercase tracking-wider font-semibold">Umbrales de carga</span>
            <button onClick={() => { setConfigEdit(thresholds); setShowConfig(true); }}
              className="text-[#8b93b8] hover:text-white transition"><Settings size={12} /></button>
          </div>
          <div className="flex gap-2 flex-wrap mt-1">
            {[
              { label: "Libre",        range: "0",                            color: "#3ecf8e" },
              { label: "Normal",       range: `1–${thresholds.max_normal}`,    color: "#4f7cff" },
              { label: "Cargado",      range: `${thresholds.max_normal+1}–${thresholds.max_cargado}`, color: "#f5a623" },
              { label: "Sobrecargado", range: `${thresholds.max_cargado+1}+`,  color: "#ff5c5c" },
            ].map(l => (
              <span key={l.label} className="text-[9px] px-2 py-0.5 rounded-full border font-semibold"
                style={{ color: l.color, borderColor: `${l.color}40`, backgroundColor: `${l.color}10` }}>
                {l.label} ({l.range})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Modal de configuración de umbrales ── */}
      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-6 w-80 space-y-4">
            <h3 className="text-sm font-bold text-[#e8eaf6]">Configurar umbrales de carga</h3>
            <p className="text-[10px] text-[#8b93b8]">Define cuántas tareas activas considera cada nivel.</p>
            <div className="space-y-3">
              <label className="block text-[10px] text-[#8b93b8] font-semibold uppercase tracking-wider">
                Máx. tareas para "Normal"
                <input type="number" min={1} max={20}
                  className="mt-1 w-full bg-[#0f1117] border border-[#2e3352] rounded-lg px-3 py-2 text-sm text-[#e8eaf6] outline-none focus:border-[#4f7cff]"
                  value={configEdit.max_normal}
                  onChange={e => setConfigEdit(p => ({ ...p, max_normal: Number(e.target.value) }))} />
              </label>
              <label className="block text-[10px] text-[#8b93b8] font-semibold uppercase tracking-wider">
                Máx. tareas para "Cargado"
                <input type="number" min={1} max={30}
                  className="mt-1 w-full bg-[#0f1117] border border-[#2e3352] rounded-lg px-3 py-2 text-sm text-[#e8eaf6] outline-none focus:border-[#f5a623]"
                  value={configEdit.max_cargado}
                  onChange={e => setConfigEdit(p => ({ ...p, max_cargado: Number(e.target.value) }))} />
              </label>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={saveConfig}
                className="flex-1 py-2 rounded-lg bg-[#4f7cff] text-white text-xs font-bold hover:bg-[#4f7cff]/80 transition">
                Guardar
              </button>
              <button onClick={() => setShowConfig(false)}
                className="flex-1 py-2 rounded-lg bg-[#2e3352] text-[#8b93b8] text-xs font-bold hover:text-white transition">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabla ── */}
      <div className="flex-1 overflow-auto">
        {users_Gantt.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-[#8b93b8]">
            <User size={36} className="opacity-20 mb-2" />
            <p className="text-sm">No hay personas en este proyecto</p>
          </div>
        ) : (
          <table className="w-full text-xs border-collapse min-w-[700px]">
            <thead className="sticky top-0 z-10 bg-[#1a1d27] border-b border-[#2e3352]">
              <tr>
                <th className="px-4 py-2.5 text-left text-[#8b93b8] font-semibold">Persona</th>
                <th className="w-28 px-3 py-2.5 text-center text-[#8b93b8] font-semibold">Estado</th>
                <th className="w-24 px-3 py-2.5 text-center text-[#8b93b8] font-semibold">Activas</th>
                <th className="w-24 px-3 py-2.5 text-center text-[#8b93b8] font-semibold">En revisión</th>
                <th className="w-24 px-3 py-2.5 text-center text-[#8b93b8] font-semibold">Completadas</th>
                <th className="w-24 px-3 py-2.5 text-center text-[#8b93b8] font-semibold">Bloqueadas</th>
                <th className="w-24 px-3 py-2.5 text-center text-[#8b93b8] font-semibold">Vencidas</th>
                <th className="w-28 px-3 py-2.5 text-right text-[#8b93b8] font-semibold">Hrs Est.</th>
                <th className="w-28 px-3 py-2.5 text-right text-[#8b93b8] font-semibold">Hrs Real</th>
                <th className="w-40 px-3 py-2.5 text-left text-[#8b93b8] font-semibold">Carga</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ user, active, done, blocked, review, estHours, realHours, overdue, workload, total }) => {
                const barPct = Math.min(Math.round((active / Math.max(total, 1)) * 100), 100);
                return (
                  <tr key={user.id} className="border-b border-[#2e3352]/50 hover:bg-white/[0.02] transition-colors">

                    {/* Persona */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#4f7cff]/20 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-[#4f7cff]">
                          {user.name?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-[#e8eaf6]">{user.name}</div>
                          <div className="text-[10px] text-[#8b93b8]">{user.role}</div>
                        </div>
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${workload.bg}`} style={{ color: workload.color }}>
                        {workload.label}
                      </span>
                    </td>

                    {/* Activas */}
                    <td className="px-3 py-3 text-center">
                      <span className="font-semibold text-[#e8eaf6]">{active}</span>
                    </td>

                    {/* En revisión */}
                    <td className="px-3 py-3 text-center">
                      {review > 0
                        ? <span className="font-semibold text-[#f5a623]">{review}</span>
                        : <Minus size={12} className="mx-auto text-[#2e3352]" />}
                    </td>

                    {/* Completadas */}
                    <td className="px-3 py-3 text-center">
                      {done > 0
                        ? <span className="flex items-center justify-center gap-1 text-[#3ecf8e] font-semibold"><CheckCircle2 size={11} />{done}</span>
                        : <Minus size={12} className="mx-auto text-[#2e3352]" />}
                    </td>

                    {/* Bloqueadas */}
                    <td className="px-3 py-3 text-center">
                      {blocked > 0
                        ? <span className="font-semibold text-[#ff5c5c]">{blocked}</span>
                        : <Minus size={12} className="mx-auto text-[#2e3352]" />}
                    </td>

                    {/* Vencidas */}
                    <td className="px-3 py-3 text-center">
                      {overdue > 0
                        ? <span className="flex items-center justify-center gap-1 text-[#ff5c5c] font-semibold"><AlertTriangle size={10} />{overdue}</span>
                        : <Minus size={12} className="mx-auto text-[#2e3352]" />}
                    </td>

                    {/* Horas estimadas */}
                    <td className="px-3 py-3 text-right">
                      {estHours > 0
                        ? <span className="flex items-center justify-end gap-1 text-[#8b93b8]"><Clock size={10} />{estHours}h</span>
                        : <Minus size={12} className="ml-auto text-[#2e3352]" />}
                    </td>

                    {/* Horas reales */}
                    <td className="px-3 py-3 text-right">
                      {realHours > 0
                        ? <span className="flex items-center justify-end gap-1" style={{ color: realHours > estHours && estHours > 0 ? "#ff5c5c" : "#8b93b8" }}>
                            <Clock size={10} />{realHours}h
                          </span>
                        : <Minus size={12} className="ml-auto text-[#2e3352]" />}
                    </td>

                    {/* Barra de carga */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-[#2e3352] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${barPct}%`, backgroundColor: workload.bar }}
                          />
                        </div>
                        <span className="text-[10px] w-6 text-right text-[#8b93b8]">{active}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
