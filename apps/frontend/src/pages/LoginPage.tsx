import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { useNavigate, Link } from "react-router-dom";

import { MarketingShell } from "@/components/layout/MarketingShell";
import {
  AuthCard,
  authInputClass,
  authLabelClass,
  authLinkClass,
  authPrimaryButtonClass,
} from "@/components/ui/AuthCard";
import { LOGIN_MUTATION, GET_CURRENT_USER } from "../graphql/auth.graphql";

export function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [loginMutation] = useMutation(LOGIN_MUTATION, {
    refetchQueries: [{ query: GET_CURRENT_USER }],
    onCompleted: () => navigate("/"),
    onError: (err) => {
      setError(err.message);
      setLoading(false);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginMutation({
        variables: { input: { email: formData.email, password: formData.password } },
      });
    } catch {
      /* onError handles */
    }
  };

  return (
    <MarketingShell minimalNav>
      <AuthCard
        title="Welcome back"
        subtitle="Sign in to continue to Webster"
        footer={
          <>
            Don&apos;t have an account?{" "}
            <Link to="/register" className={authLinkClass()}>
              Create one
            </Link>
          </>
        }
      >
        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className={authLabelClass()}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className={authInputClass()}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className={authLabelClass()}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              className={authInputClass()}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={loading} className={authPrimaryButtonClass(loading)}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </AuthCard>
    </MarketingShell>
  );
}
