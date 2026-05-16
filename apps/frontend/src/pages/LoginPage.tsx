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
import { LOGIN_MUTATION, GET_CURRENT_USER } from "../graphql/auth.graphql";

interface FieldErrors {
  email?: string;
  password?: string;
  twoFactorCode?: string;
  form?: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    twoFactorCode: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);

  const validationErrors = useMemo(() => {
    const next: FieldErrors = {};
    const email = formData.email.trim();
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

    if (showTwoFactor && !formData.twoFactorCode.trim()) {
      next.twoFactorCode = "Enter the 2FA code";
    }

    return next;
  }, [formData.email, formData.password, formData.twoFactorCode, showTwoFactor]);

  const [loginMutation] = useMutation(LOGIN_MUTATION, {
    refetchQueries: [{ query: GET_CURRENT_USER }],
    onError: (err) => {
      const message = err.message || "Login failed";
      const requiresTwoFactor = /two[- ]?factor|2fa/i.test(message);
      setFieldErrors((prev) => ({
        ...prev,
        form: requiresTwoFactor ? "Two-factor code required to continue." : message,
      }));
      if (requiresTwoFactor) {
        setShowTwoFactor(true);
      }
      setLoading(false);
    },
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
        await loginMutation({
          variables: { input: { email: formData.email, password: formData.password } },
        });
      } catch {
        // onError handles
      }
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">Welcome Back</h1>
          <p className="text-gray-600 text-center mb-8">Sign in to your account</p>

          {fieldErrors.form && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{fieldErrors.form}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="you@example.com"
                aria-label="Email address"
              />
              {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="••••••••"
                aria-label="Password"
              />
              {fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
            </div>

            {showTwoFactor && (
              <div>
                <label htmlFor="twoFactorCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Two-factor code
                </label>
                <input
                  id="twoFactorCode"
                  name="twoFactorCode"
                  type="text"
                  value={formData.twoFactorCode}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="123456"
                  aria-label="Two-factor authentication code"
                />
                {fieldErrors.twoFactorCode && <p className="mt-1 text-xs text-red-600">{fieldErrors.twoFactorCode}</p>}
              </div>
            )}

            {!showTwoFactor && (
              <button
                type="button"
                onClick={() => setShowTwoFactor(true)}
                className="text-left text-xs font-medium text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Use two-factor authentication"
              >
                Use a two-factor code
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            {/* OAuth buttons will be added here if needed */}
            <p className="text-xs text-gray-500">
              OAuth buttons are enabled when client IDs are set in the frontend environment.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link to="/reset-password" className="text-blue-600 hover:text-blue-700 font-medium">
              Forgot password?
            </Link>
            <Link to="/magic-link" className="text-blue-600 hover:text-blue-700 font-medium">
              Use magic link
            </Link>
          </div>

          <p className="text-center text-gray-600 text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}