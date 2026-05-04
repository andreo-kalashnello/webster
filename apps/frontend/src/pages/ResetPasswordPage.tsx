import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useMutation } from "@apollo/client/react";
import { RESET_PASSWORD_MUTATION } from "../graphql/auth.graphql";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get("token") || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [resetPassword, { loading }] = useMutation(RESET_PASSWORD_MUTATION);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!token || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    try {
      await resetPassword({
        variables: { token, newPassword: password },
      });
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
        <h1 className="text-3xl font-semibold">Reset password</h1>
        <p className="mt-2 text-slate-400">Set a new password for your account.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="token" className="text-sm text-slate-300">
              Reset token
            </label>
            <input
              id="token"
              name="token"
              value={token}
              onChange={event => setToken(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-slate-900"
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
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-slate-900"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-400 px-4 py-2 font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>

        <Link to="/login" className="mt-6 text-sm text-slate-300 hover:text-white">
          Back to login
        </Link>
      </div>
    </div>
  );
}