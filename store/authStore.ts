import { create } from "zustand";
import axios from "axios";

type Role = "upg" | "zi" | "admin" | null;

interface AuthState {
  isLoggedIn: boolean;
  role: Role;
  checkAuth: () => void;
  login: (role: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  role: null,

  checkAuth: async () => {
    try {
      const { data } = await axios.get("/api/auth/me");
      if (data.success) {
        set({ isLoggedIn: true, role: data.role ?? null });
      } else {
        set({ isLoggedIn: false, role: null });
      }
    } catch {
      set({ isLoggedIn: false, role: null });
    }
  },

  login: (role: string) => set({ isLoggedIn: true, role: role as Role }),

  logout: async () => {
    try {
      await axios.post("/api/auth/logout");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      set({ isLoggedIn: false, role: null });
    }
  },
}));
