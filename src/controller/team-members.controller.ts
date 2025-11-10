import { Context } from "hono";
import { auth } from "../utils/auth.js";
import { db } from "../db/drizzle.js";
import { teamMembers, user } from "../db/schema.js";
import { and, eq } from "drizzle-orm";

export const getTeamMembers = async (c: Context) => {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "Unauthorized" }, 401);

    const userId = session.user.id;
    const teamId = c.req.param("teamId");
    if (!teamId) return c.json({ error: "Team ID is required" }, 400);

    const [isMember] = await db
      .select()
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))
      );

    if (!isMember) {
      return c.json({ error: "You are not a member of this team" }, 403);
    }

    const members = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
      })
      .from(teamMembers)
      .innerJoin(user, eq(user.id, teamMembers.userId))
      .where(eq(teamMembers.teamId, teamId));

    return c.json(members);
  } catch (error) {
    console.log("error in getTeamMembers: ", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
};

export const addTeamMember = async (c: Context) => {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "Unauthorized" }, 401);

    const userId = session.user.id;

    const { teamId, userEmail, role } = await c.req.json();
    if (!teamId || !userEmail || !role) {
      return c.json({ error: "Please fill in the field" }, 400);
    }

    const [currentMember] = await db
      .select()
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))
      );

    console.log(currentMember);

    if (
      !currentMember ||
      (currentMember.role !== "owner" && currentMember.role !== "admin")
    ) {
      return c.json(
        { error: "Only team admins or owners can add members" },
        403
      );
    }

    const [targetUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, userEmail));
    if (!targetUser) {
      return c.json({ error: "User not found" }, 404);
    }

    const existing = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, targetUser.id)
        )
      );

    if (existing.length > 0) {
      return c.json({ error: "User is already a member of this team" }, 400);
    }

    await db
      .insert(teamMembers)
      .values({ teamId, userId: targetUser.id, role: role || "viewer" });

    const [newMember] = await db
      .select()
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))
      );

    return c.json(newMember, 201);
  } catch (error) {
    console.log("error in addTeamMember: ", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
};

export const removeTeamMember = async (c: Context) => {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "Unauthorized" }, 401);

    const userId = session.user.id;
    const { teamId, memberId } = await c.req.json();

    if (!teamId || !memberId) {
      return c.json({ error: "Team ID and Member ID are required" }, 400);
    }

    const [currentMember] = await db
      .select()
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))
      );

    if (!currentMember)
      return c.json({ error: "You are not part of this team" }, 403);
    if (currentMember.role !== "admin" && currentMember.role !== "owner") {
      return c.json(
        { error: "Only team admins and owners can remove members" },
        403
      );
    }

    const [targetMember] = await db
      .select()
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, memberId))
      );

    if (!targetMember) return c.json({ error: "Member not found" }, 404);
    if (targetMember.role === "owner") {
      return c.json({ error: "You cannot remove the team owner" }, 403);
    }

    await db
      .delete(teamMembers)
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, memberId))
      );

    return c.json(
      { message: "Member removed successfully", targetMember },
      200
    );
  } catch (error) {
    console.log("error in removeTeamMember: ", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
};
