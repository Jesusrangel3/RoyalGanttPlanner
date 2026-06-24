"use client";

import { useState } from "react";
import { AuthUser, loginUser, validateInstitutionalEmail } from "@/lib/auth";

interface AuthViewProps {
  onSuccess: (user: AuthUser) => void;
  theme?: "dark" | "light";
}

/**
 * Componente principal de autenticación (Solo Inicio de Sesión).
 * Maneja el inicio de sesión de usuario y la validación de correo institucional.
 */
export default function AuthView({ onSuccess, theme = "dark" }: AuthViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Limpia los mensajes de error y de éxito antes de procesar el formulario.
   */
  function resetMessages() {
    setMessage(null);
    setError(null);
  }

  /**
   * Procesa el envío del formulario de login.
   * - Valida el correo institucional.
   * - Intenta iniciar sesión.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    if (!validateInstitutionalEmail(email)) {
      setError("Ingrese un correo válido (@gmail.com o @royaltransports.com.mx).");
      return;
    }

    const result = await loginUser(email, password);
    if (result.error || !result.user) {
      setError(result.error || "Correo o contraseña incorrectos. Verifique sus datos.");
      return;
    }
    onSuccess(result.user);
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

        {/* Título de inicio de sesión similar a X */}
        <div className="mb-8 text-center">
          <h1 className={`text-3xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-[#0f172a]"}`}>
            Royal Gantt Planner
          </h1>
          <p className={`mt-2 text-sm ${isDark ? "text-[#71767b]" : "text-[#536471]"}`}>
            Indentificate con tu correo institucional para acceder.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-[#e8eaf6]" : "text-[#334155]"}`}>
                Correo institucional
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full rounded-xl border px-4 py-3.5 text-sm outline-none transition focus:ring-1 ${
                  isDark
                    ? "border-[#2f3336] bg-[#000000] text-white placeholder-[#536471] focus:border-[#4f7cff] focus:ring-[#4f7cff]"
                    : "border-[#cbd5e1] bg-white text-[#0f172a] placeholder-[#94a3b8] focus:border-[#3b82f6] focus:ring-[#3b82f6]"
                }`}
                placeholder="usuario@royaltransports.com.mx"
                required
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-[#e8eaf6]" : "text-[#334155]"}`}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full rounded-xl border px-4 py-3.5 text-sm outline-none transition focus:ring-1 ${
                  isDark
                    ? "border-[#2f3336] bg-[#000000] text-white placeholder-[#536471] focus:border-[#4f7cff] focus:ring-[#4f7cff]"
                    : "border-[#cbd5e1] bg-white text-[#0f172a] placeholder-[#94a3b8] focus:border-[#3b82f6] focus:ring-[#3b82f6]"
                }`}
                placeholder="••••••••"
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

          <button
            type="submit"
            className={`w-full rounded-full py-3.5 text-sm font-bold text-white transition active:scale-[0.98] cursor-pointer shadow-lg ${
              isDark
                ? "bg-[#4f7cff] hover:bg-[#3d6ae6] shadow-[#4f7cff]/15"
                : "bg-[#3b82f6] hover:bg-[#2563eb] shadow-[#3b82f6]/15"
            }`}
          >
            Iniciar sesión
          </button>
        </form>
      </div>

      <div className={`mt-8 border-t pt-6 text-center ${isDark ? "border-[#2f3336]/40" : "border-slate-200"}`}>
        <p className={`text-xs leading-relaxed ${isDark ? "text-[#71767b]" : "text-slate-500"}`}>
          Usa tu correo institucional <span className={isDark ? "text-[#e8eaf6]" : "text-[#0f172a] font-semibold"}>@royaltransports.com.mx</span> o <span className={isDark ? "text-[#e8eaf6]" : "text-[#0f172a] font-semibold"}>@gmail.com</span> y tu contraseña para acceder.
        </p>
      </div>
    </div>
  );
}
