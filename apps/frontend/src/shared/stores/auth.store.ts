import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
  isTwoFactorEnabled: boolean;
};

type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  clearUser: () => void;
};

export const useAuthStore = create<AuthState>()(
  devtools((set) => ({
    user: null,
    isAuthenticated: false,
    loading: true,
    setUser: (user) =>
      set({
        user,
        isAuthenticated: Boolean(user),
        loading: false,
      }),
    setLoading: (loading) => set({ loading }),
    clearUser: () => set({ user: null, isAuthenticated: false, loading: false }),
  })),
);
