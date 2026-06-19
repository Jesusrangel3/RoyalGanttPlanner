import { NextResponse } from 'next/server';
import { executeQuery, sql } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { signToken } from '@/lib/session';
import { checkRateLimit } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1';
    const { ok, retryAfter } = checkRateLimit(`login:${ip}`, 20);
    if (!ok) {
      logger.warn('Rate limit excedido en login', { ip });
      return NextResponse.json(
        { success: false, error: 'Demasiados intentos de inicio de sesión. Intente de nuevo en un minuto.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'El correo y la contraseña son requeridos.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    console.log("--- INTENTO DE INICIO DE SESIÓN ---");
    console.log("Correo ingresado:", normalizedEmail);
    console.log("Hash enviado por cliente (longitud):", password.length);

    // Buscar el usuario en la base de datos
    const result = await executeQuery(
      `SELECT id, name, email, initials, color, role, contractType, status, imageUrl, password, availableHours, skills, mustChangePassword, loginAttempts, lockoutUntil 
       FROM users_Gantt 
       WHERE email = @email`,
      { email: { type: sql.NVarChar, value: normalizedEmail } }
    );

    console.log("Usuario encontrado en DB:", result.recordset.length > 0 ? "SÍ" : "NO");

    if (result.recordset.length === 0) {
      return NextResponse.json({ success: false, error: 'Correo o contraseña incorrectos.' }, { status: 400 });
    }

    const dbUser = result.recordset[0];
    console.log("Estado de usuario en DB:", dbUser.status);

    // 1. Verificar si la cuenta está bloqueada temporalmente
    if (dbUser.lockoutUntil) {
      const lockoutTime = new Date(dbUser.lockoutUntil).getTime();
      const now = Date.now();
      if (lockoutTime > now) {
        const remainingMinutes = Math.ceil((lockoutTime - now) / (60 * 1000));
        return NextResponse.json({ 
          success: false, 
          error: `Cuenta bloqueada temporalmente por exceso de intentos fallidos. Intente de nuevo en ${remainingMinutes} ${remainingMinutes === 1 ? 'minuto' : 'minutos'}.` 
        }, { status: 423 }); // 423 Locked
      }
    }

    // Verificar estado del usuario
    if (dbUser.status === 'inactive') {
      return NextResponse.json({ success: false, error: 'La cuenta de usuario está inactiva.' }, { status: 400 });
    }
    if (dbUser.status === 'pending') {
      return NextResponse.json({ success: false, error: 'Su cuenta está pendiente de aprobación por el Project Manager.' }, { status: 400 });
    }

    // Verificar contraseña usando bcrypt
    const match = await bcrypt.compare(password, dbUser.password);
    console.log("¿Coincide la contraseña?:", match ? "SÍ" : "NO");

    if (!match) {
      const newAttempts = (dbUser.loginAttempts || 0) + 1;
      let lockoutDate: Date | null = null;
      
      if (newAttempts >= 5) {
        // Bloquear cuenta por 15 minutos
        lockoutDate = new Date(Date.now() + 15 * 60 * 1000);
      }
      
      await executeQuery(
        `UPDATE users_Gantt 
         SET loginAttempts = @attempts, 
             lockoutUntil = @lockoutUntil 
         WHERE id = @id`,
        {
          id: { type: sql.NVarChar, value: dbUser.id },
          attempts: { type: sql.Int, value: newAttempts },
          lockoutUntil: { type: sql.DateTime2, value: lockoutDate }
        }
      );

      return NextResponse.json({ success: false, error: 'Correo o contraseña incorrectos.' }, { status: 400 });
    }

    // Restablecer intentos fallidos al iniciar sesión con éxito
    if (dbUser.loginAttempts > 0 || dbUser.lockoutUntil) {
      await executeQuery(
        `UPDATE users_Gantt 
         SET loginAttempts = 0, 
             lockoutUntil = NULL 
         WHERE id = @id`,
        { id: { type: sql.NVarChar, value: dbUser.id } }
      );
    }

    // Generar el token de sesión y establecer la cookie segura HTTP-only
    const token = signToken({
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role
    });
    
    // SameSite=None + Secure requerido para funcionar en iframe cross-origin (hub.royal-transports.com)
    cookies().set('session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });

    // Retornar el usuario sin la contraseña
    const userPayload = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      initials: dbUser.initials,
      color: dbUser.color,
      role: dbUser.role,
      contractType: dbUser.contractType,
      status: dbUser.status,
      imageUrl: dbUser.imageUrl || undefined,
      availableHours: dbUser.availableHours,
      skills: dbUser.skills ? JSON.parse(dbUser.skills) : [],
      mustChangePassword: dbUser.mustChangePassword === true || dbUser.mustChangePassword === 1,
    };

    return NextResponse.json({ success: true, user: userPayload });
  } catch (error: any) {
    console.error('Error en login API:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
