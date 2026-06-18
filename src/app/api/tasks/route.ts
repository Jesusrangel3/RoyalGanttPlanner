import { NextResponse } from 'next/server';
import { executeQuery, sql, getDbPool } from '@/lib/db';
import { Task } from '@/types';
import { getAuthenticatedUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

// GET: Obtener todas las tareas
export async function GET() {
  try {
    const sessionUser = getAuthenticatedUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: 'No autorizado. Por favor inicie sesión.' }, { status: 401 });
    }

    const tasksResult = await executeQuery('SELECT * FROM Tasks ORDER BY boardOrder ASC');
    const assigneesResult = await executeQuery('SELECT taskId, userId FROM TaskAssignees');
    
    const assigneesMap: Record<string, string[]> = {};
    assigneesResult.recordset.forEach(a => {
      if (!assigneesMap[a.taskId]) {
        assigneesMap[a.taskId] = [];
      }
      assigneesMap[a.taskId].push(a.userId);
    });

    const tasks = tasksResult.recordset.map(t => ({
      ...t,
      assigneeIds: assigneesMap[t.id] || [t.assigneeId],
      requiredSkills: t.requiredSkills ? JSON.parse(t.requiredSkills) : [],
      materials: t.materials ? JSON.parse(t.materials) : [],
      estimatedBudget: t.estimatedBudget ? Number(t.estimatedBudget) : undefined,
      actualCost: t.actualCost ? Number(t.actualCost) : undefined,
      accepted: t.accepted !== undefined ? !!t.accepted : true,
      boardOrder: t.boardOrder !== undefined ? Number(t.boardOrder) : 0,
    }));

    return NextResponse.json({ success: true, tasks });
  } catch (error: any) {
    console.error('Error al obtener tareas:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Crear una tarea nueva
export async function POST(request: Request) {
  const sessionUser = getAuthenticatedUser();
  if (!sessionUser) {
    return NextResponse.json({ success: false, error: 'No autorizado. Por favor inicie sesión.' }, { status: 401 });
  }

  const pool = await getDbPool();
  const transaction = new sql.Transaction(pool);
  
  try {
    const body = await request.json();
    const task = body as Task;

    // 1. Validación Backend
    if (!task.id || !task.title || !task.phaseId || !task.startDate || !task.endDate || !task.status || !task.assigneeId) {
      return NextResponse.json({ success: false, error: 'Faltan campos obligatorios para crear la tarea.' }, { status: 400 });
    }

    if (new Date(task.startDate) > new Date(task.endDate)) {
      return NextResponse.json({ success: false, error: 'La fecha de inicio no puede ser posterior a la fecha de fin.' }, { status: 400 });
    }

    if (task.progress !== undefined && (task.progress < 0 || task.progress > 100)) {
      return NextResponse.json({ success: false, error: 'El progreso debe estar entre 0 y 100.' }, { status: 400 });
    }

    await transaction.begin();

    // 2. Insertar tarea
    const requestTask = new sql.Request(transaction);
    requestTask.input('id', sql.NVarChar, task.id);
    requestTask.input('title', sql.NVarChar, task.title);
    requestTask.input('phaseId', sql.NVarChar, task.phaseId);
    requestTask.input('projectId', sql.NVarChar, task.projectId || 'proj1');
    requestTask.input('milestoneId', sql.NVarChar, task.milestoneId || null);
    requestTask.input('startDate', sql.VarChar, task.startDate);
    requestTask.input('endDate', sql.VarChar, task.endDate);
    requestTask.input('status', sql.NVarChar, task.status);
    requestTask.input('progress', sql.Int, task.progress || 0);
    requestTask.input('assigneeId', sql.NVarChar, task.assigneeId);
    requestTask.input('notes', sql.NVarChar, task.notes || null);
    requestTask.input('estimatedHours', sql.Int, task.estimatedHours || null);
    requestTask.input('actualHours', sql.Int, task.actualHours || null);
    requestTask.input('requiredSkills', sql.NVarChar, JSON.stringify(task.requiredSkills || []));
    requestTask.input('estimatedBudget', sql.Decimal(18, 2), task.estimatedBudget || null);
    requestTask.input('actualCost', sql.Decimal(18, 2), task.actualCost || null);
    requestTask.input('materials', sql.NVarChar, JSON.stringify(task.materials || []));
    requestTask.input('dependsOnTaskId', sql.NVarChar, task.dependsOnTaskId || null);
    requestTask.input('createdBy', sql.NVarChar, sessionUser.id);
    requestTask.input('accepted', sql.Bit, task.accepted !== undefined ? (task.accepted ? 1 : 0) : 1);
    requestTask.input('boardOrder', sql.Int, task.boardOrder || 0);
    requestTask.input('priority', sql.NVarChar, (task as any).priority || 'media');

    await requestTask.query(`
      INSERT INTO Tasks (
        id, title, phaseId, projectId, milestoneId, startDate, endDate, status, progress,
        assigneeId, notes, estimatedHours, actualHours, requiredSkills, estimatedBudget, actualCost, materials, dependsOnTaskId, createdBy, accepted, boardOrder, priority
      )
      VALUES (
        @id, @title, @phaseId, @projectId, @milestoneId, @startDate, @endDate, @status, @progress,
        @assigneeId, @notes, @estimatedHours, @actualHours, @requiredSkills, @estimatedBudget, @actualCost, @materials, @dependsOnTaskId, @createdBy, @accepted, @boardOrder, @priority
      )
    `);

    // 3. Insertar asignaciones
    const assigneeIds = task.assigneeIds && task.assigneeIds.length > 0 ? task.assigneeIds : [task.assigneeId];
    for (const uid of assigneeIds) {
      const requestAssignee = new sql.Request(transaction);
      requestAssignee.input('taskId', sql.NVarChar, task.id);
      requestAssignee.input('userId', sql.NVarChar, uid);
      await requestAssignee.query(`
        INSERT INTO TaskAssignees (taskId, userId)
        VALUES (@taskId, @userId)
      `);
    }

    await transaction.commit();
    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error('Error al crear tarea:', error);
    try { await transaction.rollback(); } catch {}
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Actualizar una tarea existente
export async function PUT(request: Request) {
  const sessionUser = getAuthenticatedUser();
  if (!sessionUser) {
    return NextResponse.json({ success: false, error: 'No autorizado. Por favor inicie sesión.' }, { status: 401 });
  }

  const pool = await getDbPool();
  const transaction = new sql.Transaction(pool);
  
  try {
    const body = await request.json();
    const task = body as Task;

    // 1. Validación Backend
    if (!task.id || !task.title || !task.phaseId || !task.startDate || !task.endDate || !task.status || !task.assigneeId) {
      return NextResponse.json({ success: false, error: 'Faltan campos obligatorios para actualizar la tarea.' }, { status: 400 });
    }

    if (new Date(task.startDate) > new Date(task.endDate)) {
      return NextResponse.json({ success: false, error: 'La fecha de inicio no puede ser posterior a la fecha de fin.' }, { status: 400 });
    }

    if (task.progress !== undefined && (task.progress < 0 || task.progress > 100)) {
      return NextResponse.json({ success: false, error: 'El progreso debe estar entre 0 y 100.' }, { status: 400 });
    }

    await transaction.begin();

    // 2. Actualizar la tarea
    const requestTask = new sql.Request(transaction);
    requestTask.input('id', sql.NVarChar, task.id);
    requestTask.input('title', sql.NVarChar, task.title);
    requestTask.input('phaseId', sql.NVarChar, task.phaseId);
    requestTask.input('projectId', sql.NVarChar, task.projectId || 'proj1');
    requestTask.input('milestoneId', sql.NVarChar, task.milestoneId || null);
    requestTask.input('startDate', sql.VarChar, task.startDate);
    requestTask.input('endDate', sql.VarChar, task.endDate);
    requestTask.input('status', sql.NVarChar, task.status);
    requestTask.input('progress', sql.Int, task.progress || 0);
    requestTask.input('assigneeId', sql.NVarChar, task.assigneeId);
    requestTask.input('notes', sql.NVarChar, task.notes || null);
    requestTask.input('estimatedHours', sql.Int, task.estimatedHours || null);
    requestTask.input('actualHours', sql.Int, task.actualHours || null);
    requestTask.input('requiredSkills', sql.NVarChar, JSON.stringify(task.requiredSkills || []));
    requestTask.input('estimatedBudget', sql.Decimal(18, 2), task.estimatedBudget || null);
    requestTask.input('actualCost', sql.Decimal(18, 2), task.actualCost || null);
    requestTask.input('materials', sql.NVarChar, JSON.stringify(task.materials || []));
    requestTask.input('dependsOnTaskId', sql.NVarChar, task.dependsOnTaskId || null);
    requestTask.input('updatedAt', sql.DateTime2, new Date());
    requestTask.input('accepted', sql.Bit, task.accepted !== undefined ? (task.accepted ? 1 : 0) : 1);
    requestTask.input('boardOrder', sql.Int, task.boardOrder || 0);
    requestTask.input('priority', sql.NVarChar, (task as any).priority || 'media');

    await requestTask.query(`
      UPDATE Tasks
      SET title = @title, phaseId = @phaseId, projectId = @projectId, milestoneId = @milestoneId,
          startDate = @startDate, endDate = @endDate, status = @status, progress = @progress,
          assigneeId = @assigneeId, notes = @notes, estimatedHours = @estimatedHours, actualHours = @actualHours,
          requiredSkills = @requiredSkills, estimatedBudget = @estimatedBudget, actualCost = @actualCost,
          materials = @materials, dependsOnTaskId = @dependsOnTaskId, accepted = @accepted,
          boardOrder = @boardOrder, updatedAt = @updatedAt, priority = @priority
      WHERE id = @id
    `);

    // 3. Limpiar asignaciones viejas y guardar las nuevas
    const requestClean = new sql.Request(transaction);
    requestClean.input('taskId', sql.NVarChar, task.id);
    await requestClean.query('DELETE FROM TaskAssignees WHERE taskId = @taskId');

    const assigneeIds = task.assigneeIds && task.assigneeIds.length > 0 ? task.assigneeIds : [task.assigneeId];
    for (const uid of assigneeIds) {
      const requestAssignee = new sql.Request(transaction);
      requestAssignee.input('taskId', sql.NVarChar, task.id);
      requestAssignee.input('userId', sql.NVarChar, uid);
      await requestAssignee.query(`
        INSERT INTO TaskAssignees (taskId, userId)
        VALUES (@taskId, @userId)
      `);
    }

    await transaction.commit();
    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error('Error al actualizar tarea:', error);
    try { await transaction.rollback(); } catch {}
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Eliminar una tarea
export async function DELETE(request: Request) {
  const sessionUser = getAuthenticatedUser();
  if (!sessionUser) {
    return NextResponse.json({ success: false, error: 'No autorizado. Por favor inicie sesión.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Se requiere el parámetro ID para eliminar.' }, { status: 400 });
    }

    await executeQuery('DELETE FROM Tasks WHERE id = @id', {
      id: { type: sql.NVarChar, value: id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error al eliminar tarea:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
