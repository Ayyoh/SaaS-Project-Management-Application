import { Hono } from "hono";
import {
  createBoard,
  deleteBoard,
  getBoardsFromProjects,
} from "../controller/boards.controller.js";

export const boardRoutes = new Hono();

boardRoutes.get("/:projectId", getBoardsFromProjects);
boardRoutes.post("/create-board", createBoard);
boardRoutes.delete("/:boardId/delete-board", deleteBoard);
