import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { getDb } from "../db";
import { idParam } from "@shared/schemas/operations";
import { taskCreateSchema, taskUpdateSchema } from "@shared/schemas/task";
import type { AppEnv } from "../types";
import {
  createTask,
  readTasks,
  updateTask,
  type TaskFailure,
} from "../tasks/service";

const httpStatus: Record<TaskFailure["code"], 400 | 404 | 409> = {
  invalid: 400,
  not_found: 404,
  conflict: 409,
};

function rejectInvalid(
  result: {
    success: boolean;
    error?: { issues: { message: string }[] };
  },
  c: { json: (data: { error: string }, status: 400) => Response },
) {
  if (!result.success)
    return c.json(
      {
        error:
          result.error?.issues[0]?.message ??
          "A megadott adatok nem érvényesek.",
      },
      400,
    );
}

export const taskRoutes = new Hono<AppEnv>()
  .get("/", async (c) => c.json(await readTasks(getDb(c.env.DB))))
  .post(
    "/",
    zValidator("json", taskCreateSchema, rejectInvalid),
    async (c) => {
      const result = await createTask(getDb(c.env.DB), c.req.valid("json"));
      if (!result.ok)
        return c.json(
          { error: result.error.message },
          httpStatus[result.error.code],
        );
      return c.json(result.value, 201);
    },
  )
  .patch(
    "/:id",
    zValidator("param", idParam),
    zValidator("json", taskUpdateSchema, rejectInvalid),
    async (c) => {
      const result = await updateTask(
        getDb(c.env.DB),
        c.req.valid("param").id,
        c.req.valid("json"),
      );
      if (!result.ok)
        return c.json(
          { error: result.error.message },
          httpStatus[result.error.code],
        );
      return c.json(result.value);
    },
  );
