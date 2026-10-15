import { Hono } from "hono";
import { orderRoutes } from "./routes/orders";
import { batchRoutes } from "./routes/batches";
import { taskRoutes } from "./routes/tasks";
import { catalogRoutes } from "./routes/catalog";
import { localOnly } from "./middleware/local-only";
import type { AppEnv } from "./types";
const app = new Hono<AppEnv>();
app.use("/api/*", localOnly);
const routes = app
  .route("/api", catalogRoutes)
  .route("/api/batches", batchRoutes)
  .route("/api/orders", orderRoutes)
  .route("/api/tasks", taskRoutes);
app.notFound((c) => c.json({ error: "Az API végpont nem található." }, 404));
app.onError((error, c) => {
  if (/UNIQUE constraint failed/i.test(String(error.cause ?? error)))
    return c.json({ error: "Ez a cikkszám vagy azonosító már létezik." }, 409);
  console.error(error);
  return c.json(
    { error: "Adatbázishiba. Ellenőrizd, hogy lefutott-e az npm run setup." },
    500,
  );
});
export type AppType = typeof routes;
export default app;
