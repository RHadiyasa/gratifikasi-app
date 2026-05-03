"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getDashboardHref, hasPermission, ROLE_LABELS } from "@/lib/permissions";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, LayoutGrid, ArrowRight, Users } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);

  useEffect(() => {
    if (!role) return;

    const home = getDashboardHref(role);
    if (home !== "/dashboard") {
      router.replace(home);
    }
  }, [role, router]);

  if (!role) return null;

  if (!hasPermission(role, "dashboard:admin")) return null;

  const isDeveloper = role === "developer";

  return (
    <div className="relative flex items-center justify-center px-6 min-h-screen">
      {/* background glow sederhana (biar konsisten tanpa overkill) */}
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-60 h-60 bg-violet-500/10 blur-[100px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-3xl border border-default-200/60 bg-background/70 backdrop-blur-xl shadow-2xl p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
              <LayoutGrid size={20} className="text-primary" />
            </div>

            <h1 className="text-xl font-black mb-1">Dashboard</h1>
            <p className="text-xs text-default-400">
              Pilih area sistem yang ingin Anda akses
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {/* Kelola Akun — developer only */}
            {isDeveloper && (
              <button
                onClick={() => router.push("/dashboard/accounts")}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-default-50/50 hover:bg-default-100/60 transition group cursor-pointer hover:scale-101"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Users size={16} className="text-amber-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold">Kelola Akun</p>
                    <p className="text-xs text-default-400">
                      Edit, hapus, & blokir pengguna
                    </p>
                  </div>
                </div>

                <ArrowRight
                  size={16}
                  className="text-default-400 group-hover:translate-x-1 transition"
                />
              </button>
            )}

            {/* UPG */}
            <button
              onClick={() => router.push("/dashboard/upg")}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-default-50/50 hover:bg-default-100/60 transition group cursor-pointer hover:scale-101"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ShieldCheck size={16} className="text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">Gratifikasi</p>
                  <p className="text-xs text-default-400">
                    Unit Pengendalian Gratifikasi
                  </p>
                </div>
              </div>

              <ArrowRight
                size={16}
                className="text-default-400 group-hover:translate-x-1 transition"
              />
            </button>

            {/* E-Learning */}
            <button
              onClick={() => router.push("/e-learning/tracker")}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-default-50/50 hover:bg-default-100/60 transition group cursor-pointer hover:scale-101"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <LayoutGrid size={16} className="text-blue-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">E-Learning</p>
                  <p className="text-xs text-default-400">
                    Tracking & progress pembelajaran
                  </p>
                </div>
              </div>

              <ArrowRight
                size={16}
                className="text-default-400 group-hover:translate-x-1 transition"
              />
            </button>

            {/* ZI */}
            <button
              onClick={() => router.push("/dashboard/zi")}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-default-50/50 hover:bg-default-100/60 transition group cursor-pointer hover:scale-101"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <ShieldCheck size={16} className="text-violet-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">Zona Integritas</p>
                  <p className="text-xs text-default-400">
                    Monitoring & evaluasi ZI
                  </p>
                </div>
              </div>

              <ArrowRight
                size={16}
                className="text-default-400 group-hover:translate-x-1 transition"
              />
            </button>
          </div>

          <p className="text-[11px] text-default-300 text-center mt-6">
            Anda masuk sebagai {ROLE_LABELS[role] ?? role}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
