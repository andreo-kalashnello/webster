import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@apollo/client/react";

import { GET_CURRENT_USER, OAUTH_LOGIN_MUTATION } from "../graphql/auth.graphql";

type OAuthProvider = "Google" | "Facebook" | "Github";

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const code = searchParams.get("code") || "";
  const providerParam = searchParams.get("state") || searchParams.get("provider") || "";
  const provider = useMemo(() => {
    if (providerParam === "Google" || providerParam === "Facebook" || providerParam === "Github") {
      return providerParam as OAuthProvider;
    }
    return null;
  }, [providerParam]);

  const [oauthLogin, { loading }] = useMutation(OAUTH_LOGIN_MUTATION, {
    refetchQueries: [{ query: GET_CURRENT_USER }],
  });

  useEffect(() => {
    if (!code || !provider) {
      return;
    }

    let cancelled = false;
    async function exchangeCode() {
      try {
        await oauthLogin({
          variables: {
            input: {
              provider,
              code,
              redirectUri: `${window.location.origin}/oauth/callback`,
            },
          },
        });
        if (!cancelled) {
          setStatus("success");
          navigate("/projects", { replace: true });
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setError(err instanceof Error ? err.message : "OAuth login failed");
        }
      }
    }

    exchangeCode();
    return () => {
      cancelled = true;
    };
  }, [code, navigate, oauthLogin, provider]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
        <h1 className="text-3xl font-semibold">OAuth sign-in</h1>
        <p className="mt-2 text-slate-400">Completing your provider sign-in.</p>

        <div className="mt-6 space-y-4">
          {!code && (
            <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              Missing authorization code. Please restart the OAuth flow.
            </div>
          )}

          {code && !provider && (
            <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              Unknown OAuth provider. Please restart the OAuth flow.
            </div>
          )}

          {loading && (
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-200">
              Exchanging code with the server...
            </div>
          )}

          {status === "error" && error && (
            <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          )}
        </div>

        <Link to="/login" className="mt-6 text-sm text-slate-300 hover:text-white">
          Back to login
        </Link>
      </div>
    </div>
  );
}