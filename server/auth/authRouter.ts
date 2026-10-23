import { createHash, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { getAppPassword } from "./config.js";
import {
  clearSessionCookie,
  getSessionCookie,
  setSessionCookie,
} from "./cookies.js";
import {
  clearLoginAttempts,
  consumeLoginAttempt,
} from "./loginRateLimit.js";
import { createSessionToken, verifySessionToken } from "./session.js";

const authRouter = Router();

function passwordsMatch(input: string, expected: string): boolean {
  const inputHash = createHash("sha256").update(input, "utf8").digest();
  const expectedHash = createHash("sha256")
    .update(expected, "utf8")
    .digest();

  return timingSafeEqual(inputHash, expectedHash);
}

authRouter.get("/me", (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  const token = getSessionCookie(req);
  res.json({
    authenticated: Boolean(token && verifySessionToken(token)),
  });
});

authRouter.post("/login", (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  const attemptKey = req.ip || "unknown";
  const rateLimit = consumeLoginAttempt(attemptKey);

  if (!rateLimit.allowed) {
    res.setHeader(
      "Retry-After",
      String(rateLimit.retryAfterSeconds ?? 60)
    );
    res.status(429).json({
      error: "Too many login attempts. Try again later.",
    });
    return;
  }

  const body: unknown = req.body;

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    res.status(400).json({ error: "Password is required." });
    return;
  }

  const { password } = body as Record<string, unknown>;

  if (typeof password !== "string" || password.length === 0) {
    res.status(400).json({ error: "Password is required." });
    return;
  }

  if (!passwordsMatch(password, getAppPassword())) {
    res.status(401).json({ error: "Incorrect password." });
    return;
  }

  clearLoginAttempts(attemptKey);

  const { token } = createSessionToken();
  setSessionCookie(res, token);

  res.json({ authenticated: true });
});

authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

export default authRouter;
