import { NextResponse } from 'next/server';
import { executeQuery, sql } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

// GET: Obtener configuración de umbrales
export async function GET() {
  const sessionUser = getAuthenticatedUser();
  if (!sessionUser) return NextResponse.json({ success: false, error: 'No autorizado.' }, { status: 401 });

  try {
    const result = await executeQuery('SELECT * FROM ConfigCarga_Gantt');
    const config: Record<string, number> = {};
    result.recordset.forEach((row: any) => { config[row.configKey] = Number(row.configValue); });
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Actualizar un umbral
export async function PUT(request: Request) {
  const sessionUser = getAuthenticatedUser();
  if (!sessionUser) return NextResponse.json({ success: false, error: 'No autorizado.' }, { status: 401 });

  try {
    const { configKey, configValue } = await request.json();
    if (!configKey || configValue === undefined) {
      return NextResponse.json({ success: false, error: 'Faltan parámetros.' }, { status: 400 });
    }

    await executeQuery(`
      UPDATE ConfigCarga_Gantt SET configValue=@v, updatedAt=GETDATE() WHERE configKey=@k
    `, {
      k: { type: sql.NVarChar, value: configKey },
      v: { type: sql.Int,      value: Number(configValue) },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
