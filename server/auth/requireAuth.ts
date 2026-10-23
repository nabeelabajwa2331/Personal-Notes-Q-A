import type { RequestHandler } from "express";
import { getSessionCookie } from "./cookies.js";
import { verifySessionToken } from "./session.js";

export const requireAuth: RequestHandler = (req, res, next) => {
  const token = getSessionCookie(req);

  if (!token || !verifySessionToken(token)) {
    res.setHeader("Cache-Control", "no-store");
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  next();
};
