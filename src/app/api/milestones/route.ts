import { NextResponse } from 'next/server';
import { executeQuery, sql } from '@/lib/db';
import { Milestone } from '@/types';
import { getAuthenticatedUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

// GET: Obtener hitos
export async function GET() {
  try {
    const sessionUser = getAuthenticatedUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: 'No autorizado. Por favor inicie sesión.' }, { status: 401 });
    }

    const result = await executeQuery('SELECT id, projectId, name, targetDate, description, status FROM Hitos_Gantt');
    return NextResponse.json({ success: true, Milestones_Gantt: result.recordset });
  } catch (error: any) {
    console.error('Error al obtener hitos:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Crear un nuevo hito
export async function POST(request: Request) {
  try {
    const sessionUser = getAuthenticatedUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: 'No autorizado. Por favor inicie sesión.' }, { status: 401 });
    }
    if (sessionUser.role !== 'Project Manager') {
      return NextResponse.json({ success: false, error: 'Acceso denegado. Se requieren permisos de Project Manager.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, projectId, name, targetDate, description, status } = body as Milestone;

    if (!id || !projectId || !name || !targetDate || !status) {
      return NextResponse.json({ success: false, error: 'Faltan campos obligatorios para crear el hito.' }, { status: 400 });
    }

    await executeQuery(`
      INSERT INTO Hitos_Gantt (id, projectId, name, targetDate, description, status)
      VALUES (@id, @projectId, @name, @targetDate, @description, @status)
    `, {
      id: { type: sql.NVarChar, value: id },
      projectId: { type: sql.NVarChar, value: projectId },
      name: { type: sql.NVarChar, value: name },
      targetDate: { type: sql.VarChar, value: targetDate },
      description: { type: sql.NVarChar, value: description || null },
      status: { type: sql.NVarChar, value: status }
    });

    return NextResponse.json({ success: true, milestone: body });
  } catch (error: any) {
    console.error('Error al crear hito:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Actualizar un hito
export async function PUT(request: Request) {
  try {
    const sessionUser = getAuthenticatedUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: 'No autorizado. Por favor inicie sesión.' }, { status: 401 });
    }
    if (sessionUser.role !== 'Project Manager') {
      return NextResponse.json({ success: false, error: 'Acceso denegado. Se requieren permisos de Project Manager.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, projectId, name, targetDate, description, status } = body as Milestone;

    if (!id || !projectId || !name || !targetDate || !status) {
      return NextResponse.json({ success: false, error: 'Faltan campos obligatorios para actualizar el hito.' }, { status: 400 });
    }

    await executeQuery(`
      UPDATE Hitos_Gantt
      SET projectId = @projectId, name = @name, targetDate = @targetDate, description = @description, status = @status
      WHERE id = @id
    `, {
      id: { type: sql.NVarChar, value: id },
      projectId: { type: sql.NVarChar, value: projectId },
      name: { type: sql.NVarChar, value: name },
      targetDate: { type: sql.VarChar, value: targetDate },
      description: { type: sql.NVarChar, value: description || null },
      status: { type: sql.NVarChar, value: status }
    });

    return NextResponse.json({ success: true, milestone: body });
  } catch (error: any) {
    console.error('Error al actualizar hito:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Eliminar un hito
export async function DELETE(request: Request) {
  try {
    const sessionUser = getAuthenticatedUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: 'No autorizado. Por favor inicie sesión.' }, { status: 401 });
    }
    if (sessionUser.role !== 'Project Manager') {
      return NextResponse.json({ success: false, error: 'Acceso denegado. Se requieren permisos de Project Manager.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Se requiere el parámetro ID para eliminar.' }, { status: 400 });
    }

    await executeQuery('DELETE FROM Hitos_Gantt WHERE id = @id', {
      id: { type: sql.NVarChar, value: id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error al eliminar hito:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
