import { NextResponse } from 'next/server';
import { executeQuery, sql } from '@/lib/db';
import { Task, Project, Phase, Milestone, User, Notification, TaskComment } from '@/types';
import { getAuthenticatedUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Verificar autenticación
    const sessionUser = getAuthenticatedUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: 'No autorizado. Por favor inicie sesión.' }, { status: 401 });
    }

    // 1. Obtener usuarios (sin contraseñas)
    const usersResult = await executeQuery(`
      SELECT id, name, email, initials, color, role, contractType, status, imageUrl, availableHours, totalAssignedHours, skills 
      FROM users_Gantt
    `);
    const users: User[] = usersResult.recordset.map(u => ({
      ...u,
      skills: u.skills ? JSON.parse(u.skills) : [],
    }));

    // 2. Obtener proyectos
    const Projects_GanttResult = await executeQuery(`
      SELECT id, name, description, startDate, endDate, status, leaderId 
      FROM Projects_Gantt
    `);
    const Projects_Gantt: Project[] = Projects_GanttResult.recordset;

    // 3. Obtener fases
    const Phases_GanttResult = await executeQuery(`
      SELECT id, name, color, projectId 
      FROM Phases_Gantt
    `);
    const Phases_Gantt: Phase[] = Phases_GanttResult.recordset;

    // 4. Obtener hitos (Milestones_Gantt)
    const Milestones_GanttResult = await executeQuery(`
      SELECT id, projectId, name, targetDate, description, status 
      FROM Milestones_Gantt
    `);
    const Milestones_Gantt: Milestone[] = Milestones_GanttResult.recordset;

    // 5. Obtener asignaciones múltiples
    const assigneesResult = await executeQuery(`
      SELECT taskId, userId FROM TaskAssignees_Gantt
    `);
    const assigneesMap: Record<string, string[]> = {};
    assigneesResult.recordset.forEach(a => {
      if (!assigneesMap[a.taskId]) {
        assigneesMap[a.taskId] = [];
      }
      assigneesMap[a.taskId].push(a.userId);
    });

    // 6. Obtener comentarios
    const commentsResult = await executeQuery(`
      SELECT c.id, c.taskId, c.userId, u.name as userName, u.color as userColor, c.content, c.createdAt
      FROM TaskComments_Gantt c 
      JOIN users_Gantt u ON c.userId = u.id 
      ORDER BY c.createdAt ASC
    `);
    const commentsMap: Record<string, TaskComment[]> = {};
    commentsResult.recordset.forEach(c => {
      const comment: TaskComment = {
        id: c.id,
        userId: c.userId,
        userName: c.userName,
        userColor: c.userColor,
        content: c.content,
        createdAt: new Date(c.createdAt).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' }),
      };
      if (!commentsMap[c.taskId]) {
        commentsMap[c.taskId] = [];
      }
      commentsMap[c.taskId].push(comment);
    });

    // 7. Obtener tareas
    const tasksResult = await executeQuery(`
      SELECT id, title, phaseId, projectId, milestoneId, startDate, endDate, status, progress, assigneeId, notes, estimatedHours, actualHours, requiredSkills, estimatedBudget, actualCost, materials, dependsOnTaskId, accepted 
      FROM Tasks_Gantt
    `);
    const tasks: Task[] = tasksResult.recordset.map(t => ({
      ...t,
      assigneeIds: assigneesMap[t.id] || [t.assigneeId],
      comments: commentsMap[t.id] || [],
      requiredSkills: t.requiredSkills ? JSON.parse(t.requiredSkills) : [],
      materials: t.materials ? JSON.parse(t.materials) : [],
      estimatedBudget: t.estimatedBudget ? Number(t.estimatedBudget) : undefined,
      actualCost: t.actualCost ? Number(t.actualCost) : undefined,
      accepted: t.accepted !== undefined ? !!t.accepted : true,
    }));

    // 8. Obtener notificaciones
    const Notifications_GanttResult = await executeQuery(`
      SELECT id, userId, title, message, type, taskId, [read], createdAt 
      FROM Notifications_Gantt
      ORDER BY createdAt DESC
    `);
    const Notifications_Gantt: Notification[] = Notifications_GanttResult.recordset.map(n => ({
      id: n.id,
      userId: n.userId,
      title: n.title,
      message: n.message,
      type: n.type as any,
      taskId: n.taskId,
      read: !!n.read,
      createdAt: new Date(n.createdAt).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' }),
    }));

    return NextResponse.json({
      success: true,
      users_Gantt: users,
      Projects_Gantt,
      Phases_Gantt,
      Milestones_Gantt,
      Tasks_Gantt: tasks,
      Notifications_Gantt,
    });
  } catch (error: any) {
    console.error('Error en bootstrap API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al iniciar los datos' },
      { status: 500 }
    );
  }
}
