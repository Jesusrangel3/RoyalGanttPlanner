import { User, Phase, Task, Project, Milestone } from "@/types";

export const mockUsers: User[] = [
  { id: "u1", name: "Ana García",      email: "ana.garcia@empresa.com",    initials: "AG", color: "#3ecf8e", role: "Project Manager",    contractType: "Por hora", password: "Royal1234", status: "active" },
  { id: "u2", name: "Carlos Méndez",   email: "carlos.mendez@empresa.com", initials: "CM", color: "#4f7cff", role: "Frontend Developer",  contractType: "Por hora", password: "Royal1234", status: "active" },
  { id: "u3", name: "Luis Ramírez",    email: "luis.ramirez@empresa.com",  initials: "LR", color: "#f5a623", role: "Backend Developer",   contractType: "Por hora", password: "Royal1234", status: "active" },
  { id: "u4", name: "María López",     email: "maria.lopez@empresa.com",   initials: "ML", color: "#7c5cfc", role: "UX/UI Designer",      contractType: "Por hora", password: "Royal1234", status: "active" },
  { id: "u5", name: "Jorge Ruiz",      email: "jorge.ruiz@empresa.com",    initials: "JR", color: "#38bdf8", role: "DevOps Engineer",     contractType: "Por hora", password: "Royal1234", status: "active" },
  { id: "u6", name: "Mario Morales",   email: "mario.morales@empresa.com", initials: "MM", color: "#e879f9", role: "Systems Architect",   contractType: "Por hora", password: "Royal1234", status: "active" },
  { id: "u7", name: "Andrea Rivas",    email: "andrea.rivas@empresa.com",  initials: "AR", color: "#fb923c", role: "QA Engineer",         contractType: "Por hora", password: "Royal1234", status: "active" },
];

export const mockProjects: Project[] = [
  {
    id: "proj1",
    name: "Royal Gantt Planner",
    description: "Aplicación web de gestión de proyectos con diagrama de Gantt",
    startDate: "2026-05-01",
    endDate: "2026-08-31",
    status: "active",
    leaderId: "u1",
  },
];

export const mockMilestones: Milestone[] = [
  { id: "m1", projectId: "proj1", name: "Análisis y Planificación", targetDate: "2026-05-20", status: "achieved" },
  { id: "m2", projectId: "proj1", name: "Arquitectura y Diseño", targetDate: "2026-06-15", status: "pending" },
  { id: "m3", projectId: "proj1", name: "Alpha Release", targetDate: "2026-07-15", status: "pending" },
  { id: "m4", projectId: "proj1", name: "Release Final", targetDate: "2026-08-31", status: "pending" },
];

export const mockPhases: Phase[] = [
  { id: "p1", name: "Inicio y planificación",    color: "#4f7cff" },
  { id: "p2", name: "Diseño y arquitectura",     color: "#7c5cfc" },
  { id: "p3", name: "Desarrollo",                color: "#3ecf8e" },
  { id: "p4", name: "Pruebas y entrega",         color: "#f5a623" },
  { id: "p5", name: "Bloqueadas",                color: "#ff5c5c" },
];

export const mockTasks: Task[] = [
  { id: "t1",  projectId: "proj1", phaseId: "p1", title: "Kickoff con stakeholders",   startDate: "2026-05-01", endDate: "2026-05-03", status: "done",        progress: 100, assigneeId: "u1" },
  { id: "t2",  projectId: "proj1", phaseId: "p1", title: "Definición de alcance",      startDate: "2026-05-04", endDate: "2026-05-12", status: "done",        progress: 100, assigneeId: "u2" },
  { id: "t3",  projectId: "proj1", phaseId: "p1", title: "Plan de proyecto",           startDate: "2026-05-13", endDate: "2026-05-20", status: "done",        progress: 100, assigneeId: "u1" },
  { id: "t4",  projectId: "proj1", phaseId: "p2", title: "Arquitectura del sistema",   startDate: "2026-05-21", endDate: "2026-06-05", status: "in_progress", progress: 65,  assigneeId: "u6" },
  { id: "t5",  projectId: "proj1", phaseId: "p2", title: "Diseño UX/UI",              startDate: "2026-05-28", endDate: "2026-06-15", status: "in_progress", progress: 40,  assigneeId: "u4" },
  { id: "t6",  projectId: "proj1", phaseId: "p2", title: "Royal Gantt",               startDate: "2026-06-01", endDate: "2026-06-20", status: "in_progress", progress: 20,  assigneeId: "u5" },
  { id: "t7",  projectId: "proj1", phaseId: "p2", title: "EEEE",                      startDate: "2026-05-22", endDate: "2026-06-10", status: "open",        progress: 0,   assigneeId: "u5" },
  { id: "t8",  projectId: "proj1", phaseId: "p3", title: "Módulo autenticación",      startDate: "2026-06-10", endDate: "2026-06-30", status: "open",        progress: 0,   assigneeId: "u7" },
  { id: "t9",  projectId: "proj1", phaseId: "p3", title: "API REST",                  startDate: "2026-06-15", endDate: "2026-07-15", status: "open",        progress: 0,   assigneeId: "u3" },
  { id: "t10", projectId: "proj1", phaseId: "p3", title: "Frontend",                  startDate: "2026-06-20", endDate: "2026-07-30", status: "open",        progress: 0,   assigneeId: "u4" },
  { id: "t11", projectId: "proj1", phaseId: "p3", title: "Integraciones externas",    startDate: "2026-07-01", endDate: "2026-07-20", status: "blocked",     progress: 0,   assigneeId: "u1", Notes_Gantt: "Esperando credenciales del cliente" },
  { id: "t12", projectId: "proj1", phaseId: "p4", title: "QA y pruebas",              startDate: "2026-07-20", endDate: "2026-08-10", status: "open",        progress: 0,   assigneeId: "u2" },
  { id: "t13", projectId: "proj1", phaseId: "p4", title: "Deploy y go-live",          startDate: "2026-08-10", endDate: "2026-08-15", status: "open",        progress: 0,   assigneeId: "u3" },
];
