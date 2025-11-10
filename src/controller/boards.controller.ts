import { Context } from "hono";
import { auth } from "../utils/auth.js";
import { db } from "../db/drizzle.js";
import { boards, projects, teamMembers, teams, user } from "../db/schema.js";
import { and, desc, eq } from "drizzle-orm";

export const getBoardsFromProjects = async (c: Context) => {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "Unauthorized" }, 401);

    const projectId = c.req.param("projectId");
    if (!projectId) return c.json({ error: "Project ID is required" }, 400);

    const userId = session.user.id;

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));
    if (!project) return c.json({ error: "Project not found" }, 404);

    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, project.teamId));
    if (!team) return c.json({ error: "Team not found" }, 404);

    const [membership] = await db
      .select()
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, userId))
      );

    if (team.ownerId !== userId && !membership) {
      return c.json(
        { error: "You are not authorized to view this project" },
        403
      );
    }

    const projectBoards = await db
      .select()
      .from(boards)
      .where(eq(boards.projectId, projectId));

    return c.json(projectBoards);
  } catch (error) {
    console.log("error in getBoards: ", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
};

export const createBoard = async (c: Context) => {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "Unauthorized" }, 401);

    const userId = session.user.id;

    const { projectId, name } = await c.req.json();

    if (!projectId || !name) {
      return c.json({ error: "Project ID and name is required" }, 400);
    }

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));
    if (!project) return c.json({ error: "Project not found" }, 404);

    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, project.teamId));
    if (!team) return c.json({ error: "Team not found" }, 404);

    const [membership] = await db
      .select()
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, userId))
      );

    if (team.ownerId !== userId && !membership) {
      return c.json(
        { error: "You are not authorized to create a board in this project" },
        403
      );
    }

    const [lastBoard] = await db
      .select()
      .from(boards)
      .where(eq(boards.projectId, projectId))
      .orderBy(desc(boards.orderIndex));

    const nextOrderIndex = lastBoard ? (lastBoard.orderIndex ?? 0) + 1 : 0;

    const [newboard] = await db
      .insert(boards)
      .values({ projectId, name, orderIndex: nextOrderIndex })
      .returning();

    return c.json(newboard, 201);
  } catch (error) {
    console.log("error in createBoard: ", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
};

export const deleteBoard = async (c: Context) => {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "Unauthorized" }, 401);

    const userId = session.user.id;
    const boardId = c.req.param("boardId");

    if (!boardId) return c.json({ error: "Board ID is required" }, 400);

    const [board] = await db
      .select()
      .from(boards)
      .where(eq(boards.id, boardId));

    if (!board) return c.json({ error: "Board not found" }, 404);

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, board.projectId));

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
        { error: "Only team admins and owners can delete boards" },
        403
      );
    }

    await db.delete(boards).where(eq(boards.id, boardId));

    return c.json({ message: "Board deleted successfully", board });
  } catch (error) {
    console.log("error in deleteBoard: ", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
};
