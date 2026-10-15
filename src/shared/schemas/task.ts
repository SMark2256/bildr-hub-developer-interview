import { z } from "zod";
import { dateSchema, idSchema } from "./operations";

export const taskStatusSchema = z.enum([
  "open",
  "in_progress",
  "blocked",
  "done",
]);
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export const taskStatusLabels: Record<TaskStatus, string> = {
  open: "Nyitott",
  in_progress: "Folyamatban",
  blocked: "Akadt",
  done: "Kész",
};

export const taskTypeSchema = z.enum(["general", "production"]);
export type TaskType = z.infer<typeof taskTypeSchema>;
export const taskTypeLabels: Record<TaskType, string> = {
  general: "Szervezés",
  production: "Gyártás",
};

export const taskPrioritySchema = z.enum(["normal", "urgent"]);
export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export const taskPriorityLabels: Record<TaskPriority, string> = {
  normal: "Normál",
  urgent: "Sürgős",
};

export const taskConflictMessage =
  "Valaki közben módosította ezt a feladatot, frissítettük az adatokat.";

export function taskLinkError(
  type: TaskType,
  batchId: number | null,
): string | null {
  if (type === "general" && batchId !== null)
    return "Szervezési feladathoz nem tartozik gyártási tétel.";
  if (type === "production" && batchId === null)
    return "Gyártási feladathoz gyártási tételt kell választani.";
  return null;
}

export function isTaskLate(
  dueDate: string,
  status: TaskStatus,
  today: string,
) {
  return status !== "done" && dueDate < today;
}

const taskFields = {
  title: z.string().trim().min(1, "A cím megadása kötelező.").max(120),
  description: z.string().trim().max(2000),
  type: taskTypeSchema,
  priority: taskPrioritySchema,
  assigneeId: idSchema,
  batchId: idSchema.nullable(),
  dueDate: dateSchema,
};

type TaskLinkValue = { type: TaskType; batchId: number | null };
type IssueTarget = {
  addIssue: (issue: {
    code: "custom";
    message: string;
    path: (string | number)[];
  }) => void;
};

function addTaskLinkIssue(value: TaskLinkValue, ctx: IssueTarget) {
  const message = taskLinkError(value.type, value.batchId);
  if (message)
    ctx.addIssue({ code: "custom", message, path: ["batchId"] });
}

export const taskCreateSchema = z
  .object(taskFields)
  .strict()
  .superRefine(addTaskLinkIssue);
export const taskUpdateSchema = z
  .object({
    ...taskFields,
    status: taskStatusSchema,
    version: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  })
  .strict()
  .superRefine(addTaskLinkIssue);

export type TaskInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdate = z.infer<typeof taskUpdateSchema>;
