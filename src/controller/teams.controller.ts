import { Context } from "hono";
import { auth } from "../utils/auth.js";
import { db } from "../db/drizzle.js";
import { teamMembers, teams } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const getTeams = async (c: Context) => {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "Unauthorized" }, 401);

    const userId = session.user.id;

    const userTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        description: teams.description,
        ownerId: teams.ownerId,
        createdAt: teams.createdAt,
        updatedAt: teams.updatedAt,
      })
      .from(teams)
      .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(eq(teamMembers.userId, userId));

    return c.json(userTeams);
  } catch (error) {
    console.log("error in getTeams: ", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
};

export const createTeams = async (c: Context) => {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "Unauthorized" }, 401);

    const userId = session.user.id;
    const { name, description } = await c.req.json();

    if (!name) return c.json({ error: "Team Name is required" }, 400);

    const [team] = await db
      .insert(teams)
      .values({
        name,
        description,
        ownerId: userId,
      })
      .returning();

    await db.insert(teamMembers).values({
      teamId: team.id,
      userId,
      role: "owner",
    });

    return c.json(team, 201);
  } catch (error) {
    console.log("Error in createTeams: ", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
};

export const deleteTeam = async (c: Context) => {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "Unauthorized" }, 401);

    const userId = session.user.id;
    const teamId = c.req.param("teamId");

    if (!teamId) return c.json({ error: "Team ID is required" }, 400);

    const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
    if (!team) return c.json({ error: "Team not found" }, 404);

    if (team.ownerId !== userId) {
      return c.json({ error: "Only the team owner can delete this team" }, 403);
    }

    await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
    await db.delete(teams).where(eq(teams.id, teamId));

    return c.json({ message: "Team deleted successfully", team });
  } catch (error) {
    console.log("error in deleteTeam: ", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
};
