"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type UserRole = "patient" | "doctor" | "asha_worker" | "admin";
export type Locale = "en" | "hi" | "kn" | "ta" | "mr";

type AuthUser = {
  id?: string;
  role: UserRole;
  anonymous_id: string;
  language: Locale;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  role: UserRole | null;
  language: Locale;
  setAuth: (payload: { user: AuthUser; token: string }) => void;
  setLanguage: (language: Locale) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      role: null,
      language: "en",
      setAuth: ({ user, token }) => set({ user, token, role: user.role, language: user.language }),
      setLanguage: (language) => set({ language }),
      clearAuth: () => set({ user: null, token: null, role: null }),
    }),
    {
      name: "mindbridge-auth",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ user: state.user, token: state.token, role: state.role, language: state.language }),
    },
  ),
);
