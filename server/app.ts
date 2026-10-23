import { existsSync } from "node:fs";
import path from "node:path";
import cors from "cors";
import express from "express";
import type { ErrorRequestHandler } from "express";
import notesRouter from "./notes/notesRouter.js";
import {
  checkNoteStore,
  usesPersistentStorage,
} from "./notes/noteStore.js";
import qaRouter from "./qa/qaRouter.js";

const app = express();
const serveClient = process.env.SERVE_CLIENT === "true";
const clientDistPath = path.resolve(
  process.env.CLIENT_DIST_PATH ?? path.join(process.cwd(), "client", "dist")
);
const clientIndexPath = path.join(clientDistPath, "index.html");
const canServeClient = serveClient && existsSync(clientIndexPath);

app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});
app.use(cors());
app.use(express.json({ limit: "5mb" }));

if (!serveClient) {
  app.get("/", (_req, res) => {
    res.send("Server is working!");
  });
}

app.get("/api/health", async (_req, res) => {
  const storageOk = await checkNoteStore();

  res.status(storageOk ? 200 : 503).json({
    status: storageOk ? "ok" : "error",
    storage: usesPersistentStorage ? "postgres" : "memory",
  });
});

app.use("/api/notes", notesRouter);
app.use("/api/ask", qaRouter);

if (canServeClient) {
  console.log(`Serving React client from ${clientDistPath}`);

  app.use(
    express.static(clientDistPath, {
      index: false,
      maxAge: "1h",
    })
  );

  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }

    if (req.path === "/api" || req.path.startsWith("/api/")) {
      next();
      return;
    }

    if (!req.accepts("html")) {
      next();
      return;
    }

    res.sendFile(clientIndexPath);
  });
} else if (serveClient) {
  console.warn(
    `SERVE_CLIENT is enabled, but no client build was found at ${clientDistPath}.`
  );
}

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
