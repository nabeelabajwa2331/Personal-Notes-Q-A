import "dotenv/config";
import process from "node:process";
import app from "./app.js";
import {
  closeNoteStore,
  initNoteStore,
  usesPersistentStorage,
} from "./notes/noteStore.js";

const PORT = Number(process.env.PORT ?? 5000);

try {
  await initNoteStore();
} catch (error) {
  console.error("Could not initialize note storage:", error);
  process.exit(1);
}

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(
    `Notes storage: ${
      usesPersistentStorage
        ? "PostgreSQL"
        : "in-memory (data will be lost on restart)"
    }`
  );
});

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received. Shutting down...`);

  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });

  await closeNoteStore();
}

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});
