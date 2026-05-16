import { useState, useMemo } from "react";
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

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  const validationErrors = useMemo(() => {
    const next: FieldErrors = {};
    const email = formData.email.trim();
    if (!formData.firstName.trim()) {
      next.firstName = "First name is required";
    }
    if (!formData.lastName.trim()) {
      next.lastName = "Last name is required";
    }
    if (!email) {
      next.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = "Enter a valid email";
    }
    if (!formData.password) {
      next.password = "Password is required";
    } else if (formData.password.length < 8) {
      next.password = "Password must be at least 8 characters";
    }
    if (!formData.confirmPassword) {
      next.confirmPassword = "Confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      next.confirmPassword = "Passwords do not match";
    }

    return next;
  }, [formData]);

  const [registerMutation] = useMutation(REGISTER_MUTATION, {
    refetchQueries: [{ query: GET_CURRENT_USER }],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined, form: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) {
      setLoading(true);
      try {
        await registerMutation({
          variables: {
            input: {
              email: formData.email.trim(),
              password: formData.password,
              firstName: formData.firstName.trim(),
              lastName: formData.lastName.trim(),
            },
          },
        });
        navigate("/");
      } catch (err) {
        setFieldErrors((prev) => ({
          ...prev,
          form: err.message || "Registration failed",
        }));
      } finally {
        setLoading(false);
      }
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
        {fieldErrors.form && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {fieldErrors.form}
          </div>
        )}

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
              {fieldErrors.firstName && <p className="mt-1 text-xs text-red-600">{fieldErrors.firstName}</p>}
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
              {fieldErrors.lastName && <p className="mt-1 text-xs text-red-600">{fieldErrors.lastName}</p>}
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
            {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
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
            {fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
          </div>
          <div>
            <label htmlFor="confirmPassword" className={authLabelClass()}>
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className={authInputClass()}
            />
            {fieldErrors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.confirmPassword}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className={authPrimaryButtonClass(loading)}
          >
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </form>
      </AuthCard>
    </MarketingShell>
  );
}