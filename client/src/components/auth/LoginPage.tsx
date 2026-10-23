import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";

function LoginPage() {
  const { login, error: sessionError, refresh } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password.length === 0) {
      setError("Enter your password.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await login(password);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not sign in."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = error ?? sessionError;

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="auth-brand">
          <div className="logo-mark">N</div>
          <span>Personal Notes</span>
        </div>

        <h1>Welcome back</h1>
        <p>Enter your password to open your private workspace.</p>

        {displayError ? (
          <div className="auth-error" role="alert">
            {displayError}
          </div>
        ) : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="workspace-password">Password</label>
          <input
            id="workspace-password"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError(null);
            }}
            placeholder="Your password"
            autoComplete="current-password"
            autoFocus
            disabled={submitting}
          />

          <button
            type="submit"
            className="auth-submit"
            disabled={submitting || password.length === 0}
          >
            {submitting ? "Unlocking..." : "Unlock notes"}
          </button>
        </form>

        {sessionError ? (
          <button
            type="button"
            className="auth-retry"
            onClick={() => void refresh()}
          >
            Retry connection
          </button>
        ) : null}

        <p className="auth-footnote">
          Your session is protected by a signed, HttpOnly cookie and
          expires after 7 days by default.
        </p>
      </section>
    </main>
  );
}

export default LoginPage;
