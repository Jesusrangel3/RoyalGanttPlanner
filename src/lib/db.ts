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
    const userCheck = await pool.request().query('SELECT COUNT(*) as count FROM users_Gantt');
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
      if (!email.endsWith('@royaltransports.com.mx')) {
        email = email.split('@')[0] + '@royaltransports.com.mx';
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
          INSERT INTO users_Gantt (id, name, email, initials, color, role, contractType, status, password, skills)
          VALUES (@id, @name, @email, @initials, @color, @role, @contractType, @status, @password, @skills)
        `);
    }

    // Asegurarse de que el usuario René Rangel exista como administrador/líder principal
    const reneEmail = 'renerangel@royaltransports.com.mx';
    const reneCheck = await pool.request()
      .input('email', sql.NVarChar, reneEmail)
      .query('SELECT COUNT(*) as count FROM users_Gantt WHERE email = @email');

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
          INSERT INTO users_Gantt (id, name, email, initials, color, role, contractType, status, password, skills, mustChangePassword)
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
          INSERT INTO Projects_Gantt (id, name, description, startDate, endDate, status, leaderId)
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
          INSERT INTO Phases_Gantt (id, name, color, projectId)
          VALUES (@id, @name, @color, @projectId)
        `);
    }

    // 4. Insertar Hitos/Milestones_Gantt
    for (const ms of mockMilestones) {
      await pool.request()
        .input('id', sql.NVarChar, ms.id)
        .input('projectId', sql.NVarChar, ms.projectId)
        .input('name', sql.NVarChar, ms.name)
        .input('targetDate', sql.VarChar, ms.targetDate)
        .input('description', sql.NVarChar, ms.description || null)
        .input('status', sql.NVarChar, ms.status)
        .query(`
          INSERT INTO Milestones_Gantt (id, projectId, name, targetDate, description, status)
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
          INSERT INTO Tasks_Gantt (
            id, title, phaseId, projectId, milestoneId, startDate, endDate, status, progress, 
            assigneeId, notes, estimatedHours, actualHours, requiredSkills, estimatedBudget, actualCost, materials, dependsOnTaskId
          )
          VALUES (
            @id, @title, @phaseId, @projectId, @milestoneId, @startDate, @endDate, @status, @progress, 
            @assigneeId, @notes, @estimatedHours, @actualHours, @requiredSkills, @estimatedBudget, @actualCost, @materials, @dependsOnTaskId
          )
        `);

      // Guardar asignación en tabla puente TaskAssignees_Gantt
      await pool.request()
        .input('taskId', sql.NVarChar, task.id)
        .input('userId', sql.NVarChar, task.assigneeId)
        .query(`
          INSERT INTO TaskAssignees_Gantt (taskId, userId)
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

  // ── Columnas faltantes en users_Gantt ────────────────────────────────────────────
  await step('users_Gantt.name',             `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('users_Gantt') AND name='name') ALTER TABLE users_Gantt ADD name NVARCHAR(255) NOT NULL DEFAULT '';`);
  await step('users_Gantt.initials',         `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('users_Gantt') AND name='initials') ALTER TABLE users_Gantt ADD initials NVARCHAR(10) NOT NULL DEFAULT '';`);
  await step('users_Gantt.color',            `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('users_Gantt') AND name='color') ALTER TABLE users_Gantt ADD color NVARCHAR(20) NOT NULL DEFAULT '#6b7280';`);
  await step('users_Gantt.role',             `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('users_Gantt') AND name='role') ALTER TABLE users_Gantt ADD role NVARCHAR(100) NOT NULL DEFAULT 'Developer';`);
  await step('users_Gantt.contractType',     `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('users_Gantt') AND name='contractType') ALTER TABLE users_Gantt ADD contractType NVARCHAR(50) NOT NULL DEFAULT 'Fijo';`);
  await step('users_Gantt.status',           `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('users_Gantt') AND name='status') ALTER TABLE users_Gantt ADD status NVARCHAR(20) NOT NULL DEFAULT 'active';`);
  await step('users_Gantt.password',         `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('users_Gantt') AND name='password') ALTER TABLE users_Gantt ADD password NVARCHAR(255) NOT NULL DEFAULT '';`);
  await step('users_Gantt.imageUrl',         `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('users_Gantt') AND name='imageUrl') ALTER TABLE users_Gantt ADD imageUrl NVARCHAR(500) NULL;`);
  await step('users_Gantt.availableHours',   `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('users_Gantt') AND name='availableHours') ALTER TABLE users_Gantt ADD availableHours INT NOT NULL DEFAULT 40;`);
  await step('users_Gantt.totalAssignedHours', `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('users_Gantt') AND name='totalAssignedHours') ALTER TABLE users_Gantt ADD totalAssignedHours INT NOT NULL DEFAULT 0;`);
  await step('users_Gantt.skills',           `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('users_Gantt') AND name='skills') ALTER TABLE users_Gantt ADD skills NVARCHAR(MAX) NOT NULL DEFAULT '[]';`);
  await step('users_Gantt.mustChangePassword',`IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('users_Gantt') AND name='mustChangePassword') ALTER TABLE users_Gantt ADD mustChangePassword BIT NOT NULL DEFAULT 1;`);
  await step('users_Gantt.loginAttempts',    `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('users_Gantt') AND name='loginAttempts') ALTER TABLE users_Gantt ADD loginAttempts INT NOT NULL DEFAULT 0;`);
  await step('users_Gantt.lockoutUntil',     `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('users_Gantt') AND name='lockoutUntil') ALTER TABLE users_Gantt ADD lockoutUntil DATETIME2 NULL;`);
  await step('users_Gantt.createdAt',        `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('users_Gantt') AND name='createdAt') ALTER TABLE users_Gantt ADD createdAt DATETIME2 NOT NULL DEFAULT GETDATE();`);

  // ── Tablas faltantes ───────────────────────────────────────────────────────
  await step('create.Projects_Gantt', `
    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Projects_Gantt') AND type='U')
    CREATE TABLE Projects_Gantt (
      id NVARCHAR(50) NOT NULL PRIMARY KEY, name NVARCHAR(255) NOT NULL,
      description NVARCHAR(MAX) NULL, startDate VARCHAR(10) NOT NULL,
      endDate VARCHAR(10) NOT NULL, status NVARCHAR(50) NOT NULL DEFAULT 'planning',
      leaderId NVARCHAR(50) NULL, createdAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );`);

  await step('create.Phases_Gantt', `
    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Phases_Gantt') AND type='U')
    CREATE TABLE Phases_Gantt (
      id NVARCHAR(50) NOT NULL PRIMARY KEY, name NVARCHAR(255) NOT NULL,
      color NVARCHAR(20) NOT NULL DEFAULT '#6b7280', projectId NVARCHAR(50) NOT NULL
    );`);

  await step('create.Milestones_Gantt', `
    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Milestones_Gantt') AND type='U')
    CREATE TABLE Milestones_Gantt (
      id NVARCHAR(50) NOT NULL PRIMARY KEY, projectId NVARCHAR(50) NOT NULL,
      name NVARCHAR(255) NOT NULL, targetDate VARCHAR(10) NOT NULL,
      description NVARCHAR(MAX) NULL, status NVARCHAR(50) NOT NULL DEFAULT 'pending',
      createdAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );`);

  await step('create.Tasks_Gantt', `
    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Tasks_Gantt') AND type='U')
    CREATE TABLE Tasks_Gantt (
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

  await step('create.TaskAssignees_Gantt', `
    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'TaskAssignees_Gantt') AND type='U')
    CREATE TABLE TaskAssignees_Gantt (
      taskId NVARCHAR(50) NOT NULL, userId NVARCHAR(50) NOT NULL,
      CONSTRAINT PK_TaskAssignees_Gantt PRIMARY KEY (taskId, userId)
    );`);

  await step('create.TaskComments_Gantt', `
    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'TaskComments_Gantt') AND type='U')
    CREATE TABLE TaskComments_Gantt (
      id NVARCHAR(50) NOT NULL PRIMARY KEY, taskId NVARCHAR(50) NOT NULL,
      userId NVARCHAR(50) NOT NULL, content NVARCHAR(MAX) NOT NULL,
      createdAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );`);

  await step('create.Notifications_Gantt', `
    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Notifications_Gantt') AND type='U')
    CREATE TABLE Notifications_Gantt (
      id NVARCHAR(50) NOT NULL PRIMARY KEY, userId NVARCHAR(50) NOT NULL,
      title NVARCHAR(255) NOT NULL, message NVARCHAR(MAX) NOT NULL,
      type NVARCHAR(50) NOT NULL, taskId NVARCHAR(50) NULL,
      [read] BIT NOT NULL DEFAULT 0, createdAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );`);

  await step('create.notes', `
    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Notes_Gantt') AND type='U')
    CREATE TABLE Notes_Gantt (
      id NVARCHAR(50) NOT NULL PRIMARY KEY, userId NVARCHAR(50) NOT NULL,
      projectId NVARCHAR(50) NULL, taskId NVARCHAR(50) NULL,
      title NVARCHAR(255) NOT NULL, content NVARCHAR(MAX) NOT NULL DEFAULT '',
      color NVARCHAR(20) NOT NULL DEFAULT '#fef3c7', pinned BIT NOT NULL DEFAULT 0,
      tags NVARCHAR(500) NOT NULL DEFAULT '', isShared BIT NOT NULL DEFAULT 0,
      createdAt DATETIME2 NOT NULL DEFAULT GETDATE(), updatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );`);

  await step('create.ActivityLog_Gantt', `
    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'ActivityLog_Gantt') AND type='U')
    CREATE TABLE ActivityLog_Gantt (
      id NVARCHAR(50) NOT NULL PRIMARY KEY, userId NVARCHAR(50) NOT NULL,
      userName NVARCHAR(255) NOT NULL, action NVARCHAR(100) NOT NULL,
      entityType NVARCHAR(50) NOT NULL, entityId NVARCHAR(50) NOT NULL,
      entityTitle NVARCHAR(255) NOT NULL, details NVARCHAR(MAX) NULL,
      createdAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );`);

  await step('create.TimeEntries_Gantt', `
    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'TimeEntries_Gantt') AND type='U')
    CREATE TABLE TimeEntries_Gantt (
      id NVARCHAR(50) NOT NULL PRIMARY KEY, taskId NVARCHAR(50) NOT NULL,
      userId NVARCHAR(50) NOT NULL, hours DECIMAL(5,2) NOT NULL,
      description NVARCHAR(MAX) NULL, date VARCHAR(10) NOT NULL,
      createdAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );`);

  // ── Columnas faltantes en Tasks_Gantt (si la tabla ya existía sin ellas) ─────────
  // Renombrar Notes_Gantt → notes si quedó con el nombre incorrecto
  await step('Tasks_Gantt.rename.notes', `
    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Tasks_Gantt') AND name='Notes_Gantt')
      EXEC sp_rename 'Tasks_Gantt.Notes_Gantt', 'notes', 'COLUMN';
  `);
  await step('Tasks_Gantt.notes',      `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Tasks_Gantt') AND name='notes') ALTER TABLE Tasks_Gantt ADD notes NVARCHAR(MAX) NULL;`);
  await step('Tasks_Gantt.accepted',   `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Tasks_Gantt') AND name='accepted') ALTER TABLE Tasks_Gantt ADD accepted BIT NOT NULL DEFAULT 1;`);
  await step('Tasks_Gantt.boardOrder', `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Tasks_Gantt') AND name='boardOrder') ALTER TABLE Tasks_Gantt ADD boardOrder INT NOT NULL DEFAULT 0;`);
  await step('Tasks_Gantt.priority',   `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Tasks_Gantt') AND name='priority') ALTER TABLE Tasks_Gantt ADD priority NVARCHAR(20) NOT NULL DEFAULT 'media';`);

  // ── Fase 'Bloqueadas' para proj1 ──────────────────────────────────────────
  await step('seed.phase.bloqueadas', `
    IF EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Phases_Gantt') AND type='U')
    AND EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID(N'Projects_Gantt') AND type='U')
    AND NOT EXISTS (SELECT 1 FROM Phases_Gantt WHERE id='p5')
    AND EXISTS (SELECT 1 FROM Projects_Gantt WHERE id='proj1')
    INSERT INTO Phases_Gantt (id,name,color,projectId) VALUES ('p5','Bloqueadas','#ff5c5c','proj1');`);

  // ── Garantizar usuario admin (aunque el seed no haya corrido) ────────────
  try {
    const check = await pool.request()
      .input('email', sql.NVarChar, 'renerangel@royaltransports.com.mx')
      .query('SELECT COUNT(*) AS cnt FROM users_Gantt WHERE email=@email');
    if (check.recordset[0].cnt === 0) {
      const adminHash = await bcrypt.hash(sha256('Royal1234'), 10);
      await pool.request()
        .input('name',              sql.NVarChar, 'René de Jesús Rangel Buitrón')
        .input('email',             sql.NVarChar, 'renerangel@royaltransports.com.mx')
        .input('initials',          sql.NVarChar, 'RR')
        .input('color',             sql.NVarChar, '#7c5cfc')
        .input('role',              sql.NVarChar, 'Project Manager')
        .input('contractType',      sql.NVarChar, 'Fijo')
        .input('status',            sql.NVarChar, 'active')
        .input('password',          sql.NVarChar, adminHash)
        .input('skills',            sql.NVarChar, JSON.stringify(['React','TypeScript','SQL']))
        .input('mustChangePassword', sql.Bit,     0)
        // NEWID() para id UNIQUEIDENTIFIER; password_hash = password para compatibilidad con RoyalCIF
        .query(`INSERT INTO users_Gantt (id,name,email,initials,color,role,contractType,status,password,password_hash,skills,mustChangePassword)
                VALUES (NEWID(),@name,@email,@initials,@color,@role,@contractType,@status,@password,@password,@skills,@mustChangePassword)`);
      console.log('[migration] Usuario admin creado en RoyalCIF.');
    } else {
      await pool.request()
        .input('email', sql.NVarChar, 'renerangel@royaltransports.com.mx')
        .query('UPDATE users_Gantt SET mustChangePassword=0 WHERE email=@email');
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

  // 1. SELECT ... FROM users_Gantt WHERE email = @email
  if (normalizedQuery.includes("users_Gantt") && normalizedQuery.includes("WHERE EMAIL =")) {
    const emailParam = params?.email || "";
    const emailVal = typeof emailParam === "string" ? emailParam.trim().toLowerCase() : "";

    // Usuarios de respaldo con sus contraseñas reales (modo demo/fallback sin BD)
    const fallbackUsers: Record<string, { id: string; name: string; email: string; initials: string; color: string; role: string; password: string }> = {
      "renerangel@royaltransports.com.mx": {
        id: "u_rene",
        name: "René de Jesús Rangel Buitrón",
        email: "renerangel@royaltransports.com.mx",
        initials: "RR",
        color: "#7c5cfc",
        role: "Project Manager",
        password: sha256('Royal1234'),
      },
      "jesus@royaltransports.com.mx": {
        id: "u_jesus",
        name: "Jesús Sánchez",
        email: "jesus@royaltransports.com.mx",
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

  // 2. SELECT ... FROM users_Gantt
  if (normalizedQuery.includes("users_Gantt")) {
    const defaultHash = await bcrypt.hash(sha256('Royal1234'), 10);
    const users = mockUsers.map(u => ({
      ...u,
      password: defaultHash,
      skills: JSON.stringify([]),
      availableHours: 40,
      totalAssignedHours: 0
    }));

    // Asegurarse de incluir a René Rangel
    if (!users_Gantt.some(u => u.id === "u_rene")) {
      users.push({
        id: "u_rene",
        name: "René de Jesús Rangel Buitrón",
        email: "renerangel@royaltransports.com.mx",
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
    if (!users_Gantt.some(u => u.id === "u_jesus")) {
      users.push({
        id: "u_jesus",
        name: "Jesús Sánchez",
        email: "jesus@royaltransports.com.mx",
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
      recordset: users_Gantt as any,
      recordsets: [users_Gantt] as any,
      rowsAffected: [users.length],
      output: {}
    };
  }

  // 3. SELECT ... FROM Projects_Gantt
  if (normalizedQuery.includes("Projects_Gantt")) {
    return {
      recordset: mockProjects as any,
      recordsets: [mockProjects] as any,
      rowsAffected: [mockProjects.length],
      output: {}
    };
  }

  // 4. SELECT ... FROM Phases_Gantt
  if (normalizedQuery.includes("Phases_Gantt")) {
    return {
      recordset: mockPhases as any,
      recordsets: [mockPhases] as any,
      rowsAffected: [mockPhases.length],
      output: {}
    };
  }

  // 5. SELECT ... FROM Milestones_Gantt
  if (normalizedQuery.includes("Milestones_Gantt")) {
    return {
      recordset: mockMilestones as any,
      recordsets: [mockMilestones] as any,
      rowsAffected: [mockMilestones.length],
      output: {}
    };
  }

  // 6. SELECT ... FROM TaskAssignees_Gantt
  if (normalizedQuery.includes("TaskAssignees_Gantt")) {
    const list = mockTasks.map(t => ({ taskId: t.id, userId: t.assigneeId }));
    return {
      recordset: list as any,
      recordsets: [list] as any,
      rowsAffected: [list.length],
      output: {}
    };
  }

  // 7. SELECT ... FROM TaskComments_Gantt
  if (normalizedQuery.includes("TaskComments_Gantt")) {
    return {
      recordset: [] as any,
      recordsets: [[]] as any,
      rowsAffected: [0],
      output: {}
    };
  }

  // 8. SELECT ... FROM Tasks_Gantt
  if (normalizedQuery.includes("Tasks_Gantt")) {
    return {
      recordset: mockTasks as any,
      recordsets: [mockTasks] as any,
      rowsAffected: [mockTasks.length],
      output: {}
    };
  }

  // 9. SELECT ... FROM Notifications_Gantt
  if (normalizedQuery.includes("Notifications_Gantt")) {
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

