import { and, asc, eq } from "drizzle-orm";
import type { TaskInput, TaskUpdate } from "@shared/schemas/task";
import { getDb } from "../db";
import { batches, tasks, users } from "../db/schema";

export type Db = ReturnType<typeof getDb>;

const taskColumns = {
  id: tasks.id,
  title: tasks.title,
  description: tasks.description,
  type: tasks.type,
  status: tasks.status,
  priority: tasks.priority,
  assigneeId: tasks.assigneeId,
  assigneeName: users.displayName,
  batchId: tasks.batchId,
  batchCode: batches.batchCode,
  dueDate: tasks.dueDate,
  version: tasks.version,
};

function taskView(db: Db) {
  return db
    .select(taskColumns)
    .from(tasks)
    .innerJoin(users, eq(tasks.assigneeId, users.id))
    .leftJoin(batches, eq(tasks.batchId, batches.id));
}

export function listTasks(db: Db) {
  return taskView(db).orderBy(asc(tasks.dueDate), asc(tasks.id));
}

export function getTask(db: Db, id: number) {
  return taskView(db).where(eq(tasks.id, id)).get();
}

export async function userExists(db: Db, id: number) {
  const row = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, id))
    .get();
  return row !== undefined;
}

export async function batchExists(db: Db, id: number) {
  const row = await db
    .select({ id: batches.id })
    .from(batches)
    .where(eq(batches.id, id))
    .get();
  return row !== undefined;
}

export async function insertTask(db: Db, input: TaskInput) {
  const [created] = await db
    .insert(tasks)
    .values({ ...input, status: "open", version: 1 })
    .returning();
  return created;
}

export async function updateTaskIfCurrent(
  db: Db,
  id: number,
  input: TaskUpdate,
) {
  const [updated] = await db
    .update(tasks)
    .set({
      title: input.title,
      description: input.description,
      type: input.type,
      status: input.status,
      priority: input.priority,
      assigneeId: input.assigneeId,
      batchId: input.batchId,
      dueDate: input.dueDate,
      version: input.version + 1,
    })
    .where(and(eq(tasks.id, id), eq(tasks.version, input.version)))
    .returning();
  return updated;
}
