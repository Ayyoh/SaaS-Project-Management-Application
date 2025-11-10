import { Hono } from "hono";
import { auth } from "./utils/auth.js";
import { projectRoutes } from "./routes/projects.routes.js";
import { boardRoutes } from "./routes/boards.routes.js";
import { taskRoutes } from "./routes/todo.routes.js";
import { teamMembersRoutes } from "./routes/team-members.routes.js";
import { teamRoutes } from "./routes/teams.routes.js";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: process.env.FRONTEND_API_URL || "http://localhost:5173",
    credentials: true,
    allowHeaders: ["Content-type", "Authorization"],
    allowMethods: ["GET", "POST", "DELETE", "PUT", "OPTIONS"],
  })
);

app.route("/api/teams", teamRoutes);
app.route("/api/projects", projectRoutes);
app.route("/api/boards", boardRoutes);
app.route("/api/tasks", taskRoutes);
app.route("/api/team-members", teamMembersRoutes);

app
  .on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw))
  .get("/", (c) => {
    return c.text("Hello Hono!");
  });

serve({
  fetch: app.fetch,
  port: Number(process.env.PORT!) || 5000,
});

export default app;
