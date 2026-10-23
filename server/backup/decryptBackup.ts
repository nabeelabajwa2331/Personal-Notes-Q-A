import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";
import { getBackupPassword } from "../auth/config.js";
import { decryptEncryptedBackup } from "./backupService.js";

const inputPath = process.argv[2];

if (!inputPath) {
  console.error(
    "Usage: npm run backup:decrypt -- <personal-notes-backup.json.enc>"
  );
  process.exit(1);
}

const backupPassword = getBackupPassword();

if (!backupPassword) {
  console.error(
    "BACKUP_PASSWORD is not configured. Set it in server/.env or your environment."
  );
  process.exit(1);
}

const rawBackup = await readFile(inputPath, "utf8");
const payload = decryptEncryptedBackup(JSON.parse(rawBackup), backupPassword);
const outputPath = inputPath.endsWith(".enc")
  ? inputPath.slice(0, -4)
  : `${inputPath}.decrypted.json`;

await writeFile(outputPath, JSON.stringify(payload, null, 2), "utf8");
console.log(`Decrypted backup written to ${outputPath}`);
