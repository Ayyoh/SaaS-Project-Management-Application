import { Hono } from "hono";
import {
  createTask,
  deleteTask,
  getTodoFromBoards,
} from "../controller/todo.controller.js";

export const taskRoutes = new Hono();

taskRoutes.get("/:boardId", getTodoFromBoards);
taskRoutes.post("/create-task", createTask);
taskRoutes.delete("/:taskId/delete-task", deleteTask);
