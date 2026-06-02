export type TaskStatus = "open" | "in_progress" | "done" | "blocked" | "review";
export type UserRole = "Project Manager" | "Frontend Developer" | "Backend Developer" | "UX/UI Designer" | "DevOps Engineer" | "Systems Architect" | "QA Engineer" | "Analista" | "Observer";
export type ContractType = "Por hora" | "Fijo" | "Freelance" | "Consultor";
export type UserStatus = "pending" | "active" | "inactive";

/**
 * Interfaz de usuario del sistema.
 * Incluye campos para recursos, capacidades y disponibilidad.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
  color: string;
  role: UserRole;
  contractType: ContractType;
  status?: UserStatus;
  imageUrl?: string;
  password?: string;
  mustChangePassword?: boolean;

  // Gestión de recursos
  availableHours?: number; // Horas disponibles por semana
  totalAssignedHours?: number; // Horas totales asignadas
  skills?: string[]; // Capacidades técnicas del usuario
}

export interface AuthUser extends User {
  password?: string;
}

/**
 * Proyecto contenedor de fases y tareas.
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  startDate: string; // ISO: "2026-05-01"
  endDate: string;
  status: "planning" | "active" | "completed" | "on_hold";
  leaderId: string; // ID del Project Manager
}

/**
 * Fase dentro de un proyecto.
 */
export interface Phase {
  id: string;
  name: string;
  color: string;
  projectId?: string; // Opcional: vinculación a proyecto
}

/**
 * Hito o milestone del proyecto.
 */
export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  targetDate: string; // ISO: "2026-05-01"
  description?: string;
  status: "pending" | "achieved" | "missed";
}

/**
 * Tarea con soporte para gestión de recursos mejorada.
 */
export interface Task {
  id: string;
  title: string;
  phaseId: string;
  projectId?: string;
  milestoneId?: string;
  startDate: string; // ISO: "2026-05-01"
  endDate: string;
  status: TaskStatus;
  progress: number; // 0–100
  assigneeId: string;
  assigneeIds?: string[];
  notes?: string;

  // Gestión de recursos
  estimatedHours?: number; // Horas estimadas para completar
  actualHours?: number; // Horas reales invertidas
  requiredSkills?: string[]; // Skills necesarios para la tarea
  estimatedBudget?: number; // Presupuesto financiero estimado
  actualCost?: number; // Costo real invertido
  materials?: string[]; // Recursos materiales asignados

  // Dependencias
  dependsOnTaskId?: string; // ID de tarea anterior si la hay
  
  // Comentarios y colaboración
  comments?: TaskComment[];

  // Auditoría
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  accepted?: boolean;
  boardOrder?: number;
}

export interface TaskComment {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  content: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "comment" | "assignment" | "delay" | "dependency";
  taskId?: string;
  read: boolean;
  createdAt: string;
}

