import { useMemo, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { Link, useNavigate } from "react-router-dom";
import { GET_CURRENT_USER, LOGIN_MUTATION } from "../graphql/auth.graphql";

export function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    twoFactorCode: "",
  });
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    twoFactorCode?: string;
    form?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);

  const [loginMutation] = useMutation(LOGIN_MUTATION, {
    refetchQueries: [{ query: GET_CURRENT_USER }],
    onCompleted: () => {
      navigate('/');
    },
    onError: (err) => {
      const message = err.message || "Login failed";
      const requiresTwoFactor = /two[- ]?factor|2fa/i.test(message);
      setFieldErrors({
        form: requiresTwoFactor ? "Two-factor code required to continue." : message,
      });
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

  const validationErrors = useMemo(() => {
    const next: typeof fieldErrors = {};
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

  const oauthConfig = useMemo(() => {
    const redirectUri = `${window.location.origin}/oauth/callback`;
    return [
      {
        id: "Google",
        label: "Continue with Google",
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined,
        url: (clientId: string) =>
          `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: "openid email profile",
            state: "Google",
          }).toString()}`,
      },
      {
        id: "Facebook",
        label: "Continue with Facebook",
        clientId: import.meta.env.VITE_FACEBOOK_CLIENT_ID as string | undefined,
        url: (clientId: string) =>
          `https://www.facebook.com/v19.0/dialog/oauth?${new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: "email,public_profile",
            state: "Facebook",
          }).toString()}`,
      },
      {
        id: "Github",
        label: "Continue with GitHub",
        clientId: import.meta.env.VITE_GITHUB_CLIENT_ID as string | undefined,
        url: (clientId: string) =>
          `https://github.com/login/oauth/authorize?${new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: "read:user user:email",
            state: "Github",
          }).toString()}`,
      },
    ];
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setLoading(true);

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setLoading(false);
      return;
    }

    try {
      await loginMutation({
        variables: {
          input: {
            email: formData.email.trim(),
            password: formData.password,
            twoFactorCode: formData.twoFactorCode.trim() || undefined,
          },
        },
      });
    } catch (err) {
      console.error('Login error:', err);
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
                />
                {fieldErrors.twoFactorCode && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.twoFactorCode}</p>
                )}
              </div>
            )}

            {!showTwoFactor && (
              <button
                type="button"
                onClick={() => setShowTwoFactor(true)}
                className="text-left text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Use a two-factor code
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            {oauthConfig.map((provider) => {
              const disabled = !provider.clientId;
              return (
                <button
                  key={provider.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (provider.clientId) {
                      window.location.href = provider.url(provider.clientId);
                    }
                  }}
                  className="w-full border border-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition hover:border-gray-400 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {provider.label}
                </button>
              );
            })}
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