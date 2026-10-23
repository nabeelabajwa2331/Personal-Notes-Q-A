import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { authApi } from "../api";
import { AuthContext } from "./AuthContext";
import type {
  AuthContextValue,
  AuthStatus,
} from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus("loading");
    setError(null);

    try {
      const session = await authApi.me();
      setStatus(
        session.authenticated ? "authenticated" : "unauthenticated"
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not check your session."
      );
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const session = await authApi.me();

        if (!cancelled) {
          setStatus(
            session.authenticated
              ? "authenticated"
              : "unauthenticated"
          );
          setError(null);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Could not check your session."
          );
          setStatus("unauthenticated");
        }
      }
    };

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setStatus("unauthenticated");
    };

    window.addEventListener("notes:unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener(
        "notes:unauthorized",
        handleUnauthorized
      );
    };
  }, []);

  const login = useCallback(async (password: string) => {
    setError(null);

    const session = await authApi.login(password);

    if (!session.authenticated) {
      throw new Error("Login failed.");
    }

    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setStatus("unauthenticated");
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      error,
      login,
      logout,
      refresh,
    }),
    [status, error, login, logout, refresh]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
