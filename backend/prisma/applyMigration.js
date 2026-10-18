require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runMigration() {
  console.log('🔄 Applying PostgreSQL migration for CodeAlpha_ProjectManagement...');

  const statements = [
    // 1. Create Enums safely
    `DO $$ BEGIN
      CREATE TYPE "PmProjectRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`,

    `DO $$ BEGIN
      CREATE TYPE "PmTaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`,

    // 2. Create Tables
    `CREATE TABLE IF NOT EXISTS "pm_users" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "avatarUrl" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "pm_users_pkey" PRIMARY KEY ("id")
    );`,

    `CREATE TABLE IF NOT EXISTS "pm_projects" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "ownerId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "pm_projects_pkey" PRIMARY KEY ("id")
    );`,

    `CREATE TABLE IF NOT EXISTS "pm_project_members" (
      "id" TEXT NOT NULL,
      "projectId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "role" "PmProjectRole" NOT NULL DEFAULT 'MEMBER',
      "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "pm_project_members_pkey" PRIMARY KEY ("id")
    );`,

    `CREATE TABLE IF NOT EXISTS "pm_task_lists" (
      "id" TEXT NOT NULL,
      "projectId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "position" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "pm_task_lists_pkey" PRIMARY KEY ("id")
    );`,

    `CREATE TABLE IF NOT EXISTS "pm_tasks" (
      "id" TEXT NOT NULL,
      "projectId" TEXT NOT NULL,
      "listId" TEXT NOT NULL,
      "creatorId" TEXT NOT NULL,
      "assigneeId" TEXT,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "priority" "PmTaskPriority" NOT NULL DEFAULT 'MEDIUM',
      "dueDate" TIMESTAMP(3),
      "position" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "pm_tasks_pkey" PRIMARY KEY ("id")
    );`,

    `CREATE TABLE IF NOT EXISTS "pm_comments" (
      "id" TEXT NOT NULL,
      "taskId" TEXT NOT NULL,
      "authorId" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "pm_comments_pkey" PRIMARY KEY ("id")
    );`,

    `CREATE TABLE IF NOT EXISTS "pm_activity_logs" (
      "id" TEXT NOT NULL,
      "projectId" TEXT NOT NULL,
      "taskId" TEXT,
      "userId" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "details" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "pm_activity_logs_pkey" PRIMARY KEY ("id")
    );`,

    // 3. Unique Indexes
    `CREATE UNIQUE INDEX IF NOT EXISTS "pm_users_email_key" ON "pm_users"("email");`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "pm_project_members_projectId_userId_key" ON "pm_project_members"("projectId", "userId");`,

    // 4. Foreign Key Constraints
    `DO $$ BEGIN
      ALTER TABLE "pm_projects" ADD CONSTRAINT "pm_projects_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "pm_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN null; END $$;`,

    `DO $$ BEGIN
      ALTER TABLE "pm_project_members" ADD CONSTRAINT "pm_project_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "pm_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN null; END $$;`,

    `DO $$ BEGIN
      ALTER TABLE "pm_project_members" ADD CONSTRAINT "pm_project_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "pm_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN null; END $$;`,

    `DO $$ BEGIN
      ALTER TABLE "pm_task_lists" ADD CONSTRAINT "pm_task_lists_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "pm_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN null; END $$;`,

    `DO $$ BEGIN
      ALTER TABLE "pm_tasks" ADD CONSTRAINT "pm_tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "pm_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN null; END $$;`,

    `DO $$ BEGIN
      ALTER TABLE "pm_tasks" ADD CONSTRAINT "pm_tasks_listId_fkey" FOREIGN KEY ("listId") REFERENCES "pm_task_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN null; END $$;`,

    `DO $$ BEGIN
      ALTER TABLE "pm_tasks" ADD CONSTRAINT "pm_tasks_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "pm_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN null; END $$;`,

    `DO $$ BEGIN
      ALTER TABLE "pm_tasks" ADD CONSTRAINT "pm_tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "pm_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN null; END $$;`,

    `DO $$ BEGIN
      ALTER TABLE "pm_comments" ADD CONSTRAINT "pm_comments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "pm_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN null; END $$;`,

    `DO $$ BEGIN
      ALTER TABLE "pm_comments" ADD CONSTRAINT "pm_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "pm_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN null; END $$;`,

    `DO $$ BEGIN
      ALTER TABLE "pm_activity_logs" ADD CONSTRAINT "pm_activity_logs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "pm_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN null; END $$;`,

    `DO $$ BEGIN
      ALTER TABLE "pm_activity_logs" ADD CONSTRAINT "pm_activity_logs_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "pm_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN null; END $$;`,

    `DO $$ BEGIN
      ALTER TABLE "pm_activity_logs" ADD CONSTRAINT "pm_activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "pm_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  ];

  for (let i = 0; i < statements.length; i++) {
    try {
      await prisma.$executeRawUnsafe(statements[i]);
    } catch (err) {
      console.error(`Statement ${i + 1} failed:`, err.message);
      throw err;
    }
  }

  console.log('✅ PostgreSQL migration applied successfully! All pm_* tables and constraints are in place.');
}

runMigration()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
