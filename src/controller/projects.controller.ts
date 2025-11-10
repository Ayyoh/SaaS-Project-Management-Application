import { Context } from "hono";
import { auth } from "../utils/auth.js";
import { db } from "../db/drizzle.js";
import { projects, teamMembers, teams } from "../db/schema.js";
import { and, eq } from "drizzle-orm";

export const getProjectsByTeam = async (c: Context) => {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "Unauthorized" }, 401);

    const teamId = c.req.param("teamId");
    if (!teamId) return c.json({ error: "Team ID is required" }, 400);

    const userId = session.user.id;

    const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
    if (!team) return c.json({ error: "Team not found" }, 404);

    const [membership] = await db
      .select()
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))
      );

    if (team.ownerId !== userId && !membership) {
      return c.json({ error: "You are not a member of this team" }, 403);
    }

    const teamProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.teamId, teamId));

    return c.json(teamProjects);
  } catch (error) {
    console.log("error in getProjectsByTeam: ", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
};

export const createProject = async (c: Context) => {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "Unauthorized" }, 401);

    const userId = session.user.id;

    const { teamId, name, description } = await c.req.json();

    if (!teamId || !name) {
      return c.json({ error: "Team ID and name are required" }, 400);
    }

    const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
    if (!team) return c.json({ error: "Team not found" }, 404);

    const [membership] = await db
      .select()
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))
      );

    if (team.ownerId !== userId && !membership) {
      return c.json({ error: "You are not a member of this team" }, 403);
    }

    const newProject = await db
      .insert(projects)
      .values({ teamId, name, description, createdBy: userId })
      .returning();

    return c.json(newProject, 201);
  } catch (error) {
    console.log("error in createProject: ", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
};

export const deleteProject = async (c: Context) => {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "Unauthorized" }, 401);

    const userId = session.user.id;
    const projectId = c.req.param("projectId");

    if (!projectId) return c.json({ error: "Project ID is required" }, 400);

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) return c.json({ error: "Project not found" }, 404);

    const [currentMember] = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, project.teamId),
          eq(teamMembers.userId, userId)
        )
      );

    if (!currentMember) {
      return c.json({ error: "You are not a member of this team" }, 403);
    }

    if (currentMember.role !== "admin" && currentMember.role !== "owner") {
      return c.json(
        { error: "Only team admins and owner can delete projects" },
        403
      );
    }

    await db.delete(projects).where(eq(projects.id, projectId));

    return c.json({ message: "Project removed", project }, 200);
  } catch (error) {
    console.log("error in deleteProject: ", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
};
