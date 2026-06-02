import sql from 'mssql';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { mockUsers, mockProjects, mockPhases, mockMilestones, mockTasks } from './mockData';

const config: sql.config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'RoyalGanttPlanner',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true, // Para desarrollo local
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
    const userCheck = await pool.request().query('SELECT COUNT(*) as count FROM Users');
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
          INSERT INTO Users (id, name, email, initials, color, role, contractType, status, password, skills)
          VALUES (@id, @name, @email, @initials, @color, @role, @contractType, @status, @password, @skills)
        `);
    }

    // Asegurarse de que el usuario René Rangel exista como administrador/líder principal
    const reneEmail = 'renerangel@royaltransports.com.mx';
    const reneCheck = await pool.request()
      .input('email', sql.NVarChar, reneEmail)
      .query('SELECT COUNT(*) as count FROM Users WHERE email = @email');

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
          INSERT INTO Users (id, name, email, initials, color, role, contractType, status, password, skills, mustChangePassword)
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
          INSERT INTO Projects (id, name, description, startDate, endDate, status, leaderId)
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
          INSERT INTO Phases (id, name, color, projectId)
          VALUES (@id, @name, @color, @projectId)
        `);
    }

    // 4. Insertar Hitos/Milestones
    for (const ms of mockMilestones) {
      await pool.request()
        .input('id', sql.NVarChar, ms.id)
        .input('projectId', sql.NVarChar, ms.projectId)
        .input('name', sql.NVarChar, ms.name)
        .input('targetDate', sql.VarChar, ms.targetDate)
        .input('description', sql.NVarChar, ms.description || null)
        .input('status', sql.NVarChar, ms.status)
        .query(`
          INSERT INTO Milestones (id, projectId, name, targetDate, description, status)
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
          INSERT INTO Tasks (
            id, title, phaseId, projectId, milestoneId, startDate, endDate, status, progress, 
            assigneeId, notes, estimatedHours, actualHours, requiredSkills, estimatedBudget, actualCost, materials, dependsOnTaskId
          )
          VALUES (
            @id, @title, @phaseId, @projectId, @milestoneId, @startDate, @endDate, @status, @progress, 
            @assigneeId, @notes, @estimatedHours, @actualHours, @requiredSkills, @estimatedBudget, @actualCost, @materials, @dependsOnTaskId
          )
        `);

      // Guardar asignación en tabla puente TaskAssignees
      await pool.request()
        .input('taskId', sql.NVarChar, task.id)
        .input('userId', sql.NVarChar, task.assigneeId)
        .query(`
          INSERT INTO TaskAssignees (taskId, userId)
          VALUES (@taskId, @userId)
        `);
    }

    console.log('¡Base de datos sembrada con éxito!');
  } catch (error) {
    console.error('Error al sembrar la base de datos:', error);
  }
}

async function runMigrations(pool: sql.ConnectionPool) {
  try {
    // 1. Agregar columna mustChangePassword si no existe
    await pool.request().query(`
      IF NOT EXISTS (
          SELECT * FROM sys.columns 
          WHERE object_id = OBJECT_ID('Users') AND name = 'mustChangePassword'
      )
      BEGIN
          ALTER TABLE Users ADD mustChangePassword BIT NOT NULL DEFAULT 1;
      END
    `);
    
    // 2. Agregar columna loginAttempts si no existe
    await pool.request().query(`
      IF NOT EXISTS (
          SELECT * FROM sys.columns 
          WHERE object_id = OBJECT_ID('Users') AND name = 'loginAttempts'
      )
      BEGIN
          ALTER TABLE Users ADD loginAttempts INT NOT NULL DEFAULT 0;
      END
    `);

    // 3. Agregar columna lockoutUntil si no existe
    await pool.request().query(`
      IF NOT EXISTS (
          SELECT * FROM sys.columns 
          WHERE object_id = OBJECT_ID('Users') AND name = 'lockoutUntil'
      )
      BEGIN
          ALTER TABLE Users ADD lockoutUntil DATETIME2 NULL;
      END
    `);

    // 4. Asegurarse de que René tenga mustChangePassword = 0
    await pool.request()
      .input('email', sql.NVarChar, 'renerangel@royaltransport.com.mx')
      .query('UPDATE Users SET mustChangePassword = 0 WHERE email = @email');

    // 5. Agregar columna accepted a la tabla Tasks si no existe
    await pool.request().query(`
      IF NOT EXISTS (
          SELECT * FROM sys.columns 
          WHERE object_id = OBJECT_ID('Tasks') AND name = 'accepted'
      )
      BEGIN
          ALTER TABLE Tasks ADD accepted BIT NOT NULL DEFAULT 1;
      END
    `);

    // 6. Asegurar fase Bloqueadas para proj1
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM Phases WHERE id = 'p5')
      BEGIN
          INSERT INTO Phases (id, name, color, projectId)
          VALUES ('p5', 'Bloqueadas', '#ff5c5c', 'proj1');
      END
    `);

    // 7. Agregar columna boardOrder a la tabla Tasks si no existe
    await pool.request().query(`
      IF NOT EXISTS (
          SELECT * FROM sys.columns 
          WHERE object_id = OBJECT_ID('Tasks') AND name = 'boardOrder'
      )
      BEGIN
          ALTER TABLE Tasks ADD boardOrder INT NOT NULL DEFAULT 0;
      END
    `);
      
    console.log('Migraciones de base de datos ejecutadas con éxito.');
  } catch (error) {
    console.error('Error al ejecutar migraciones en la base de datos:', error);
  }
}

async function connectAndSeed(): Promise<sql.ConnectionPool> {
  const pool = await sql.connect(config);
  await runMigrations(pool);
  await seedDatabase(pool);
  return pool;
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
  const pool = await getDbPool();
  const request = pool.request();

  if (params) {
    Object.entries(params).forEach(([name, param]) => {
      request.input(name, param.value);
    });
  }

  return request.query<T>(query);
}

export { sql };
