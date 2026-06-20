export type TaskStatus = "open" | "in_progress" | "done" | "blocked" | "review";
export type TaskPriority = "critica" | "alta" | "media" | "baja";
export type UserRole = "Project Manager" | "Frontend Developer" | "Backend Developer" | "UX/UI Designer" | "DevOps Engineer" | "Systems Architect" | "QA Engineer" | "Analista" | "Observer";
export type ContractType = "Por hora" | "Fijo" | "Freelance" | "Consultor";
export type UserStatus = "pending" | "active" | "inactive";

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
  availableHours?: number;
  totalAssignedHours?: number;
  skills?: string[];
}

export interface AuthUser extends User {
  password?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: "planning" | "active" | "completed" | "on_hold";
  leaderId: string;
}

export interface Phase {
  id: string;
  name: string;
  color: string;
  projectId?: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  targetDate: string;
  description?: string;
  status: "pending" | "achieved" | "missed";
}

export interface Task {
  id: string;
  title: string;
  phaseId: string;
  projectId?: string;
  milestoneId?: string;
  startDate: string;
  endDate: string;
  status: TaskStatus;
  progress: number;
  priority?: TaskPriority;
  riskFlag?: "en_riesgo" | "vencida" | null;
  assigneeId: string;
  assigneeIds?: string[];
  notes?: string;
  estimatedHours?: number;
  actualHours?: number;
  requiredSkills?: string[];
  estimatedBudget?: number;
  actualCost?: number;
  materials?: string[];
  dependsOnTaskId?: string;
  comments?: TaskComment[];
  checklist?: ChecklistItem[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  accepted?: boolean;
  boardOrder?: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
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

export interface Note {
  id: string;
  userId: string;
  projectId?: string;
  taskId?: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  tags?: string[];
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog_Gantt {
  id: string;
  userId: string;
  userName: string;
  action: "created" | "updated" | "deleted" | "commented" | "login" | "status_changed";
  entityType: "task" | "project" | "phase" | "milestone" | "user" | "note";
  entityId: string;
  entityTitle: string;
  details?: string;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  userId: string;
  hours: number;
  description?: string;
  date: string;
  createdAt: string;
  userName?: string;
  userColor?: string;
  taskTitle?: string;
}
