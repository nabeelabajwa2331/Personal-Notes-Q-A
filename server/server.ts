import "dotenv/config";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";
import app from "./app.js";
import {
  closeNoteStore,
  initNoteStore,
  usesPersistentStorage,
} from "./notes/noteStore.js";

const PORT = Number(process.env.PORT ?? 5000);
const STORAGE_ATTEMPTS = 5;

if (
  process.env.NODE_ENV === "production" &&
  !process.env.DATABASE_URL?.trim()
) {
  console.error(
    "DATABASE_URL is required when NODE_ENV=production. Connect a PostgreSQL database so notes are not lost."
  );
  process.exit(1);
}

async function initializeStorage(): Promise<void> {
  for (let attempt = 1; attempt <= STORAGE_ATTEMPTS; attempt += 1) {
    try {
      await initNoteStore();
      return;
    } catch (error) {
      if (attempt === STORAGE_ATTEMPTS) {
        throw error;
      }

      console.warn(
        `Note storage is not ready (attempt ${attempt}/${STORAGE_ATTEMPTS}). Retrying in 3 seconds...`
      );
      await sleep(3000);
    }
  }
}

try {
  await initializeStorage();
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
