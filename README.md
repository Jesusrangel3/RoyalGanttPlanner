# GanttPro — Sistema de Gestión de Proyectos

MVP visual (Fase 2) construido con Next.js + Tailwind CSS.
esto lo vere en la lap del jale fierro flash 
## 🚀 Cómo iniciar

```bash
# 1. Entra a la carpeta
cd ganttpro

# 2. Instala dependencias
npm install

# 3. Levanta el servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## 📁 Estructura del proyecto

```
ganttpro/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout (fuente, metadata)
│   │   ├── page.tsx            # Shell principal + navegación de tabs
│   │   └── globals.css         # Estilos globales + dark theme
│   ├── components/
│   │   └── views/
│   │       ├── GanttView.tsx   # Vista Gantt con barras arrastrables
│   │       ├── BoardView.tsx   # Tablero Kanban drag & drop
│   │       ├── CalendarView.tsx# Calendario mensual
│   │       └── UsersView.tsx   # Gestión de personas
│   ├── lib/
│   │   ├── mockData.ts         # ← Fuente única de datos (editar aquí)
│   │   └── utils.ts            # Helpers de fechas y colores
│   └── types/
│       └── index.ts            # Tipos TypeScript: Task, User, Phase
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

---

## 🗂 Vistas disponibles

| Vista | Descripción |
|-------|-------------|
| **Diagrama de Gantt** | Línea de tiempo con barras arrastrables, filtros y stats |
| **Tablero** | Kanban con columnas por estado, drag & drop entre columnas |
| **Calendario** | Vista mensual con tareas como bloques de color |
| **Personas** | Tabla de miembros: rol, tipo de contrato, tareas asignadas |

---

## ✏️ Cómo agregar tus datos

Edita `src/lib/mockData.ts`:

```ts
export const mockUsers: User[] = [
  { id: "u1", name: "Tu Nombre", email: "tu@email.com",
    initials: "TN", color: "#4f7cff", role: "Developer", contractType: "Por hora" },
];

export const mockTasks: Task[] = [
  { id: "t1", phaseId: "p1", title: "Mi tarea",
    startDate: "2026-06-01", endDate: "2026-06-15",
    status: "open", progress: 0, assigneeId: "u1" },
];
```

---

## 🗺 Roadmap (siguientes fases)

- **Fase 3:** Conectar a SQL Server con Prisma + Next.js API Routes
- **Fase 4:** Persistencia real de drag & drop al backend
- **Fase 5:** Autenticación de usuarios (NextAuth)
- **Fase 6:** Notificaciones y colaboración en tiempo real

---

## 🛠 Stack

- **Framework:** Next.js 14 (App Router)
- **Estilos:** Tailwind CSS
- **Iconos:** Lucide React
- **TypeScript:** Strict mode
- **Estado:** React useState/useEffect (sin Redux)
- **Datos:** Mock Data estático (sin backend en esta fase)
