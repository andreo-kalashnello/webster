import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@apollo/client/react";

import {
  GET_CURRENT_USER,
  REQUEST_MAGIC_LINK_MUTATION,
  VERIFY_MAGIC_LINK_MUTATION,
} from "../graphql/auth.graphql";

export function MagicLinkPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const token = searchParams.get("token") || "";

  const [requestMagicLink, { loading: requestLoading }] = useMutation(REQUEST_MAGIC_LINK_MUTATION);
  const [verifyMagicLink, { loading: verifyLoading }] = useMutation(VERIFY_MAGIC_LINK_MUTATION, {
    refetchQueries: [{ query: GET_CURRENT_USER }],
  });

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;
    async function runVerification() {
      try {
        await verifyMagicLink({ variables: { token } });
        if (!cancelled) {
          setStatus("success");
          navigate("/projects", { replace: true });
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setError(err instanceof Error ? err.message : "Failed to verify magic link");
        }
      }
    }

    runVerification();
    return () => {
      cancelled = true;
    };
  }, [navigate, token, verifyMagicLink]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setStatus("idle");

    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }

    try {
      await requestMagicLink({
        variables: {
          input: {
            email: email.trim(),
          },
        },
      });
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to send magic link");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
        <h1 className="text-3xl font-semibold">Magic link sign-in</h1>
        <p className="mt-2 text-slate-400">
          {token
            ? "Verifying your magic link."
            : "Send a magic link to your email for instant sign-in."}
        </p>

        {!token && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="text-sm text-slate-300">
                Email address
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

            {status === "success" && (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                Magic link sent. Check your email for the sign-in link.
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={requestLoading}
              className="w-full rounded-xl bg-emerald-400 px-4 py-2 font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:opacity-50"
            >
              {requestLoading ? "Sending..." : "Send magic link"}
            </button>
          </form>
        )}

        {token && (
          <div className="mt-6">
            {verifyLoading && (
              <p className="text-sm text-slate-300">Verifying token...</p>
            )}
            {status === "error" && (
              <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            )}
          </div>
        )}

        <Link to="/login" className="mt-6 text-sm text-slate-300 hover:text-white">
          Back to login
        </Link>
      </div>
    </div>
  );
}