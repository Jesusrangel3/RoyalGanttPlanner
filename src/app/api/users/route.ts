import { NextResponse } from 'next/server';
import { executeQuery, sql } from '@/lib/db';
import { User } from '@/types';
import { getAuthenticatedUser } from '@/lib/session';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// GET: Obtener todos los usuarios (sin contraseñas)
export async function GET() {
  try {
    const sessionUser = getAuthenticatedUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: 'No autorizado. Por favor inicie sesión.' }, { status: 401 });
    }

    const result = await executeQuery(`
      SELECT id, name, email, initials, color, role, contractType, status, imageUrl, availableHours, totalAssignedHours, skills
      FROM users_Gantt
    `);
    const users = result.recordset.map(u => ({
      ...u,
      skills: u.skills ? JSON.parse(u.skills) : [],
    }));
    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    console.error('Error al obtener usuarios:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Actualizar un usuario
export async function PUT(request: Request) {
  try {
    const sessionUser = getAuthenticatedUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: 'No autorizado. Por favor inicie sesión.' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, role, contractType, status, availableHours, skills, imageUrl } = body as User;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Se requiere el ID de usuario.' }, { status: 400 });
    }

    const isPM = sessionUser.role === 'Project Manager';
    const isSelf = sessionUser.id === id;

    // Regla de Autorización: Sólo el propio usuario o el PM pueden editar un perfil.
    if (!isSelf && !isPM) {
      return NextResponse.json({ success: false, error: 'Acceso denegado. No tiene permisos para modificar este perfil.' }, { status: 403 });
    }

    // Regla de Autorización: Parámetros administrativos (rol, estado, disponibilidad, contrato) requieren ser PM.
    // Si un usuario no-PM está intentando enviar campos administrativos diferentes de lo que ya tiene, denegamos.
    if (!isPM) {
      if (role !== undefined || status !== undefined || availableHours !== undefined || contractType !== undefined) {
        return NextResponse.json({ success: false, error: 'Acceso denegado. Solo un Project Manager puede modificar roles, estados, tipo de contrato o disponibilidad.' }, { status: 403 });
      }
    }

    // Actualizar campos
    await executeQuery(`
      UPDATE users_Gantt
      SET name = COALESCE(@name, name),
          role = COALESCE(@role, role),
          contractType = COALESCE(@contractType, contractType),
          status = COALESCE(@status, status),
          availableHours = COALESCE(@availableHours, availableHours),
          skills = COALESCE(@skills, skills),
          imageUrl = COALESCE(@imageUrl, imageUrl)
      WHERE id = @id
    `, {
      id: { type: sql.NVarChar, value: id },
      name: { type: sql.NVarChar, value: name || null },
      role: { type: sql.NVarChar, value: role || null },
      contractType: { type: sql.NVarChar, value: contractType || null },
      status: { type: sql.NVarChar, value: status || null },
      availableHours: { type: sql.Int, value: availableHours !== undefined ? availableHours : null },
      skills: { type: sql.NVarChar, value: skills ? JSON.stringify(skills) : null },
      imageUrl: { type: sql.NVarChar, value: imageUrl || null }
    });

    return NextResponse.json({ success: true, user: body });
  } catch (error: any) {
    console.error('Error al actualizar usuario:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Crear un nuevo usuario (solo PM)
export async function POST(request: Request) {
  try {
    const sessionUser = getAuthenticatedUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: 'No autorizado.' }, { status: 401 });
    }
    if (sessionUser.role !== 'Project Manager') {
      return NextResponse.json({ success: false, error: 'Solo el Project Manager puede crear usuarios.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, role, contractType, availableHours, skills, color, initials, imageUrl } = body as Partial<User>;

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ success: false, error: 'Nombre y correo son obligatorios.' }, { status: 400 });
    }

    // Check email uniqueness
    const exists = await executeQuery('SELECT COUNT(*) as c FROM users_Gantt WHERE email = @email', {
      email: { type: sql.NVarChar, value: email.trim().toLowerCase() },
    });
    if (exists.recordset[0].c > 0) {
      return NextResponse.json({ success: false, error: 'Ya existe un usuario con ese correo.' }, { status: 409 });
    }

    const id = 'u_' + Date.now();
    const COLORS = ['#4f7cff','#7c5cfc','#3ecf8e','#f5a623','#ff5c5c','#38bdf8','#e879f9','#fb923c'];
    const userColor = color || COLORS[Math.floor(Math.random() * COLORS.length)];
    const userInitials = initials || name.trim().split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

    // Temp password: "Royal1234" — user must change on first login
    const tempHash = crypto.createHash('sha256').update('Royal1234').digest('hex');
    const passwordHash = await bcrypt.hash(tempHash, 10);

    await executeQuery(`
      INSERT INTO users_Gantt (id, name, email, initials, color, role, contractType, status, password, availableHours, skills, mustChangePassword, imageUrl)
      VALUES (@id, @name, @email, @initials, @color, @role, @contractType, 'active', @password, @availableHours, @skills, 1, @imageUrl)
    `, {
      id: { type: sql.NVarChar, value: id },
      name: { type: sql.NVarChar, value: name.trim() },
      email: { type: sql.NVarChar, value: email.trim().toLowerCase() },
      initials: { type: sql.NVarChar, value: userInitials },
      color: { type: sql.NVarChar, value: userColor },
      role: { type: sql.NVarChar, value: role || 'Frontend Developer' },
      contractType: { type: sql.NVarChar, value: contractType || 'Por hora' },
      password: { type: sql.NVarChar, value: passwordHash },
      availableHours: { type: sql.Int, value: availableHours || 40 },
      skills: { type: sql.NVarChar, value: JSON.stringify(skills || []) },
      imageUrl: { type: sql.NVarChar, value: imageUrl || null },
    });

    const newUser: Partial<User> = {
      id, name: name.trim(), email: email.trim().toLowerCase(),
      initials: userInitials, color: userColor, role: role as any,
      contractType: contractType as any, status: 'active',
      availableHours: availableHours || 40, skills: skills || [],
    };
    return NextResponse.json({ success: true, user: newUser, tempPassword: 'Royal1234' });
  } catch (error: any) {
    console.error('Error al crear usuario:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Eliminar un usuario
export async function DELETE(request: Request) {
  try {
    const sessionUser = getAuthenticatedUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: 'No autorizado. Por favor inicie sesión.' }, { status: 401 });
    }

    const isPM = sessionUser.role === 'Project Manager';
    if (!isPM) {
      return NextResponse.json({ success: false, error: 'Acceso denegado. Se requieren permisos de Project Manager para eliminar usuarios.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Se requiere el ID para eliminar.' }, { status: 400 });
    }

    // Evitar que el administrador se elimine a sí mismo
    if (id === sessionUser.id) {
      return NextResponse.json({ success: false, error: 'No es posible eliminarse a sí mismo de la plataforma.' }, { status: 400 });
    }

    await executeQuery('DELETE FROM users_Gantt WHERE id = @id', {
      id: { type: sql.NVarChar, value: id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error al eliminar usuario:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
