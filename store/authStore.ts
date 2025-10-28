import { create } from "zustand";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

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
    const rawToken = localStorage.getItem("token");
    
    // 1. Pengecekan Keberadaan dan String (RawToken mungkin null)
    if (!rawToken || typeof rawToken !== 'string' || rawToken.trim() === '') {
      return set({ isLoggedIn: false, token: null });
    }

    // 2. Cek format (Setelah yakin itu string non-kosong)
    if (rawToken.split(".").length !== 3) {
      console.error("Token tidak valid: Format JWT salah (missing dots).");
      localStorage.removeItem("token");
      return set({ isLoggedIn: false, token: null });
    }
    
    // Sekarang kita yakin rawToken adalah string yang formatnya benar
    const token = rawToken;

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
      // Catch error jika decoding gagal (misalnya, signature salah)
      console.error("Token tidak valid:", error);
      localStorage.removeItem("token");
      set({ isLoggedIn: false, token: null });
    }
  },

  login: (token: string) => {
    // localStorage.setItem("token", token);
    set({ isLoggedIn: true, token });
  },

  logout: async () => { // <-- Tetap jadikan async
    try {
      // 1. Hapus token dari localStorage (jika ada)
      localStorage.removeItem("token");
      
      // 2. Panggil API untuk menghapus cookie
      // Axios akan otomatis menggunakan metode POST sesuai route.js
      await axios.post('/api/auth/logout');

    } catch (error) {
      console.error("Gagal menghapus cookie saat logout:", error);
      // Kegagalan API logout tidak boleh menghentikan pembaruan state
    } finally {
      // 3. Update state visual (di client)
      set({ isLoggedIn: false, token: null });
    }
  },
}));