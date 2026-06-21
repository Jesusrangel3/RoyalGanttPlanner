"use client";

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { LayoutDashboard, Trello, Calendar, Users, LogOut, BarChart2, Plus, Target, X, Bell, Check, Trash2, MessageSquare, AlertTriangle, Briefcase, Sun, Moon, StickyNote, Activity, List, DollarSign} from "lucide-react";
import AuthView from "@/components/AuthView";
import ChangePasswordView from "@/components/ChangePasswordView";
import GanttView from "@/components/views/GanttView";
import BoardView from "@/components/views/BoardView";
import CalendarView from "@/components/views/CalendarView";
import ReportsView from "@/components/views/ReportsView";
import UsersView from "@/components/views/UsersView";
import ProjectsView from "@/components/views/ProjectsView";
import NotesView from "@/components/views/NotesView";
import ActivityView from "@/components/views/ActivityView";
import ListView from "@/components/views/ListView";
import BudgetView from "@/components/views/BudgetView";
import WorkloadView from "@/components/views/WorkloadView";
import ApprovalsView from "@/components/views/ApprovalsView";
import { AuthUser, clearSession, getSessionUser, saveSessionUser } from "@/lib/auth";
import { mockTasks, mockPhases, mockProjects, mockMilestones } from "@/lib/mockData";
import { Task, Phase, Project, Milestone, Notification } from "@/types";

/**
 * Página principal de la aplicación.
 * Sincroniza y persiste todo el estado de la aplicación.
 * Habilita multi-proyectos, informes y aprobaciones administrativas.
 */

type Tab = "gantt" | "board" | "calendar" | "reports" | "users_Gantt" | "Projects_Gantt" | "workload" | "approvals" | "list" | "budget";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "Projects_Gantt",  label: "Proyectos",         icon: <Briefcase size={15} /> },
  { id: "list",      label: "Lista",             icon: <List size={15} /> },
  { id: "gantt",     label: "Diagrama de Gantt", icon: <LayoutDashboard size={15} /> },
  { id: "board",     label: "Tablero",           icon: <Trello size={15} /> },
  { id: "calendar",  label: "Calendario",        icon: <Calendar size={15} /> },
  { id: "reports",   label: "Informes",          icon: <BarChart2 size={15} /> },
  { id: "workload",  label: "Carga de Trabajo",  icon: <Users size={15} /> },
  { id: "approvals", label: "Aprobaciones",       icon: <Target size={15} /> },
  { id: "users_Gantt",     label: "Personas",          icon: <Users size={15} /> },
];

function getShortName(fullName: string): string {
  const name = fullName.trim();
  if (name.toLowerCase().includes("rené de jesús rangel buitrón")) {
    return "René Rangel";
  }
  const parts = name.split(" ").filter(Boolean);
  if (parts.length <= 2) return name;

  const connectors = ["de", "del", "la", "los", "las", "y", "de la", "de los", "de las", "de jesús"];
  let firstName = parts[0];
  let lastName = "";

  if (parts[1]?.toLowerCase() === "de" && parts[2]?.toLowerCase() === "jesús" && parts[3]) {
    lastName = parts[3];
  } else if (parts[1]?.toLowerCase() === "de" && parts[2]?.toLowerCase() === "la" && parts[3]?.toLowerCase() === "cruz" && parts[4]) {
    lastName = parts[4];
  } else if (connectors.includes(parts[1]?.toLowerCase()) && parts[2]) {
    if (parts[2]?.toLowerCase() === "la" || parts[2]?.toLowerCase() === "los" || parts[2]?.toLowerCase() === "las") {
      lastName = parts[4] || parts[3] || parts[2];
    } else {
      lastName = parts[3] || parts[2];
    }
  } else {
    lastName = parts[1] || "";
  }

  return `${firstName} ${lastName}`.trim();
}

