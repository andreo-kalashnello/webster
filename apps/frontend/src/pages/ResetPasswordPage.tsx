import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@apollo/client/react";
import { REQUEST_PASSWORD_RESET_MUTATION, RESET_PASSWORD_MUTATION } from "../graphql/auth.graphql";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get("token") || "");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"request" | "reset">(token ? "reset" : "request");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const [requestReset, { loading: requestLoading }] = useMutation(REQUEST_PASSWORD_RESET_MUTATION);
  const [resetPassword, { loading: resetLoading }] = useMutation(RESET_PASSWORD_MUTATION);

  useEffect(() => {
    if (token) {
      setMode("reset");
    }
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setStatus("idle");

    try {
      if (mode === "request") {
        if (!email.trim()) {
          setError("Please enter your email");
          return;
        }
        await requestReset({
          variables: {
            input: { email: email.trim() },
          },
        });
        setStatus("success");
      } else {
        if (!token || !password) {
          setError("Please fill in all fields");
          return;
        }

        if (password.length < 8) {
          setError("Password must be at least 8 characters");
          return;
        }

        await resetPassword({
          variables: { input: { token, newPassword: password } },
        });
        setStatus("success");
        navigate("/login", { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
        <h1 className="text-3xl font-semibold">Reset password</h1>
        <p className="mt-2 text-slate-400">
          {mode === "request"
            ? "Request a reset link and token for your account."
            : "Set a new password for your account."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "request" ? (
            <div>
              <label htmlFor="email" className="text-sm text-slate-300">
                Account email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100"
                placeholder="you@example.com"
                required
              />
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="token" className="text-sm text-slate-300">
                  Reset token
                </label>
                <input
                  id="token"
                  name="token"
                  value={token}
                  onChange={event => setToken(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100"
                  placeholder="Paste token"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="text-sm text-slate-300">
                  New password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100"
                  placeholder="••••••••"
                  required
                />
              </div>
            </>
          )}

          {status === "success" && (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              {mode === "request"
                ? "Reset instructions sent. Check your email for the token."
                : "Password updated. You can sign in now."}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={mode === "request" ? requestLoading : resetLoading}
            className="w-full rounded-xl bg-emerald-400 px-4 py-2 font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:opacity-50"
          >
            {mode === "request"
              ? requestLoading
                ? "Sending..."
                : "Send reset email"
              : resetLoading
                ? "Updating..."
                : "Update password"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode((prev) => (prev === "request" ? "reset" : "request"))}
          className="mt-4 text-sm text-slate-300 hover:text-white"
        >
          {mode === "request" ? "Already have a token?" : "Need a reset token?"}
        </button>

        <Link to="/login" className="mt-6 text-sm text-slate-300 hover:text-white">
          Back to login
        </Link>
      </div>
    </div>
  );
}