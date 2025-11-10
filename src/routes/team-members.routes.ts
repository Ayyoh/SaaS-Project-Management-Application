import { Hono } from "hono";
import {
  addTeamMember,
  getTeamMembers,
  removeTeamMember,
} from "../controller/team-members.controller.js";

export const teamMembersRoutes = new Hono();

teamMembersRoutes.get("/:teamId/members", getTeamMembers);
teamMembersRoutes.post("/:teamId/members", addTeamMember);
teamMembersRoutes.delete("/members/remove", removeTeamMember);
