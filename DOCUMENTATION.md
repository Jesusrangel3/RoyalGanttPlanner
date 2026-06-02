# Documentación de GanttPro

## Visión general

GanttPro es una aplicación de gestión de proyectos construida con **Next.js 14**, **React 18** y **Tailwind CSS**. Está diseñada para ofrecer un flujo básico de autenticación, gestión de tareas en diagramas de Gantt, tablero Kanban y calendario.

La aplicación es un prototipo de solución colaborativa que permite:
- iniciar sesión y registrarse con correo institucional `@royaltransport.com.mx`
- visualizar tareas en un diagrama de Gantt
- administrar tareas por estado en un tablero tipo Kanban
- revisar tareas en un calendario mensual
- gestionar usuarios del proyecto


## Estructura de carpetas clave

- `src/app/`
  - `page.tsx`: componente raíz que controla la autenticación y la navegación entre vistas.
  - `layout.tsx`: layout global de Next.js que envuelve la app y carga estilos globales.
  - `globals.css`: estilos globales, fuentes y configuración del scroll.

- `src/components/`
  - `AuthView.tsx`: componente de login/registro.
  - `views/`: vistas principales del tablero.
    - `GanttView.tsx`: vista de diagrama de Gantt.
    - `BoardView.tsx`: vista Kanban/board.
    - `CalendarView.tsx`: vista de calendario.
    - `UsersView.tsx`: vista de miembros del equipo.

- `src/lib/`
  - `auth.ts`: lógica de autenticación, persistencia de usuarios y sesión en `localStorage`.
  - `mockData.ts`: datos simulados de usuarios, fases y tareas.
  - `utils.ts`: utilidades de fechas y estilos asociados al estado de tareas.

- `src/types/`
  - `index.ts`: tipos TypeScript de usuarios, tareas, fases y estados.

- `public/`
  - `RTransportmini.jpeg`: imagen usada en el header de la app.


## Flujo de la aplicación

### 1. Inicio y autenticación

- `src/app/page.tsx` es la puerta de entrada.
- Verifica si existe sesión en `localStorage` con `getSessionUser()`.
- Si no hay sesión, muestra `AuthView`.
- Si hay sesión, muestra el layout principal con barra superior y pestañas.
- El usuario puede cerrar sesión con `clearSession()`.

### 2. Login y registro

- `src/components/AuthView.tsx` contiene el formulario.
- Modo `login`:
  - valida correo institucional
  - utiliza `loginUser(email, password)` de `src/lib/auth.ts`
- Modo `register`:
  - valida nombre, correo institucional, contraseña y match de contraseñas
  - permite subir una foto de perfil como `imageUrl`
  - registra al usuario con `registerUser(...)`
- Las cuentas nuevas y existentes se almacenan en `localStorage`.

### 3. Persistencia de usuarios

- `src/lib/auth.ts`
  - `getPersistedUsers()`: carga usuarios de `localStorage` o usa los `mockUsers` iniciales.
  - `savePersistedUsers(users)`: guarda usuarios en `localStorage`.
  - `saveSessionUser(user)`: guarda sesión activa en `localStorage`.
  - `loginUser(...)`: autentica por correo y contraseña.
  - `registerUser(...)`: crea un nuevo usuario.

### 4. Vistas principales

#### `GanttView.tsx`

- Muestra una vista de diagrama de Gantt con:
  - fases (`mockPhases`)
  - tareas (`mockTasks`)
  - barra de tiempo mensual
- Permite:
  - filtrar por estado y usuario
  - crear/editar/eliminar tareas
  - arrastrar barras de tarea para cambiar fechas
  - exportar JSON de tareas
  - ver estadísticas rápidas de estados
- Usa utilidades de `src/lib/utils.ts` para fechas y estilos.

#### `BoardView.tsx`

- Muestra la vista tipo Kanban dividida en columnas por estado:
  - Abierto, En progreso, Terminado, Bloqueado
- Permite:
  - arrastrar tareas de una columna a otra
  - ver detalles de la tarea en un modal

#### `CalendarView.tsx`

- Muestra un calendario mensual con tareas del rango de fecha.
- Da la opción de cambiar mes y volver al mes actual.
- Muestra un modal de detalle al pulsar una tarea.

