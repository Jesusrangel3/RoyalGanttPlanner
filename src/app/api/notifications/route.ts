import { NextResponse } from 'next/server';
import { executeQuery, sql } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

// GET: Obtener notificaciones del usuario
export async function GET(request: Request) {
  try {
    const sessionUser = getAuthenticatedUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: 'No autorizado. Por favor inicie sesión.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Se requiere el ID de usuario.' }, { status: 400 });
    }

    if (sessionUser.id !== userId) {
      return NextResponse.json({ success: false, error: 'Acceso denegado. No puede ver notificaciones de otro usuario.' }, { status: 403 });
    }

    const result = await executeQuery(`
      SELECT id, userId, title, message, type, taskId, [read], createdAt 
      FROM Notifications_Gantt 
      WHERE userId = @userId 
      ORDER BY createdAt DESC
    `, {
      userId: { type: sql.NVarChar, value: userId }
    });

    const Notifications_Gantt = result.recordset.map(n => ({
      id: n.id,
      userId: n.userId,
      title: n.title,
      message: n.message,
      type: n.type,
      taskId: n.taskId || undefined,
      read: !!n.read,
      createdAt: new Date(n.createdAt).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })
    }));

    return NextResponse.json({ success: true, Notifications_Gantt });
  } catch (error: any) {
    console.error('Error al obtener notificaciones:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Crear una nueva notificación
export async function POST(request: Request) {
  try {
    const sessionUser = getAuthenticatedUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: 'No autorizado. Por favor inicie sesión.' }, { status: 401 });
    }

    const body = await request.json();
    const { id, userId, title, message, type, taskId, read } = body;

    if (!id || !userId || !title || !message || !type) {
      return NextResponse.json({ success: false, error: 'Faltan campos obligatorios para la notificación.' }, { status: 400 });
    }

    await executeQuery(`
      INSERT INTO Notifications_Gantt (id, userId, title, message, type, taskId, [read], createdAt)
      VALUES (@id, @userId, @title, @message, @type, @taskId, @read, GETDATE())
    `, {
      id: { type: sql.NVarChar, value: id },
      userId: { type: sql.NVarChar, value: userId },
      title: { type: sql.NVarChar, value: title },
      message: { type: sql.NVarChar, value: message },
      type: { type: sql.NVarChar, value: type },
      taskId: { type: sql.NVarChar, value: taskId || null },
      read: { type: sql.Bit, value: read ? 1 : 0 }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error al crear notificación:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Marcar notificaciones como leídas
export async function PUT(request: Request) {
  try {
    const sessionUser = getAuthenticatedUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: 'No autorizado. Por favor inicie sesión.' }, { status: 401 });
    }

    const body = await request.json();
    const { id, userId, read } = body; // Si viene id, se marca esa. Si no, se marcan todas de ese userId.

    if (id) {
      await executeQuery(`
        UPDATE Notifications_Gantt
        SET [read] = @read
        WHERE id = @id AND userId = @userId
      `, {
        id: { type: sql.NVarChar, value: id },
        userId: { type: sql.NVarChar, value: sessionUser.id },
        read: { type: sql.Bit, value: read ? 1 : 0 }
      });
    } else if (userId) {
      if (sessionUser.id !== userId) {
        return NextResponse.json({ success: false, error: 'Acceso denegado. No puede modificar notificaciones de otro usuario.' }, { status: 403 });
      }

      await executeQuery(`
        UPDATE Notifications_Gantt
        SET [read] = @read
        WHERE userId = @userId
      `, {
        userId: { type: sql.NVarChar, value: userId },
        read: { type: sql.Bit, value: read ? 1 : 0 }
      });
    } else {
      return NextResponse.json({ success: false, error: 'Faltan parámetros para actualizar notificaciones.' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error al marcar notificaciones:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Eliminar notificaciones
export async function DELETE(request: Request) {
  try {
    const sessionUser = getAuthenticatedUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: 'No autorizado. Por favor inicie sesión.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId'); // Si viene userId, se eliminan todas de ese usuario.

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Se requiere el parámetro userId para eliminar notificaciones.' }, { status: 400 });
    }

    if (sessionUser.id !== userId) {
      return NextResponse.json({ success: false, error: 'Acceso denegado. No puede eliminar notificaciones de otro usuario.' }, { status: 403 });
    }

    await executeQuery('DELETE FROM Notifications_Gantt WHERE userId = @userId', {
      userId: { type: sql.NVarChar, value: userId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error al eliminar notificaciones:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
