-- ============================================================
--  Royal Gantt Planner — Schema SQL Server
--  Base de datos: RoyalGanttPlanner
--  Generado: 2026-06-18
--
--  USO:
--    1. Crear la base de datos manualmente en SQL Server Management Studio
--       o con:  CREATE DATABASE RoyalGanttPlanner;  USE RoyalGanttPlanner;
--    2. Ejecutar este archivo completo.
--    3. La aplicación sembará datos iniciales al arrancar (db.ts/seedDatabase).
-- ============================================================

USE RoyalGanttPlanner;
GO

-- ------------------------------------------------------------
--  Tabla: Users
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'Users') AND type = 'U')
BEGIN
  CREATE TABLE Users (
    id                NVARCHAR(50)   NOT NULL PRIMARY KEY,
    name              NVARCHAR(255)  NOT NULL,
    email             NVARCHAR(255)  NOT NULL,
    initials          NVARCHAR(10)   NOT NULL,
    color             NVARCHAR(20)   NOT NULL DEFAULT '#6b7280',
    role              NVARCHAR(100)  NOT NULL DEFAULT 'Developer',
    contractType      NVARCHAR(50)   NOT NULL DEFAULT 'Fijo',
    status            NVARCHAR(20)   NOT NULL DEFAULT 'pending',
    password          NVARCHAR(255)  NOT NULL,
    imageUrl          NVARCHAR(500)  NULL,
    availableHours    INT            NOT NULL DEFAULT 40,
    totalAssignedHours INT           NOT NULL DEFAULT 0,
    skills            NVARCHAR(MAX)  NOT NULL DEFAULT '[]',
    mustChangePassword BIT           NOT NULL DEFAULT 1,
    loginAttempts     INT            NOT NULL DEFAULT 0,
    lockoutUntil      DATETIME2      NULL,
    createdAt         DATETIME2      NOT NULL DEFAULT GETDATE(),
    updatedAt         DATETIME2      NULL,
    CONSTRAINT UQ_Users_Email UNIQUE (email)
  );
END
GO

-- ------------------------------------------------------------
--  Tabla: Projects
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'Projects') AND type = 'U')
BEGIN
  CREATE TABLE Projects (
    id          NVARCHAR(50)   NOT NULL PRIMARY KEY,
    name        NVARCHAR(255)  NOT NULL,
    description NVARCHAR(MAX)  NULL,
    startDate   VARCHAR(10)    NOT NULL,
    endDate     VARCHAR(10)    NOT NULL,
    status      NVARCHAR(50)   NOT NULL DEFAULT 'planning',
    leaderId    NVARCHAR(50)   NULL,
    createdAt   DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Projects_Leader FOREIGN KEY (leaderId) REFERENCES Users(id)
  );
END
GO

-- ------------------------------------------------------------
--  Tabla: Phases
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'Phases') AND type = 'U')
BEGIN
  CREATE TABLE Phases (
    id        NVARCHAR(50)  NOT NULL PRIMARY KEY,
    name      NVARCHAR(255) NOT NULL,
    color     NVARCHAR(20)  NOT NULL DEFAULT '#6b7280',
    projectId NVARCHAR(50)  NOT NULL,
    CONSTRAINT FK_Phases_Project FOREIGN KEY (projectId) REFERENCES Projects(id)
  );
END
GO

-- ------------------------------------------------------------
--  Tabla: Milestones
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'Milestones') AND type = 'U')
BEGIN
  CREATE TABLE Milestones (
    id          NVARCHAR(50)  NOT NULL PRIMARY KEY,
    projectId   NVARCHAR(50)  NOT NULL,
    name        NVARCHAR(255) NOT NULL,
    targetDate  VARCHAR(10)   NOT NULL,
    description NVARCHAR(MAX) NULL,
    status      NVARCHAR(50)  NOT NULL DEFAULT 'pending',
    createdAt   DATETIME2     NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Milestones_Project FOREIGN KEY (projectId) REFERENCES Projects(id)
  );
END
GO

