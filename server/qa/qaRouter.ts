import { Router } from "express";
import { askNotes } from "./askService.js";

const qaRouter = Router();

qaRouter.post("/", async (req, res) => {
  const body: unknown = req.body;

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    res.status(400).json({
      error: "Request body must be a JSON object.",
    });
    return;
  }

  const { question } = body as Record<string, unknown>;

  if (typeof question !== "string" || question.trim().length === 0) {
    res.status(400).json({
      error: "Question is required and must be a non-empty string.",
    });
    return;
  }

  if (question.length > 1000) {
    res.status(400).json({
      error: "Question must be 1000 characters or fewer.",
    });
    return;
  }

  res.json(await askNotes(question.trim()));
});

export default qaRouter;
