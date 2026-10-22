import express from "express";
import type { ErrorRequestHandler } from "express";
import cors from "cors";
import notesRouter from "./notes/notesRouter.js";
import { usesPersistentStorage } from "./notes/noteStore.js";
import qaRouter from "./qa/qaRouter.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/", (req, res) => {
  res.send("Server is working!");
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    storage: usesPersistentStorage ? "postgres" : "memory",
  });
});

app.use("/api/notes", notesRouter);
app.use("/api/ask", qaRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found." });
});

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (res.headersSent) {
    _next(err);
    return;
  }

  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "Invalid JSON body." });
    return;
  }

  if (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    err.status === 413
  ) {
    res.status(413).json({ error: "Request body is too large." });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error." });
};

app.use(errorHandler);

export default app;