-- ------------------------------------------------------------
--  Tabla: Tasks
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'Tasks') AND type = 'U')
BEGIN
  CREATE TABLE Tasks (
    id               NVARCHAR(50)    NOT NULL PRIMARY KEY,
    title            NVARCHAR(500)   NOT NULL,
    phaseId          NVARCHAR(50)    NOT NULL,
    projectId        NVARCHAR(50)    NOT NULL,
    milestoneId      NVARCHAR(50)    NULL,
    startDate        VARCHAR(10)     NOT NULL,
    endDate          VARCHAR(10)     NOT NULL,
    status           NVARCHAR(50)    NOT NULL DEFAULT 'open',
    progress         INT             NOT NULL DEFAULT 0,
    assigneeId       NVARCHAR(50)    NOT NULL,
    notes            NVARCHAR(MAX)   NULL,
    estimatedHours   INT             NULL,
    actualHours      INT             NOT NULL DEFAULT 0,
    requiredSkills   NVARCHAR(MAX)   NOT NULL DEFAULT '[]',
    estimatedBudget  DECIMAL(18, 2)  NULL,
    actualCost       DECIMAL(18, 2)  NULL,
    materials        NVARCHAR(MAX)   NOT NULL DEFAULT '[]',
    dependsOnTaskId  NVARCHAR(50)    NULL,
    createdBy        NVARCHAR(50)    NULL,
    accepted         BIT             NOT NULL DEFAULT 1,
    boardOrder       INT             NOT NULL DEFAULT 0,
    priority         NVARCHAR(20)    NOT NULL DEFAULT 'media',
    createdAt        DATETIME2       NOT NULL DEFAULT GETDATE(),
    updatedAt        DATETIME2       NULL,
    CONSTRAINT FK_Tasks_Phase     FOREIGN KEY (phaseId)         REFERENCES Phases(id),
    CONSTRAINT FK_Tasks_Project   FOREIGN KEY (projectId)       REFERENCES Projects(id),
    CONSTRAINT FK_Tasks_Milestone FOREIGN KEY (milestoneId)     REFERENCES Milestones(id),
    CONSTRAINT FK_Tasks_Assignee  FOREIGN KEY (assigneeId)      REFERENCES Users(id),
    CONSTRAINT FK_Tasks_Creator   FOREIGN KEY (createdBy)       REFERENCES Users(id),
    CONSTRAINT FK_Tasks_DependsOn FOREIGN KEY (dependsOnTaskId) REFERENCES Tasks(id),
    CONSTRAINT CK_Tasks_Progress  CHECK (progress >= 0 AND progress <= 100),
    CONSTRAINT CK_Tasks_Priority  CHECK (priority IN ('crítica', 'alta', 'media', 'baja'))
  );
END
GO

-- ------------------------------------------------------------
--  Tabla: TaskAssignees (asignaciones múltiples por tarea)
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'TaskAssignees') AND type = 'U')
BEGIN
  CREATE TABLE TaskAssignees (
    taskId NVARCHAR(50) NOT NULL,
    userId NVARCHAR(50) NOT NULL,
    CONSTRAINT PK_TaskAssignees         PRIMARY KEY (taskId, userId),
    CONSTRAINT FK_TaskAssignees_Task    FOREIGN KEY (taskId) REFERENCES Tasks(id)    ON DELETE CASCADE,
    CONSTRAINT FK_TaskAssignees_User    FOREIGN KEY (userId) REFERENCES Users(id)
  );
END
GO

-- ------------------------------------------------------------
--  Tabla: TaskComments
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'TaskComments') AND type = 'U')
BEGIN
  CREATE TABLE TaskComments (
    id        NVARCHAR(50)  NOT NULL PRIMARY KEY,
    taskId    NVARCHAR(50)  NOT NULL,
    userId    NVARCHAR(50)  NOT NULL,
    content   NVARCHAR(MAX) NOT NULL,
    createdAt DATETIME2     NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_TaskComments_Task FOREIGN KEY (taskId) REFERENCES Tasks(id) ON DELETE CASCADE,
    CONSTRAINT FK_TaskComments_User FOREIGN KEY (userId) REFERENCES Users(id)
  );
