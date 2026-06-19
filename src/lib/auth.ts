import { User } from "@/types";
import { hashPassword } from "@/lib/utils";

/**
 * Representa un usuario con credenciales de autenticación.
 */
export type AuthUser = User & {
  password?: string;
};

const STORAGE_SESSION_KEY = "ganttpro-auth-session";
const INSTITUTIONAL_DOMAIN = "gmail.com";

// ── Validación de Entrada ────────────────────────────

/**
 * Valida que un correo tenga un formato válido según RFC 5322 simplificado.
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida que una contraseña sea lo suficientemente fuerte.
 * Requisitos: mínimo 6 caracteres, al menos 1 número.
 */
function isStrongPassword(password: string): boolean {
  return password.length >= 6 && /\d/.test(password);
}

/**
 * Valida que un nombre tenga al menos 2 caracteres significativos y contenga solo letras.
 */
function isValidName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 2 && /^[a-záéíóúñA-ZÁÉÍÓÚÑ\s]+$/.test(trimmed);
}

// ── Control de Sesión en Cliente ──────────────────────

/**
 * Recupera el usuario de la sesión activa desde localStorage.
 */
export function getSessionUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

/**
 * Guarda o elimina la sesión activa del usuario en localStorage.
 */
export function saveSessionUser(user: AuthUser | null) {
  if (typeof window === "undefined") return;
  try {
    if (!user) {
      window.localStorage.removeItem(STORAGE_SESSION_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(user));
  } catch (error) {
    console.error("Error al guardar sesión local:", error);
  }
}

/**
 * Elimina la sesión activa actual de manera segura.
 */
export function clearSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_SESSION_KEY);
  } catch (error) {
    console.error("Error al limpiar sesión local:", error);
  }
}

/**
 * Valida que el correo pertenezca al dominio institucional configurado.
 */
export function validateInstitutionalEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!isValidEmail(normalized)) return false;
  return normalized.endsWith(`@${INSTITUTIONAL_DOMAIN}`);
}

// ── Solicitudes de Autenticación a API ────────────────

/**
 * Autentica un usuario en el servidor.
 * La contraseña se transmite hasheada en SHA-256 para evitar enviarla en texto plano sobre HTTP.
 */
export async function loginUser(email: string, password: string): Promise<{ user: AuthUser | null; error?: string }> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    
    if (!isValidEmail(normalizedEmail)) {
      return { user: null, error: "Formato de correo inválido." };
    }
    
    if (!password || password.length === 0) {
      return { user: null, error: "La contraseña es requerida." };
    }
    
    const clientHash = await hashPassword(password);
    
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, password: clientHash })
    });
    
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { user: null, error: data.error || "Correo o contraseña incorrectos." };
    }
    
    return { user: data.user };
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    return { user: null, error: "No se pudo conectar con el servidor de la base de datos." };
  }
}

/**
 * Registra un nuevo usuario con validaciones iniciales en cliente y transmisión segura de hash.
 */
export async function registerUser(payload: {
  name: string;
  email: string;
  password: string;
  role: string;
  contractType: string;
  imageUrl?: string;
}): Promise<{ user?: AuthUser; error?: string }> {
  try {
    const email = payload.email.trim().toLowerCase();
    
    if (!isValidName(payload.name)) {
      return { error: "El nombre debe contener al menos 2 caracteres y solo letras." };
    }
    
    if (!validateInstitutionalEmail(email)) {
      return { error: `El correo debe ser institucional @${INSTITUTIONAL_DOMAIN}.` };
    }
    
    if (!isStrongPassword(payload.password)) {
      return { error: "La contraseña debe tener al menos 6 caracteres e incluir un número." };
    }
    
    const clientHash = await hashPassword(payload.password);
    
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        email,
        password: clientHash
      })
    });
    
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { error: data.error || "Error al registrar usuario." };
    }
    
    return { user: data.user };
  } catch (error) {
    console.error("Error al registrar:", error);
    return { error: "No se pudo conectar con el servidor de la base de datos." };
  }
}
