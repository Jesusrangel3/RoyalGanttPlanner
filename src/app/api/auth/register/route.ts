import { NextResponse } from 'next/server';
import { executeQuery, sql } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getAuthenticatedUser } from '@/lib/session';
import { checkRateLimit } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1';
    const { ok, retryAfter } = checkRateLimit(`register:${ip}`, 5);
    if (!ok) {
      logger.warn('Rate limit excedido en registro', { ip });
      return NextResponse.json(
        { success: false, error: 'Demasiados intentos de registro. Intente de nuevo en un minuto.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const body = await request.json();
    const { id, name, email, password, role, contractType, imageUrl } = body;

    if (!name || !email || !password || !role || !contractType) {
      return NextResponse.json({ success: false, error: 'Todos los campos son obligatorios.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Validar si el correo institucional ya existe
    const existingCheck = await executeQuery(
      'SELECT COUNT(*) as count FROM Usuarios_Gantt WHERE email = @email',
      { email: { type: sql.NVarChar, value: normalizedEmail } }
    );

    if (existingCheck.recordset[0].count > 0) {
      return NextResponse.json({ success: false, error: 'Ya existe un usuario registrado con este correo.' }, { status: 400 });
    }

    // Calcular iniciales
    const initials = name
      .split(' ')
      .map((part: string) => part[0] || '')
      .join('')
      .toUpperCase()
      .slice(0, 2);

    // Obtener paleta de colores para asignar uno
    const countCheck = await executeQuery('SELECT COUNT(*) as count FROM Usuarios_Gantt');
    const userCount = countCheck.recordset[0].count;
    const colorPalette = ['#4f7cff', '#7c5cfc', '#3ecf8e', '#f5a623', '#ff5c5c', '#38bdf8', '#e879f9', '#fb923c'];
    const color = colorPalette[userCount % colorPalette.length];

    // Encriptar la contraseña (que viene como SHA-256 desde el cliente) usando bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    const sessionUser = getAuthenticatedUser();
    const isPM = sessionUser?.role === 'Project Manager';

    const userId = id || `u${Date.now()}`;
    const status = (normalizedEmail === 'renedejesusrangel228@gmail.com' || isPM) ? 'active' : 'pending';

    await executeQuery(`
      INSERT INTO Usuarios_Gantt (id, name, email, initials, color, role, contractType, status, password, imageUrl, availableHours, totalAssignedHours, skills)
      VALUES (@id, @name, @email, @initials, @color, @role, @contractType, @status, @password, @imageUrl, 40, 0, @skills)
    `, {
      id: { type: sql.NVarChar, value: userId },
      name: { type: sql.NVarChar, value: name.trim() },
      email: { type: sql.NVarChar, value: normalizedEmail },
      initials: { type: sql.NVarChar, value: initials },
      color: { type: sql.NVarChar, value: color },
      role: { type: sql.NVarChar, value: role },
      contractType: { type: sql.NVarChar, value: contractType },
      status: { type: sql.NVarChar, value: status },
      password: { type: sql.NVarChar, value: hashedPassword },
      imageUrl: { type: sql.NVarChar, value: imageUrl || null },
      skills: { type: sql.NVarChar, value: JSON.stringify([]) }
    });

    const newUser = {
      id: userId,
      name: name.trim(),
      email: normalizedEmail,
      initials,
      color,
      role,
      contractType,
      status,
      imageUrl: imageUrl || undefined,
      availableHours: 40,
      skills: []
    };

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    console.error('Error en registro:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error en el servidor al registrar usuario.' }, { status: 500 });
  }
}
