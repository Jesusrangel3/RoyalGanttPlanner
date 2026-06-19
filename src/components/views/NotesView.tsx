"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pin, Trash2, Search, Tag, Globe, Lock, Edit3, X, Check } from "lucide-react";
import { Note, AuthUser, Project } from "@/types";
import { getSessionUser } from "@/lib/auth";

interface Notes_GanttViewProps {
  users_Gantt: AuthUser[];
  Projects_Gantt: Project[];
  activeProjectId?: string;
}

const NOTE_COLORS = [
  { value: "#fef3c7", label: "Amarillo" },
  { value: "#dcfce7", label: "Verde" },
  { value: "#dbeafe", label: "Azul" },
  { value: "#fce7f3", label: "Rosa" },
  { value: "#ede9fe", label: "Violeta" },
  { value: "#ffedd5", label: "Naranja" },
  { value: "#1e2235", label: "Oscuro" },
];

function NoteCard({
  note,
  onEdit,
  onDelete,
  onTogglePin,
}: {
  note: Note;
  onEdit: (n: Note) => void;
  onDelete: (id: string) => void;
  onTogglePin: (n: Note) => void;
}) {
  const isDark = note.color === "#1e2235";
  const textColor = isDark ? "#e8eaf6" : "#1e293b";
  const subColor = isDark ? "#8b93b8" : "#64748b";

  return (
    <div
      className="relative rounded-xl p-4 flex flex-col gap-2 group transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer border border-transparent hover:border-black/10"
      style={{ backgroundColor: note.color, minHeight: 140 }}
      onClick={() => onEdit(note)}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-sm leading-snug flex-1" style={{ color: textColor }}>
          {note.title || "Sin título"}
        </h3>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onTogglePin(note)}
            className="p-1 rounded hover:bg-black/10 transition"
            aria-label={note.pinned ? "Desfijar" : "Fijar"}
          >
            <Pin size={13} style={{ color: note.pinned ? "#f59e0b" : subColor }} fill={note.pinned ? "#f59e0b" : "none"} />
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="p-1 rounded hover:bg-red-500/20 transition"
            title="Eliminar"
          >
            <Trash2 size={13} style={{ color: subColor }} />
          </button>
        </div>
      </div>

      {note.content && (
        <p className="text-xs leading-relaxed line-clamp-4 whitespace-pre-wrap flex-1" style={{ color: subColor }}>
          {note.content}
        </p>
      )}

      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex flex-wrap gap-1">
          {note.tags?.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: "rgba(0,0,0,0.1)", color: subColor }}
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {note.isShared && <span aria-label="Nota compartida"><Globe size={10} style={{ color: subColor }} /></span>}
          <span className="text-[9px]" style={{ color: subColor }}>
            {note.updatedAt ? new Date(note.updatedAt).toLocaleDateString("es-MX", { month: "short", day: "numeric" }) : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

function NoteEditor({
  note,
  onSave,
  onClose,
  activeProjectId,
}: {
  note: Partial<Note>;
  onSave: (n: Partial<Note>) => void;
  onClose: () => void;
  activeProjectId?: string;
}) {
  const [form, setForm] = useState<Partial<Note>>({
    title: "",
    content: "",
    color: "#fef3c7",
    pinned: false,
    tags: [],
    isShared: false,
    projectId: activeProjectId,
    ...note,
  });
  const [tagsStr, setTagsStr] = useState((note.tags || []).join(", "));

  function handleSave() {
    const tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
    onSave({ ...form, tags });
  }

  const isDark = form.color === "#1e2235";

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-black/10"
        style={{ backgroundColor: form.color, maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <input
            className="flex-1 bg-transparent font-bold text-base outline-none placeholder:opacity-40"
            style={{ color: isDark ? "#e8eaf6" : "#1e293b" }}
            placeholder="Título de la nota..."
            value={form.title || ""}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            autoFocus
          />
          <button onClick={onClose} className="p-1 rounded hover:bg-black/10">
            <X size={16} style={{ color: isDark ? "#8b93b8" : "#64748b" }} />
          </button>
        </div>

        <textarea
          className="flex-1 bg-transparent px-4 pb-3 text-sm outline-none resize-none min-h-[180px] leading-relaxed placeholder:opacity-40"
          style={{ color: isDark ? "#c8cae0" : "#334155" }}
          placeholder="Escribe aquí tu nota..."
          value={form.content || ""}
          onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
        />

        <div className="px-4 pb-3 space-y-2 border-t border-black/10 pt-3">
          <div className="flex items-center gap-2">
            <Tag size={11} style={{ color: isDark ? "#8b93b8" : "#64748b" }} />
            <input
              className="flex-1 bg-black/10 rounded px-2 py-1 text-xs outline-none placeholder:opacity-50"
              style={{ color: isDark ? "#e8eaf6" : "#1e293b" }}
              placeholder="Etiquetas separadas por coma..."
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1.5">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setForm((p) => ({ ...p, color: c.value }))}
                  className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c.value,
                    borderColor: form.color === c.value ? "#4f7cff" : "transparent",
                  }}
                  title={c.label}
                />
              ))}
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer text-xs" style={{ color: isDark ? "#8b93b8" : "#64748b" }}>
              <input
                type="checkbox"
                checked={!!form.pinned}
                onChange={(e) => setForm((p) => ({ ...p, pinned: e.target.checked }))}
                className="accent-amber-500"
              />
              Fijar
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-xs" style={{ color: isDark ? "#8b93b8" : "#64748b" }}>
              <input
                type="checkbox"
                checked={!!form.isShared}
                onChange={(e) => setForm((p) => ({ ...p, isShared: e.target.checked }))}
                className="accent-[#4f7cff]"
              />
              Compartir con equipo
            </label>
          </div>
        </div>

        <div className="px-4 py-3 flex justify-end gap-2 border-t border-black/10">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded-lg bg-black/10 hover:bg-black/20 transition font-medium"
            style={{ color: isDark ? "#e8eaf6" : "#1e293b" }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-xs rounded-lg bg-[#4f7cff] text-white font-bold hover:bg-[#3a6be0] transition flex items-center gap-1.5"
          >
            <Check size={12} /> Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Notes_GanttView({ users_Gantt, Projects_Gantt, activeProjectId }: Notes_GanttViewProps) {
  const currentUser = getSessionUser();
  const [Notes_Gantt, setNotes_Gantt] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingNote, setEditingNote] = useState<Partial<Note> | null>(null);
  const [filterShared, setFilterShared] = useState<"all" | "mine" | "shared">("all");

  const loadNotes_Gantt = useCallback(async () => {
    try {
      setLoading(true);
      const url = activeProjectId ? `/api/Notes_Gantt?projectId=${activeProjectId}` : '/api/notes';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setNotes_Gantt(data.notes);
    } catch (err) {
      console.error("Error cargando notas:", err);
    } finally {
      setLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => { loadNotes_Gantt(); }, [loadNotes_Gantt]);

  async function handleSave(note: Partial<Note>) {
    try {
      const isNew = !note.id;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch('/api/notes', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...note, id: note.id || 'note_' + Date.now() }),
      });
      const data = await res.json();
      if (data.success) {
        await loadNotes_Gantt();
        setEditingNote(null);
      }
    } catch (err) {
      console.error("Error guardando nota:", err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta nota?")) return;
    await fetch(`/api/Notes_Gantt?id=${id}`, { method: 'DELETE' });
    setNotes_Gantt((prev) => prev.filter((n) => n.id !== id));
  }

  async function handleTogglePin(note: Note) {
    const updated = { ...note, pinned: !note.pinned };
    await handleSave(updated);
  }

  const filtered = Notes_Gantt.filter((n) => {
    const matchSearch =
      !search ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content?.toLowerCase().includes(search.toLowerCase()) ||
      n.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()));

    const matchFilter =
      filterShared === "all" ||
      (filterShared === "mine" && n.userId === currentUser?.id) ||
      (filterShared === "shared" && n.isShared);

    return matchSearch && matchFilter;
  });

  const pinned = filtered.filter((n) => n.pinned);
  const unpinned = filtered.filter((n) => !n.pinned);

  return (
    <div className="h-full flex flex-col bg-[#0f1117] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[#2e3352] bg-[#1a1d27] flex-shrink-0">
        <div className="flex-1 relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b93b8]" />
          <input
            className="w-full bg-[#0f1117] border border-[#2e3352] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#e8eaf6] outline-none focus:border-[#4f7cff] placeholder:text-[#8b93b8]"
            placeholder="Buscar notas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-1 bg-[#0f1117] border border-[#2e3352] rounded-lg p-0.5">
          {(["all", "mine", "shared"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterShared(f)}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition ${
                filterShared === f ? "bg-[#4f7cff] text-white" : "text-[#8b93b8] hover:text-white"
              }`}
            >
              {f === "all" ? "Todas" : f === "mine" ? "Mías" : "Compartidas"}
            </button>
          ))}
        </div>

        <button
          onClick={() => setEditingNote({ projectId: activeProjectId })}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4f7cff] text-white text-xs font-bold rounded-lg hover:bg-[#3a6be0] transition"
        >
          <Plus size={13} /> Nueva nota
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-[#8b93b8] text-sm">Cargando notas...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center text-[#8b93b8]">
            <Edit3 size={40} className="opacity-20 mb-3" />
            <p className="text-sm font-semibold">No hay notas todavía</p>
            <p className="text-xs mt-1 opacity-70">Crea tu primera nota con el botón de arriba</p>
            <button
              onClick={() => setEditingNote({ projectId: activeProjectId })}
              className="mt-4 px-4 py-2 bg-[#4f7cff] text-white text-xs font-bold rounded-lg hover:bg-[#3a6be0] transition flex items-center gap-1.5"
            >
              <Plus size={13} /> Crear nota
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {pinned.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Pin size={12} className="text-amber-400" fill="#fbbf24" />
                  <span className="text-[10px] font-bold text-[#8b93b8] uppercase tracking-wider">Fijadas</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {pinned.map((n) => (
                    <NoteCard key={n.id} note={n} onEdit={setEditingNote} onDelete={handleDelete} onTogglePin={handleTogglePin} />
                  ))}
                </div>
              </div>
            )}

            {unpinned.length > 0 && (
              <div>
                {pinned.length > 0 && (
                  <span className="text-[10px] font-bold text-[#8b93b8] uppercase tracking-wider block mb-3">Otras notas</span>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {unpinned.map((n) => (
                    <NoteCard key={n.id} note={n} onEdit={setEditingNote} onDelete={handleDelete} onTogglePin={handleTogglePin} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {editingNote !== null && (
        <NoteEditor
          note={editingNote}
          onSave={handleSave}
          onClose={() => setEditingNote(null)}
          activeProjectId={activeProjectId}
        />
      )}
    </div>
  );
}
