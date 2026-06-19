import { NextResponse } from 'next/server';
import { executeQuery, sql, getDbPool } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/session';
import { Note } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const sessionUser = getAuthenticatedUser();
  if (!sessionUser) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  try {
    let query = `
      SELECT id, userId, projectId, taskId, title, content, color, pinned, tags, isShared, createdAt, updatedAt
      FROM Notes_Gantt
      WHERE userId = @userId OR isShared = 1
    `;
    const params: any = { userId: { type: sql.NVarChar, value: sessionUser.id } };

    if (projectId) {
      query += ' AND (projectId = @projectId OR projectId IS NULL)';
      params.projectId = { type: sql.NVarChar, value: projectId };
    }
    query += ' ORDER BY pinned DESC, updatedAt DESC';

    const result = await executeQuery(query, params);
    const Notes_Gantt: Note[] = result.recordset.map(n => ({
      ...n,
      pinned: !!n.pinned,
      isShared: !!n.isShared,
      tags: n.tags ? n.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
    }));

    return NextResponse.json({ success: true, Notes_Gantt });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const sessionUser = getAuthenticatedUser();
  if (!sessionUser) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  try {
    const body = await request.json() as Note;
    const id = body.id || 'note_' + Date.now();

    await executeQuery(`
      INSERT INTO Notes_Gantt (id, userId, projectId, taskId, title, content, color, pinned, tags, isShared, createdAt, updatedAt)
      VALUES (@id, @userId, @projectId, @taskId, @title, @content, @color, @pinned, @tags, @isShared, GETDATE(), GETDATE())
    `, {
      id: { type: sql.NVarChar, value: id },
      userId: { type: sql.NVarChar, value: sessionUser.id },
      projectId: { type: sql.NVarChar, value: body.projectId || null },
      taskId: { type: sql.NVarChar, value: body.taskId || null },
      title: { type: sql.NVarChar, value: body.title },
      content: { type: sql.NVarChar, value: body.content || '' },
      color: { type: sql.NVarChar, value: body.color || '#fef3c7' },
      pinned: { type: sql.Bit, value: body.pinned ? 1 : 0 },
      tags: { type: sql.NVarChar, value: (body.tags || []).join(',') },
      isShared: { type: sql.Bit, value: body.isShared ? 1 : 0 },
    });

    return NextResponse.json({ success: true, note: { ...body, id } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const sessionUser = getAuthenticatedUser();
  if (!sessionUser) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  try {
    const body = await request.json() as Note;
    if (!body.id) return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 });

    await executeQuery(`
      UPDATE Notes_Gantt
      SET title = @title, content = @content, color = @color, pinned = @pinned,
          tags = @tags, isShared = @isShared, projectId = @projectId, updatedAt = GETDATE()
      WHERE id = @id AND userId = @userId
    `, {
      id: { type: sql.NVarChar, value: body.id },
      userId: { type: sql.NVarChar, value: sessionUser.id },
      title: { type: sql.NVarChar, value: body.title },
      content: { type: sql.NVarChar, value: body.content || '' },
      color: { type: sql.NVarChar, value: body.color || '#fef3c7' },
      pinned: { type: sql.Bit, value: body.pinned ? 1 : 0 },
      tags: { type: sql.NVarChar, value: (body.tags || []).join(',') },
      isShared: { type: sql.Bit, value: body.isShared ? 1 : 0 },
      projectId: { type: sql.NVarChar, value: body.projectId || null },
    });

    return NextResponse.json({ success: true });
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
    await executeQuery('DELETE FROM Notes_Gantt WHERE id = @id AND userId = @userId', {
      id: { type: sql.NVarChar, value: id },
      userId: { type: sql.NVarChar, value: sessionUser.id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
