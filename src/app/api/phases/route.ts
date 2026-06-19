import { NextResponse } from 'next/server';
import { executeQuery, sql } from '@/lib/db';
import { Phase } from '@/types';
import { getAuthenticatedUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

// GET: Obtener todas las fases
export async function GET() {
  try {
    const sessionUser = getAuthenticatedUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: 'No autorizado. Por favor inicie sesión.' }, { status: 401 });
    }

    const result = await executeQuery('SELECT id, name, color, projectId FROM Phases_Gantt');
    return NextResponse.json({ success: true, Phases_Gantt: result.recordset });
  } catch (error: any) {
    console.error('Error al obtener fases:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Crear una nueva fase
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
    const { id, name, color, projectId } = body as Phase;

    if (!id || !name || !color) {
      return NextResponse.json({ success: false, error: 'Faltan campos obligatorios para crear la fase.' }, { status: 400 });
    }

    await executeQuery(`
      INSERT INTO Phases_Gantt (id, name, color, projectId)
      VALUES (@id, @name, @color, @projectId)
    `, {
      id: { type: sql.NVarChar, value: id },
      name: { type: sql.NVarChar, value: name },
      color: { type: sql.NVarChar, value: color },
      projectId: { type: sql.NVarChar, value: projectId || 'proj1' }
    });

    return NextResponse.json({ success: true, phase: body });
  } catch (error: any) {
    console.error('Error al crear fase:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Actualizar una fase
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
    const { id, name, color, projectId } = body as Phase;

    if (!id || !name || !color) {
      return NextResponse.json({ success: false, error: 'Faltan campos obligatorios para actualizar la fase.' }, { status: 400 });
    }

    await executeQuery(`
      UPDATE Phases_Gantt
      SET name = @name, color = @color, projectId = @projectId
      WHERE id = @id
    `, {
      id: { type: sql.NVarChar, value: id },
      name: { type: sql.NVarChar, value: name },
      color: { type: sql.NVarChar, value: color },
      projectId: { type: sql.NVarChar, value: projectId || 'proj1' }
    });

    return NextResponse.json({ success: true, phase: body });
  } catch (error: any) {
    console.error('Error al actualizar fase:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Eliminar una fase
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

    await executeQuery('DELETE FROM Phases_Gantt WHERE id = @id', {
      id: { type: sql.NVarChar, value: id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error al eliminar fase:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
