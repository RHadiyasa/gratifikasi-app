import { create } from "zustand";
import axios from "axios";
import type { Role } from "@/lib/permissions";

type AuthUser = {
  id: string | null;
  name: string | null;
  unitKerja: string | null;
};

interface AuthState {
  isLoggedIn: boolean;
  role: Role | null;
  user: AuthUser;
  checkAuth: () => void;
  login: (session: {
    role: string;
    id?: string | null;
    name?: string | null;
    unitKerja?: string | null;
  }) => void;
  logout: () => void;
  setProfile: (profile: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  role: null,
  user: {
    id: null,
    name: null,
    unitKerja: null,
  },

  checkAuth: async () => {
    try {
      const { data } = await axios.get("/api/auth/me");
      if (data.success) {
        set({
          isLoggedIn: true,
          role: data.role ?? null,
          user: {
            id: data.id ?? null,
            name: data.name ?? null,
            unitKerja: data.unitKerja ?? null,
          },
        });
      } else {
        set({
          isLoggedIn: false,
          role: null,
          user: { id: null, name: null, unitKerja: null },
        });
      }
    } catch {
      set({
        isLoggedIn: false,
        role: null,
        user: { id: null, name: null, unitKerja: null },
      });
    }
  },

  login: (session) =>
    set({
      isLoggedIn: true,
      role: session.role as Role,
      user: {
        id: session.id ?? null,
        name: session.name ?? null,
        unitKerja: session.unitKerja ?? null,
      },
    }),

  logout: async () => {
    try {
      await axios.post("/api/auth/logout");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      set({
        isLoggedIn: false,
        role: null,
        user: { id: null, name: null, unitKerja: null },
      });
    }
  },

  setProfile: (profile) =>
    set((state) => ({
      user: {
        ...state.user,
        ...profile,
      },
    })),
}));
