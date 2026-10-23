import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import app from "../app.js";
import { noteStore } from "../notes/noteStore.js";
import type { AskResult } from "./askService.js";
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

async function ask(question: unknown): Promise<Response> {
  return fetch(`${baseUrl}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
}

describe("Ask Notes API", () => {
  it("answers a question using matching notes and returns sources", async () => {
    await noteStore.create({
      title: "Docker Networking",
      content:
        "Docker networking allows containers to communicate with each other and with external networks. The bridge network is the default network driver. Containers connected to the same bridge network can communicate.",
    });
    await noteStore.create({
      title: "React Hooks",
      content:
        "useState and useEffect are fundamental React hooks for managing component state.",
    });

    const response = await ask(
      "What did I write about Docker networking?"
    );
    assert.equal(response.status, 200);

    const result = (await response.json()) as AskResult;
    assert.match(result.answer, /Docker Networking/);
    assert.match(result.answer, /bridge|containers/i);
    assert.equal(result.sources.length, 1);
    assert.equal(result.sources[0]?.title, "Docker Networking");
    assert.ok((result.sources[0]?.relevance ?? 0) > 0);
  });

  it("returns an overview when asked to summarize all notes", async () => {
    await noteStore.create({
      title: "Docker Networking",
      content: "Bridge networks connect containers.",
    });
    await noteStore.create({
      title: "React Hooks",
      content: "useState manages component state.",
    });

    const response = await ask("Summarize my notes");
    assert.equal(response.status, 200);

    const result = (await response.json()) as AskResult;
    assert.match(result.answer, /Docker Networking/);
    assert.match(result.answer, /React Hooks/);
    assert.ok(result.sources.length >= 1);
  });

  it("returns recent notes as fallback when nothing matches", async () => {
    await noteStore.create({
      title: "Docker Networking",
      content: "Bridge networks connect containers.",
    });

    const response = await ask("What is my favorite recipe?");
    assert.equal(response.status, 200);

    const result = (await response.json()) as AskResult;
    assert.match(result.answer, /could not find a direct match/i);
    assert.equal(result.sources.length, 1);
    assert.equal(result.sources[0]?.title, "Docker Networking");
  });

  it("matches related word forms", async () => {
    await noteStore.create({
      title: "Docker Networking",
      content: "Bridge networks connect containers.",
    });

    const response = await ask("How do networks connect containers?");
    assert.equal(response.status, 200);

    const result = (await response.json()) as AskResult;
    assert.match(result.answer, /Docker Networking/);
    assert.equal(result.sources[0]?.title, "Docker Networking");
  });

  it("handles an empty notes collection", async () => {
    const response = await ask("What do my notes say?");
    assert.equal(response.status, 200);

    const result = (await response.json()) as AskResult;
    assert.match(result.answer, /do not have any notes yet/i);
    assert.deepEqual(result.sources, []);
  });

  it("rejects invalid questions with 400", async () => {
    for (const body of [
      {},
      { question: "" },
      { question: "   " },
      { question: 42 },
      { question: "x".repeat(1001) },
    ]) {
      const response = await fetch(`${baseUrl}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      assert.equal(response.status, 400);
      const payload = (await response.json()) as { error?: unknown };
      assert.equal(typeof payload.error, "string");
    }
  });
});
