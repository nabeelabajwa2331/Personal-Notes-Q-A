import { basename, extname } from "node:path";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export const MAX_IMPORT_FILE_SIZE = 15 * 1024 * 1024;
export const MAX_IMPORT_TEXT_LENGTH = 1_000_000;

export type ImportedFormat = "pdf" | "docx";

export interface ImportedDocument {
  title: string;
  content: string;
  format: ImportedFormat;
}

export class NoteImportError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "NoteImportError";
    this.statusCode = statusCode;
  }
}

function deriveTitle(originalName: string): string {
  const safeName = basename(originalName);
  const extension = extname(safeName);
  const withoutExtension = extension
    ? safeName.slice(0, -extension.length)
    : safeName;

  const title = withoutExtension.replace(/_/g, " ").replace(/\s+/g, " ").trim();

  return title.slice(0, 200) || "Imported note";
}

function cleanExtractedText(
  text: string,
  format: ImportedFormat
): string {
  const cleaned = text
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/^--\s*\d+\s+of\s+\d+\s*--\s*$/gm, "")
    .replace(/[ \t]+\n/g, "\n");

  const withoutPdfLineBreaks =
    format === "pdf"
      ? cleaned.replace(/([^\n])\n([^\n])/g, "$1 $2")
      : cleaned;

  return withoutPdfLineBreaks
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function validateSignature(
  buffer: Buffer,
  format: ImportedFormat
): void {
  if (format === "pdf") {
    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      throw new NoteImportError(
        "The selected file is not a valid PDF document."
      );
    }

    return;
  }

  if (buffer.subarray(0, 2).toString("ascii") !== "PK") {
    throw new NoteImportError(
      "The selected file is not a valid DOCX document."
    );
  }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function parseImportedDocument(
  buffer: Buffer,
  originalName: string
): Promise<ImportedDocument> {
  const extension = extname(basename(originalName)).toLowerCase();

  if (extension === ".doc") {
    throw new NoteImportError(
      "Legacy .doc files are not supported. Save the document as .docx and try again."
    );
  }

  if (extension !== ".pdf" && extension !== ".docx") {
    throw new NoteImportError(
      "Unsupported file type. Choose a PDF (.pdf) or Word document (.docx)."
    );
  }

  const format: ImportedFormat = extension === ".pdf" ? "pdf" : "docx";
  validateSignature(buffer, format);

  let extractedText: string;

  try {
    extractedText =
      format === "pdf"
        ? await extractPdfText(buffer)
        : await extractDocxText(buffer);
  } catch {
    throw new NoteImportError(
      format === "pdf"
        ? "Could not read this PDF. It may be corrupt or password-protected."
        : "Could not read this DOCX file. It may be corrupt or password-protected."
    );
  }

  const content = cleanExtractedText(extractedText, format);

  if (!content) {
    throw new NoteImportError(
      "No readable text was found in this document. Scanned PDFs need OCR before they can be imported."
    );
  }

  if (content.length > MAX_IMPORT_TEXT_LENGTH) {
    throw new NoteImportError(
      "This document contains too much text to import. The limit is 1,000,000 characters.",
      413
    );
  }

  return {
    title: deriveTitle(originalName),
    content,
    format,
  };
}
