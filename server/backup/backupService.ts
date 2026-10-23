import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";
import type { Note } from "../notes/noteStore.js";

const BACKUP_FORMAT = "personal-notes-backup";
const PAYLOAD_FORMAT = "personal-notes-notes";
const BACKUP_VERSION = 1;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export interface EncryptedBackup {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  createdAt: string;
  kdf: {
    name: "scrypt";
    salt: string;
    N: number;
    r: number;
    p: number;
  };
  cipher: {
    name: "aes-256-gcm";
    iv: string;
    tag: string;
  };
  data: string;
}

export interface BackupPayload {
  format: typeof PAYLOAD_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  notes: Note[];
}

function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEY_LENGTH);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNote(value: unknown): value is Note {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.content === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isBackupPayload(value: unknown): value is BackupPayload {
  return (
    isRecord(value) &&
    value.format === PAYLOAD_FORMAT &&
    value.version === BACKUP_VERSION &&
    typeof value.exportedAt === "string" &&
    Array.isArray(value.notes) &&
    value.notes.every(isNote)
  );
}

export function createEncryptedBackup(
  notes: Note[],
  password: string,
  now = new Date()
): EncryptedBackup {
  const payload: BackupPayload = {
    format: PAYLOAD_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    notes,
  };

  const salt = randomBytes(16);
  const iv = randomBytes(IV_LENGTH);
  const key = deriveKey(password, salt);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: payload.exportedAt,
    kdf: {
      name: "scrypt",
      salt: salt.toString("base64"),
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
    },
    cipher: {
      name: "aes-256-gcm",
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
    },
    data: ciphertext.toString("base64"),
  };
}

export function decryptEncryptedBackup(
  backup: unknown,
  password: string
): BackupPayload {
  if (
    !isRecord(backup) ||
    backup.format !== BACKUP_FORMAT ||
    backup.version !== BACKUP_VERSION ||
    !isRecord(backup.kdf) ||
    backup.kdf.name !== "scrypt" ||
    backup.kdf.N !== SCRYPT_N ||
    backup.kdf.r !== SCRYPT_R ||
    backup.kdf.p !== SCRYPT_P ||
    typeof backup.kdf.salt !== "string" ||
    !isRecord(backup.cipher) ||
    backup.cipher.name !== "aes-256-gcm" ||
    typeof backup.cipher.iv !== "string" ||
    typeof backup.cipher.tag !== "string" ||
    typeof backup.data !== "string"
  ) {
    throw new Error("This is not a valid encrypted notes backup.");
  }

  const salt = Buffer.from(backup.kdf.salt, "base64");
  const iv = Buffer.from(backup.cipher.iv, "base64");
  const tag = Buffer.from(backup.cipher.tag, "base64");
  const ciphertext = Buffer.from(backup.data, "base64");

  if (
    salt.length !== 16 ||
    iv.length !== IV_LENGTH ||
    tag.length !== TAG_LENGTH
  ) {
    throw new Error("This encrypted notes backup is malformed.");
  }

  let decrypted: Buffer;
  try {
    const key = deriveKey(password, salt);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
  } catch {
    throw new Error(
      "Could not decrypt the backup. Check BACKUP_PASSWORD and try again."
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(decrypted.toString("utf8"));
  } catch {
    throw new Error("The decrypted backup is not valid JSON.");
  }

  if (!isBackupPayload(payload)) {
    throw new Error("The decrypted backup has an unexpected shape.");
  }

  return payload;
}
