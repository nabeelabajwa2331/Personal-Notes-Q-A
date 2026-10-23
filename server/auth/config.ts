import { randomBytes } from "node:crypto";

export const sessionCookieName = "notes_session";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function requiredSetting(name: string, minimumLength: number): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} is required. Set it in server/.env for local development or in the Render environment for production.`
    );
  }

  if (value.length < minimumLength) {
    throw new Error(`${name} must be at least ${minimumLength} characters long.`);
  }

  return value;
}

export function getAppPassword(): string {
  return requiredSetting("APP_PASSWORD", 8);
}

let developmentSessionSecret: string | undefined;

export function getSessionSecret(): string {
  const configuredSecret = process.env.SESSION_SECRET?.trim();

  if (configuredSecret) {
    if (configuredSecret.length < 32) {
      throw new Error("SESSION_SECRET must be at least 32 characters long.");
    }

    return configuredSecret;
  }

  if (isProduction()) {
    throw new Error(
      "SESSION_SECRET is required in production. Generate a long random value and set it on Render."
    );
  }

  if (!developmentSessionSecret) {
    developmentSessionSecret = randomBytes(48).toString("base64url");
    console.warn(
      "SESSION_SECRET is not set. Using a temporary development secret; restarting the server will sign everyone out."
    );
  }

  return developmentSessionSecret;
}

export function getBackupPassword(): string | null {
  const configuredPassword = process.env.BACKUP_PASSWORD?.trim();

  if (!configuredPassword) {
    return null;
  }

  if (configuredPassword.length < 8) {
    throw new Error("BACKUP_PASSWORD must be at least 8 characters long.");
  }

  return configuredPassword;
}

export function isSecureCookie(): boolean {
  if (process.env.COOKIE_SECURE === "true") {
    return true;
  }

  if (process.env.COOKIE_SECURE === "false") {
    return false;
  }

  return isProduction();
}

export function getSessionTtlMs(): number {
  const configuredHours = process.env.SESSION_TTL_HOURS?.trim();
  const hours = configuredHours ? Number(configuredHours) : 168;

  if (!Number.isFinite(hours) || hours < 1 || hours > 720) {
    throw new Error(
      "SESSION_TTL_HOURS must be a number between 1 and 720."
    );
  }

  return hours * 60 * 60 * 1000;
}

/**
 * Called during startup so a production deployment cannot accidentally run
 * without a password gate or with a weak signing secret.
 */
export function validateAuthConfiguration(): void {
  getAppPassword();
  getSessionSecret();
  getSessionTtlMs();

  if (isProduction() && !getBackupPassword()) {
    throw new Error(
      "BACKUP_PASSWORD is required in production so encrypted backups can be created."
    );
  }
}
