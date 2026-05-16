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
import { REGISTER_MUTATION, GET_CURRENT_USER } from "../graphql/auth.graphql";

export function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [registerMutation] = useMutation(REGISTER_MUTATION, {
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

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      setLoading(false);
      return;
    }

    try {
      await registerMutation({
        variables: {
          input: {
            email: formData.email,
            password: formData.password,
            firstName: formData.firstName,
            lastName: formData.lastName,
          },
        },
      });
    } catch {
      /* onError */
    }
  };

  return (
    <MarketingShell minimalNav>
      <AuthCard
        title="Create your account"
        subtitle="Start designing with Webster in minutes"
        footer={
          <>
            Already have an account?{" "}
            <Link to="/login" className={authLinkClass()}>
              Sign in
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className={authLabelClass()}>
                First name
              </label>
              <input
                id="firstName"
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleChange}
                className={authInputClass()}
              />
            </div>
            <div>
              <label htmlFor="lastName" className={authLabelClass()}>
                Last name
              </label>
              <input
                id="lastName"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleChange}
                className={authInputClass()}
              />
            </div>
          </div>
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
            />
            <p className="mt-1 text-xs text-violet-600/70">At least 8 characters</p>
          </div>
          <button type="submit" disabled={loading} className={authPrimaryButtonClass(loading)}>
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </form>
      </AuthCard>
    </MarketingShell>
  );
}
