import { NextResponse } from 'next/server';
import { executeQuery, sql, getDbPool } from '@/lib/db';
import { Project } from '@/types';
import { getAuthenticatedUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

// GET: Obtener todos los proyectos
export async function GET() {
  try {
    const sessionUser = getAuthenticatedUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: 'No autorizado. Por favor inicie sesión.' }, { status: 401 });
    }

    const result = await executeQuery('SELECT id, name, description, startDate, endDate, status, leaderId FROM Proyectos_Gantt');
    return NextResponse.json({ success: true, Projects_Gantt: result.recordset });
  } catch (error: any) {
    console.error('Error al obtener proyectos:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Crear un nuevo proyecto
export async function POST(request: Request) {
  // 1. Autorización
  const sessionUser = getAuthenticatedUser();
  if (!sessionUser) {
    return NextResponse.json({ success: false, error: 'No autorizado. Por favor inicie sesión.' }, { status: 401 });
  }
  if (sessionUser.role !== 'Project Manager') {
    return NextResponse.json({ success: false, error: 'Acceso denegado. Se requieren permisos de Project Manager.' }, { status: 403 });
  }

  const pool = await getDbPool();
  const transaction = new sql.Transaction(pool);

  try {
    const body = await request.json();
    const { id, name, description, startDate, endDate, status, leaderId } = body as Project;

    // 2. Validación Backend
    if (!id || !name || !startDate || !endDate || !status || !leaderId) {
      return NextResponse.json({ success: false, error: 'Faltan campos obligatorios para crear el proyecto.' }, { status: 400 });
    }
    if (new Date(startDate) > new Date(endDate)) {
      return NextResponse.json({ success: false, error: 'La fecha de inicio no puede ser posterior a la fecha de fin.' }, { status: 400 });
    }

    await transaction.begin();

    // 3. Insertar Proyecto
    const requestProj = new sql.Request(transaction);
    requestProj.input('id', sql.NVarChar, id);
    requestProj.input('name', sql.NVarChar, name);
    requestProj.input('description', sql.NVarChar, description || null);
    requestProj.input('startDate', sql.VarChar, startDate);
    requestProj.input('endDate', sql.VarChar, endDate);
    requestProj.input('status', sql.NVarChar, status);
    requestProj.input('leaderId', sql.NVarChar, leaderId);

    await requestProj.query(`
      INSERT INTO Proyectos_Gantt (id, name, description, startDate, endDate, status, leaderId)
      VALUES (@id, @name, @description, @startDate, @endDate, @status, @leaderId)
    `);

    // 4. Crear por defecto fases iniciales para este proyecto de forma atómica
    const defaultPhases_Gantt = [
      { id: `${id}_init`, name: 'Inicio y planificación', color: '#4f7cff' },
      { id: `${id}_design`, name: 'Diseño y arquitectura', color: '#7c5cfc' },
      { id: `${id}_dev`, name: 'Desarrollo', color: '#3ecf8e' },
      { id: `${id}_qa`, name: 'Pruebas y entrega', color: '#f5a623' },
      { id: `${id}_blocked`, name: 'Bloqueadas', color: '#ff5c5c' }
    ];

    for (const phase of defaultPhases_Gantt) {
      const requestPhase = new sql.Request(transaction);
      requestPhase.input('id', sql.NVarChar, phase.id);
      requestPhase.input('name', sql.NVarChar, phase.name);
      requestPhase.input('color', sql.NVarChar, phase.color);
      requestPhase.input('projectId', sql.NVarChar, id);

      await requestPhase.query(`
        INSERT INTO Fases_Gantt (id, name, color, projectId)
        VALUES (@id, @name, @color, @projectId)
      `);
    }

    await transaction.commit();
    return NextResponse.json({ success: true, project: body, defaultPhases_Gantt });
  } catch (error: any) {
    console.error('Error al crear proyecto:', error);
    try { await transaction.rollback(); } catch {}
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Actualizar un proyecto
export async function PUT(request: Request) {
  // 1. Autorización
  const sessionUser = getAuthenticatedUser();
  if (!sessionUser) {
    return NextResponse.json({ success: false, error: 'No autorizado. Por favor inicie sesión.' }, { status: 401 });
  }
  if (sessionUser.role !== 'Project Manager') {
    return NextResponse.json({ success: false, error: 'Acceso denegado. Se requieren permisos de Project Manager.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, name, description, startDate, endDate, status, leaderId } = body as Project;

    // 2. Validación Backend
    if (!id || !name || !startDate || !endDate || !status || !leaderId) {
      return NextResponse.json({ success: false, error: 'Faltan campos obligatorios para actualizar el proyecto.' }, { status: 400 });
    }
    if (new Date(startDate) > new Date(endDate)) {
      return NextResponse.json({ success: false, error: 'La fecha de inicio no puede ser posterior a la fecha de fin.' }, { status: 400 });
    }

    await executeQuery(`
      UPDATE Proyectos_Gantt
      SET name = @name, description = @description, startDate = @startDate, endDate = @endDate, status = @status, leaderId = @leaderId
      WHERE id = @id
    `, {
      id: { type: sql.NVarChar, value: id },
      name: { type: sql.NVarChar, value: name },
      description: { type: sql.NVarChar, value: description || null },
      startDate: { type: sql.VarChar, value: startDate },
      endDate: { type: sql.VarChar, value: endDate },
      status: { type: sql.NVarChar, value: status },
      leaderId: { type: sql.NVarChar, value: leaderId }
    });

    return NextResponse.json({ success: true, project: body });
  } catch (error: any) {
    console.error('Error al actualizar proyecto:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Eliminar un proyecto
export async function DELETE(request: Request) {
  // 1. Autorización
  const sessionUser = getAuthenticatedUser();
  if (!sessionUser) {
    return NextResponse.json({ success: false, error: 'No autorizado. Por favor inicie sesión.' }, { status: 401 });
  }
  if (sessionUser.role !== 'Project Manager') {
    return NextResponse.json({ success: false, error: 'Acceso denegado. Se requieren permisos de Project Manager.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Se requiere el parámetro ID para eliminar.' }, { status: 400 });
    }

    await executeQuery('DELETE FROM Proyectos_Gantt WHERE id = @id', {
      id: { type: sql.NVarChar, value: id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error al eliminar proyecto:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
