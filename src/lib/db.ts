import sql from 'mssql';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { mockUsers, mockProjects, mockPhases, mockMilestones, mockTasks } from './mockData';

const serverRaw = process.env.DB_SERVER || 'localhost\\SQLEXPRESS';
// Para instancias con nombre (localhost\SQLEXPRESS), tedious necesita server sin el nombre de instancia
// y el instanceName separado. El puerto se resuelve automáticamente vía SQL Browser o se omite.
const serverHost = serverRaw.includes('\\') ? serverRaw.split('\\')[0] : serverRaw;
const instanceName = serverRaw.includes('\\') ? serverRaw.split('\\')[1] : undefined;

const config: sql.config = {
  user: process.env.DB_USER || 'royalapp',
  password: process.env.DB_PASSWORD,
  server: serverHost,
  database: process.env.DB_DATABASE || 'RoyalGanttPlanner',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
    instanceName: instanceName,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

function sha256(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}

export async function seedDatabase(pool: sql.ConnectionPool) {
  try {
    // Verificar si la tabla de usuarios ya tiene datos
    const userCheck = await pool.request().query('SELECT COUNT(*) as count FROM Usuarios_Gantt');
    if (userCheck.recordset[0].count > 0) {
      return; // Ya está sembrada
    }

    console.log('Sembrando la base de datos SQL Server con datos mock...');

    // 1. Insertar usuarios
    for (const user of mockUsers) {
      const rawPass = user.password || 'Royal1234';
      const clientHash = sha256(rawPass);
      const serverHash = await bcrypt.hash(clientHash, 10);

      let email = user.email.trim().toLowerCase();
      if (!email.endsWith('@gmail.com')) {
        email = email.split('@')[0] + '@gmail.com';
      }

      await pool.request()
        .input('id', sql.NVarChar, user.id)
        .input('name', sql.NVarChar, user.name)
        .input('email', sql.NVarChar, email)
        .input('initials', sql.NVarChar, user.initials)
        .input('color', sql.NVarChar, user.color)
        .input('role', sql.NVarChar, user.role)
        .input('contractType', sql.NVarChar, user.contractType)
        .input('status', sql.NVarChar, 'active')
        .input('password', sql.NVarChar, serverHash)
        .input('skills', sql.NVarChar, JSON.stringify([]))
        .query(`
          INSERT INTO Usuarios_Gantt (id, name, email, initials, color, role, contractType, status, password, skills)
          VALUES (@id, @name, @email, @initials, @color, @role, @contractType, @status, @password, @skills)
        `);
    }

    // Asegurarse de que el usuario René Rangel exista como administrador/líder principal
    const reneEmail = 'renedejesusrangel228@gmail.com';
    const reneCheck = await pool.request()
      .input('email', sql.NVarChar, reneEmail)
      .query('SELECT COUNT(*) as count FROM Usuarios_Gantt WHERE email = @email');

    if (reneCheck.recordset[0].count === 0) {
      const reneHash = await bcrypt.hash(sha256('Royal1234'), 10);
      await pool.request()
        .input('id', sql.NVarChar, 'u_rene')
        .input('name', sql.NVarChar, 'René de Jesús Rangel Buitrón')
        .input('email', sql.NVarChar, reneEmail)
        .input('initials', sql.NVarChar, 'RR')
        .input('color', sql.NVarChar, '#7c5cfc')
        .input('role', sql.NVarChar, 'Project Manager')
        .input('contractType', sql.NVarChar, 'Fijo')
        .input('status', sql.NVarChar, 'active')
        .input('password', sql.NVarChar, reneHash)
        .input('skills', sql.NVarChar, JSON.stringify(['React', 'TypeScript', 'SQL']))
        .input('mustChangePassword', sql.Bit, 0)
        .query(`
          INSERT INTO Usuarios_Gantt (id, name, email, initials, color, role, contractType, status, password, skills, mustChangePassword)
          VALUES (@id, @name, @email, @initials, @color, @role, @contractType, @status, @password, @skills, @mustChangePassword)
        `);
    }

    // 2. Insertar Proyectos
    for (const proj of mockProjects) {
      await pool.request()
        .input('id', sql.NVarChar, proj.id)
        .input('name', sql.NVarChar, proj.name)
        .input('description', sql.NVarChar, proj.description || null)
        .input('startDate', sql.VarChar, proj.startDate)
        .input('endDate', sql.VarChar, proj.endDate)
        .input('status', sql.NVarChar, proj.status)
        .input('leaderId', sql.NVarChar, proj.leaderId)
        .query(`
          INSERT INTO Proyectos_Gantt (id, name, description, startDate, endDate, status, leaderId)
          VALUES (@id, @name, @description, @startDate, @endDate, @status, @leaderId)
        `);
    }

    // 3. Insertar Fases
    for (const phase of mockPhases) {
      await pool.request()
        .input('id', sql.NVarChar, phase.id)
        .input('name', sql.NVarChar, phase.name)
        .input('color', sql.NVarChar, phase.color)
        .input('projectId', sql.NVarChar, 'proj1')
        .query(`
          INSERT INTO Fases_Gantt (id, name, color, projectId)
          VALUES (@id, @name, @color, @projectId)
        `);
    }

    // 4. Insertar Hitos/Hitos_Gantt
    for (const ms of mockMilestones) {
      await pool.request()
        .input('id', sql.NVarChar, ms.id)
        .input('projectId', sql.NVarChar, ms.projectId)
        .input('name', sql.NVarChar, ms.name)
        .input('targetDate', sql.VarChar, ms.targetDate)
        .input('description', sql.NVarChar, ms.description || null)
        .input('status', sql.NVarChar, ms.status)
        .query(`
          INSERT INTO Hitos_Gantt (id, projectId, name, targetDate, description, status)
          VALUES (@id, @projectId, @name, @targetDate, @description, @status)
        `);
    }

    // 5. Insertar Tareas y sus asignados
    for (const task of mockTasks) {
      await pool.request()
        .input('id', sql.NVarChar, task.id)
        .input('title', sql.NVarChar, task.title)
        .input('phaseId', sql.NVarChar, task.phaseId)
        .input('projectId', sql.NVarChar, task.projectId || 'proj1')
        .input('milestoneId', sql.NVarChar, task.milestoneId || null)
        .input('startDate', sql.VarChar, task.startDate)
        .input('endDate', sql.VarChar, task.endDate)
        .input('status', sql.NVarChar, task.status)
        .input('progress', sql.Int, task.progress)
        .input('assigneeId', sql.NVarChar, task.assigneeId)
        .input('notes', sql.NVarChar, task.notes || null)
        .input('estimatedHours', sql.Int, task.estimatedHours || 8)
        .input('actualHours', sql.Int, task.actualHours || 0)
        .input('requiredSkills', sql.NVarChar, JSON.stringify([]))
        .input('estimatedBudget', sql.Decimal, 0)
        .input('actualCost', sql.Decimal, 0)
        .input('materials', sql.NVarChar, JSON.stringify([]))
        .input('dependsOnTaskId', sql.NVarChar, task.dependsOnTaskId || null)
        .query(`
          INSERT INTO Tareas_Gantt (
            id, title, phaseId, projectId, milestoneId, startDate, endDate, status, progress,
            assigneeId, notes, estimatedHours, actualHours, requiredSkills, estimatedBudget, actualCost, materials, dependsOnTaskId
          )
          VALUES (
            @id, @title, @phaseId, @projectId, @milestoneId, @startDate, @endDate, @status, @progress,
            @assigneeId, @notes, @estimatedHours, @actualHours, @requiredSkills, @estimatedBudget, @actualCost, @materials, @dependsOnTaskId
          )
        `);

      // Guardar asignación en tabla puente Asignaciones_Gantt
      await pool.request()
        .input('taskId', sql.NVarChar, task.id)
        .input('userId', sql.NVarChar, task.assigneeId)
        .query(`
          INSERT INTO Asignaciones_Gantt (taskId, userId)
          VALUES (@taskId, @userId)
        `);
    }

    console.log('¡Base de datos sembrada con éxito!');
  } catch (error) {
    console.error('Error al sembrar la base de datos:', error);
  }
}

async function runMigrations(pool: sql.ConnectionPool) {
  // Cada paso es independiente; un fallo no aborta los demás
  const step = async (name: string, query: string) => {
    try {
      await pool.request().query(query);
    } catch (err: any) {
      console.warn(`[migration] '${name}': ${err.message}`);
    }
  };

  // ── Columnas faltantes en Usuarios_Gantt ────────────────────────────────────────────
  await step('Usuarios_Gantt.name',             `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Usuarios_Gantt') AND name='name') ALTER TABLE Usuarios_Gantt ADD name NVARCHAR(255) NOT NULL DEFAULT '';`);
  await step('Usuarios_Gantt.initials',         `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Usuarios_Gantt') AND name='initials') ALTER TABLE Usuarios_Gantt ADD initials NVARCHAR(10) NOT NULL DEFAULT '';`);
  await step('Usuarios_Gantt.color',            `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Usuarios_Gantt') AND name='color') ALTER TABLE Usuarios_Gantt ADD color NVARCHAR(20) NOT NULL DEFAULT '#6b7280';`);
  await step('Usuarios_Gantt.role',             `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Usuarios_Gantt') AND name='role') ALTER TABLE Usuarios_Gantt ADD role NVARCHAR(100) NOT NULL DEFAULT 'Developer';`);
  await step('Usuarios_Gantt.contractType',     `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Usuarios_Gantt') AND name='contractType') ALTER TABLE Usuarios_Gantt ADD contractType NVARCHAR(50) NOT NULL DEFAULT 'Fijo';`);
  await step('Usuarios_Gantt.status',           `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Usuarios_Gantt') AND name='status') ALTER TABLE Usuarios_Gantt ADD status NVARCHAR(20) NOT NULL DEFAULT 'active';`);
  await step('Usuarios_Gantt.password',         `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Usuarios_Gantt') AND name='password') ALTER TABLE Usuarios_Gantt ADD password NVARCHAR(255) NOT NULL DEFAULT '';`);
  await step('Usuarios_Gantt.imageUrl',         `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Usuarios_Gantt') AND name='imageUrl') ALTER TABLE Usuarios_Gantt ADD imageUrl NVARCHAR(500) NULL;`);
  await step('Usuarios_Gantt.availableHours',   `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Usuarios_Gantt') AND name='availableHours') ALTER TABLE Usuarios_Gantt ADD availableHours INT NOT NULL DEFAULT 40;`);
  await step('Usuarios_Gantt.totalAssignedHours', `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Usuarios_Gantt') AND name='totalAssignedHours') ALTER TABLE Usuarios_Gantt ADD totalAssignedHours INT NOT NULL DEFAULT 0;`);
  await step('Usuarios_Gantt.skills',           `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Usuarios_Gantt') AND name='skills') ALTER TABLE Usuarios_Gantt ADD skills NVARCHAR(MAX) NOT NULL DEFAULT '[]';`);
  await step('Usuarios_Gantt.mustChangePassword',`IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Usuarios_Gantt') AND name='mustChangePassword') ALTER TABLE Usuarios_Gantt ADD mustChangePassword BIT NOT NULL DEFAULT 1;`);
  await step('Usuarios_Gantt.loginAttempts',    `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Usuarios_Gantt') AND name='loginAttempts') ALTER TABLE Usuarios_Gantt ADD loginAttempts INT NOT NULL DEFAULT 0;`);
  await step('Usuarios_Gantt.lockoutUntil',     `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Usuarios_Gantt') AND name='lockoutUntil') ALTER TABLE Usuarios_Gantt ADD lockoutUntil DATETIME2 NULL;`);
  await step('Usuarios_Gantt.createdAt',        `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Usuarios_Gantt') AND name='createdAt') ALTER TABLE Usuarios_Gantt ADD createdAt DATETIME2 NOT NULL DEFAULT GETDATE();`);

  // ── Renombrar tablas existentes de inglés a español ───────────────────────
  await step('rename.Tasks_Gantt', `
    IF EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Tasks_Gantt') AND type='U')
    AND NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Tareas_Gantt') AND type='U')
    EXEC sp_rename 'Tasks_Gantt', 'Tareas_Gantt';`);

  await step('rename.users_Gantt', `
    IF EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'users_Gantt') AND type='U')
    AND NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Usuarios_Gantt') AND type='U')
    EXEC sp_rename 'users_Gantt', 'Usuarios_Gantt';`);

  await step('rename.Projects_Gantt', `
    IF EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Projects_Gantt') AND type='U')
    AND NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Proyectos_Gantt') AND type='U')
    EXEC sp_rename 'Projects_Gantt', 'Proyectos_Gantt';`);

  await step('rename.Phases_Gantt', `
    IF EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Phases_Gantt') AND type='U')
    AND NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Fases_Gantt') AND type='U')
    EXEC sp_rename 'Phases_Gantt', 'Fases_Gantt';`);

  await step('rename.Milestones_Gantt', `
    IF EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Milestones_Gantt') AND type='U')
    AND NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Hitos_Gantt') AND type='U')
    EXEC sp_rename 'Milestones_Gantt', 'Hitos_Gantt';`);

  await step('rename.TaskAssignees_Gantt', `
    IF EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'TaskAssignees_Gantt') AND type='U')
    AND NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Asignaciones_Gantt') AND type='U')
    EXEC sp_rename 'TaskAssignees_Gantt', 'Asignaciones_Gantt';`);

  await step('rename.TaskComments_Gantt', `
    IF EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'TaskComments_Gantt') AND type='U')
    AND NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Comentarios_Gantt') AND type='U')
    EXEC sp_rename 'TaskComments_Gantt', 'Comentarios_Gantt';`);

  await step('rename.TimeEntries_Gantt', `
    IF EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'TimeEntries_Gantt') AND type='U')
    AND NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Horas_Gantt') AND type='U')
    EXEC sp_rename 'TimeEntries_Gantt', 'Horas_Gantt';`);

  await step('rename.Notifications_Gantt', `
    IF EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Notifications_Gantt') AND type='U')
    AND NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Notificaciones_Gantt') AND type='U')
    EXEC sp_rename 'Notifications_Gantt', 'Notificaciones_Gantt';`);

  await step('rename.Notes_Gantt', `
    IF EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Notes_Gantt') AND type='U')
    AND NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Notas_Gantt') AND type='U')
    EXEC sp_rename 'Notes_Gantt', 'Notas_Gantt';`);

  await step('rename.ActivityLog_Gantt', `
    IF EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'ActivityLog_Gantt') AND type='U')
    AND NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Actividad_Gantt') AND type='U')
    EXEC sp_rename 'ActivityLog_Gantt', 'Actividad_Gantt';`);

  await step('rename.ApprovalLog_Gantt', `
    IF EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'ApprovalLog_Gantt') AND type='U')
    AND NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Aprobaciones_Gantt') AND type='U')
    EXEC sp_rename 'ApprovalLog_Gantt', 'Aprobaciones_Gantt';`);

  await step('rename.WorkloadConfig_Gantt', `
    IF EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'WorkloadConfig_Gantt') AND type='U')
    AND NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'ConfigCarga_Gantt') AND type='U')
    EXEC sp_rename 'WorkloadConfig_Gantt', 'ConfigCarga_Gantt';`);

  // ── Tablas faltantes ───────────────────────────────────────────────────────
  await step('create.Proyectos_Gantt', `
    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Proyectos_Gantt') AND type='U')
    CREATE TABLE Proyectos_Gantt (
      id NVARCHAR(50) NOT NULL PRIMARY KEY, name NVARCHAR(255) NOT NULL,
      description NVARCHAR(MAX) NULL, startDate VARCHAR(10) NOT NULL,
      endDate VARCHAR(10) NOT NULL, status NVARCHAR(50) NOT NULL DEFAULT 'planning',
      leaderId NVARCHAR(50) NULL, createdAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );`);

  await step('create.Fases_Gantt', `
    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Fases_Gantt') AND type='U')
    CREATE TABLE Fases_Gantt (
      id NVARCHAR(50) NOT NULL PRIMARY KEY, name NVARCHAR(255) NOT NULL,
      color NVARCHAR(20) NOT NULL DEFAULT '#6b7280', projectId NVARCHAR(50) NOT NULL
    );`);

  await step('create.Hitos_Gantt', `
    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Hitos_Gantt') AND type='U')
    CREATE TABLE Hitos_Gantt (
      id NVARCHAR(50) NOT NULL PRIMARY KEY, projectId NVARCHAR(50) NOT NULL,
      name NVARCHAR(255) NOT NULL, targetDate VARCHAR(10) NOT NULL,
      description NVARCHAR(MAX) NULL, status NVARCHAR(50) NOT NULL DEFAULT 'pending',
      createdAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );`);

  await step('create.Tareas_Gantt', `
    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Tareas_Gantt') AND type='U')
    CREATE TABLE Tareas_Gantt (
      id NVARCHAR(50) NOT NULL PRIMARY KEY, title NVARCHAR(500) NOT NULL,
      phaseId NVARCHAR(50) NOT NULL, projectId NVARCHAR(50) NOT NULL,
      milestoneId NVARCHAR(50) NULL, startDate VARCHAR(10) NOT NULL,
      endDate VARCHAR(10) NOT NULL, status NVARCHAR(50) NOT NULL DEFAULT 'open',
      progress INT NOT NULL DEFAULT 0, assigneeId NVARCHAR(50) NOT NULL,
      notes NVARCHAR(MAX) NULL, estimatedHours INT NULL, actualHours INT NOT NULL DEFAULT 0,
      requiredSkills NVARCHAR(MAX) NOT NULL DEFAULT '[]',
      estimatedBudget DECIMAL(18,2) NULL, actualCost DECIMAL(18,2) NULL,
      materials NVARCHAR(MAX) NOT NULL DEFAULT '[]', dependsOnTaskId NVARCHAR(50) NULL,
      createdBy NVARCHAR(50) NULL, accepted BIT NOT NULL DEFAULT 1,
      boardOrder INT NOT NULL DEFAULT 0, priority NVARCHAR(20) NOT NULL DEFAULT 'media',
      createdAt DATETIME2 NOT NULL DEFAULT GETDATE(), updatedAt DATETIME2 NULL
    );`);

  await step('create.Asignaciones_Gantt', `
    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Asignaciones_Gantt') AND type='U')
    CREATE TABLE Asignaciones_Gantt (
      taskId NVARCHAR(50) NOT NULL, userId NVARCHAR(50) NOT NULL,
      CONSTRAINT PK_Asignaciones_Gantt PRIMARY KEY (taskId, userId)
    );`);

  await step('create.Comentarios_Gantt', `
    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Comentarios_Gantt') AND type='U')
    CREATE TABLE Comentarios_Gantt (
      id NVARCHAR(50) NOT NULL PRIMARY KEY, taskId NVARCHAR(50) NOT NULL,
      userId NVARCHAR(50) NOT NULL, content NVARCHAR(MAX) NOT NULL,
      createdAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );`);

  await step('create.Notificaciones_Gantt', `
    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Notificaciones_Gantt') AND type='U')
    CREATE TABLE Notificaciones_Gantt (
      id NVARCHAR(50) NOT NULL PRIMARY KEY, userId NVARCHAR(50) NOT NULL,
      title NVARCHAR(255) NOT NULL, message NVARCHAR(MAX) NOT NULL,
      type NVARCHAR(50) NOT NULL, taskId NVARCHAR(50) NULL,
      [read] BIT NOT NULL DEFAULT 0, createdAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );`);

  await step('create.notes', `
    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Notas_Gantt') AND type='U')
    CREATE TABLE Notas_Gantt (
      id NVARCHAR(50) NOT NULL PRIMARY KEY, userId NVARCHAR(50) NOT NULL,
      projectId NVARCHAR(50) NULL, taskId NVARCHAR(50) NULL,
      title NVARCHAR(255) NOT NULL, content NVARCHAR(MAX) NOT NULL DEFAULT '',
      color NVARCHAR(20) NOT NULL DEFAULT '#fef3c7', pinned BIT NOT NULL DEFAULT 0,
      tags NVARCHAR(500) NOT NULL DEFAULT '', isShared BIT NOT NULL DEFAULT 0,
      createdAt DATETIME2 NOT NULL DEFAULT GETDATE(), updatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );`);

  await step('create.Actividad_Gantt', `
    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Actividad_Gantt') AND type='U')
    CREATE TABLE Actividad_Gantt (
      id NVARCHAR(50) NOT NULL PRIMARY KEY, userId NVARCHAR(50) NOT NULL,
      userName NVARCHAR(255) NOT NULL, action NVARCHAR(100) NOT NULL,
      entityType NVARCHAR(50) NOT NULL, entityId NVARCHAR(50) NOT NULL,
      entityTitle NVARCHAR(255) NOT NULL, details NVARCHAR(MAX) NULL,
      createdAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );`);

  await step('create.Horas_Gantt', `
    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Horas_Gantt') AND type='U')
    CREATE TABLE Horas_Gantt (
      id NVARCHAR(50) NOT NULL PRIMARY KEY, taskId NVARCHAR(50) NOT NULL,
      userId NVARCHAR(50) NOT NULL, hours DECIMAL(5,2) NOT NULL,
      description NVARCHAR(MAX) NULL, date VARCHAR(10) NOT NULL,
      createdAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );`);

  // ── Columnas faltantes en Tareas_Gantt (si la tabla ya existía sin ellas) ─────────
  // Renombrar Notas_Gantt → notes si quedó con el nombre incorrecto
  await step('Tareas_Gantt.rename.notes', `
    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Tareas_Gantt') AND name='Notas_Gantt')
      EXEC sp_rename 'Tareas_Gantt.Notas_Gantt', 'notes', 'COLUMN';
  `);
  await step('Tareas_Gantt.notes',      `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Tareas_Gantt') AND name='notes') ALTER TABLE Tareas_Gantt ADD notes NVARCHAR(MAX) NULL;`);
  await step('Tareas_Gantt.accepted',   `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Tareas_Gantt') AND name='accepted') ALTER TABLE Tareas_Gantt ADD accepted BIT NOT NULL DEFAULT 1;`);
  await step('Tareas_Gantt.boardOrder', `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Tareas_Gantt') AND name='boardOrder') ALTER TABLE Tareas_Gantt ADD boardOrder INT NOT NULL DEFAULT 0;`);
  await step('Tareas_Gantt.priority',   `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Tareas_Gantt') AND name='priority') ALTER TABLE Tareas_Gantt ADD priority NVARCHAR(20) NOT NULL DEFAULT 'media';`);
  await step('Tareas_Gantt.checklist',  `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Tareas_Gantt') AND name='checklist') ALTER TABLE Tareas_Gantt ADD checklist NVARCHAR(MAX) NULL;`);

  // ── Aprobaciones_Gantt (historial de aprobaciones para sección Aprobaciones) ─
  await step('create.Aprobaciones_Gantt', `
    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Aprobaciones_Gantt') AND type='U')
    CREATE TABLE Aprobaciones_Gantt (
      id            NVARCHAR(50)  NOT NULL PRIMARY KEY,
      taskId        NVARCHAR(50)  NOT NULL,
      taskTitle     NVARCHAR(500) NOT NULL DEFAULT '',
      action        NVARCHAR(20)  NOT NULL,
      performedBy   NVARCHAR(50)  NOT NULL,
      performedByName NVARCHAR(255) NOT NULL DEFAULT '',
      comment       NVARCHAR(MAX) NULL,
      previousStatus NVARCHAR(30) NULL,
      createdAt     DATETIME2     NOT NULL DEFAULT GETDATE()
    );`);

  // ── ConfigCarga_Gantt (umbrales de carga para sección Carga de Trabajo) ─
  await step('create.ConfigCarga_Gantt', `
    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'ConfigCarga_Gantt') AND type='U')
    CREATE TABLE ConfigCarga_Gantt (
      configKey   NVARCHAR(50)  NOT NULL PRIMARY KEY,
      configValue INT           NOT NULL,
      label       NVARCHAR(100) NOT NULL DEFAULT '',
      updatedAt   DATETIME2     NOT NULL DEFAULT GETDATE()
    );`);

  await step('seed.ConfigCarga_Gantt.normal', `
    IF NOT EXISTS (SELECT 1 FROM ConfigCarga_Gantt WHERE configKey='max_normal')
    INSERT INTO ConfigCarga_Gantt (configKey, configValue, label) VALUES ('max_normal', 3, 'Máx tareas para estado Normal');`);

  await step('seed.ConfigCarga_Gantt.cargado', `
    IF NOT EXISTS (SELECT 1 FROM ConfigCarga_Gantt WHERE configKey='max_cargado')
    INSERT INTO ConfigCarga_Gantt (configKey, configValue, label) VALUES ('max_cargado', 6, 'Máx tareas para estado Cargado');`);

  // ── Fase 'Bloqueadas' para proj1 ──────────────────────────────────────────
  await step('seed.phase.bloqueadas', `
    IF EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Fases_Gantt') AND type='U')
    AND EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Proyectos_Gantt') AND type='U')
    AND NOT EXISTS (SELECT 1 FROM Fases_Gantt WHERE id='p5')
    AND EXISTS (SELECT 1 FROM Proyectos_Gantt WHERE id='proj1')
    INSERT INTO Fases_Gantt (id,name,color,projectId) VALUES ('p5','Bloqueadas','#ff5c5c','proj1');`);

  // ── Migrar emails viejos de royaltransports.com.mx a gmail.com ────────────
  await step('migrate.email.rene', `
    UPDATE Usuarios_Gantt SET email='renedejesusrangel228@gmail.com'
    WHERE email='renerangel@royaltransports.com.mx';
  `);
  await step('migrate.email.jesus', `
    UPDATE Usuarios_Gantt SET email='jesusrangel3@gmail.com'
    WHERE email='jesus@royaltransports.com.mx';
  `);
  await step('migrate.email.domain', `
    UPDATE Usuarios_Gantt SET email = REPLACE(email, '@royaltransports.com.mx', '@gmail.com')
    WHERE email LIKE '%@royaltransports.com.mx';
  `);
  await step('migrate.role.rene', `
    UPDATE Usuarios_Gantt SET role='Project Manager', status='active'
    WHERE email='renedejesusrangel228@gmail.com' AND role <> 'Project Manager';
  `);

  // ── Garantizar usuario admin (aunque el seed no haya corrido) ────────────
  try {
    const check = await pool.request()
      .input('email', sql.NVarChar, 'renedejesusrangel228@gmail.com')
      .query('SELECT COUNT(*) AS cnt FROM Usuarios_Gantt WHERE email=@email');
    if (check.recordset[0].cnt === 0) {
      const adminHash = await bcrypt.hash(sha256('Royal1234'), 10);
      await pool.request()
        .input('name',              sql.NVarChar, 'René de Jesús Rangel Buitrón')
        .input('email',             sql.NVarChar, 'renedejesusrangel228@gmail.com')
        .input('initials',          sql.NVarChar, 'RR')
        .input('color',             sql.NVarChar, '#7c5cfc')
        .input('role',              sql.NVarChar, 'Project Manager')
        .input('contractType',      sql.NVarChar, 'Fijo')
        .input('status',            sql.NVarChar, 'active')
        .input('password',          sql.NVarChar, adminHash)
        .input('skills',            sql.NVarChar, JSON.stringify(['React','TypeScript','SQL']))
        .input('mustChangePassword', sql.Bit,     0)
        // NEWID() para id UNIQUEIDENTIFIER; password_hash = password para compatibilidad con RoyalCIF
        .query(`INSERT INTO Usuarios_Gantt (id,name,email,initials,color,role,contractType,status,password,password_hash,skills,mustChangePassword)
                VALUES (NEWID(),@name,@email,@initials,@color,@role,@contractType,@status,@password,@password,@skills,@mustChangePassword)`);
      console.log('[migration] Usuario admin creado en RoyalCIF.');
    } else {
      await pool.request()
        .input('email', sql.NVarChar, 'renedejesusrangel228@gmail.com')
        .query('UPDATE Usuarios_Gantt SET mustChangePassword=0 WHERE email=@email');
    }
  } catch (err: any) {
    console.warn(`[migration] seed.admin: ${err.message}`);
  }

  console.log('[migration] Migraciones completadas.');
}

let isMockMode = false;

class MockRequest {
  transaction: any;
  inputs: Record<string, any> = {};
  constructor(transaction?: any) {
    this.transaction = transaction;
  }
  input(name: string, type: any, value?: any) {
    if (value === undefined) {
      this.inputs[name] = type;
    } else {
      this.inputs[name] = value;
    }
    return this;
  }
  async query(queryStr: string) {
    return handleMockQuery(queryStr, this.inputs);
  }
}

class MockTransaction {
  pool: any;
  constructor(pool: any) {
    this.pool = pool;
  }
  async begin() {
    return this;
  }
  async commit() {
    return this;
  }
  async rollback() {
    return this;
  }
}

class MockConnectionPool {
  async connect() {
    return this;
  }
  request() {
    return new MockRequest();
  }
}

async function handleMockQuery<T = any>(
  query: string,
  params?: Record<string, any>
): Promise<sql.IResult<T>> {
  const normalizedQuery = query.replace(/\s+/g, ' ').trim().toUpperCase();

  // 1. SELECT ... FROM Usuarios_Gantt WHERE email = @email
  if (normalizedQuery.includes("USUARIOS_GANTT") && normalizedQuery.includes("WHERE EMAIL =")) {
    const emailParam = params?.email || "";
    const emailVal = typeof emailParam === "string" ? emailParam.trim().toLowerCase() : "";

    // Usuarios de respaldo con sus contraseñas reales (modo demo/fallback sin BD)
    const fallbackUsers: Record<string, { id: string; name: string; email: string; initials: string; color: string; role: string; password: string }> = {
      "renedejesusrangel228@gmail.com": {
        id: "u_rene",
        name: "René de Jesús Rangel Buitrón",
        email: "renedejesusrangel228@gmail.com",
        initials: "RR",
        color: "#7c5cfc",
        role: "Project Manager",
        password: sha256('Royal1234'),
      },
      "jesusrangel3@gmail.com": {
        id: "u_jesus",
        name: "Jesús Sánchez",
        email: "jesusrangel3@gmail.com",
        initials: "JS",
        color: "#D4A017",
        role: "Administrador",
        password: sha256('@Jsanchez546'),
      },
    };

    const fallback = fallbackUsers[emailVal];
    if (fallback) {
      const serverHash = await bcrypt.hash(fallback.password, 10);
      const user = {
        ...fallback,
        password: serverHash,
        contractType: "Fijo",
        status: "active",
        availableHours: 40,
        skills: JSON.stringify([]),
        mustChangePassword: false,
        loginAttempts: 0,
        lockoutUntil: null,
        imageUrl: undefined
      };
      return {
        recordset: [user] as any,
        recordsets: [[user]] as any,
        rowsAffected: [1],
        output: {}
      };
    }

    // Buscar en otros mockUsers
    const foundUser = mockUsers.find(u => u.email.trim().toLowerCase() === emailVal || u.email.split('@')[0] === emailVal.split('@')[0]);
    if (foundUser) {
      const defaultHash = await bcrypt.hash(sha256('Royal1234'), 10);
      const user = {
        ...foundUser,
        password: defaultHash,
        availableHours: 40,
        skills: JSON.stringify([]),
        mustChangePassword: false,
        loginAttempts: 0,
        lockoutUntil: null
      };
      return {
        recordset: [user] as any,
        recordsets: [[user]] as any,
        rowsAffected: [1],
        output: {}
      };
    }

    return {
      recordset: [] as any,
      recordsets: [[]] as any,
      rowsAffected: [0],
      output: {}
    };
  }

  // 2. SELECT ... FROM Usuarios_Gantt
  if (normalizedQuery.includes("USUARIOS_GANTT")) {
    const defaultHash = await bcrypt.hash(sha256('Royal1234'), 10);
    const users = mockUsers.map(u => ({
      ...u,
      password: defaultHash,
      skills: JSON.stringify([]),
      availableHours: 40,
      totalAssignedHours: 0
    }));

    // Asegurarse de incluir a René Rangel
    if (!users.some(u => u.id === "u_rene")) {
      users.push({
        id: "u_rene",
        name: "René de Jesús Rangel Buitrón",
        email: "renedejesusrangel228@gmail.com",
        initials: "RR",
        color: "#7c5cfc",
        role: "Project Manager",
        contractType: "Fijo",
        status: "active",
        password: defaultHash,
        availableHours: 40,
        skills: JSON.stringify(['React', 'TypeScript', 'SQL']),
        totalAssignedHours: 0
      } as any);
    }

    // Asegurarse de incluir a Jesús Sánchez
    if (!users.some(u => u.id === "u_jesus")) {
      users.push({
        id: "u_jesus",
        name: "Jesús Sánchez",
        email: "jesusrangel3@gmail.com",
        initials: "JS",
        color: "#D4A017",
        role: "Administrador",
        contractType: "Fijo",
        status: "active",
        password: defaultHash,
        availableHours: 40,
        skills: JSON.stringify([]),
        totalAssignedHours: 0
      } as any);
    }

    return {
      recordset: users as any,
      recordsets: [users] as any,
      rowsAffected: [users.length],
      output: {}
    };
  }

  // 3. SELECT ... FROM Proyectos_Gantt
  if (normalizedQuery.includes("PROYECTOS_GANTT")) {
    return {
      recordset: mockProjects as any,
      recordsets: [mockProjects] as any,
      rowsAffected: [mockProjects.length],
      output: {}
    };
  }

  // 4. SELECT ... FROM Fases_Gantt
  if (normalizedQuery.includes("FASES_GANTT")) {
    return {
      recordset: mockPhases as any,
      recordsets: [mockPhases] as any,
      rowsAffected: [mockPhases.length],
      output: {}
    };
  }

  // 5. SELECT ... FROM Hitos_Gantt
  if (normalizedQuery.includes("HITOS_GANTT")) {
    return {
      recordset: mockMilestones as any,
      recordsets: [mockMilestones] as any,
      rowsAffected: [mockMilestones.length],
      output: {}
    };
  }

  // 6. SELECT ... FROM Asignaciones_Gantt
  if (normalizedQuery.includes("ASIGNACIONES_GANTT")) {
    const list = mockTasks.map(t => ({ taskId: t.id, userId: t.assigneeId }));
    return {
      recordset: list as any,
      recordsets: [list] as any,
      rowsAffected: [list.length],
      output: {}
    };
  }

  // 7. SELECT ... FROM Comentarios_Gantt
  if (normalizedQuery.includes("COMENTARIOS_GANTT")) {
    return {
      recordset: [] as any,
      recordsets: [[]] as any,
      rowsAffected: [0],
      output: {}
    };
  }

  // 8. SELECT ... FROM Tareas_Gantt
  if (normalizedQuery.includes("TAREAS_GANTT")) {
    return {
      recordset: mockTasks as any,
      recordsets: [mockTasks] as any,
      rowsAffected: [mockTasks.length],
      output: {}
    };
  }

  // 9. SELECT ... FROM Notificaciones_Gantt
  if (normalizedQuery.includes("NOTIFICACIONES_GANTT")) {
    return {
      recordset: [] as any,
      recordsets: [[]] as any,
      rowsAffected: [0],
      output: {}
    };
  }

  // 10. Fallback genérico para INSERT, UPDATE, DELETE, etc.
  return {
    recordset: [] as any,
    recordsets: [[]] as any,
    rowsAffected: [1],
    output: {}
  };
}

async function connectAndSeed(): Promise<sql.ConnectionPool> {
  try {
    const pool = await sql.connect(config);
    await runMigrations(pool);
    await seedDatabase(pool);
    return pool;
  } catch (err: any) {
    console.warn("⚠️ No se pudo conectar a la base de datos SQL Server. Iniciando en MODO DEMO/FALLBACK...", err.message);
    isMockMode = true;
    // @ts-ignore
    sql.Transaction = MockTransaction;
    // @ts-ignore
    sql.Request = MockRequest;
    return new MockConnectionPool() as any;
  }
}

if (process.env.NODE_ENV === 'production') {
  poolPromise = connectAndSeed();
} else {
  const globalWithDb = global as typeof globalThis & {
    _sqlPoolPromise?: Promise<sql.ConnectionPool>;
  };
  
  if (!globalWithDb._sqlPoolPromise) {
    globalWithDb._sqlPoolPromise = connectAndSeed();
  }
  poolPromise = globalWithDb._sqlPoolPromise;
}

export async function getDbPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    throw new Error('No se pudo inicializar el pool de conexión a la base de datos.');
  }
  return poolPromise;
}

export async function executeQuery<T = any>(
  query: string,
  params?: Record<string, { type: any; value: any }>
): Promise<sql.IResult<T>> {
  try {
    const pool = await getDbPool();
    const request = pool.request();

    if (params) {
      Object.entries(params).forEach(([name, param]) => {
        request.input(name, param.value);
      });
    }

    return await request.query<T>(query);
  } catch (error: any) {
    if (isMockMode) {
      // Extraemos los valores de los parámetros para handleMockQuery
      const mockParams: Record<string, any> = {};
      if (params) {
        Object.entries(params).forEach(([name, param]) => {
          mockParams[name] = param.value;
        });
      }
      return await handleMockQuery<T>(query, mockParams);
    }
    throw error;
  }
}

export { sql };

