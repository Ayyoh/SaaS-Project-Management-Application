import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  pgEnum,
  primaryKey,
  uniqueIndex,
  uuid,
  integer,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// 🧩 ENUMS
export const userRoleEnum = pgEnum("user_role", ["owner", "admin", "editor", "viewer"]);
export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "done",
]);
export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
]);

// 👥 TEAMS
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 👥 TEAM MEMBERS (many-to-many user <-> teams)
export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: userRoleEnum("role").default("viewer").notNull(),
    joinedAt: timestamp("joined_at").defaultNow(),
  },
  (table) => ({
    uniqueMembership: uniqueIndex("unique_team_user").on(
      table.teamId,
      table.userId
    ),
  })
);

// 📁 PROJECTS
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id, { onDelete: "set null" }),
  archived: boolean("archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 🪧 BOARDS (Kanban)
export const boards = pgTable("boards", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ✅ TASKS
export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  boardId: uuid("board_id")
    .notNull()
    .references(() => boards.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").default("todo"),
  priority: taskPriorityEnum("priority").default("medium"),
  assigneeId: text("assignee_id").references(() => user.id, {
    onDelete: "set null",
  }),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id, { onDelete: "set null" }),
  dueDate: timestamp("due_date"),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 💬 COMMENTS
export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// 📜 ACTIVITIES (for dashboards / audit logs)
export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(), // e.g., task, project, comment
  entityId: text("entity_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ✉️ INVITATIONS (optional, for team invites)
export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: userRoleEnum("role").default("viewer"),
  token: text("token").notNull(),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 🔗 RELATIONS
export const userRelations = relations(user, ({ many }) => ({
  teams: many(teamMembers),
  tasks: many(tasks),
  comments: many(comments),
  activities: many(activities),
}));

export const teamsRelations = relations(teams, ({ many, one }) => ({
  members: many(teamMembers),
  projects: many(projects),
  owner: one(user, {
    fields: [teams.ownerId],
    references: [user.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(user, {
    fields: [teamMembers.userId],
    references: [user.id],
  }),
}));

export const projectsRelations = relations(projects, ({ many, one }) => ({
  boards: many(boards),
  team: one(teams, {
    fields: [projects.teamId],
    references: [teams.id],
  }),
  creator: one(user, {
    fields: [projects.createdBy],
    references: [user.id],
  }),
}));

export const boardsRelations = relations(boards, ({ many, one }) => ({
  project: one(projects, {
    fields: [boards.projectId],
    references: [projects.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ many, one }) => ({
  board: one(boards, {
    fields: [tasks.boardId],
    references: [boards.id],
  }),
  assignee: one(user, {
    fields: [tasks.assigneeId],
    references: [user.id],
  }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  task: one(tasks, {
    fields: [comments.taskId],
    references: [tasks.id],
  }),
  user: one(user, {
    fields: [comments.userId],
    references: [user.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(user, {
    fields: [activities.userId],
    references: [user.id],
  }),
  team: one(teams, {
    fields: [activities.teamId],
    references: [teams.id],
  }),
}));
