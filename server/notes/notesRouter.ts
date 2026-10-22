import { Router } from "express";
import multer from "multer";
import {
  MAX_IMPORT_FILE_SIZE,
  NoteImportError,
  parseImportedDocument,
} from "./importService.js";
import { noteStore } from "./noteStore.js";
import type { NoteInput } from "./noteStore.js";

type ValidationResult =
  | { ok: true; value: NoteInput }
  | { ok: false; error: string };

function validateNoteInput(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return {
      ok: false,
      error: "Request body must be a JSON object.",
    };
  }

  const { title, content } = body as Record<string, unknown>;

  if (typeof title !== "string" || title.trim().length === 0) {
    return {
      ok: false,
      error: "Title is required and must be a non-empty string.",
    };
  }

  if (typeof content !== "string") {
    return {
      ok: false,
      error: "Content is required and must be a string.",
    };
  }

  return {
    ok: true,
    value: {
      title: title.trim(),
      content,
    },
  };
}

const notesRouter = Router();

const uploadSingleFile = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMPORT_FILE_SIZE,
    files: 1,
  },
}).single("file");

function isUploadError(error: unknown): error is Error & { code?: string } {
  return error instanceof Error && error.name === "MulterError";
}

notesRouter.get("/", async (_req, res) => {
  res.json(await noteStore.list());
});

notesRouter.post("/", async (req, res) => {
  const result = validateNoteInput(req.body);

  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }

  const note = await noteStore.create(result.value);

  res.status(201).json(note);
});

notesRouter.post("/import", (req, res, next) => {
  uploadSingleFile(req, res, (uploadError: unknown) => {
    if (uploadError) {
      if (isUploadError(uploadError)) {
        if (uploadError.code === "LIMIT_FILE_SIZE") {
          res.status(413).json({
            error: "The file is too large. The maximum upload size is 15 MB.",
          });
          return;
        }

        res.status(400).json({
          error: "Upload one PDF or DOCX file in the 'file' field.",
        });
        return;
      }

      next(uploadError);
      return;
    }

    if (!req.file) {
      res.status(400).json({
        error: "Choose a PDF or DOCX file to import.",
      });
      return;
    }

    void parseImportedDocument(
      req.file.buffer,
      req.file.originalname
    )
      .then(async (imported) => {
        const note = await noteStore.create({
          title: imported.title,
          content: imported.content,
        });

        res.status(201).json(note);
      })
      .catch((importError: unknown) => {
        if (importError instanceof NoteImportError) {
          res.status(importError.statusCode).json({
            error: importError.message,
          });
          return;
        }

        next(importError);
      });
  });
});

notesRouter.get("/:id", async (req, res) => {
  const id = req.params.id;

  if (!id) {
    res.status(404).json({ error: "Note not found." });
    return;
  }

  const note = await noteStore.findById(id);

  if (!note) {
    res.status(404).json({ error: "Note not found." });
    return;
  }

  res.json(note);
});

notesRouter.put("/:id", async (req, res) => {
  const id = req.params.id;

  if (!id) {
    res.status(404).json({ error: "Note not found." });
    return;
  }

  const result = validateNoteInput(req.body);

  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }

  const note = await noteStore.update(id, result.value);

  if (!note) {
    res.status(404).json({ error: "Note not found." });
    return;
  }

  res.json(note);
});

notesRouter.delete("/:id", async (req, res) => {
  const id = req.params.id;

  if (!id) {
    res.status(404).json({ error: "Note not found." });
    return;
  }

  const removed = await noteStore.remove(id);

  if (!removed) {
    res.status(404).json({ error: "Note not found." });
    return;
  }

  res.status(204).send();
});

export default notesRouter;
