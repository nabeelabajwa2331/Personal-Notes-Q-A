import type { Request, Response } from "express";
import {
  getSessionTtlMs,
  isSecureCookie,
  sessionCookieName,
} from "./config.js";

function cookieOptions() {
  return {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: "strict" as const,
    path: "/",
  };
}

export function parseCookies(
  header: string | undefined
): Record<string, string> {
  const cookies: Record<string, string> = {};

  if (!header) {
    return cookies;
  }

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");

    if (separator === -1) {
      continue;
    }

    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();

    if (!name) {
      continue;
    }

    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }

  return cookies;
}

export function getSessionCookie(req: Request): string | undefined {
  return parseCookies(req.headers.cookie)[sessionCookieName];
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(sessionCookieName, token, {
    ...cookieOptions(),
    maxAge: getSessionTtlMs(),
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(sessionCookieName, cookieOptions());
}
