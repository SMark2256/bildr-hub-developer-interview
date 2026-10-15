import {
  taskConflictMessage,
  taskLinkError,
  type TaskInput,
  type TaskUpdate,
} from "@shared/schemas/task";
import {
  batchExists,
  getTask,
  insertTask,
  listTasks,
  updateTaskIfCurrent,
  userExists,
  type Db,
} from "./repository";

export type TaskFailure = {
  code: "invalid" | "not_found" | "conflict";
  message: string;
};

export type TaskResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: TaskFailure };

type TaskView = NonNullable<Awaited<ReturnType<typeof getTask>>>;

function failure(code: TaskFailure["code"], message: string): TaskResult<never> {
  return { ok: false, error: { code, message } };
}

async function referenceFailure(
  db: Db,
  input: Pick<TaskInput, "type" | "assigneeId" | "batchId">,
) {
  const linkError = taskLinkError(input.type, input.batchId);
  if (linkError) return failure("invalid", linkError);
  if (!(await userExists(db, input.assigneeId)))
    return failure("invalid", "Érvénytelen felelős.");
  if (input.batchId !== null && !(await batchExists(db, input.batchId)))
    return failure("invalid", "A gyártási tétel nem található.");
  return null;
}

export function readTasks(db: Db) {
  return listTasks(db);
}

export async function createTask(
  db: Db,
  input: TaskInput,
): Promise<TaskResult<TaskView>> {
  const invalid = await referenceFailure(db, input);
  if (invalid) return invalid;
  const created = await insertTask(db, input);
  if (!created) return failure("not_found", "A feladat nem található.");
  const view = await getTask(db, created.id);
  return view
    ? { ok: true, value: view }
    : failure("not_found", "A feladat nem található.");
}

export async function updateTask(
  db: Db,
  id: number,
  input: TaskUpdate,
): Promise<TaskResult<TaskView>> {
  const invalid = await referenceFailure(db, input);
  if (invalid) return invalid;
  const updated = await updateTaskIfCurrent(db, id, input);
  if (updated) {
    const view = await getTask(db, id);
    if (view) return { ok: true, value: view };
  }
  const current = await getTask(db, id);
  if (!current) return failure("not_found", "A feladat nem található.");
  return failure("conflict", taskConflictMessage);
}
