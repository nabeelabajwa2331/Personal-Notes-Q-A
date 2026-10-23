import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, describe, it } from "node:test";
import JSZip from "jszip";
import app from "../app.js";
import { noteStore } from "./noteStore.js";
import type { Note } from "./noteStore.js";
import type { AskResult } from "../qa/askService.js";
import {
  configureAuthForTests,
  installCookieFetch,
  loginTestUser,
} from "../test/authTestUtils.js";

configureAuthForTests();

let server: Server;
let baseUrl = "";
let restoreFetch: (() => void) | undefined;

before(async () => {
  server = app.listen(0);

  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
  restoreFetch = installCookieFetch(await loginTestUser(baseUrl));
});

after(async () => {
  restoreFetch?.();

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });

    server.closeAllConnections();
  });
});

beforeEach(async () => {
  await noteStore.clear();
});

function createPdf(text: string): Buffer {
  const escaped = text.replace(/[\\()]/g, "\\$&");
  const content = text
    ? `BT /F1 18 Tf 72 720 Td (${escaped}) Tj ET`
    : "";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf);
}

async function createDocx(text: string): Promise<Buffer> {
  const zip = new JSZip();
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );

  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>${escaped}</w:t></w:r></w:p>
  </w:body>
</w:document>`
  );

  return zip.generateAsync({ type: "nodebuffer" });
}

async function importFile(
  buffer: Buffer,
  filename: string,
  type: string
): Promise<Response> {
  const bytes = new Uint8Array(buffer);
  const arrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
  const formData = new FormData();
  formData.append("file", new Blob([arrayBuffer], { type }), filename);

  return fetch(`${baseUrl}/api/notes/import`, {
    method: "POST",
    body: formData,
  });
}

async function ask(question: string): Promise<AskResult> {
  const response = await fetch(`${baseUrl}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  assert.equal(response.status, 200);
  return (await response.json()) as AskResult;
}

describe("Note document import", () => {
  it("imports a PDF and answers questions about its content", async () => {
    const pdf = createPdf(
      "The launch code is ORBIT-42. The project owner is Ada Lovelace."
    );

    const response = await importFile(
      pdf,
      "Launch Plan.pdf",
      "application/pdf"
    );
    assert.equal(response.status, 201);

    const note = (await response.json()) as Note;
    assert.equal(note.title, "Launch Plan");
    assert.match(note.content, /ORBIT-42/);
    assert.doesNotMatch(note.content, /-- 1 of 1 --/);

    const result = await ask("What is the launch code?");
    assert.match(result.answer, /ORBIT-42/);
    assert.equal(result.sources[0]?.title, "Launch Plan");
  });

  it("imports a DOCX and answers questions about its content", async () => {
    const docx = await createDocx(
      "The quarterly budget is 12500 dollars. The vendor is Contoso."
    );

    const response = await importFile(
      docx,
      "Budget_Report.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    assert.equal(response.status, 201);

    const note = (await response.json()) as Note;
    assert.equal(note.title, "Budget Report");
    assert.match(note.content, /12500 dollars/);

    const result = await ask("What is the quarterly budget?");
    assert.match(result.answer, /12500/);
    assert.equal(result.sources[0]?.title, "Budget Report");
  });

  it("rejects unsupported, missing, and invalid files", async () => {
    const cases: Array<{ response: Response; error: RegExp }> = [];

    const missingResponse = await fetch(`${baseUrl}/api/notes/import`, {
      method: "POST",
      body: new FormData(),
    });
    cases.push({ response: missingResponse, error: /choose a pdf or docx/i });

    const textResponse = await importFile(
      Buffer.from("plain text"),
      "notes.txt",
      "text/plain"
    );
    cases.push({ response: textResponse, error: /unsupported file type/i });

    const legacyResponse = await importFile(
      Buffer.from("legacy"),
      "notes.doc",
      "application/msword"
    );
    cases.push({ response: legacyResponse, error: /legacy \.doc/i });

    const fakePdfResponse = await importFile(
      Buffer.from("not a pdf"),
      "fake.pdf",
      "application/pdf"
    );
    cases.push({ response: fakePdfResponse, error: /not a valid pdf/i });

    const corruptPdfResponse = await importFile(
      Buffer.from("%PDF-1.4\nthis is not a real pdf"),
      "corrupt.pdf",
      "application/pdf"
    );
    cases.push({
      response: corruptPdfResponse,
      error: /could not read this pdf/i,
    });

    const blankPdfResponse = await importFile(
      createPdf(""),
      "blank.pdf",
      "application/pdf"
    );
    cases.push({
      response: blankPdfResponse,
      error: /no readable text/i,
    });

    for (const { response, error } of cases) {
      assert.equal(response.status, 400);
      const payload = (await response.json()) as { error: string };
      assert.match(payload.error, error);
    }

    assert.equal((await noteStore.list()).length, 0);
  });
});
