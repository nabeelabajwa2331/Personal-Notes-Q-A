import type { ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import LoginPage from "./LoginPage";

function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <main className="auth-screen" aria-busy="true">
        <div className="auth-loading">
          <span className="auth-spinner" aria-hidden="true" />
          Checking your session...
        </div>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return <LoginPage />;
  }

  return <>{children}</>;
}

export default AuthGate;
