import { NextResponse } from 'next/server';
import { executeQuery, sql } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * GET /api/export?type=Tasks_Gantt|users_Gantt|time-entries&projectId=...&format=csv
 * Exporta datos a CSV. Solo Project Manager puede exportar usuarios y registros de tiempo globales.
 */
export async function GET(request: Request) {
  const sessionUser = getAuthenticatedUser();
  if (!sessionUser) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'Tasks_Gantt';
  const projectId = searchParams.get('projectId');
  const isPM = sessionUser.role === 'Project Manager';

  try {
    let csv = '';
    let filename = '';

    if (type === 'Tasks_Gantt') {
      const params: Record<string, any> = {};
      let where = '1=1';
      if (projectId) {
        where += ' AND t.projectId = @projectId';
        params.projectId = { type: sql.NVarChar, value: projectId };
      }

      const r = await executeQuery(`
        SELECT t.id, t.title, t.status, t.priority, t.progress,
               t.startDate, t.endDate, t.estimatedHours, t.actualHours,
               t.estimatedBudget, t.actualCost, t.notes,
               u.name AS assignee, p.name AS project, ph.name AS phase
        FROM Tareas_Gantt t
        JOIN Usuarios_Gantt u    ON t.assigneeId = u.id
        JOIN Proyectos_Gantt p ON t.projectId  = p.id
        JOIN Fases_Gantt ph  ON t.phaseId    = ph.id
        WHERE ${where}
        ORDER BY t.startDate, t.title
      `, params);

      const headers = ['ID','Título','Estado','Prioridad','Progreso(%)','Inicio','Fin','Horas Est.','Horas Reales','Presupuesto','Costo Real','Notas','Asignado a','Proyecto','Fase'];
      const rows = r.recordset.map(t => [
        t.id, escapeCsv(t.title), t.status, t.priority, t.progress,
        t.startDate, t.endDate, t.estimatedHours ?? '', t.actualHours ?? '',
        t.estimatedBudget ?? '', t.actualCost ?? '', escapeCsv(t.notes ?? ''),
        escapeCsv(t.assignee), escapeCsv(t.project), escapeCsv(t.phase),
      ]);
      csv = toCsv(headers, rows);
      filename = `tareas_${projectId || 'todos'}_${dateTag()}.csv`;

    } else if (type === 'users_Gantt') {
      if (!isPM) return NextResponse.json({ success: false, error: 'Solo el Project Manager puede exportar usuarios.' }, { status: 403 });

      const r = await executeQuery(`
        SELECT id, name, email, role, contractType, status, availableHours, totalAssignedHours,
               skills, createdAt
        FROM Usuarios_Gantt
        ORDER BY name
      `);

      const headers = ['ID','Nombre','Correo','Rol','Contrato','Estado','Horas Disponibles','Horas Asignadas','Habilidades','Fecha Registro'];
      const rows = r.recordset.map(u => [
        u.id, escapeCsv(u.name), u.email, u.role, u.contractType, u.status,
        u.availableHours, u.totalAssignedHours,
        escapeCsv(u.skills ? JSON.parse(u.skills).join('; ') : ''),
        u.createdAt ? new Date(u.createdAt).toLocaleDateString('es') : '',
      ]);
      csv = toCsv(headers, rows);
      filename = `usuarios_${dateTag()}.csv`;

    } else if (type === 'time-entries') {
      const params: Record<string, any> = {};
      let where = '1=1';
      if (!isPM) {
        where += ' AND te.userId = @userId';
        params.userId = { type: sql.NVarChar, value: sessionUser.id };
      }
      if (projectId) {
        where += ' AND t.projectId = @projectId';
        params.projectId = { type: sql.NVarChar, value: projectId };
      }

      const r = await executeQuery(`
        SELECT te.id, te.date, te.hours, te.description,
               u.name AS userName, t.title AS taskTitle, p.name AS projectName
        FROM Horas_Gantt te
        JOIN Usuarios_Gantt u    ON te.userId = u.id
        JOIN Tareas_Gantt t    ON te.taskId = t.id
        JOIN Proyectos_Gantt p ON t.projectId = p.id
        WHERE ${where}
        ORDER BY te.date DESC
      `, params);

      const headers = ['ID','Fecha','Horas','Descripción','Usuario','Tarea','Proyecto'];
      const rows = r.recordset.map(e => [
        e.id, e.date, e.hours, escapeCsv(e.description ?? ''),
        escapeCsv(e.userName), escapeCsv(e.taskTitle), escapeCsv(e.projectName),
      ]);
      csv = toCsv(headers, rows);
      filename = `horas_${dateTag()}.csv`;

    } else {
      return NextResponse.json({ success: false, error: `Tipo de exportación desconocido: ${type}` }, { status: 400 });
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('[export] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function escapeCsv(value: string): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: (string | number)[][]): string {
  const bom = '﻿'; // BOM para que Excel abra correctamente con UTF-8
  const lines = [headers.join(','), ...rows.map(r => r.join(','))];
  return bom + lines.join('\r\n');
}

function dateTag(): string {
  return new Date().toISOString().slice(0, 10);
}
