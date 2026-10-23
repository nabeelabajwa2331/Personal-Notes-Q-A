import assert from "node:assert/strict";

export const TEST_APP_PASSWORD = "test-password-123";
export const TEST_SESSION_SECRET =
  "test-session-secret-0123456789abcdef0123456789abcdef";
export const TEST_BACKUP_PASSWORD = "test-backup-password-123";

export function configureAuthForTests(): void {
  process.env.NODE_ENV = "test";
  process.env.APP_PASSWORD = TEST_APP_PASSWORD;
  process.env.SESSION_SECRET = TEST_SESSION_SECRET;
  process.env.BACKUP_PASSWORD = TEST_BACKUP_PASSWORD;
}

export async function loginTestUser(baseUrl: string): Promise<string> {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: TEST_APP_PASSWORD }),
  });

  assert.equal(response.status, 200);

  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie, "Expected the login response to set a session cookie.");

  const cookie = setCookie.split(";")[0];
  assert.ok(cookie, "Expected a usable session cookie.");

  return cookie;
}

/**
 * Adds the signed session cookie to every request in a test file. This keeps
 * existing API tests focused on their endpoints while still exercising the
 * real authentication middleware.
 */
export function installCookieFetch(cookie: string): () => void {
  const originalFetch = globalThis.fetch;

  const authenticatedFetch: typeof fetch = (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (!url.startsWith("http://127.0.0.1:") && !url.startsWith("http://localhost:")) {
      return originalFetch(input, init);
    }

    const headers = new Headers(init?.headers);
    headers.set("Cookie", cookie);

    return originalFetch(input, {
      ...(init ?? {}),
      headers,
    });
  };

  globalThis.fetch = authenticatedFetch;

  return () => {
    globalThis.fetch = originalFetch;
  };
}
