import { NextResponse } from 'next/server';
import { executeQuery, sql } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getAuthenticatedUser } from '@/lib/session';

export async function POST(request: Request) {
  try {
    // 1. Verificar autenticación del usuario
    const sessionUser = getAuthenticatedUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: 'No autorizado. Por favor inicie sesión.' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // 2. Validar campos
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ success: false, error: 'La contraseña actual y la nueva son requeridas.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, error: 'La nueva contraseña debe tener al menos 6 caracteres.' }, { status: 400 });
    }

    // 3. Buscar el usuario actual en la base de datos
    const result = await executeQuery(
      'SELECT password FROM Usuarios_Gantt WHERE id = @id',
      { id: { type: sql.NVarChar, value: sessionUser.id } }
    );

    if (result.recordset.length === 0) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado.' }, { status: 404 });
    }

    const dbPassword = result.recordset[0].password;

    // 4. Verificar la contraseña actual
    const isMatch = await bcrypt.compare(currentPassword, dbPassword);
    if (!isMatch) {
      return NextResponse.json({ success: false, error: 'La contraseña actual es incorrecta.' }, { status: 400 });
    }

    // 5. Encriptar la nueva contraseña con bcrypt
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // 6. Actualizar la contraseña y desactivar el cambio obligatorio en la DB
    await executeQuery(
      `UPDATE Usuarios_Gantt 
       SET password = @newPassword, mustChangePassword = 0 
       WHERE id = @id`,
      {
        id: { type: sql.NVarChar, value: sessionUser.id },
        newPassword: { type: sql.NVarChar, value: hashedNewPassword }
      }
    );

    return NextResponse.json({ success: true, message: 'Contraseña actualizada con éxito.' });
  } catch (error: any) {
    console.error('Error al cambiar contraseña:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error en el servidor al cambiar contraseña.' }, { status: 500 });
  }
}
