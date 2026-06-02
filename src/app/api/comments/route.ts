import { NextResponse } from 'next/server';
import { executeQuery, sql } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/session';

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
      INSERT INTO TaskComments (id, taskId, userId, content, createdAt)
      VALUES (@id, @taskId, @userId, @content, GETDATE())
    `, {
      id: { type: sql.NVarChar, value: id },
      taskId: { type: sql.NVarChar, value: taskId },
      userId: { type: sql.NVarChar, value: userId },
      content: { type: sql.NVarChar, value: content }
    });

    // 2. Recuperar detalles del usuario creador para responder con su nombre y color
    const userResult = await executeQuery('SELECT name, color FROM Users WHERE id = @id', {
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
