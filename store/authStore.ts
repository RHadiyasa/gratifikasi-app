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
    
    // 1. Cek keberadaan token
    if (!token) return set({ isLoggedIn: false, token: null });

    // 2. ✅ MODIFIKASI: Cek format token sebelum decoding
    // Token yang valid harus memiliki 3 bagian (dipisahkan oleh 2 titik)
    if (token.split(".").length !== 3) {
      console.error("Token tidak valid: Format JWT salah (missing dots).");
      localStorage.removeItem("token");
      return set({ isLoggedIn: false, token: null });
    }
    
    // Setelah melewati dua pengecekan di atas, kita bisa yakin token memiliki format yang benar
    try {
      const decoded: DecodedToken = jwtDecode(token);

      // Pastikan exp ada
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
      // Catch error jika decoding gagal (misalnya, payload rusak)
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