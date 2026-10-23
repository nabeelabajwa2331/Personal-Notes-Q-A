import { randomUUID } from "node:crypto";
import { Pool } from "pg";

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteInput {
  title: string;
  content: string;
}

interface NoteRow {
  id: string;
  title: string;
  content: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface DatabaseConfig {
  connectionString: string;
  host: string;
  port: string;
  sslEnabled: boolean;
  ssl: { rejectUnauthorized: boolean } | undefined;
}

const databaseUrl = process.env.DATABASE_URL?.trim();
const memoryNotes = new Map<string, Note>();

let pool: Pool | null = null;
let databaseConfig: DatabaseConfig | null | undefined;

export const usesPersistentStorage = Boolean(databaseUrl);

function getDatabaseConfig(): DatabaseConfig | null {
  if (databaseConfig !== undefined) {
    return databaseConfig;
  }

  if (!databaseUrl) {
    databaseConfig = null;
    return databaseConfig;
  }

  const normalizedUrl = databaseUrl.replace(/^['"]|['"]$/g, "");

  let parsed: URL;
  try {
    parsed = new URL(normalizedUrl);
  } catch {
    throw new Error(
      "DATABASE_URL is not a valid PostgreSQL connection URL. Copy the Internal Database URL from Render again."
    );
  }

  if (
    (parsed.protocol !== "postgres:" &&
      parsed.protocol !== "postgresql:") ||
    !parsed.hostname
  ) {
    throw new Error(
      "DATABASE_URL must start with postgresql:// and include the database host. Copy the Internal Database URL from Render again."
    );
  }

  const sslMode = parsed.searchParams.get("sslmode")?.toLowerCase();
  const sslOverride = process.env.DATABASE_SSL?.trim().toLowerCase();
  const sslEnabled =
    sslOverride === "true" ||
    (sslOverride !== "false" &&
      (sslMode === "require" ||
        sslMode === "prefer" ||
        sslMode === "verify-ca" ||
        sslMode === "verify-full"));

  // Render's internal database certificates are self-signed. Encrypt the
  // connection without requiring a public chain unless verification was
  // explicitly requested.
  const verifyCertificate =
    sslMode === "verify-ca" || sslMode === "verify-full";
  parsed.searchParams.delete("sslmode");

  const config: DatabaseConfig = {
    connectionString: parsed.toString(),
    host: parsed.hostname,
    port: parsed.port || "5432",
    sslEnabled,
    ssl: sslEnabled
      ? { rejectUnauthorized: verifyCertificate }
      : undefined,
  };

  databaseConfig = config;
  return config;
}

function getPool(): Pool {
  const config = getDatabaseConfig();

  if (!config) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: config.connectionString,
      ssl: config.ssl,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });

    pool.on("error", (error) => {
      console.error("Unexpected PostgreSQL pool error:", error);
    });
  }

  return pool;
}

function toIsoString(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function copyNote(note: Note): Note {
  return { ...note };
}

/**
 * Creates the notes table when a PostgreSQL database is configured. Local
 * development and the test suite fall back to in-memory storage.
 */
export async function initNoteStore(): Promise<void> {
  const config = getDatabaseConfig();

  if (!config) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "DATABASE_URL is required when NODE_ENV=production. Connect a PostgreSQL database so notes are not lost."
      );
    }

    return;
  }

  console.log(
    `Connecting to PostgreSQL at ${config.host}:${config.port} (SSL ${
      config.sslEnabled ? "enabled" : "disabled"
    })`
  );

  const db = getPool();

  await db.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id UUID PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS notes_updated_at_idx
    ON notes (updated_at DESC)
  `);
}

export async function closeNoteStore(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function checkNoteStore(): Promise<boolean> {
  if (!databaseUrl) {
    return true;
  }

  try {
    await getPool().query("SELECT 1");
    return true;
  } catch (error) {
    console.error("PostgreSQL health check failed:", error);
    return false;
  }
}

export const noteStore = {
  async list(): Promise<Note[]> {
    if (!databaseUrl) {
      return Array.from(memoryNotes.values(), copyNote);
    }

    const result = await getPool().query<NoteRow>(`
      SELECT id, title, content, created_at, updated_at
      FROM notes
      ORDER BY updated_at DESC, created_at DESC
    `);

    return result.rows.map(rowToNote);
  },

  async findById(id: string): Promise<Note | undefined> {
    if (!databaseUrl) {
      const note = memoryNotes.get(id);
      return note ? copyNote(note) : undefined;
    }

    const result = await getPool().query<NoteRow>(
      `
        SELECT id, title, content, created_at, updated_at
        FROM notes
        WHERE id = $1
      `,
      [id]
    );

    const row = result.rows[0];
    return row ? rowToNote(row) : undefined;
  },

  async create(input: NoteInput): Promise<Note> {
    const now = new Date().toISOString();
    const note: Note = {
      id: randomUUID(),
      title: input.title,
      content: input.content,
      createdAt: now,
      updatedAt: now,
    };

    if (!databaseUrl) {
      memoryNotes.set(note.id, note);
      return copyNote(note);
    }

    await getPool().query(
      `
        INSERT INTO notes (id, title, content, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [note.id, note.title, note.content, note.createdAt, note.updatedAt]
    );

    return copyNote(note);
  },

  async update(id: string, input: NoteInput): Promise<Note | undefined> {
    if (!databaseUrl) {
      const existing = memoryNotes.get(id);

      if (!existing) {
        return undefined;
      }

      const updated: Note = {
        ...existing,
        title: input.title,
        content: input.content,
        updatedAt: new Date().toISOString(),
      };

      memoryNotes.set(id, updated);

      return copyNote(updated);
    }

    const updatedAt = new Date().toISOString();
    const result = await getPool().query<NoteRow>(
      `
        UPDATE notes
        SET title = $2, content = $3, updated_at = $4
        WHERE id = $1
        RETURNING id, title, content, created_at, updated_at
      `,
      [id, input.title, input.content, updatedAt]
    );

    const row = result.rows[0];
    return row ? rowToNote(row) : undefined;
  },

  async remove(id: string): Promise<boolean> {
    if (!databaseUrl) {
      return memoryNotes.delete(id);
    }

    const result = await getPool().query(
      `
        DELETE FROM notes
        WHERE id = $1
        RETURNING id
      `,
      [id]
    );

    return (result.rowCount ?? 0) > 0;
  },

  /** Clears all notes. Intended for tests and local resets. */
  async clear(): Promise<void> {
    if (!databaseUrl) {
      memoryNotes.clear();
      return;
    }

    await getPool().query("DELETE FROM notes");
  },
};
