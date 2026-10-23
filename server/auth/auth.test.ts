import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, describe, it } from "node:test";
import app from "../app.js";
import { decryptEncryptedBackup } from "../backup/backupService.js";
import { noteStore } from "../notes/noteStore.js";
import {
  configureAuthForTests,
  loginTestUser,
  TEST_APP_PASSWORD,
  TEST_BACKUP_PASSWORD,
} from "../test/authTestUtils.js";

configureAuthForTests();
process.env.APP_ORIGIN = "https://notes.example.com";
process.env.COOKIE_SECURE = "false";

let server: Server;
let baseUrl = "";
let cookie = "";

before(async () => {
  server = app.listen(0);

  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
  cookie = await loginTestUser(baseUrl);
});

after(async () => {
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

function authHeaders(
  extra: Record<string, string> = {}
): Record<string, string> {
  return {
    Cookie: cookie,
    ...extra,
  };
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

describe("Authentication and protected API", () => {
  it("rejects protected requests without a session", async () => {
    for (const path of ["/api/notes", "/api/backup/export"]) {
      const response = await fetch(`${baseUrl}${path}`);
      assert.equal(response.status, 401);
      assert.deepEqual(await readJson<{ error: string }>(response), {
        error: "Authentication required.",
      });
    }

    const askResponse = await fetch(`${baseUrl}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "What is in my notes?" }),
    });
    assert.equal(askResponse.status, 401);

    const forgedSessionResponse = await fetch(`${baseUrl}/api/notes`, {
      headers: {
        Cookie: "notes_session=v1.9999999999.not-a-valid-signature",
      },
    });
    assert.equal(forgedSessionResponse.status, 401);

    const meResponse = await fetch(`${baseUrl}/api/auth/me`);
    assert.equal(meResponse.status, 200);
    assert.deepEqual(await readJson(meResponse), {
      authenticated: false,
    });
  });

  it("logs in with the configured password and sets a secure session cookie", async () => {
    const wrongPasswordResponse = await fetch(
      `${baseUrl}/api/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "not-the-password" }),
      }
    );
    assert.equal(wrongPasswordResponse.status, 401);
    assert.deepEqual(
      await readJson<{ error: string }>(wrongPasswordResponse),
      { error: "Incorrect password." }
    );

    const invalidBodyResponse = await fetch(
      `${baseUrl}/api/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );
    assert.equal(invalidBodyResponse.status, 400);

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: TEST_APP_PASSWORD }),
    });
    assert.equal(loginResponse.status, 200);

    const setCookie = loginResponse.headers.get("set-cookie");
    assert.ok(setCookie);
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Strict/i);
    assert.match(setCookie, /Path=\//);

    const sessionCookie = setCookie.split(";")[0];
    assert.ok(sessionCookie);

    const meResponse = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: sessionCookie },
    });
    assert.deepEqual(await readJson(meResponse), {
      authenticated: true,
    });
  });

  it("allows authenticated notes access and logs out", async () => {
    const createResponse = await fetch(`${baseUrl}/api/notes`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        title: "Private note",
        content: "Only a signed-in user can read this.",
      }),
    });
    assert.equal(createResponse.status, 201);

    const listResponse = await fetch(`${baseUrl}/api/notes`, {
      headers: authHeaders(),
    });
    assert.equal(listResponse.status, 200);

    const notes = await readJson<Array<{ title: string }>>(listResponse);
    assert.equal(notes[0]?.title, "Private note");

    const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: authHeaders(),
    });
    assert.equal(logoutResponse.status, 204);
    assert.match(
      logoutResponse.headers.get("set-cookie") ?? "",
      /notes_session=;/
    );

    const meAfterLogout = await fetch(`${baseUrl}/api/auth/me`);
    assert.deepEqual(await readJson(meAfterLogout), {
      authenticated: false,
    });
  });

  it("exports notes as an encrypted backup", async () => {
    await noteStore.create({
      title: "Launch Plan",
      content: "The launch code is ORBIT-42. Keep it private.",
    });

    const response = await fetch(`${baseUrl}/api/backup/export`, {
      headers: authHeaders(),
    });
    assert.equal(response.status, 200);
    assert.match(
      response.headers.get("content-disposition") ?? "",
      /attachment; filename="personal-notes-backup-\d{4}-\d{2}-\d{2}\.json\.enc"/
    );
    assert.equal(response.headers.get("cache-control"), "no-store");

    const rawBackup = await response.text();
    assert.doesNotMatch(rawBackup, /ORBIT-42/);
    assert.doesNotMatch(rawBackup, /Launch Plan/);

    const envelope = JSON.parse(rawBackup) as unknown;
    const payload = decryptEncryptedBackup(
      envelope,
      TEST_BACKUP_PASSWORD
    );
    assert.equal(payload.notes.length, 1);
    assert.equal(payload.notes[0]?.title, "Launch Plan");
    assert.match(payload.notes[0]?.content ?? "", /ORBIT-42/);

    assert.throws(
      () => decryptEncryptedBackup(envelope, "wrong-password"),
      /Could not decrypt/
    );
  });

  it("allows configured origins and blocks mutating requests from others", async () => {
    const allowedOrigin = "https://notes.example.com";
    const evilOrigin = "https://evil.example";

    const allowedHealth = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: allowedOrigin },
    });
    assert.equal(
      allowedHealth.headers.get("access-control-allow-origin"),
      allowedOrigin
    );

    const evilHealth = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: evilOrigin },
    });
    assert.equal(
      evilHealth.headers.get("access-control-allow-origin"),
      null
    );

    const blockedCreate = await fetch(`${baseUrl}/api/notes`, {
      method: "POST",
      headers: {
        ...authHeaders({
          "Content-Type": "application/json",
          Origin: evilOrigin,
        }),
      },
      body: JSON.stringify({
        title: "Blocked",
        content: "Should not be created.",
      }),
    });
    assert.equal(blockedCreate.status, 403);

    const allowedCreate = await fetch(`${baseUrl}/api/notes`, {
      method: "POST",
      headers: authHeaders({
        "Content-Type": "application/json",
        Origin: allowedOrigin,
      }),
      body: JSON.stringify({
        title: "Allowed",
        content: "Created from the app origin.",
      }),
    });
    assert.equal(allowedCreate.status, 201);
    assert.equal(
      allowedCreate.headers.get("access-control-allow-origin"),
      allowedOrigin
    );
  });
});
