import { create } from "zustand";
import { jwtDecode } from "jwt-decode";

interface DecodedToken {
  exp?: number;
  [key: string]: any;
}

interface AuthState {
  isLoggedIn: boolean;
  token: string | null;
  checkToken: () => void;
  login: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  token: null,

  checkToken: () => {
    const token = localStorage.getItem("token");
    if (!token) return set({ isLoggedIn: false, token: null });

    try {
      const decoded: DecodedToken = jwtDecode(token);

      // ✅ pastikan exp ada
      if (!decoded.exp || typeof decoded.exp !== "number") {
        localStorage.removeItem("token");
        return set({ isLoggedIn: false, token: null });
      }

      const isExpired = decoded.exp * 1000 < Date.now();

      if (isExpired) {
        localStorage.removeItem("token");
        set({ isLoggedIn: false, token: null });
      } else {
        set({ isLoggedIn: true, token });
      }
    } catch (error) {
      console.error("Token tidak valid:", error);
      localStorage.removeItem("token");
      set({ isLoggedIn: false, token: null });
    }
  },

  login: (token: string) => {
    localStorage.setItem("token", token);
    set({ isLoggedIn: true, token });
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ isLoggedIn: false, token: null });
  },
}));
