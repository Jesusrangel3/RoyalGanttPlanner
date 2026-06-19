import { NextResponse } from 'next/server';
import { executeQuery, sql } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * GET /api/search?q=texto&type=Tasks_Gantt,Projects_Gantt,Notes_Gantt
 * Búsqueda global en tareas, proyectos y notas.
 */
export async function GET(request: Request) {
  const sessionUser = getAuthenticatedUser();
  if (!sessionUser) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();
  const types = (searchParams.get('type') || 'Tasks_Gantt,Projects_Gantt,Notes_Gantt').split(',');

  if (!q || q.length < 2) {
    return NextResponse.json({ success: false, error: 'La búsqueda debe tener al menos 2 caracteres.' }, { status: 400 });
  }

  const term = `%${q}%`;
  const results: Record<string, unknown[]> = {};

  try {
    if (types.includes('Tasks_Gantt')) {
      const r = await executeQuery(`
        SELECT TOP 20 t.id, t.title, t.status, t.priority, t.startDate, t.endDate, t.progress,
               p.name AS projectName, ph.name AS phaseName, u.name AS assigneeName
        FROM Tasks_Gantt t
        JOIN Projects_Gantt p  ON t.projectId = p.id
        JOIN Phases_Gantt ph   ON t.phaseId   = ph.id
        JOIN users_Gantt u     ON t.assigneeId = u.id
        WHERE t.title LIKE @term OR t.notes LIKE @term
        ORDER BY t.updatedAt DESC, t.createdAt DESC
      `, { term: { type: sql.NVarChar, value: term } });

      results.Tasks_Gantt = r.recordset;
    }

    if (types.includes('Projects_Gantt')) {
      const r = await executeQuery(`
        SELECT TOP 10 id, name, description, status, startDate, endDate
        FROM Projects_Gantt
        WHERE name LIKE @term OR description LIKE @term
        ORDER BY name
      `, { term: { type: sql.NVarChar, value: term } });

      results.Projects_Gantt = r.recordset;
    }

    if (types.includes('Notes_Gantt')) {
      const r = await executeQuery(`
        SELECT TOP 10 id, title, content, color, pinned, isShared, createdAt
        FROM Notes_Gantt
        WHERE (userId = @userId OR isShared = 1) AND (title LIKE @term OR content LIKE @term OR tags LIKE @term)
        ORDER BY pinned DESC, updatedAt DESC
      `, {
        userId: { type: sql.NVarChar, value: sessionUser.id },
        term:   { type: sql.NVarChar, value: term },
      });

      results.notes = r.recordset;
    }

    if (types.includes('users_Gantt')) {
      const isPM = sessionUser.role === 'Project Manager';
      if (isPM) {
        const r = await executeQuery(`
          SELECT TOP 10 id, name, email, role, contractType, status, initials, color
          FROM users_Gantt
          WHERE name LIKE @term OR email LIKE @term OR role LIKE @term
          ORDER BY name
        `, { term: { type: sql.NVarChar, value: term } });

        results.users_Gantt = r.recordset;
      }
    }

    return NextResponse.json({ success: true, results, query: q });
  } catch (error: any) {
    console.error('[search] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
