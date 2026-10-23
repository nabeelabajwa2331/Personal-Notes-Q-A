import { Router } from "express";
import { getBackupPassword } from "../auth/config.js";
import { noteStore } from "../notes/noteStore.js";
import { createEncryptedBackup } from "./backupService.js";

const backupRouter = Router();

backupRouter.get("/export", async (_req, res) => {
  const backupPassword = getBackupPassword();

  if (!backupPassword) {
    res.status(503).json({
      error:
        "Encrypted backups are not configured. Set BACKUP_PASSWORD on the server.",
    });
    return;
  }

  const notes = await noteStore.list();
  const backup = createEncryptedBackup(notes, backupPassword);
  const filename = `personal-notes-backup-${new Date()
    .toISOString()
    .slice(0, 10)}.json.enc`;

  res.setHeader("Cache-Control", "no-store");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`
  );
  res.type("application/json");
  res.send(JSON.stringify(backup, null, 2));
});

export default backupRouter;
