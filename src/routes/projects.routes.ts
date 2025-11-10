import { Hono } from "hono";
import {
  createProject,
  deleteProject,
  getProjectsByTeam,
} from "../controller/projects.controller.js";

export const projectRoutes = new Hono();

projectRoutes.get("/:teamId", getProjectsByTeam);
projectRoutes.post("/create-project", createProject);
projectRoutes.delete("/:projectId/delete-project", deleteProject);
