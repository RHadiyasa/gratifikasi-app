"use client";

import { useState, useRef, useCallback } from "react";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";
import { Input, Button } from "@heroui/react";
import { loginService } from "@/modules/auth/auth.service";
import { toast } from "react-toastify";
import { useAuthStore } from "@/store/authStore";
import {
  ShieldCheck, Lock, Eye, EyeOff, Loader2,
  FileText, BadgeCheck, Users, Scale, Search, ArrowRight,
} from "lucide-react";

// ── Orbit nodes data ──────────────────────────────────────────────────────
const nodes = [
  { icon: FileText,   label: "Laporan",    r: 110, angle:   0, speed: 18, color: "#3b82f6" },
  { icon: Search,     label: "Tracking",   r: 140, angle:  72, speed: 24, color: "#a855f7" },
  { icon: BadgeCheck, label: "Verifikasi", r: 110, angle: 144, speed: 20, color: "#22c55e" },
  { icon: Users,      label: "UPG",        r: 140, angle: 216, speed: 28, color: "#f59e0b" },
  { icon: Scale,      label: "KPK",        r: 110, angle: 288, speed: 16, color: "#ef4444" },
];

// ── Single orbit ring ─────────────────────────────────────────────────────
function OrbitRing({ radius, duration, reverse = false }) {
  return (
    <motion.div
      className="absolute rounded-full border border-white/5"
      style={{ width: radius * 2, height: radius * 2, top: "50%", left: "50%", x: "-50%", y: "-50%" }}
      animate={{ rotate: reverse ? -360 : 360 }}
      transition={{ duration, repeat: Infinity, ease: "linear" }}
    />
  );
}

// ── Orbiting node ─────────────────────────────────────────────────────────
function OrbitNode({ icon: Icon, label, r, initialAngle, speed, color }) {
  const [hovered, setHovered] = useState(false);
  const rad = (initialAngle * Math.PI) / 180;
  const x = Math.cos(rad) * r;
  const y = Math.sin(rad) * r;

  return (
    <motion.div
      className="absolute"
      style={{ top: "50%", left: "50%", translateX: x - 20, translateY: y - 20 }}
      animate={{ rotate: [0, 360] }}
      transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
    >
      <motion.div
        animate={{ rotate: [0, -360] }}
        transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        className="w-10 h-10 rounded-xl flex items-center justify-center cursor-default relative"
        style={{ background: `${color}18`, border: `1px solid ${color}40` }}
        whileHover={{ scale: 1.3 }}
      >
        <Icon size={16} style={{ color }} />
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap"
            >
              {label}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// ── SVG connecting lines ──────────────────────────────────────────────────
function NetworkLines() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 320 320">
      <defs>
        <radialGradient id="lineGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="hsl(var(--heroui-primary))" stopOpacity="0.6" />
          <stop offset="100%" stopColor="hsl(var(--heroui-primary))" stopOpacity="0"   />
        </radialGradient>
      </defs>
      {nodes.map((n, i) => {
        const rad = (n.angle * Math.PI) / 180;
        const x2 = parseFloat((160 + Math.cos(rad) * n.r).toFixed(4));
        const y2 = parseFloat((160 + Math.sin(rad) * n.r).toFixed(4));
        return (
          <motion.line
            key={i}
            x1="160" y1="160"
            x2={x2} y2={y2}
            stroke="url(#lineGrad)"
            strokeWidth="1"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 + i * 0.15, ease: "easeOut" }}
          />
        );
      })}
    </svg>
  );
}

