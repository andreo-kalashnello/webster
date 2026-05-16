import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client/react";

import { AppShell } from "@/components/layout/AppShell";
import { AppPageSpinner } from "@/components/ui/PageSpinner";
import {
  GET_CURRENT_USER,
  LOGOUT_MUTATION,
  CHANGE_PASSWORD_MUTATION,
  UPDATE_PROFILE_MUTATION,
} from "../graphql/auth.graphql";
import { useAuthStore } from "../shared/stores/auth.store";
import { useToastStore } from "@/shared/stores/toast.store";

type Modal = "edit" | "password" | null;

export function ProfilePage() {
  const navigate = useNavigate();
  const clearUser = useAuthStore((state) => state.clearUser);
  const pushToast = useToastStore((state) => state.pushToast);
  const { data, loading, error } = useQuery(GET_CURRENT_USER);
  const [modal, setModal] = useState<Modal>(null);
  const [editError, setEditError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const user = data?.me;

  const [logout] = useMutation(LOGOUT_MUTATION, {
    onCompleted: () => {
      clearUser();
      pushToast({ title: "Signed out", tone: "info" });
      navigate("/login", { replace: true });
    },
    onError: (err) => {
      pushToast({ title: "Sign out failed", message: err.message, tone: "error" });
    },
  });

  const [changePassword, { loading: passwordLoading }] = useMutation(
    CHANGE_PASSWORD_MUTATION,
    {
      onCompleted: () => {
        setModal(null);
        setPasswordError("");
        pushToast({ title: "Password updated", tone: "success" });
      },
      onError: (err) => {
        pushToast({ title: "Password update failed", message: err.message, tone: "error" });
      },
    }
  );

  const [updateProfile, { loading: updateLoading }] = useMutation(
    UPDATE_PROFILE_MUTATION,
    {
      onCompleted: () => {
        setModal(null);
        setEditError("");
        pushToast({ title: "Profile updated", tone: "success" });
      },
      onError: (err) => {
        pushToast({ title: "Profile update failed", message: err.message, tone: "error" });
      },
    }
  );

  const handleLogout = () => {
    logout();
  };

  const handleChangePassword = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError("");

    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please fill in all fields");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match");
      return;
    }

    changePassword({
      variables: { input: { currentPassword, newPassword } },
    }).catch(err => {
      setPasswordError(err.message || "Failed to change password");
    });
  };

  const handleUpdateProfile = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEditError("");

    const formData = new FormData(e.currentTarget);
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;

    if (!firstName || !lastName) {
      setEditError("Please fill in all fields");
      return;
    }

    updateProfile({
      variables: { input: { firstName, lastName } },
    }).catch(err => {
      setEditError(err.message || "Failed to update profile");
    });
  };

  if (loading) {
    return (
      <AppShell title="Your account" subtitle="Profile">
        <AppPageSpinner />
      </AppShell>
    );
  }

  if (error || !user) {
    return (
      <AppShell title="Your account" subtitle="Profile">
        <p className="text-rose-200">Failed to load profile.</p>
        <Link to="/login" className="mt-4 inline-block font-semibold text-cyan-300">
          Back to login
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell title="Your account" subtitle="Profile">
        <section className="glass-card rounded-2xl p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-sm text-violet-200/70">Name</p>
              <p className="mt-2 text-lg font-semibold">
                {user.firstName} {user.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm text-violet-200/70">Email</p>
              <p className="mt-2 text-lg font-semibold">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-violet-200/70">Account status</p>
              <p className="mt-2 text-lg font-semibold text-cyan-300">Active</p>
            </div>
            <div>
              <p className="text-sm text-violet-200/70">Email verified</p>
              <p
                className={`mt-2 text-lg font-semibold ${
                  user.isEmailVerified ? "text-cyan-300" : "text-violet-300/60"
                }`}
              >
                {user.isEmailVerified ? "Yes" : "No"}
              </p>
            </div>
          </div>
        </section>

        <section className="glass-card mt-6 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white">Quick actions</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => setModal("edit")}
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-violet-100 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Edit profile
            </button>
            <button
              onClick={() => setModal("password")}
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-violet-100 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Change password
            </button>
            <button
              onClick={handleLogout}
              className="rounded-full border border-rose-400/40 px-4 py-2 text-sm text-rose-200 transition hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
            >
              Sign out
            </button>
          </div>
        </section>

        {/* Edit Profile Modal */}
        {modal === "edit" && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 px-4">
            <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold text-white">Edit profile</h2>

              <form onSubmit={handleUpdateProfile} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="firstName" className="text-sm text-slate-300">
                    First name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    defaultValue={user.firstName}
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="text-sm text-slate-300">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    defaultValue={user.lastName}
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100"
                    required
                  />
                </div>

                {editError && (
                  <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                    {editError}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="flex-1 rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateLoading}
                    className="flex-1 rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    {updateLoading ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Change Password Modal */}
        {modal === "password" && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 px-4">
            <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold text-white">Change password</h2>

              <form onSubmit={handleChangePassword} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="text-sm text-slate-300">
                    Current password
                  </label>
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="newPassword" className="text-sm text-slate-300">
                    New password
                  </label>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="text-sm text-slate-300">
                    Confirm password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100"
                    placeholder="••••••••"
                    required
                  />
                </div>

                {passwordError && (
                  <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                    {passwordError}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="flex-1 rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="flex-1 rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    {passwordLoading ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AppShell>
  );
}