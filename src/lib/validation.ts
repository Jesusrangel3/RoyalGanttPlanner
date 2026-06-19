/**
 * Librería de validación para tareas, proyectos y recursos.
 * Proporciona funciones para validar integridad de datos y prevenir estados inválidos.
 */

import { Task, AuthUser } from "@/types";

/**
 * Valida que una fecha esté en formato ISO válido (YYYY-MM-DD).
 */
export function isValidISODate(dateString: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
  const date = new Date(dateString + "T00:00:00");
  return !isNaN(date.getTime());
}

/**
 * Valida que una fecha de inicio sea menor o igual a la fecha de fin.
 */
export function isValidDateRange(startDate: string, endDate: string): boolean {
  if (!isValidISODate(startDate) || !isValidISODate(endDate)) return false;
  return new Date(startDate) <= new Date(endDate);
}

/**
 * Obtiene el número de días laborales entre dos fechas (excluyendo fines de semana).
 */
export function getWorkingDays(startDate: string, endDate: string): number {
  if (!isValidDateRange(startDate, endDate)) return 0;
  
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * Calcula el número de días totales entre dos fechas (incluyendo ambas).
 */
export function getDaysDuration(startDate: string, endDate: string): number {
  if (!isValidDateRange(startDate, endDate)) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDiff = end.getTime() - start.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
}

/**
 * Valida que una tarea tenga datos consistentes.
 * Verifica: fechas válidas, rango válido, progreso en rango 0-100, horas estimadas positivas.
 */
export function isValidTask(task: Partial<Task>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validación: título
  if (!task.title || task.title.trim().length === 0) {
    errors.push("El título de la tarea es obligatorio.");
  }

  // Validación: fechas
  if (!task.startDate) {
    errors.push("La fecha de inicio es obligatoria.");
  } else if (!isValidISODate(task.startDate)) {
    errors.push("La fecha de inicio tiene un formato inválido (YYYY-MM-DD).");
  }

  if (!task.endDate) {
    errors.push("La fecha de fin es obligatoria.");
  } else if (!isValidISODate(task.endDate)) {
    errors.push("La fecha de fin tiene un formato inválido (YYYY-MM-DD).");
  }

  // Validación: rango de fechas
  if (task.startDate && task.endDate && !isValidDateRange(task.startDate, task.endDate)) {
    errors.push("La fecha de inicio no puede ser posterior a la fecha de fin.");
  }

  // Validación: progreso
  if (task.progress !== undefined) {
    if (task.progress < 0 || task.progress > 100) {
      errors.push("El progreso debe estar entre 0 y 100.");
    }
    if (!Number.isInteger(task.progress)) {
      errors.push("El progreso debe ser un número entero.");
    }
  }

  // Validación: horas estimadas
  if (task.estimatedHours !== undefined && task.estimatedHours < 0) {
    errors.push("Las horas estimadas no pueden ser negativas.");
  }

  // Validación: horas reales
  if (task.actualHours !== undefined && task.actualHours < 0) {
    errors.push("Las horas reales no pueden ser negativas.");
  }

  // Validación: horas reales vs estimadas
  if (
    task.estimatedHours !== undefined &&
    task.actualHours !== undefined &&
    task.actualHours > task.estimatedHours * 1.5
  ) {
    errors.push(
      "Advertencia: Las horas reales son significativamente mayores que las estimadas."
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Valida si un usuario puede ser asignado a una tarea.
 * Verifica: usuario existe, tiene disponibilidad, tiene skills requeridos (opcional).
 */
export function canAssignUserToTask(
  user: AuthUser,
  task: Partial<Task>,
  allUsers: AuthUser[],
  allTasks: Task[]
): { canAssign: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Validación: usuario existe
  if (!user || !user.id) {
    reasons.push("El usuario es inválido.");
    return { canAssign: false, reasons };
  }

  // Validación: usuario activo
  if (user.status === "inactive") {
    reasons.push(`El usuario ${user.name} está inactivo.`);
  }

  // Validación: disponibilidad
  const userTasks = allTasks.filter(
    (t) => t.assigneeId === user.id && t.status !== "done"
  );
  const totalAssignedHours = userTasks.reduce(
    (sum, t) => sum + (t.estimatedHours || 0),
    0
  );
  const availableHours = user.availableHours || 40;

  if (task.estimatedHours && totalAssignedHours + task.estimatedHours > availableHours * 1.5) {
    reasons.push(
      `Advertencia: Asignar ${task.estimatedHours}h excedería la disponibilidad de ${user.name} (${availableHours}h/semana, ${totalAssignedHours}h asignadas).`
    );
  }

  // Validación: skills requeridos
  if (task.requiredSkills && task.requiredSkills.length > 0) {
    const userSkills = user.skills || [];
    const missingSkills = task.requiredSkills.filter((skill) => !userSkills.includes(skill));

    if (missingSkills.length > 0) {
      reasons.push(
        `Advertencia: ${user.name} no tiene los skills requeridos: ${missingSkills.join(", ")}.`
      );
    }
  }

  return {
    canAssign: reasons.length === 0 || reasons.every((r) => r.startsWith("Advertencia")),
    reasons,
  };
}

/**
 * Calcula la carga de trabajo de un usuario en horas.
 */
export function calculateUserWorkload(userId: string, Tasks_Gantt: Task[]): {
  totalEstimatedHours: number;
  totalActualHours: number;
  incompleteTasks: number;
} {
  const userTasks = Tasks_Gantt.filter((t) => t.assigneeId === userId && t.status !== "done");
  
  return {
    totalEstimatedHours: userTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0),
    totalActualHours: userTasks.reduce((sum, t) => sum + (t.actualHours || 0), 0),
    incompleteTasks: userTasks.length,
  };
}

/**
 * Obtiene alertas de sobrecarga para un usuario.
 */
export function getUserWorkloadAlerts(
  user: AuthUser,
  Tasks_Gantt: Task[]
): string[] {
  const alerts: string[] = [];
  const workload = calculateUserWorkload(user.id, Tasks_Gantt);
  const availableHours = user.availableHours || 40;

  if (workload.totalEstimatedHours > availableHours) {
    alerts.push(
      `Sobrecarga detectada: ${user.name} tiene ${workload.totalEstimatedHours}h asignadas pero solo ${availableHours}h disponibles.`
    );
  }

  if (workload.incompleteTasks > 5) {
    alerts.push(`${user.name} tiene ${workload.incompleteTasks} tareas incompletas.`);
  }

  return alerts;
}