// ── Background network viz (full page, theme-aware) ───────────────────────
function NetworkBackground({ onMouseMove, onMouseLeave, springX, springY }) {
  return (
    <div
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none"
      style={{ perspective: 800 }}
    >
      {/* Subtle grid — adapts to theme */}
      <div
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.07]"
        style={{
          backgroundImage: "linear-gradient(hsl(var(--heroui-primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--heroui-primary)) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Ambient glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-primary/10 dark:bg-primary/15 blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 w-56 h-56 rounded-full bg-violet-500/8 dark:bg-violet-500/15 blur-[80px]" />
      <div className="absolute top-2/3 left-2/3 w-40 h-40 rounded-full bg-blue-500/6 dark:bg-blue-500/10 blur-[60px]" />

      {/* Tiltable viz */}
      <motion.div
        style={{ rotateX: springX, rotateY: springY, transformStyle: "preserve-3d" }}
        className="relative w-[340px] h-[340px] pointer-events-auto"
      >
        <NetworkLines />

        <OrbitRing radius={85}  duration={32} />
        <OrbitRing radius={115} duration={24} reverse />
        <OrbitRing radius={145} duration={40} />

        {/* Central shield */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border border-primary/25"
              style={{ width: 64, height: 64, top: "50%", left: "50%", x: "-50%", y: "-50%" }}
              animate={{ scale: [1, 2.4], opacity: [0.4, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.9, ease: "easeOut" }}
            />
          ))}
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-16 h-16 rounded-2xl bg-primary/15 dark:bg-primary/20 border border-primary/30 flex items-center justify-center"
          >
            <ShieldCheck size={28} className="text-primary" />
          </motion.div>
        </div>

        {nodes.map((n) => (
          <OrbitNode key={n.label} {...n} initialAngle={n.angle} />
        ))}
      </motion.div>

      {/* Hint text */}
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-6 right-6 text-default-300 text-[10px] tracking-widest uppercase"
      >
        Gerakkan kursor
      </motion.p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [nip, setNip]           = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const login = useAuthStore((s) => s.login);

  // Mouse parallax state shared between background and page
  const pageRef = useRef(null);
  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const springX = useSpring(rotX, { stiffness: 80, damping: 20 });
  const springY = useSpring(rotY, { stiffness: 80, damping: 20 });

  const handleMouseMove = useCallback((e) => {
    const rect = pageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    rotY.set(((e.clientX - cx) / (rect.width  / 2)) * 8);
    rotX.set(((e.clientY - cy) / (rect.height / 2)) * -8);
  }, [rotX, rotY]);

  const handleMouseLeave = useCallback(() => {
    rotX.set(0); rotY.set(0);
  }, [rotX, rotY]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      const res = await loginService(nip, password);
      if (!res.success) {
        setError(res.message || "NIP atau password salah.");
        return;
      }
      login();
      setTimeout(() => { window.location.href = "/dashboard"; }, 500);
    } catch {
      setError("Terjadi kesalahan server. Coba beberapa saat lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={pageRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative flex items-center justify-center px-6"
      style={{ minHeight: "calc(100dvh - 64px)" }}
    >
      {/* ── Animated background (absolute, behind form) ───────────────── */}
      <NetworkBackground
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        springX={springX}
        springY={springY}
      />

      {/* ── Login card (on top, glassmorphism) ───────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="rounded-3xl border border-default-200/60 bg-background/70 dark:bg-background/60 backdrop-blur-xl shadow-2xl shadow-default-200/30 dark:shadow-black/40 p-8">

          {/* Logo / title */}
          <div className="mb-8">
            <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
              <ShieldCheck size={20} className="text-primary" />
            </div>
            <h1 className="text-xl font-black mb-1">Masuk ke Dashboard</h1>
            <p className="text-xs text-default-400 leading-relaxed">
              Khusus tim UPG · Inspektorat V Kementerian ESDM
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-default-400 uppercase tracking-widest mb-1.5 block">
                NIP
              </label>
              <Input
                variant="bordered"
                placeholder="Nomor Induk Pegawai"
                value={nip}
                onChange={(e) => { setNip(e.target.value); setError(""); }}
                required
                isDisabled={loading}
                startContent={<Lock size={14} className="text-default-400" />}
                classNames={{
                  input: "text-sm bg-transparent",
                  inputWrapper: "rounded-xl bg-default-50/50 dark:bg-default-100/5",
                }}
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-default-400 uppercase tracking-widest mb-1.5 block">
                Password
              </label>
              <Input
                variant="bordered"
                placeholder="Masukkan password"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                required
                isDisabled={loading}
                startContent={<Lock size={14} className="text-default-400" />}
                endContent={
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="text-default-400 hover:text-foreground transition-colors"
                  >
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                }
                classNames={{
                  input: "text-sm bg-transparent",
                  inputWrapper: "rounded-xl bg-default-50/50 dark:bg-default-100/5",
                }}
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              color="primary"
              fullWidth
              isDisabled={loading || !nip || !password}
              className="rounded-xl font-semibold h-11"
              endContent={!loading && <ArrowRight size={15} />}
            >
              {loading
                ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" />Memproses...</span>
                : "Masuk"
              }
            </Button>
          </form>

          <p className="text-[11px] text-default-300 text-center mt-6 leading-relaxed">
            Akses terbatas untuk petugas UPG yang telah terdaftar.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
