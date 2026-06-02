import { useState } from 'react';
import { AuthUser } from '@/lib/auth';
import { hashPassword } from '@/lib/utils';

interface ChangePasswordViewProps {
  user: AuthUser;
  onSuccess: (updatedUser: AuthUser) => void;
  onLogout: () => void;
  theme?: "dark" | "light";
}

export default function ChangePasswordView({ user, onSuccess, onLogout, theme = "dark" }: ChangePasswordViewProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    // Validaciones básicas
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (!/\d/.test(newPassword)) {
      setError('La nueva contraseña debe contener al menos un número.');
      return;
    }

    if (newPassword === 'Royal1234') {
      setError('No puede utilizar la contraseña provisional predeterminada.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }

    setLoading(false);
    try {
      setLoading(true);

      // Hashear las contraseñas con SHA-256 en el cliente antes de transmitirlas
      const currentHashed = await hashPassword(currentPassword);
      const newHashed = await hashPassword(newPassword);

      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: currentHashed,
          newPassword: newHashed
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Error al cambiar la contraseña. Verifique sus datos.');
        return;
      }

      setMessage('¡Contraseña actualizada con éxito! Redirigiendo...');
      
      // Esperar 1.5 segundos para mostrar el mensaje de éxito
      setTimeout(() => {
        const updatedUser: AuthUser = {
          ...user,
          mustChangePassword: false
        };
        onSuccess(updatedUser);
      }, 1500);
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error de red. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  const isDark = theme === "dark";

  return (
    <div className={`max-w-md w-full rounded-3xl border p-8 md:p-10 shadow-2xl flex flex-col justify-between backdrop-blur-md transition-all duration-300 ${
      isDark 
        ? "border-[#2f3336] bg-[#000000]/95 text-white shadow-black/80" 
        : "border-[#cbd5e1] bg-[#ffffff]/95 text-[#0f172a] shadow-black/10"
    }`}>
      <div className="w-full">
        {/* Logo superior centrado */}
        <div className="mb-8 flex justify-center">
          <img src="/RTransport.png" alt="Royal Transport" className="h-14 w-auto object-contain" />
        </div>

        {/* Título de cambio de contraseña */}
        <div className="mb-8">
          <h1 className={`text-2xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-[#0f172a]"}`}>
            Cambio de Contraseña
          </h1>
          <p className={`mt-2 text-sm leading-relaxed ${isDark ? "text-[#71767b]" : "text-[#536471]"}`}>
            Por seguridad de la empresa, debes cambiar tu contraseña provisional antes de acceder.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-[#e8eaf6]" : "text-[#334155]"}`}>
                Contraseña provisional actual
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
                className={`w-full rounded-xl border px-4 py-3.5 text-sm outline-none transition focus:ring-1 disabled:opacity-50 ${
                  isDark
                    ? "border-[#2f3336] bg-[#000000] text-white placeholder-[#536471] focus:border-[#4f7cff] focus:ring-[#4f7cff]"
                    : "border-[#cbd5e1] bg-white text-[#0f172a] placeholder-[#94a3b8] focus:border-[#3b82f6] focus:ring-[#3b82f6]"
                }`}
                placeholder="Ingresa tu contraseña actual"
                required
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-[#e8eaf6]" : "text-[#334155]"}`}>
                Nueva contraseña
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                className={`w-full rounded-xl border px-4 py-3.5 text-sm outline-none transition focus:ring-1 disabled:opacity-50 ${
                  isDark
                    ? "border-[#2f3336] bg-[#000000] text-white placeholder-[#536471] focus:border-[#4f7cff] focus:ring-[#4f7cff]"
                    : "border-[#cbd5e1] bg-white text-[#0f172a] placeholder-[#94a3b8] focus:border-[#3b82f6] focus:ring-[#3b82f6]"
                }`}
                placeholder="Mínimo 6 caracteres y 1 número"
                required
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-[#e8eaf6]" : "text-[#334155]"}`}>
                Confirmar nueva contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className={`w-full rounded-xl border px-4 py-3.5 text-sm outline-none transition focus:ring-1 disabled:opacity-50 ${
                  isDark
                    ? "border-[#2f3336] bg-[#000000] text-white placeholder-[#536471] focus:border-[#4f7cff] focus:ring-[#4f7cff]"
                    : "border-[#cbd5e1] bg-white text-[#0f172a] placeholder-[#94a3b8] focus:border-[#3b82f6] focus:ring-[#3b82f6]"
                }`}
                placeholder="Repite la nueva contraseña"
                required
              />
            </div>
          </div>

          {error && (
            <div className={`rounded-xl border p-3 text-xs animate-fade-in ${
              isDark
                ? "bg-[#ff1a53]/10 border-[#ff1a53]/25 text-[#ff5c8a]"
                : "bg-red-50 border-red-200 text-red-600"
            }`}>
              ⚠️ {error}
            </div>
          )}

          {message && (
            <div className={`rounded-xl border p-3 text-xs animate-fade-in ${
              isDark
                ? "bg-[#3ecf8e]/10 border-[#3ecf8e]/25 text-[#3ecf8e]"
                : "bg-green-50 border-green-200 text-green-600"
            }`}>
              ✓ {message}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-full py-3.5 text-sm font-bold text-white transition active:scale-[0.98] cursor-pointer disabled:opacity-50 shadow-lg ${
                isDark
                  ? "bg-[#4f7cff] hover:bg-[#3d6ae6] shadow-[#4f7cff]/15"
                  : "bg-[#3b82f6] hover:bg-[#2563eb] shadow-[#3b82f6]/15"
              }`}
            >
              {loading ? "Actualizando..." : "Guardar nueva contraseña"}
            </button>
            
            <button
              type="button"
              onClick={onLogout}
              disabled={loading}
              className={`w-full rounded-full border py-2.5 text-xs font-bold transition cursor-pointer disabled:opacity-50 ${
                isDark
                  ? "border-[#2f3336] bg-transparent text-[#71767b] hover:bg-white/5"
                  : "border-slate-300 bg-transparent text-[#475569] hover:bg-slate-50"
              }`}
            >
              Regresar al Inicio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
