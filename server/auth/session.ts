import { createHmac, timingSafeEqual } from "node:crypto";
import { getSessionSecret, getSessionTtlMs } from "./config.js";

const TOKEN_VERSION = "v1";

function sign(value: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("base64url");
}

export interface SessionToken {
  token: string;
  expiresAt: number;
}

export function createSessionToken(now = Date.now()): SessionToken {
  const expiresAt = now + getSessionTtlMs();
  const expiresAtSeconds = Math.floor(expiresAt / 1000);
  const payload = `${TOKEN_VERSION}.${expiresAtSeconds}`;

  return {
    token: `${payload}.${sign(payload)}`,
    expiresAt,
  };
}

export function verifySessionToken(
  token: string,
  now = Date.now()
): boolean {
  const parts = token.split(".");

  if (parts.length !== 3) {
    return false;
  }

  const [version, expiresAtRaw, providedSignature] = parts;

  if (
    version !== TOKEN_VERSION ||
    !expiresAtRaw ||
    !providedSignature
  ) {
    return false;
  }

  const expiresAtSeconds = Number(expiresAtRaw);

  if (
    !Number.isInteger(expiresAtSeconds) ||
    expiresAtSeconds <= Math.floor(now / 1000)
  ) {
    return false;
  }

  const expectedSignature = sign(`${version}.${expiresAtRaw}`);
  const providedBuffer = Buffer.from(providedSignature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}
