import { NextResponse } from 'next/server';
import { executeQuery, sql } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const sessionUser = getAuthenticatedUser();
  if (!sessionUser) return NextResponse.json({ success: false, error: 'No autorizado.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');
  if (!taskId) return NextResponse.json({ success: false, error: 'Se requiere taskId.' }, { status: 400 });

  try {
    const result = await executeQuery(`
      SELECT c.id, c.taskId, c.userId, u.name AS userName, u.color AS userColor, c.content, c.createdAt
      FROM TaskComments_Gantt c JOIN users_Gantt u ON c.userId = u.id
      WHERE c.taskId = @taskId ORDER BY c.createdAt ASC
    `, { taskId: { type: sql.NVarChar, value: taskId } });

    const comments = result.recordset.map(c => ({
      ...c,
      createdAt: new Date(c.createdAt).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' }),
    }));
    return NextResponse.json({ success: true, comments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = getAuthenticatedUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: 'No autorizado. Por favor inicie sesión.' }, { status: 401 });
    }

    const body = await request.json();
    const { id, taskId, userId, content } = body;

    if (!id || !taskId || !userId || !content) {
      return NextResponse.json({ success: false, error: 'Faltan campos obligatorios para guardar el comentario.' }, { status: 400 });
    }

    if (sessionUser.id !== userId) {
      return NextResponse.json({ success: false, error: 'Acceso denegado. No puede publicar comentarios a nombre de otro usuario.' }, { status: 403 });
    }

    // 1. Insertar en la base de datos
    await executeQuery(`
      INSERT INTO TaskComments_Gantt (id, taskId, userId, content, createdAt)
      VALUES (@id, @taskId, @userId, @content, GETDATE())
    `, {
      id: { type: sql.NVarChar, value: id },
      taskId: { type: sql.NVarChar, value: taskId },
      userId: { type: sql.NVarChar, value: userId },
      content: { type: sql.NVarChar, value: content }
    });

    // 2. Recuperar detalles del usuario creador para responder con su nombre y color
    const userResult = await executeQuery('SELECT name, color FROM users_Gantt WHERE id = @id', {
      id: { type: sql.NVarChar, value: userId }
    });
    
    const user = userResult.recordset[0] || { name: 'Usuario', color: '#4f7cff' };

    const comment = {
      id,
      userId,
      userName: user.name,
      userColor: user.color,
      content,
      createdAt: new Date().toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })
    };

    return NextResponse.json({ success: true, comment });
  } catch (error: any) {
    console.error('Error al guardar comentario:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