END
GO

-- ------------------------------------------------------------
--  Tabla: Notifications
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'Notifications') AND type = 'U')
BEGIN
  CREATE TABLE Notifications (
    id        NVARCHAR(50)  NOT NULL PRIMARY KEY,
    userId    NVARCHAR(50)  NOT NULL,
    title     NVARCHAR(255) NOT NULL,
    message   NVARCHAR(MAX) NOT NULL,
    type      NVARCHAR(50)  NOT NULL,
    taskId    NVARCHAR(50)  NULL,
    [read]    BIT           NOT NULL DEFAULT 0,
    createdAt DATETIME2     NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Notifications_User FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
  );

  CREATE INDEX IX_Notifications_UserId ON Notifications(userId);
END
GO

-- ------------------------------------------------------------
--  Tabla: Notes
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'Notes') AND type = 'U')
BEGIN
  CREATE TABLE Notes (
    id        NVARCHAR(50)  NOT NULL PRIMARY KEY,
    userId    NVARCHAR(50)  NOT NULL,
    projectId NVARCHAR(50)  NULL,
    taskId    NVARCHAR(50)  NULL,
    title     NVARCHAR(255) NOT NULL,
    content   NVARCHAR(MAX) NOT NULL DEFAULT '',
    color     NVARCHAR(20)  NOT NULL DEFAULT '#fef3c7',
    pinned    BIT           NOT NULL DEFAULT 0,
    tags      NVARCHAR(500) NOT NULL DEFAULT '',
    isShared  BIT           NOT NULL DEFAULT 0,
    createdAt DATETIME2     NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2     NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Notes_User    FOREIGN KEY (userId)    REFERENCES Users(id),
    CONSTRAINT FK_Notes_Project FOREIGN KEY (projectId) REFERENCES Projects(id)
  );
END
GO

-- ------------------------------------------------------------
--  Tabla: ActivityLog
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'ActivityLog') AND type = 'U')
BEGIN
  CREATE TABLE ActivityLog (
    id          NVARCHAR(50)  NOT NULL PRIMARY KEY,
    userId      NVARCHAR(50)  NOT NULL,
    userName    NVARCHAR(255) NOT NULL,
    action      NVARCHAR(100) NOT NULL,
    entityType  NVARCHAR(50)  NOT NULL,
    entityId    NVARCHAR(50)  NOT NULL,
    entityTitle NVARCHAR(255) NOT NULL,
    details     NVARCHAR(MAX) NULL,
    createdAt   DATETIME2     NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_ActivityLog_User FOREIGN KEY (userId) REFERENCES Users(id)
  );

  CREATE INDEX IX_ActivityLog_UserId     ON ActivityLog(userId);
  CREATE INDEX IX_ActivityLog_EntityType ON ActivityLog(entityType, entityId);
  CREATE INDEX IX_ActivityLog_CreatedAt  ON ActivityLog(createdAt DESC);
END
GO

-- ------------------------------------------------------------
--  Tabla: TimeEntries
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'TimeEntries') AND type = 'U')
BEGIN
  CREATE TABLE TimeEntries (
    id          NVARCHAR(50)   NOT NULL PRIMARY KEY,
    taskId      NVARCHAR(50)   NOT NULL,
    userId      NVARCHAR(50)   NOT NULL,
    hours       DECIMAL(5, 2)  NOT NULL,
    description NVARCHAR(MAX)  NULL,
    date        VARCHAR(10)    NOT NULL,
    createdAt   DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_TimeEntries_Task FOREIGN KEY (taskId) REFERENCES Tasks(id) ON DELETE CASCADE,
    CONSTRAINT FK_TimeEntries_User FOREIGN KEY (userId) REFERENCES Users(id),
    CONSTRAINT CK_TimeEntries_Hours CHECK (hours > 0 AND hours <= 24)
  );

  CREATE INDEX IX_TimeEntries_TaskId ON TimeEntries(taskId);
  CREATE INDEX IX_TimeEntries_UserId ON TimeEntries(userId);
END
GO

PRINT 'Schema de Royal Gantt Planner creado con exito.';
