import { NextResponse } from 'next/server';
import { executeQuery, sql } from '@/lib/db';
import { User } from '@/types';
import { getAuthenticatedUser } from '@/lib/session';

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
      FROM Users
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
      UPDATE Users
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

    await executeQuery('DELETE FROM Users WHERE id = @id', {
      id: { type: sql.NVarChar, value: id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error al eliminar usuario:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
