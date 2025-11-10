import { Hono } from "hono";
import {
  createTeams,
  deleteTeam,
  getTeams,
} from "../controller/teams.controller.js";

export const teamRoutes = new Hono();

teamRoutes.get("/", getTeams);
teamRoutes.post("/create-team", createTeams);
teamRoutes.delete("/:teamId/delete-team", deleteTeam);