#### `UsersView.tsx`

- Lista los usuarios persistidos.
- Permite invitar/editar/eliminar usuarios.
- Soporta foto de perfil, nombre, correo, rol, tipo de contrato y conteo de tareas.
- Usa `getPersistedUsers()` y `savePersistedUsers()` para mantener cambios.


## Modelo de datos

Los tipos principales están en `src/types/index.ts`:

- `User`
  - `id`, `name`, `email`, `initials`, `color`, `role`, `contractType`
  - `status` opcional (`pending` | `active`)
  - `imageUrl` opcional para foto de perfil
  - `password` opcional en `User`, obligatorio en `AuthUser`

- `AuthUser` extiende `User` e incluye `password`.

- `Phase`
  - `id`, `name`, `color`

- `Task`
  - `id`, `title`, `phaseId`, `startDate`, `endDate`, `status`, `progress`, `assigneeId`, `notes?`

- `TaskStatus`
  - valores: `open`, `in_progress`, `done`, `blocked`


## Datos simulados

`src/lib/mockData.ts` define:
- lista inicial de usuarios con contraseñas de demo `Royal1234`
- fases del proyecto
- tareas de ejemplo con asignaciones y estados

Estos datos se usan en todas las vistas para renderizar contenido sin backend.


## Estilo y UI

- El proyecto utiliza **Tailwind CSS**.
- `src/app/globals.css` importa la fuente `DM Sans` y define variables CSS para tema oscuro.
- Se aplican estilos de scroll y colores globales.


## Dependencias principales

- `next`: framework React para SSR y app routing.
- `react` / `react-dom`
- `lucide-react`: íconos SVG.
- `tailwindcss`, `postcss`, `autoprefixer`: estilos.
- `typescript`: tipado.


## Comandos útiles

- `npm install`: instalar dependencias
- `npm run dev`: iniciar en modo desarrollo
- `npm run build`: construir para producción
- `npm run start`: iniciar servidor de producción


## Estado actual del sistema

### Funcionalidades ya implementadas

- Autenticación básica
- Registro con correo institucional y foto de perfil
- Persistencia local de usuarios y sesión
- Diagrama de Gantt
- Tablero Kanban
- Vista de calendario
- Gestión de usuarios
- Filtros por estado de tarea

### Lo que no está implementado aún

- Backend real / base de datos
- Rollos de administrador vs usuario
- Comentarios de tareas y notificaciones en tiempo real
- Histórico de cambios
- Dependencias de tareas y fechas enlazadas
- Informes avanzados
- Seguridad avanzada (hash de contraseñas, OAuth)


## Recomendaciones para continuar

1. Migrar la persistencia a un backend real.
2. Implementar roles y permisos.
3. Agregar reportes y dashboard de métricas.
4. Añadir una vista de proyecto maestro/hitos.
5. Mejorar la gestión de recursos con carga de trabajo y disponibilidad.


## Archivos importantes y su propósito

| Archivo | Propósito |
|---|---|
| `src/app/page.tsx` | Control de sesión y navegación principal |
| `src/components/AuthView.tsx` | Login / registro de usuario |
| `src/lib/auth.ts` | Lógica de autenticación y persistencia local |
| `src/components/views/GanttView.tsx` | Vista principal del Gantt y edición de tareas |
| `src/components/views/BoardView.tsx` | Tablero Kanban por estado |
| `src/components/views/CalendarView.tsx` | Vista de calendario mensual |
| `src/components/views/UsersView.tsx` | Administración de usuarios |
| `src/lib/mockData.ts` | Datos de ejemplo para usuarios, tareas y fases |
| `src/lib/utils.ts` | Funciones de fecha y constantes de estado |
| `src/types/index.ts` | Tipos TypeScript del dominio |
| `src/app/globals.css` | Estilos globales del tema oscuro |


## Notas finales

Este proyecto es un prototipo funcional con enfoque en UI/UX y validación básica. El código actual está organizado en componentes de React y usa datos simulados para facilitar iteración rápida.

Si deseas, puedo también generar un `README.md` con esta documentación integrada y una sección de “Próximos pasos”.
