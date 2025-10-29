import { create } from "zustand";
import axios from "axios";

interface AuthState {
  isLoggedIn: boolean;
  checkAuth: () => void;
  login: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,

  checkAuth: async () => {
    try {
      // Panggil endpoint validasi token di backend
      const { data } = await axios.get("/api/auth/me"); // endpoint untuk cek cookie
      set({ isLoggedIn: data.success });
    } catch {
      set({ isLoggedIn: false });
    }
  },

  login: () => set({ isLoggedIn: true }),

  logout: async () => {
    try {
      await axios.post("/api/auth/logout");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      set({ isLoggedIn: false });
    }
  },
}));
