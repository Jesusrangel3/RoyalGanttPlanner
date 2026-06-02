import { cookies } from 'next/headers';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'royal_gantt_planner_2026_super_secure_secret_key_1234567890';

export interface SessionPayload {
  id: string;
  email: string;
  role: string;
  exp: number;
}

/**
 * Firma un token JWT ligero utilizando HMAC SHA-256 de forma nativa.
 */
export function signToken(payload: Omit<SessionPayload, 'exp'>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({
    ...payload,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7 // 7 días de duración
  })).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
    
  return `${header}.${body}.${signature}`;
}

/**
 * Verifica la firma y expiración de un token JWT.
 */
export function verifyToken(token: string): SessionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [header, body, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');
      
    if (signature !== expectedSignature) {
      return null;
    }
    
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (decoded.exp < Date.now()) {
      return null; // Token expirado
    }
    
    return decoded;
  } catch (err) {
    return null;
  }
}

/**
 * Obtiene y valida el usuario autenticado desde la cookie de sesión HTTP-only.
 */
export function getAuthenticatedUser(): Omit<SessionPayload, 'exp'> | null {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('session')?.value;
    if (!token) return null;
    
    const verified = verifyToken(token);
    if (!verified) return null;
    
    return {
      id: verified.id,
      email: verified.email,
      role: verified.role
    };
  } catch (err) {
    return null;
  }
}
