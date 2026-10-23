import type { Request } from "express";

const DEVELOPMENT_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:4173",
];

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function getAllowedOrigins(): Set<string> {
  const allowedOrigins = new Set<string>();
  const configuredOrigins = process.env.APP_ORIGIN ?? "";

  for (const configuredOrigin of configuredOrigins.split(",")) {
    const origin = normalizeOrigin(configuredOrigin.trim());

    if (origin) {
      allowedOrigins.add(origin);
    }
  }

  const renderExternalUrl = process.env.RENDER_EXTERNAL_URL?.trim();

  if (renderExternalUrl) {
    const origin = normalizeOrigin(renderExternalUrl);

    if (origin) {
      allowedOrigins.add(origin);
    }
  }

  if (process.env.NODE_ENV !== "production") {
    for (const origin of DEVELOPMENT_ORIGINS) {
      allowedOrigins.add(origin);
    }
  }

  return allowedOrigins;
}

export function isAllowedOrigin(origin: string): boolean {
  const normalizedOrigin = normalizeOrigin(origin);

  return normalizedOrigin !== null && getAllowedOrigins().has(normalizedOrigin);
}

export function isSameOriginRequest(req: Request): boolean {
  const origin = req.headers.origin;

  if (!origin) {
    return true;
  }

  const host = req.get("host");

  if (!host) {
    return false;
  }

  return normalizeOrigin(origin) === `${req.protocol}://${host}`;
}
