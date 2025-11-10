import { Context } from "hono";
import { auth } from "../utils/auth.js";
import { db } from "../db/drizzle.js";
import { boards, projects, tasks, teamMembers } from "../db/schema.js";
import { and, eq } from "drizzle-orm";

export const getTodoFromBoards = async (c: Context) => {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "Unauthorized" }, 401);

    const userId = session.user.id;
    const boardId = c.req.param("boardId");
    if (!boardId) return c.json({ error: "Board ID is required" }, 400);

    const [board] = await db
      .select({
        boardId: boards.id,
        projectId: boards.projectId,
        teamId: projects.teamId,
      })
      .from(boards)
      .leftJoin(projects, eq(boards.projectId, projects.id))
      .where(eq(boards.id, boardId));

    if (!board) return c.json({ error: "Board not found" }, 404);

    const [member] = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, board.teamId!),
          eq(teamMembers.userId, userId)
        )
      );

    if (!member) return c.json({ error: "Forbidden: not a team member" }, 403);

    const todos = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.boardId, boardId), eq(tasks.status, "todo")));

    return c.json(todos);
  } catch (error) {
    console.log("error in getTodoFromBoards: ", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
};

export const createTask = async (c: Context) => {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "Unauthorized" }, 401);

    const userId = session.user.id;

    const {
      boardId,
      title,
      description,
      status,
      priority,
      dueDate,
      assigneeId,
    } = await c.req.json();

    if (!boardId || !title) {
      return c.json({ error: "Board ID and title are required" }, 400);
    }

    const [board] = await db
      .select({
        boardId: boards.id,
        projectId: boards.projectId,
        teamId: projects.teamId,
      })
      .from(boards)
      .innerJoin(projects, eq(boards.projectId, projects.id))
      .where(eq(boards.id, boardId));
    if (!board) return c.json({ error: "Board not found" }, 404);

    const member = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.userId, userId)));

    if (member.length === 0) {
      return c.json({ error: "You are not a member of this team" }, 403);
    }

    const [newTask] = await db
      .insert(tasks)
      .values({
        boardId,
        title,
        description,
        status: status || "todo",
        priority: priority || "medium",
        dueDate: dueDate ? new Date(dueDate) : null,
        assigneeId: assigneeId || null,
        createdBy: userId,
      })
      .returning();

    return c.json(newTask, 201);
  } catch (error) {
    console.log("error in createTask: ", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
};

export const deleteTask = async (c: Context) => {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "Unauthorized" }, 401);

    const userId = session.user.id;
    const taskId = c.req.param("taskId");

    if (!taskId) return c.json({ error: "Task ID is required" }, 400);

    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    if (!task) return c.json({ error: "Task not found" }, 404);

    const [board] = await db
      .select()
      .from(boards)
      .where(eq(boards.id, task.boardId));
    if (!board) return c.json({ error: "Board not found" }, 404);

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, board.projectId));
    if (!project) return c.json({ error: "Project not found" }, 404);

    const [member] = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, project.teamId),
          eq(teamMembers.userId, userId)
        )
      );

    if (!member) {
      return c.json({ error: "You are not a member of this team" }, 403);
    }

    if (
      member.role !== "admin" &&
      member.role !== "owner" &&
      task.createdBy !== userId
    ) {
      return c.json(
        {
          error: "Only team admins, owners, and task creators can delete tasks",
        },
        403
      );
    }

    await db.delete(tasks).where(eq(tasks.id, taskId));
    return c.json({ message: "Task deleted successfully", task });
  } catch (error) {
    console.log("error in deleteTask: ", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
};
