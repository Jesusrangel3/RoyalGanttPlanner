import { NextResponse } from 'next/server';
import { executeQuery, sql } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/session';
import { TimeEntry } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const sessionUser = getAuthenticatedUser();
  if (!sessionUser) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');
  const isPM = sessionUser.role === 'Project Manager';

  try {
    let query = `
      SELECT te.id, te.taskId, te.userId, te.hours, te.description, te.date, te.createdAt,
             u.name as userName, u.color as userColor, t.title as taskTitle
      FROM Horas_Gantt te
      JOIN Usuarios_Gantt u ON te.userId = u.id
      JOIN Tareas_Gantt t ON te.taskId = t.id
      WHERE 1=1
    `;
    const params: any = {};

    if (taskId) {
      query += ' AND te.taskId = @taskId';
      params.taskId = { type: sql.NVarChar, value: taskId };
    } else if (!isPM) {
      query += ' AND te.userId = @userId';
      params.userId = { type: sql.NVarChar, value: sessionUser.id };
    }
    query += ' ORDER BY te.date DESC, te.createdAt DESC';

    const result = await executeQuery(query, params);
    const entries: TimeEntry[] = result.recordset.map(e => ({
      ...e,
      hours: Number(e.hours),
      createdAt: new Date(e.createdAt).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' }),
    }));

    return NextResponse.json({ success: true, entries });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const sessionUser = getAuthenticatedUser();
  if (!sessionUser) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  try {
    const body = await request.json() as TimeEntry;
    if (!body.taskId || !body.hours || !body.date) {
      return NextResponse.json({ success: false, error: 'Campos requeridos: taskId, hours, date' }, { status: 400 });
    }

    const id = 'te_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

    await executeQuery(`
      INSERT INTO Horas_Gantt (id, taskId, userId, hours, description, date, createdAt)
      VALUES (@id, @taskId, @userId, @hours, @description, @date, GETDATE())
    `, {
      id: { type: sql.NVarChar, value: id },
      taskId: { type: sql.NVarChar, value: body.taskId },
      userId: { type: sql.NVarChar, value: sessionUser.id },
      hours: { type: sql.Decimal, value: body.hours },
      description: { type: sql.NVarChar, value: body.description || null },
      date: { type: sql.VarChar, value: body.date },
    });

    // Actualizar actualHours en la tarea
    await executeQuery(`
      UPDATE Tareas_Gantt
      SET actualHours = (SELECT ISNULL(SUM(hours), 0) FROM Horas_Gantt WHERE taskId = @taskId)
      WHERE id = @taskId
    `, { taskId: { type: sql.NVarChar, value: body.taskId } });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const sessionUser = getAuthenticatedUser();
  if (!sessionUser) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 });

  try {
    const existing = await executeQuery('SELECT taskId FROM Horas_Gantt WHERE id = @id AND userId = @userId', {
      id: { type: sql.NVarChar, value: id },
      userId: { type: sql.NVarChar, value: sessionUser.id },
    });
    if (existing.recordset.length === 0) {
      return NextResponse.json({ success: false, error: 'Registro no encontrado' }, { status: 404 });
    }
    const taskId = existing.recordset[0].taskId;

    await executeQuery('DELETE FROM Horas_Gantt WHERE id = @id', {
      id: { type: sql.NVarChar, value: id },
    });

    // Recalcular actualHours
    await executeQuery(`
      UPDATE Tareas_Gantt
      SET actualHours = (SELECT ISNULL(SUM(hours), 0) FROM Horas_Gantt WHERE taskId = @taskId)
      WHERE id = @taskId
    `, { taskId: { type: sql.NVarChar, value: taskId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
