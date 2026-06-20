import { NextResponse } from 'next/server';
import { executeQuery, sql } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/session';
import { ActivityLog_Gantt } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const sessionUser = getAuthenticatedUser();
  if (!sessionUser) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get('entityType');
  const entityId = searchParams.get('entityId');
  const limit = parseInt(searchParams.get('limit') || '100');

  try {
    let query = 'SELECT TOP (@limit) id, userId, userName, action, entityType, entityId, entityTitle, details, createdAt FROM Actividad_Gantt';
    const params: any = { limit: { type: sql.Int, value: limit } };
    const conditions: string[] = [];

    if (entityType) {
      conditions.push('entityType = @entityType');
      params.entityType = { type: sql.NVarChar, value: entityType };
    }
    if (entityId) {
      conditions.push('entityId = @entityId');
      params.entityId = { type: sql.NVarChar, value: entityId };
    }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY createdAt DESC';

    const result = await executeQuery(query, params);
    const logs: ActivityLog_Gantt[] = result.recordset.map(r => ({
      ...r,
      createdAt: new Date(r.createdAt).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' }),
    }));

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const sessionUser = getAuthenticatedUser();
  if (!sessionUser) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  try {
    const body = await request.json() as Partial<ActivityLog_Gantt>;
    const id = 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

    const userRes = await executeQuery('SELECT name FROM Usuarios_Gantt WHERE id = @uid', { uid: { type: sql.NVarChar, value: sessionUser.id } });
    const userName = userRes.recordset[0]?.name || sessionUser.email;

    await executeQuery(`
      INSERT INTO Actividad_Gantt (id, userId, userName, action, entityType, entityId, entityTitle, details, createdAt)
      VALUES (@id, @userId, @userName, @action, @entityType, @entityId, @entityTitle, @details, GETDATE())
    `, {
      id: { type: sql.NVarChar, value: id },
      userId: { type: sql.NVarChar, value: sessionUser.id },
      userName: { type: sql.NVarChar, value: userName },
      action: { type: sql.NVarChar, value: body.action || 'updated' },
      entityType: { type: sql.NVarChar, value: body.entityType || 'task' },
      entityId: { type: sql.NVarChar, value: body.entityId || '' },
      entityTitle: { type: sql.NVarChar, value: body.entityTitle || '' },
      details: { type: sql.NVarChar, value: body.details || null },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
