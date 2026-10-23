import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, describe, it } from "node:test";
import app from "../app.js";
import { noteStore } from "./noteStore.js";
import type { Note } from "./noteStore.js";
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

async function send(
  path: string,
  method: string,
  body?: unknown
): Promise<Response> {
  const init: RequestInit = { method };

  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }

  return fetch(`${baseUrl}${path}`, init);
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

describe("Personal Notes API", () => {
  it("preserves the root and health endpoints", async () => {
    const rootResponse = await fetch(`${baseUrl}/`);
    assert.equal(rootResponse.status, 200);
    assert.equal(await rootResponse.text(), "Server is working!");

    const healthResponse = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthResponse.status, 200);

    const health = await readJson<{ status: string; storage: string }>(
      healthResponse
    );
    assert.equal(health.status, "ok");
    assert.ok(["memory", "postgres"].includes(health.storage));
  });

  it("supports the full notes lifecycle", async () => {
    const createResponse = await send("/api/notes", "POST", {
      title: "  First note  ",
      content: "",
    });
    assert.equal(createResponse.status, 201);

    const created = await readJson<Note>(createResponse);
    assert.equal(created.title, "First note");
    assert.equal(created.content, "");
    assert.ok(created.id.length > 0);
    assert.equal(created.createdAt, created.updatedAt);

    const listResponse = await fetch(`${baseUrl}/api/notes`);
    assert.equal(listResponse.status, 200);
    assert.deepEqual(await readJson<Note[]>(listResponse), [created]);

    const getResponse = await fetch(`${baseUrl}/api/notes/${created.id}`);
    assert.equal(getResponse.status, 200);
    assert.deepEqual(await readJson<Note>(getResponse), created);

    const updateResponse = await send(
      `/api/notes/${created.id}`,
      "PUT",
      {
        title: "Updated note",
        content: "Updated content",
      }
    );
    assert.equal(updateResponse.status, 200);

    const updated = await readJson<Note>(updateResponse);
    assert.equal(updated.id, created.id);
    assert.equal(updated.title, "Updated note");
    assert.equal(updated.content, "Updated content");
    assert.equal(updated.createdAt, created.createdAt);
    assert.ok(
      Date.parse(updated.updatedAt) >= Date.parse(created.updatedAt)
    );

    const deleteResponse = await fetch(
      `${baseUrl}/api/notes/${created.id}`,
      { method: "DELETE" }
    );
    assert.equal(deleteResponse.status, 204);
    assert.equal(await deleteResponse.text(), "");

    const missingResponse = await fetch(
      `${baseUrl}/api/notes/${created.id}`
    );
    assert.equal(missingResponse.status, 404);
    assert.deepEqual(await readJson<{ error: string }>(missingResponse), {
      error: "Note not found.",
    });
  });

  it("rejects invalid note bodies with 400", async () => {
    const invalidBodies: unknown[] = [
      undefined,
      {},
      { title: "", content: "text" },
      { title: "   ", content: "text" },
      { title: "Valid title" },
      { title: "Valid title", content: 42 },
      { title: 42, content: "text" },
    ];

    for (const body of invalidBodies) {
      const response = await send("/api/notes", "POST", body);
      assert.equal(response.status, 400);

      const payload = await readJson<{ error?: unknown }>(response);
      assert.equal(typeof payload.error, "string");
    }

    const malformedJsonResponse = await fetch(`${baseUrl}/api/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    assert.equal(malformedJsonResponse.status, 400);

    const malformedJsonPayload =
      await readJson<{ error?: unknown }>(malformedJsonResponse);
    assert.equal(typeof malformedJsonPayload.error, "string");
  });

  it("rejects invalid updates without changing the note", async () => {
    const createResponse = await send("/api/notes", "POST", {
      title: "Original",
      content: "Original content",
    });
    const created = await readJson<Note>(createResponse);

    const updateResponse = await send(
      `/api/notes/${created.id}`,
      "PUT",
      { title: "", content: "Changed" }
    );
    assert.equal(updateResponse.status, 400);

    const getResponse = await fetch(`${baseUrl}/api/notes/${created.id}`);
    assert.deepEqual(await readJson<Note>(getResponse), created);
  });

  it("returns 404 for unknown note ids", async () => {
    const missingId = "00000000-0000-4000-8000-000000000000";

    const responses = await Promise.all([
      fetch(`${baseUrl}/api/notes/${missingId}`),
      send(`/api/notes/${missingId}`, "PUT", {
        title: "Missing",
        content: "Missing",
      }),
      fetch(`${baseUrl}/api/notes/${missingId}`, { method: "DELETE" }),
    ]);

    for (const response of responses) {
      assert.equal(response.status, 404);

      const payload = await readJson<{ error?: unknown }>(response);
      assert.equal(typeof payload.error, "string");
    }
  });
});