const STORAGE_TASKS_KEY = "ganttpro-Tasks_Gantt";
const STORAGE_Phases_Gantt_KEY = "ganttpro-Phases_Gantt";
const STORAGE_Projects_Gantt_KEY = "ganttpro-Projects_Gantt";
const STORAGE_Milestones_Gantt_KEY = "ganttpro-Milestones_Gantt";
const STORAGE_USERS_KEY = "ganttpro-auth-users_Gantt";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("gantt");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const socketRef = useRef<any>(null);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Tema del sistema
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Carrusel de fondos en Login
  const BACKGROUNDS = ["/fondo1.jpeg", "/fondo2.png", "/fondo3.jpeg", "/fondo4.jpeg","/fondo6.png",];
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    if (user) return;
    const interval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % BACKGROUNDS.length);
    }, 8000); // Cambia cada 6 segundos
    return () => clearInterval(interval);
  }, [user]);

  // Estados para toasts flotantes
  const [toasts, setToasts] = useState<{ id: string; title: string; message: string; taskId?: string }[]>([]);
  const isInitialLoadRef = useRef(true);

  // Sobrecarga de fetch para interceptar de manera transparente la sincronización y desconexión
  const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    setIsSyncing(true);
    try {
      const response = await window.fetch(input, init);
      setIsOffline(false);
      return response;
    } catch (error) {
      setIsOffline(true);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  // Efecto para verificar conexión periódicamente si se detecta estado desconectado
  useEffect(() => {
    if (!isOffline) return;

    const interval = setInterval(async () => {
      try {
        const res = await window.fetch('/api/bootstrap');
        if (res.ok) {
          setIsOffline(false);
          if (user) {
            loadInitialData(user.id);
          }
        }
      } catch (err) {
        // Seguir desconectado
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isOffline, user]);

  const [Tasks_Gantt, setTasks] = useState<Task[]>([]);
  const [Phases_Gantt, setPhases_Gantt] = useState<Phase[]>([]);
  const [Projects_Gantt, setProjects_Gantt] = useState<Project[]>([]);
  const [Milestones_Gantt, setMilestones_Gantt] = useState<Milestone[]>([]);
  const [users_Gantt, setUsers] = useState<AuthUser[]>([]);
  // aliases para compatibilidad con referencias que usan nombre corto
  const tasks = Tasks_Gantt;
  const users = users_Gantt;

  // Notificaciones y navegación por tareas
  const [Notifications_Gantt, setNotifications_Gantt] = useState<Notification[]>([]);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [showNotifications_Gantt, setShowNotifications_Gantt] = useState(false);

  // Proyecto Activo Seleccionado
  const [activeProjectId, setActiveProjectId] = useState<string>("proj1");

  // Crear nuevo proyecto modal
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProj, setNewProj] = useState({ name: "", description: "", startDate: "", endDate: "" });

  async function loadInitialData(currentUserId: string) {
    try {
      const res = await fetch('/api/bootstrap');
      const data = await res.json();
      if (data.success) {
        setTasks(data.Tasks_Gantt);
        setPhases_Gantt(data.Phases_Gantt);
        setProjects_Gantt(data.Projects_Gantt);
        setMilestones_Gantt(data.Milestones_Gantt);
        setUsers(data.users_Gantt);
        setNotifications_Gantt(data.Notifications_Gantt);
        
        if (data.Projects_Gantt.length > 0) {
          const savedActiveProj = localStorage.getItem("ganttpro-active-project-id");
          if (savedActiveProj && data.Projects_Gantt.some((p: any) => p.id === savedActiveProj)) {
            setActiveProjectId(savedActiveProj);
          } else {
            setActiveProjectId(data.Projects_Gantt[0].id);
          }
        }
      } else {
        console.error("Error al cargar datos desde API:", data.error);
      }
    } catch (err) {
      console.error("Error de red al inicializar datos:", err);
    }
  }

  useEffect(() => {
    const sessionUser = getSessionUser();
    setUser(sessionUser);

    if (sessionUser) {
      loadInitialData(sessionUser.id);
    }
    setLoaded(true);

    // Inicializar tema desde localStorage
    const savedTheme = localStorage.getItem("ganttpro-theme") as "dark" | "light" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === "light") {
        document.documentElement.classList.add("theme-light");
      } else {
        document.documentElement.classList.remove("theme-light");
      }
    }

    // ─── SSO: Login Único desde la Suite Royal Hub ────────────────────────────
    // Si el Gantt está embebido en un iframe, la Suite envía las credenciales
    // via postMessage para que el usuario no tenga que autenticarse de nuevo.
    async function handleSSOMessage(event: MessageEvent) {
      if (!event.data || event.data.type !== "ROYAL_HUB_SSO") return;
      const { email, password } = event.data;
      if (!email || !password) return;

      // Solo hacer auto-login si NO hay sesión activa ya
      const existingSession = getSessionUser();
      if (existingSession) return;

      try {
        // Importar hashPassword para enviar el hash correcto al servidor
        const { hashPassword } = await import("@/lib/utils");
        const clientHash = await hashPassword(password);

        const res = await window.fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase(), password: clientHash }),
        });

        if (!res.ok) return;
        const data = await res.json();
        if (!data.success || !data.user) return;

        // Login exitoso: guardar sesión y cargar datos
        const { saveSessionUser } = await import("@/lib/auth");
        saveSessionUser(data.user);
        setUser(data.user);
        loadInitialData(data.user.id);
      } catch (err) {
        // Si falla el SSO no interrumpir — el usuario puede hacer login manualmente
        console.warn("[SSO Gantt] No se pudo hacer auto-login:", err);
      }
    }

    window.addEventListener("message", handleSSOMessage);
    return () => window.removeEventListener("message", handleSSOMessage);
    // ─────────────────────────────────────────────────────────────────────────
  }, []);

  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      isInitialLoadRef.current = true;
    }
  }, [user]);

  // Redirige a gantt si el tab activo no está permitido para el rol del usuario
  useEffect(() => {
    const restricted = new Set(["list", "workload", "approvals"]);
    if (user && user.role !== "Project Manager" && restricted.has(activeTab)) {
      setActiveTab("gantt");
    }
  }, [user?.role, activeTab]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("ganttpro-theme", nextTheme);
    if (nextTheme === "light") {
      document.documentElement.classList.add("theme-light");
    } else {
      document.documentElement.classList.remove("theme-light");
    }
  };

  useEffect(() => {
    if (!user) return;

    const socketUrl = `http://${window.location.hostname}:3001`;
    console.log("Conectando a WebSocket en:", socketUrl);
    const newSocket = io(socketUrl);

    newSocket.on("connect", () => {
      console.log("Conectado al servidor de sincronización en tiempo real");
      // Unirse a la sala personal para recibir notificaciones dirigidas
      newSocket.emit("join-user-room", user.id);
    });

    newSocket.on("update-Tasks_Gantt", (updatedTasks: Task[]) => {
      setTasks(updatedTasks);
    });

    newSocket.on("update-Projects_Gantt", (updatedProjects_Gantt: Project[]) => {
      setProjects_Gantt(updatedProjects_Gantt);
    });

    newSocket.on("update-Phases_Gantt", (updatedPhases_Gantt: Phase[]) => {
      setPhases_Gantt(updatedPhases_Gantt);
    });

    newSocket.on("update-Milestones_Gantt", (updatedMilestones_Gantt: Milestone[]) => {
      setMilestones_Gantt(updatedMilestones_Gantt);
    });

    newSocket.on("update-users_Gantt", (updatedUsers: AuthUser[]) => {
      setUsers(updatedUsers);
    });

    newSocket.on("update-Notifications_Gantt", (updatedNotifications_Gantt: Notification[]) => {
      setNotifications_Gantt((prevNotifications_Gantt) => {
        if (!isInitialLoadRef.current) {
          const newAssignments = updatedNotifications_Gantt.filter(n => 
            n.userId === user.id && 
            !n.read && 
            n.type === "assignment" && 
            !prevNotifications_Gantt.some(p => p.id === n.id)
          );
          newAssignments.forEach(n => {
            setToasts(curr => {
              if (curr.some(t => t.id === n.id)) return curr;
              return [...curr, {
                id: n.id,
                title: n.title,
                message: n.message,
                taskId: n.taskId
              }];
            });
          });
        }
        return updatedNotifications_Gantt;
      });
    });

    // Notificación dirigida (solo para este usuario, sin filtrar)
    newSocket.on("new-notification", (notification: Notification) => {
      setNotifications_Gantt(prev => {
        if (prev.some(p => p.id === notification.id)) return prev;
        if (!notification.read && notification.type === "assignment") {
          setToasts(curr => curr.some(t => t.id === notification.id) ? curr : [...curr, {
            id: notification.id,
            title: notification.title,
            message: notification.message,
            taskId: notification.taskId,
          }]);
        }
        return [notification, ...prev];
      });
    });

    socketRef.current = newSocket;

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id]);

  const handleSetTasks = (newTasks: Task[] | ((prev: Task[]) => Task[])) => {
    const prev = Tasks_Gantt;
    const next = typeof newTasks === "function" ? newTasks(prev) : newTasks;
    setTasks(next);

    if (socketRef.current) {
      socketRef.current.emit("sync-Tasks_Gantt", next);
    }

    // Sincronizar con el servidor
    const added = next.filter(n => !prev.some(p => p.id === n.id));
    added.forEach(t => {
      fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(t)
      }).catch(err => console.error("Error al agregar tarea en DB:", err));
    });

    const deleted = prev.filter(p => !next.some(n => n.id === p.id));
    deleted.forEach(t => {
      fetch(`/api/tasks?id=${t.id}`, { method: 'DELETE' })
        .catch(err => console.error("Error al eliminar tarea en DB:", err));
    });

    const updated = next.filter(n => {
      const original = prev.find(p => p.id === n.id);
      return original && JSON.stringify(original) !== JSON.stringify(n);
    });
    
    updated.forEach(t => {
      const original = prev.find(p => p.id === t.id);
      
      // Detectar si hay nuevos comentarios
      const prevComments = original?.comments || [];
      const nextComments = t.comments || [];
      if (nextComments.length > prevComments.length) {
        const newComments = nextComments.filter(nc => !prevComments.some(pc => pc.id === nc.id));
        newComments.forEach(nc => {
          fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: nc.id,
              taskId: t.id,
              userId: nc.userId,
              content: nc.content
            })
          }).catch(err => console.error("Error al guardar comentario en DB:", err));
        });
      }
      
      // Guardar la tarea modificada en la base de datos
      fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(t)
      }).catch(err => console.error("Error al actualizar tarea en DB:", err));
    });

    // Generar alertas y notificaciones basadas en los cambios
    if (prev.length > 0 && user) {
      const generatedAlerts: Notification[] = [];
      const timestamp = new Date().toLocaleString("es", { dateStyle: "short", timeStyle: "short" });

      next.forEach((newTask) => {
        const oldTask = prev.find((t) => t.id === newTask.id);

        if (!oldTask) {
          // 1. Tarea Nueva
          const uids = newTask.assigneeIds || (newTask.assigneeId ? [newTask.assigneeId] : []);
          uids.forEach((uid) => {
            if (uid !== user.id) {
              generatedAlerts.push({
                id: "notif" + Date.now() + Math.random().toString(36).substr(2, 4),
                userId: uid,
                title: "Nueva tarea asignada",
                message: `Has sido asignado a la tarea: "${newTask.title}"`,
                type: "assignment",
                taskId: newTask.id,
                read: false,
                createdAt: timestamp,
              });
            }
          });
        } else {
          // 2. Comentarios Nuevos
          const oldComments = oldTask.comments || [];
          const newComments = newTask.comments || [];
          if (newComments.length > oldComments.length) {
            const latestComment = newComments[newComments.length - 1];
            const uids = newTask.assigneeIds || (newTask.assigneeId ? [newTask.assigneeId] : []);
            uids.forEach((uid) => {
              if (uid !== latestComment.userId) { // No notificar al autor
                generatedAlerts.push({
                  id: "notif" + Date.now() + Math.random().toString(36).substr(2, 4),
                  userId: uid,
                  title: "Nuevo comentario",
                  message: `${latestComment.userName} comentó en "${newTask.title}": "${latestComment.content.substring(0, 32)}${latestComment.content.length > 32 ? "..." : ""}"`,
                  type: "comment",
                  taskId: newTask.id,
                  read: false,
                  createdAt: timestamp,
                });
              }
            });
          }

          // 3. Nuevos asignados a tarea existente
          const oldUids = oldTask.assigneeIds || (oldTask.assigneeId ? [oldTask.assigneeId] : []);
          const newUids = newTask.assigneeIds || (newTask.assigneeId ? [newTask.assigneeId] : []);
          const newlyAssigned = newUids.filter((uid) => !oldUids.includes(uid));
          newlyAssigned.forEach((uid) => {
            if (uid !== user.id) {
              generatedAlerts.push({
                id: "notif" + Date.now() + Math.random().toString(36).substr(2, 4),
                userId: uid,
                title: "Nueva tarea asignada",
                message: `Has sido asignado a la tarea: "${newTask.title}"`,
                type: "assignment",
                taskId: newTask.id,
                read: false,
                createdAt: timestamp,
              });
            }
          });

          // 4. Dependencia completada
          if (newTask.status === "done" && oldTask.status !== "done") {
            next.forEach((sucTask) => {
              if (sucTask.dependsOnTaskId === newTask.id) {
                const sucUids = sucTask.assigneeIds || (sucTask.assigneeId ? [sucTask.assigneeId] : []);
                sucUids.forEach((uid) => {
                  generatedAlerts.push({
                    id: "notif" + Date.now() + Math.random().toString(36).substr(2, 4),
                    userId: uid,
                    title: "Dependencia completada",
                    message: `La tarea predecesora "${newTask.title}" ha terminado. Ya puedes comenzar con "${sucTask.title}".`,
                    type: "dependency",
                    taskId: sucTask.id,
                    read: false,
                    createdAt: timestamp,
                  });
                });
              }
            });
          }

          // 5. Sobrecarga de Horas
          if (
            newTask.estimatedHours !== oldTask.estimatedHours || 
            JSON.stringify(newUids) !== JSON.stringify(oldUids)
          ) {
            newUids.forEach((uid) => {
              const assignedUser = users.find((u) => u.id === uid);
              if (assignedUser) {
                const activeUserTasks = next.filter(
                  (t) => (t.assigneeIds?.includes(uid) || t.assigneeId === uid) && t.status !== "done"
                );
                const totalAssignedHours = activeUserTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
                const limit = assignedUser.availableHours || 40;
                if (totalAssignedHours > limit) {
                  generatedAlerts.push({
                    id: "notif" + Date.now() + Math.random().toString(36).substr(2, 4),
                    userId: uid,
                    title: "⚠️ Alerta de Sobrecarga",
                    message: `Has superado tu capacidad semanal (${totalAssignedHours}h asignadas de ${limit}h disponibles)`,
                    type: "delay",
                    taskId: newTask.id,
                    read: false,
                    createdAt: timestamp,
                  });
                }
              }
            });
          }
        }
      });

      if (generatedAlerts.length > 0) {
        setNotifications_Gantt((curr) => {
          const updated = [...generatedAlerts, ...curr];
          if (socketRef.current) {
            socketRef.current.emit("sync-Notifications_Gantt", updated);
          }
          return updated;
        });

        generatedAlerts.forEach(n => {
          fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(n)
          }).catch(err => console.error("Error al registrar alerta en DB:", err));
        });
      }
    }
  };

  const handleSetPhases_Gantt = (newPhases_Gantt: Phase[] | ((prev: Phase[]) => Phase[])) => {
    const prev = Phases_Gantt;
    const next = typeof newPhases_Gantt === "function" ? newPhases_Gantt(prev) : newPhases_Gantt;
    setPhases_Gantt(next);

    if (socketRef.current) {
      socketRef.current.emit("sync-Phases_Gantt", next);
    }

    const added = next.filter(n => !prev.some(p => p.id === n.id));
    added.forEach(p => {
      fetch('/api/phases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p)
      }).catch(err => console.error("Error al crear fase en DB:", err));
    });

    const deleted = prev.filter(p => !next.some(n => n.id === p.id));
    deleted.forEach(p => {
      fetch(`/api/phases?id=${p.id}`, { method: 'DELETE' })
        .catch(err => console.error("Error al eliminar fase en DB:", err));
    });

    const updated = next.filter(n => {
      const original = prev.find(p => p.id === n.id);
      return original && JSON.stringify(original) !== JSON.stringify(n);
    });
    updated.forEach(p => {
      fetch('/api/phases', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p)
      }).catch(err => console.error("Error al actualizar fase en DB:", err));
    });
  };

  const handleSetProjects_Gantt = (newProjects_Gantt: Project[] | ((prev: Project[]) => Project[])) => {
    const prev = Projects_Gantt;
    const next = typeof newProjects_Gantt === "function" ? newProjects_Gantt(prev) : newProjects_Gantt;
    setProjects_Gantt(next);

    if (socketRef.current) {
      socketRef.current.emit("sync-Projects_Gantt", next);
    }

    const added = next.filter(n => !prev.some(p => p.id === n.id));
    added.forEach(p => {
      fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p)
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.defaultPhases_Gantt) {
          setPhases_Gantt(prevPhases_Gantt => {
            const updated = [...prevPhases_Gantt, ...data.defaultPhases_Gantt];
            if (socketRef.current) {
              socketRef.current.emit("sync-Phases_Gantt", updated);
            }
            return updated;
          });
        } else if (!data.success) {
          alert(`Error al guardar proyecto: ${data.error || 'Error desconocido'}`);
          setProjects_Gantt(prev);
        }
      })
      .catch(err => {
        console.error("Error al crear proyecto en DB:", err);
        alert("Error de red al guardar el proyecto. Verifica la conexión.");
        setProjects_Gantt(prev);
      });
    });

    const deleted = prev.filter(p => !next.some(n => n.id === p.id));
    deleted.forEach(p => {
      fetch(`/api/projects?id=${p.id}`, { method: 'DELETE' })
        .catch(err => console.error("Error al eliminar proyecto en DB:", err));
    });

    const updated = next.filter(n => {
      const original = prev.find(p => p.id === n.id);
      return original && JSON.stringify(original) !== JSON.stringify(n);
    });
    updated.forEach(p => {
      fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p)
      }).catch(err => console.error("Error al actualizar proyecto en DB:", err));
    });
  };

  const handleSetMilestones_Gantt = (newMilestones_Gantt: Milestone[] | ((prev: Milestone[]) => Milestone[])) => {
    const prev = Milestones_Gantt;
    const next = typeof newMilestones_Gantt === "function" ? newMilestones_Gantt(prev) : newMilestones_Gantt;
    setMilestones_Gantt(next);

    if (socketRef.current) {
      socketRef.current.emit("sync-Milestones_Gantt", next);
    }

    const added = next.filter(n => !prev.some(p => p.id === n.id));
    added.forEach(m => {
      fetch('/api/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(m)
      }).catch(err => console.error("Error al crear hito en DB:", err));
    });

    const deleted = prev.filter(p => !next.some(n => n.id === p.id));
    deleted.forEach(m => {
      fetch(`/api/milestones?id=${m.id}`, { method: 'DELETE' })
        .catch(err => console.error("Error al eliminar hito en DB:", err));
    });

    const updated = next.filter(n => {
      const original = prev.find(p => p.id === n.id);
      return original && JSON.stringify(original) !== JSON.stringify(n);
    });
    updated.forEach(m => {
      fetch('/api/milestones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(m)
      }).catch(err => console.error("Error al actualizar hito en DB:", err));
    });
  };

  const handleSetUsers = (newUsers: AuthUser[] | ((prev: AuthUser[]) => AuthUser[])) => {
    const prev = users_Gantt;
    const next = typeof newUsers === "function" ? newUsers(prev) : newUsers;
    setUsers(next);

    if (socketRef.current) {
      socketRef.current.emit("sync-users_Gantt", next);
    }

    const added = next.filter(n => !prev.some(p => p.id === n.id));
    added.forEach(u => {
      fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: u.id,
          name: u.name,
          email: u.email,
          password: '613686d53416d2aeb0f8e2e859516d4e76c892027dc953ef6b6ddc51c6b449d5',
          role: u.role,
          contractType: u.contractType,
          imageUrl: u.imageUrl
        })
      }).catch(err => console.error("Error al registrar colaborador invitado:", err));
    });

    const deleted = prev.filter(p => !next.some(n => n.id === p.id));
    deleted.forEach(u => {
      fetch(`/api/users?id=${u.id}`, { method: 'DELETE' })
        .catch(err => console.error("Error al eliminar usuario en DB:", err));
    });

    const updated = next.filter(n => {
      const original = prev.find(p => p.id === n.id);
      return original && JSON.stringify(original) !== JSON.stringify(n);
    });
    updated.forEach(u => {
      fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(u)
      }).catch(err => console.error("Error al actualizar usuario en DB:", err));
    });
  };

  function handleLogout() {
    clearSession();
    setUser(null);
  }

  const userNotifications_Gantt = Notifications_Gantt.filter((n) => n.userId === user?.id);
  const unreadNotifications_Gantt = userNotifications_Gantt.filter((n) => !n.read);

  function handleMarkAllAsRead() {
    const prev = Notifications_Gantt;
    const updated = prev.map((n) => (n.userId === user?.id ? { ...n, read: true } : n));
    setNotifications_Gantt(updated);

    if (user) {
      fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, read: true })
      }).catch(err => console.error("Error al marcar notificaciones leídas:", err));
    }
    if (socketRef.current) {
      socketRef.current.emit("sync-Notifications_Gantt", updated);
    }
  }

  function handleClearAllNotifications_Gantt() {
    const prev = Notifications_Gantt;
    const updated = prev.filter((n) => n.userId !== user?.id);
    setNotifications_Gantt(updated);

    if (user) {
      fetch(`/api/notifications?userId=${user.id}`, { method: 'DELETE' })
        .catch(err => console.error("Error al limpiar notificaciones en DB:", err));
    }
    if (socketRef.current) {
      socketRef.current.emit("sync-Notifications_Gantt", updated);
    }
  }

  function handleNotificationClick(n: Notification) {
    const prev = Notifications_Gantt;
    const updated = prev.map((item) => (item.id === n.id ? { ...item, read: true } : item));
    setNotifications_Gantt(updated);

    fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: n.id, read: true })
    }).catch(err => console.error("Error al marcar notificación leída:", err));

    if (socketRef.current) {
      socketRef.current.emit("sync-Notifications_Gantt", updated);
    }
    
    setShowNotifications_Gantt(false);

    if (n.taskId) {
      const task = tasks.find((t) => t.id === n.taskId);
      if (task) {
        if (task.projectId && task.projectId !== activeProjectId) {
          setActiveProjectId(task.projectId);
        }
        setActiveTab("gantt");
        setOpenTaskId(task.id);
      }
    }
  }

  function handleAuthSuccess(authUser: AuthUser) {
    saveSessionUser(authUser);
    setUser(authUser);
    loadInitialData(authUser.id);
  }

  function handleAddProject() {
    if (!newProj.name.trim() || !newProj.startDate || !newProj.endDate) return;
    const pmUser = users.find(u => u.role?.toString().trim().toLowerCase() === "project manager") || user;
    const leaderId = user?.id || pmUser?.id || "u1780073275604";
    const proj: Project = {
      id: "proj" + Date.now(),
      name: newProj.name.trim(),
      description: newProj.description.trim() || undefined,
      startDate: newProj.startDate,
      endDate: newProj.endDate,
      status: "planning",
      leaderId: leaderId,
    };
    handleSetProjects_Gantt((prev) => [...prev, proj]);
    setActiveProjectId(proj.id);
    setNewProj({ name: "", description: "", startDate: "", endDate: "" });
    setShowAddProject(false);
  }

  if (!loaded) {
    return null;
  }

  if (!user) {
    return (
      <div className={`relative min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden ${theme === "light" ? "theme-light" : ""}`}>
        {/* Carrusel de fondos con transición suave */}
        {BACKGROUNDS.map((bg, idx) => (
          <div
            key={bg}
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ease-in-out"
            style={{
              backgroundImage: `url('${bg}')`,
              opacity: idx === bgIndex ? 1 : 0,
              zIndex: idx === bgIndex ? 0 : -1,
            }}
          />
        ))}

        {/* Overlay oscuro y difuminado */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px] z-[1]" />
        
        {/* Contenedor relativo para el formulario (z-index) */}
        <div className="relative z-10 w-full max-w-md flex justify-center">
          <AuthView onSuccess={handleAuthSuccess} theme={theme} />
        </div>
      </div>
    );
  }

  if (user.mustChangePassword) {
    return (
      <div className={`relative min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden ${theme === "light" ? "theme-light" : ""}`}>
        {/* Carrusel de fondos con transición suave */}
        {BACKGROUNDS.map((bg, idx) => (
          <div
            key={bg}
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ease-in-out"
            style={{
              backgroundImage: `url('${bg}')`,
              opacity: idx === bgIndex ? 1 : 0,
              zIndex: idx === bgIndex ? 0 : -1,
            }}
          />
        ))}

        {/* Overlay oscuro y difuminado */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px] z-[1]" />
        
        {/* Contenedor relativo para el formulario (z-index) */}
        <div className="relative z-10 w-full max-w-md flex justify-center">
          <ChangePasswordView
            user={user}
            onSuccess={(updatedUser) => {
              setUser(updatedUser);
              saveSessionUser(updatedUser);
            }}
            onLogout={handleLogout}
            theme={theme}
          />
        </div>
      </div>
    );
  }

  const activeProj = Projects_Gantt.find((p) => p.id === activeProjectId) || Projects_Gantt[0] || mockProjects[0];

  const isPM = user?.role === "Project Manager";

  // Tabs restringidas: solo el Project Manager las ve
  const PM_ONLY_TABS = new Set(["list", "workload", "approvals"]);
  const visibleTabs  = isPM ? TABS : TABS.filter(t => !PM_ONLY_TABS.has(t.id));

  // Proyectos visibles: PM ve todos, el resto solo en los que tiene tareas asignadas
  const visibleProjects = isPM
    ? Projects_Gantt
    : Projects_Gantt.filter(p =>
        tasks.some(t => t.projectId === p.id && t.assigneeId === user?.id)
      );

  // Si el proyecto activo quedó fuera del scope del usuario, cambia al primero visible
  const safeActiveProj = visibleProjects.find(p => p.id === activeProjectId)
    ? activeProj
    : visibleProjects[0] || activeProj;

  const projectTasks = tasks.filter((t) => t.projectId === safeActiveProj.id);
  const projectMilestones_Gantt = Milestones_Gantt.filter((m) => m.projectId === safeActiveProj.id);
  let projectPhases_Gantt = Phases_Gantt.filter((p) => p.projectId === safeActiveProj.id || (!p.projectId && safeActiveProj.id === "proj1"));
  if (projectPhases_Gantt.length === 0) {
    if (safeActiveProj.id === "proj1") {
      projectPhases_Gantt = [
        { id: 'p1', name: 'Inicio y planificación', color: '#4f7cff', projectId: 'proj1' },
        { id: 'p2', name: 'Diseño y arquitectura', color: '#7c5cfc', projectId: 'proj1' },
        { id: 'p3', name: 'Desarrollo', color: '#3ecf8e', projectId: 'proj1' },
        { id: 'p4', name: 'Pruebas y entrega', color: '#f5a623', projectId: 'proj1' },
        { id: 'p5', name: 'Bloqueadas', color: '#ff5c5c', projectId: 'proj1' }
      ];
    } else {
      projectPhases_Gantt = [
        { id: `${safeActiveProj.id}_init`, name: 'Inicio y planificación', color: '#4f7cff', projectId: safeActiveProj.id },
        { id: `${safeActiveProj.id}_design`, name: 'Diseño y arquitectura', color: '#7c5cfc', projectId: safeActiveProj.id },
        { id: `${safeActiveProj.id}_dev`, name: 'Desarrollo', color: '#3ecf8e', projectId: safeActiveProj.id },
        { id: `${safeActiveProj.id}_qa`, name: 'Pruebas y entrega', color: '#f5a623', projectId: safeActiveProj.id },
        { id: `${safeActiveProj.id}_blocked`, name: 'Bloqueadas', color: '#ff5c5c', projectId: safeActiveProj.id }
      ];
    }
  }

  return (
    <div className={`flex flex-col h-screen bg-[#0f1117] text-[#e8eaf6] overflow-hidden ${theme === "light" ? "theme-light" : ""}`}>
      {/* Banner sin conexión */}
      {isOffline && (
        <div className="bg-[#ff5c5c]/95 backdrop-blur-md text-white py-2 px-4 text-xs font-bold text-center border-b border-[#ff5c5c]/50 flex items-center justify-center gap-2 z-50 animate-pulse">
          <span>⚠️ Conexión con el servidor de Royal Transport perdida. Se ha pausado la edición para evitar pérdida de datos. Intentando reconectar...</span>
        </div>
      )}
      {/* ── Top Bar ── */}
      <header className="flex items-center gap-3 px-4 py-2 bg-[#1a1d27] border-b border-[#2e3352] flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-4">
          <div className="w-7 h-7 rounded-lg overflow-hidden">
            <img src="/RTransportmini.jpeg" alt="Royal Transport" className="w-full h-full object-cover"/>
          </div>
          <span className="font-bold text-sm tracking-tight hidden lg:inline">
            Royal Gantt<span className="text-[#7c5cfc]"> Planner</span>
          </span>
        </div>

        {/* Project Switcher */}
        <div className="flex items-center gap-1.5 bg-[#11151f] border border-[#2e3352] rounded-xl px-2.5 py-1">
          <Target size={13} className="text-[#7c5cfc]" />
          <select
            value={activeProjectId}
            onChange={(e) => setActiveProjectId(e.target.value)}
            className="bg-transparent text-xs font-semibold text-[#e8eaf6] outline-none cursor-pointer pr-2"
          >
            {visibleProjects.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#1a1d27]">
                {p.name}
              </option>
            ))}
          </select>
          {isPM && (
            <button
              onClick={() => setShowAddProject(true)}
              className="text-[#8b93b8] hover:text-white p-0.5 rounded transition"
              title="Crear nuevo proyecto maestro"
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1 ml-2">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                activeTab === tab.id
                  ? "bg-[#4f7cff]/20 text-[#4f7cff] border border-[#4f7cff]/30"
                  : "text-[#8b93b8] hover:text-[#e8eaf6] hover:bg-white/5"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-2">
          {/* Botón de cambio de modo claro/oscuro */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg border border-[#2e3352] bg-[#1a1d27] text-[#8b93b8] hover:text-white hover:border-[#4f7cff] transition cursor-pointer flex items-center justify-center mr-1"
            title={theme === "light" ? "Modo oscuro" : "Modo claro"}
          >
            {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
          </button>

          {/* Centro de Notificaciones */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications_Gantt(!showNotifications_Gantt)}
              className="relative p-1.5 rounded-lg border border-[#2e3352] bg-[#1a1d27] text-[#8b93b8] hover:text-white hover:border-[#4f7cff] transition cursor-pointer flex items-center justify-center"
              title="Notificaciones"
            >
              <Bell size={15} />
              {unreadNotifications_Gantt.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#ff5c5c] text-white text-[8px] font-black rounded-full flex items-center justify-center border border-[#1a1d27]">
                  {unreadNotifications_Gantt.length}
                </span>
              )}
            </button>

            {showNotifications_Gantt && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications_Gantt(false)} />
                <div className="absolute right-0 mt-2 w-80 bg-[#1a1d27] border border-[#2e3352] rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[360px] animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2.5 border-b border-[#2e3352] bg-[#151821] flex justify-between items-center">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Bell size={13} className="text-[#4f7cff]" /> Notificaciones
                    </span>
                    <div className="flex gap-2 text-[9px] font-semibold">
                      {unreadNotifications_Gantt.length > 0 && (
                        <button onClick={handleMarkAllAsRead} className="text-[#4f7cff] hover:underline cursor-pointer">
                          Marcar todo leido
                        </button>
                      )}
                      {userNotifications_Gantt.length > 0 && (
                        <button onClick={handleClearAllNotifications_Gantt} className="text-[#ff5c5c] hover:underline cursor-pointer">
                          Limpiar todo
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1 divide-y divide-[#2e3352]/40">
                    {userNotifications_Gantt.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-[#8b93b8]">
                        <Bell size={24} className="opacity-20 mb-1.5" />
                        <p className="text-[10px] font-medium">No tienes notificaciones</p>
                      </div>
                    ) : (
                      userNotifications_Gantt.map((n) => {
                        const iconMap = {
                          comment: <MessageSquare size={13} className="text-[#4f7cff]" />,
                          assignment: <Briefcase size={13} className="text-[#3ecf8e]" />,
                          dependency: <Check size={13} className="text-[#e879f9]" />,
                          delay: <AlertTriangle size={13} className="text-[#ff5c5c]" />,
                        };
                        return (
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`p-3 text-left hover:bg-white/[0.02] cursor-pointer transition-colors flex gap-2.5 items-start ${!n.read ? "bg-white/[0.015]" : ""}`}
                          >
                            <div className="mt-0.5">{iconMap[n.type]}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-1">
                                <span className={`text-[11px] font-bold ${!n.read ? "text-white" : "text-[#8b93b8]"}`}>{n.title}</span>
                                <span className="text-[8px] text-[#8b93b8] flex-shrink-0 mt-0.5">{n.createdAt}</span>
                              </div>
                              <p className="text-[10px] text-[#8b93b8] leading-relaxed mt-0.5 line-clamp-2">{n.message}</p>
                            </div>
                            {!n.read && (
                              <div className="w-1.5 h-1.5 rounded-full bg-[#4f7cff] flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1 text-xs text-[#e8eaf6]">
            {/* Avatar circular */}
            <div 
              className="w-8 h-8 rounded-full overflow-hidden border border-[#2e3352] flex items-center justify-center flex-shrink-0" 
              style={{ background: user.color || '#4f7cff' }}
            >
              {user.imageUrl ? (
                <img src={user.imageUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-xs font-bold uppercase select-none">{user.initials}</span>
              )}
            </div>
            {/* Nombre y Cargo */}
            <div className="flex flex-col text-left">
              <span className="font-bold text-[#e8eaf6] leading-tight">{getShortName(user.name)}</span>
              <span className="text-[10px] text-[#8b93b8] leading-tight mt-0.5">{user.role}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 rounded-lg border border-[#2e3352] bg-[#1a1d27] px-3 py-1.5 text-xs text-[#e8eaf6] hover:bg-white/5 transition"
          >
            <LogOut size={14} /> Salir
          </button>
        </div>
      </header>
      {/* ── View Content ── */}
      <main className={`flex-1 overflow-hidden relative ${isOffline ? "pointer-events-none opacity-60" : ""}`}>
        {activeTab === "gantt"    && (
          <GanttView 
            Tasks_Gantt={projectTasks} 
            setTasks={handleSetTasks} 
            Phases_Gantt={projectPhases_Gantt} 
            setPhases_Gantt={handleSetPhases_Gantt} 
            Milestones_Gantt={projectMilestones_Gantt}
            setMilestones_Gantt={handleSetMilestones_Gantt}
            Projects_Gantt={[activeProj]}
            setProjects_Gantt={handleSetProjects_Gantt}
            users_Gantt={users_Gantt} 
            openTaskId={openTaskId}
            onClearOpenTaskId={() => setOpenTaskId(null)}
          />
        )}
        {activeTab === "board"    && (
          <BoardView 
            Tasks_Gantt={projectTasks} 
            setTasks={handleSetTasks} 
            Phases_Gantt={projectPhases_Gantt} 
            Milestones_Gantt={projectMilestones_Gantt}
            users_Gantt={users_Gantt} 
            activeProjectId={safeActiveProj.id}
          />
        )}
        {activeTab === "calendar" && (
          <CalendarView 
            Tasks_Gantt={projectTasks} 
            setTasks={handleSetTasks} 
            Phases_Gantt={projectPhases_Gantt} 
            Milestones_Gantt={projectMilestones_Gantt}
            users_Gantt={users_Gantt} 
            activeProjectId={safeActiveProj.id}
          />
        )}
        {activeTab === "reports"  && (
          <ReportsView 
            Tasks_Gantt={projectTasks} 
            Projects_Gantt={Projects_Gantt} 
            setProjects_Gantt={handleSetProjects_Gantt}
            Milestones_Gantt={projectMilestones_Gantt} 
            users_Gantt={users_Gantt} 
            activeProjectId={activeProjectId}
          />
        )}
        {activeTab === "users_Gantt"    && (
          <UsersView 
            Tasks_Gantt={Tasks_Gantt} 
            users_Gantt={users_Gantt} 
            setUsers={handleSetUsers} 
            currentUser={user}
            setCurrentUser={setUser}
          />
        )}
        {activeTab === "Projects_Gantt" && (
          <ProjectsView
            Projects_Gantt={Projects_Gantt}
            setProjects_Gantt={handleSetProjects_Gantt}
            Tasks_Gantt={Tasks_Gantt}
            users_Gantt={users_Gantt}
            currentUser={user}
            activeProjectId={activeProjectId}
            setActiveProjectId={setActiveProjectId}
            setActiveTab={setActiveTab}
          />
        )}
        {activeTab === "workload" && (
          <WorkloadView
            Tasks_Gantt={projectTasks}
            users_Gantt={users_Gantt}
          />
        )}
        {activeTab === "approvals" && (
          <ApprovalsView
            Tasks_Gantt={projectTasks}
            setTasks={handleSetTasks}
            Projects_Gantt={Projects_Gantt}
            users_Gantt={users_Gantt}
            currentUser={user}
          />
        )}
        {activeTab === "list" && (
          <ListView
            Tasks_Gantt={projectTasks}
            setTasks={handleSetTasks}
            Projects_Gantt={Projects_Gantt}
            users_Gantt={users_Gantt}
            activeProjectId={safeActiveProj.id}
            theme={theme}
          />
        )}
      </main>

      {/* Modal para agregar nuevo proyecto maestro */}
      {showAddProject && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={() => setShowAddProject(false)}>
          <div className="bg-[#1a1d27] border border-[#2e3352] rounded-xl p-5 w-80 max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-sm">Nuevo Proyecto Maestro</h3>
              <button onClick={() => setShowAddProject(false)} className="text-[#8b93b8] hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[#8b93b8] uppercase tracking-wider">Nombre del Proyecto</label>
                <input
                  className="bg-[#22263a] border border-[#2e3352] text-[#e8eaf6] rounded-lg px-3 py-1.5 text-xs w-full focus:outline-none focus:border-[#4f7cff]"
                  value={newProj.name}
                  onChange={(e) => setNewProj((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ej: Proyecto Logística Norte"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[#8b93b8] uppercase tracking-wider">Descripción</label>
                <textarea
                  className="bg-[#22263a] border border-[#2e3352] text-[#e8eaf6] rounded-lg px-3 py-1.5 text-xs w-full focus:outline-none focus:border-[#4f7cff] resize-none"
                  rows={2}
                  value={newProj.description}
                  onChange={(e) => setNewProj((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Descripción breve..."
                />
              </div>
              <div className="flex gap-2">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-[10px] text-[#8b93b8] uppercase tracking-wider">Inicio</label>
                  <input
                    type="date"
                    className="bg-[#22263a] border border-[#2e3352] text-[#e8eaf6] rounded-lg px-2 py-1.5 text-xs w-full focus:outline-none"
                    value={newProj.startDate}
                    onChange={(e) => setNewProj((p) => ({ ...p, startDate: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-[10px] text-[#8b93b8] uppercase tracking-wider">Fin</label>
                  <input
                    type="date"
                    className="bg-[#22263a] border border-[#2e3352] text-[#e8eaf6] rounded-lg px-2 py-1.5 text-xs w-full focus:outline-none"
                    value={newProj.endDate}
                    onChange={(e) => setNewProj((p) => ({ ...p, endDate: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button
                className="px-3 py-1.5 rounded-lg border border-[#2e3352] bg-[#22263a] text-[#e8eaf6] text-xs font-medium hover:border-[#4f7cff] transition-all cursor-pointer"
                onClick={() => setShowAddProject(false)}
              >
                Cancelar
              </button>
              <button
                className="px-3 py-1.5 rounded-lg bg-[#4f7cff] text-white text-xs font-medium hover:bg-[#3a6be0] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                onClick={handleAddProject}
                disabled={isSyncing}
              >
                {isSyncing ? "Guardando..." : "Crear Proyecto"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Sincronizador de base de datos flotante */}
      {isSyncing && (
        <div className="fixed bottom-4 right-4 z-50 bg-[#151821]/80 backdrop-blur-md border border-[#2e3352] rounded-xl px-3.5 py-2 shadow-2xl flex items-center gap-2 animate-in fade-in duration-300">
          <div className="w-3.5 h-3.5 border-2 border-[#7c5cfc]/30 border-t-[#7c5cfc] rounded-full animate-spin"></div>
          <span className="text-[10px] font-semibold text-[#8b93b8]">Sincronizando con SQL Server...</span>
        </div>
      )}

      {/* Toasts de Notificación en Esquina Inferior Izquierda */}
      <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="bg-[#1a1d27] border border-[#7c5cfc] rounded-xl p-4 shadow-2xl flex flex-col gap-2 animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto">
            <div className="flex justify-between items-start gap-3">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Bell size={13} className="text-[#3ecf8e]" /> {toast.title}
              </span>
              <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-[#8b93b8] hover:text-white cursor-pointer">
                <X size={14} />
              </button>
            </div>
            <p className="text-[10px] text-[#8b93b8] leading-relaxed">{toast.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
