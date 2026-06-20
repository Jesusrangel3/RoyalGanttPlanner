import { NextResponse } from 'next/server';
import { executeQuery, sql } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

// GET: Historial de aprobaciones
export async function GET(request: Request) {
  const sessionUser = getAuthenticatedUser();
  if (!sessionUser) return NextResponse.json({ success: false, error: 'No autorizado.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  try {
    const query = taskId
      ? `SELECT TOP 50 * FROM Aprobaciones_Gantt WHERE taskId = @taskId ORDER BY createdAt DESC`
      : `SELECT TOP 100 * FROM Aprobaciones_Gantt ORDER BY createdAt DESC`;

    const params = taskId ? { taskId: { type: sql.NVarChar, value: taskId } } : undefined;
    const result = await executeQuery(query, params);
    return NextResponse.json({ success: true, logs: result.recordset });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Registrar una aprobación o rechazo
export async function POST(request: Request) {
  const sessionUser = getAuthenticatedUser();
  if (!sessionUser) return NextResponse.json({ success: false, error: 'No autorizado.' }, { status: 401 });

  try {
    const body = await request.json();
    const { taskId, taskTitle, action, comment, previousStatus } = body;

    if (!taskId || !action || !['approved', 'rejected'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Datos inválidos.' }, { status: 400 });
    }

    const id = `apl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    await executeQuery(`
      INSERT INTO Aprobaciones_Gantt (id, taskId, taskTitle, action, performedBy, performedByName, comment, previousStatus)
      VALUES (@id, @taskId, @taskTitle, @action, @performedBy, @performedByName, @comment, @previousStatus)
    `, {
      id:              { type: sql.NVarChar, value: id },
      taskId:          { type: sql.NVarChar, value: taskId },
      taskTitle:       { type: sql.NVarChar, value: taskTitle || '' },
      action:          { type: sql.NVarChar, value: action },
      performedBy:     { type: sql.NVarChar, value: sessionUser.id },
      performedByName: { type: sql.NVarChar, value: sessionUser.email },
      comment:         { type: sql.NVarChar, value: comment || null },
      previousStatus:  { type: sql.NVarChar, value: previousStatus || null },
    });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
