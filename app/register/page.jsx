"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input, Button, Select, SelectItem } from "@heroui/react";
import { registerService } from "@/modules/auth/auth.service";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getCreatableRoles, ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/permissions";
import {
  UserPlus, Lock, Eye, EyeOff, Loader2,
  User, BadgeCheck, Building2, Mail, Phone, ShieldCheck,
} from "lucide-react";

// ── Subtle animated background ────────────────────────────────────────────
function Background() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      <div
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--heroui-primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--heroui-primary)) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-primary/8 dark:bg-primary/12 blur-[120px]" />
      <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full bg-violet-500/6 dark:bg-violet-500/10 blur-[100px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-blue-500/4 dark:bg-blue-500/8 blur-[80px]" />
    </div>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-default-400 uppercase tracking-widest mb-1.5 block">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass = {
  input: "text-sm bg-transparent",
  inputWrapper: "rounded-xl bg-default-50/50 dark:bg-default-100/5",
};

// ── Page ──────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const creatableRoles = getCreatableRoles(role);
  const roleOptions = creatableRoles.map((r) => ({
    key: r,
    label: ROLE_LABELS[r],
    desc: ROLE_DESCRIPTIONS[r],
  }));

  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "", nip: "", jabatan: "", unitKerja: "",
    email: "", noTelp: "", password: "", confirmPassword: "", role: creatableRoles[0] ?? "upg",
  });

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Password dan konfirmasi password tidak sama.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }

    try {
      setLoading(true);
      const { confirmPassword, ...payload } = form;
      const res = await registerService(payload);

      if (!res.success) {
        setError(res.error || res.message || "Gagal membuat akun.");
        return;
      }

      toast.success(`Akun ${ROLE_LABELS[form.role] ?? form.role} berhasil dibuat untuk ${form.name}.`);
      router.push("/dashboard");
    } catch {
      setError("Terjadi kesalahan server. Coba beberapa saat lagi.");
    } finally {
      setLoading(false);
    }
  };

  const isComplete =
    form.name && form.nip && form.jabatan && form.unitKerja &&
    form.email && form.noTelp && form.password && form.confirmPassword && form.role;

  return (
    <div
      className="relative flex items-center justify-center px-6 py-12"
      style={{ minHeight: "calc(100dvh - 64px)" }}
    >
      <Background />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
        className="relative z-10 w-full max-w-2xl"
      >
        <div className="rounded-3xl border border-default-200/60 bg-background/70 dark:bg-background/60 backdrop-blur-xl shadow-2xl shadow-default-200/30 dark:shadow-black/40 p-8 md:p-10">

          {/* Header */}
          <div className="mb-8">
            <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
              <UserPlus size={20} className="text-primary" />
            </div>
            <h1 className="text-xl font-black mb-1">Buat Akun Pengguna</h1>
            <p className="text-xs text-default-400 leading-relaxed">
              Master Admin · Inspektorat V Kementerian ESDM
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nama Lengkap">
                <Input
                  variant="bordered"
                  placeholder="Nama lengkap pegawai"
                  value={form.name}
                  onChange={set("name")}
                  isDisabled={loading}
                  startContent={<User size={14} className="text-default-400" />}
                  classNames={inputClass}
                  required
                />
              </Field>
              <Field label="NIP">
                <Input
                  variant="bordered"
                  placeholder="Nomor Induk Pegawai"
                  value={form.nip}
                  onChange={set("nip")}
                  isDisabled={loading}
                  startContent={<BadgeCheck size={14} className="text-default-400" />}
                  classNames={inputClass}
                  required
                />
              </Field>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Jabatan">
                <Input
                  variant="bordered"
                  placeholder="Jabatan / posisi"
                  value={form.jabatan}
                  onChange={set("jabatan")}
                  isDisabled={loading}
                  classNames={inputClass}
                  required
                />
              </Field>
              <Field label="Unit Kerja">
                <Input
                  variant="bordered"
                  placeholder="Unit kerja / satker"
                  value={form.unitKerja}
                  onChange={set("unitKerja")}
                  isDisabled={loading}
                  startContent={<Building2 size={14} className="text-default-400" />}
                  classNames={inputClass}
                  required
                />
              </Field>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Email">
                <Input
                  variant="bordered"
                  type="email"
                  placeholder="email@esdm.go.id"
                  value={form.email}
                  onChange={set("email")}
                  isDisabled={loading}
                  startContent={<Mail size={14} className="text-default-400" />}
                  classNames={inputClass}
                  required
                />
              </Field>
              <Field label="No. Telepon">
                <Input
                  variant="bordered"
                  placeholder="08xxxxxxxxxx"
                  value={form.noTelp}
                  onChange={set("noTelp")}
                  isDisabled={loading}
                  startContent={<Phone size={14} className="text-default-400" />}
                  classNames={inputClass}
                  required
                />
              </Field>
            </div>

            {/* Row 4 — Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Password">
                <Input
                  variant="bordered"
                  type={showPass ? "text" : "password"}
                  placeholder="Min. 8 karakter"
                  value={form.password}
                  onChange={set("password")}
                  isDisabled={loading}
                  startContent={<Lock size={14} className="text-default-400" />}
                  endContent={
                    <button type="button" onClick={() => setShowPass((v) => !v)}
                      className="text-default-400 hover:text-foreground transition-colors">
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  }
                  classNames={inputClass}
                  required
                />
              </Field>
              <Field label="Konfirmasi Password">
                <Input
                  variant="bordered"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Ulangi password"
                  value={form.confirmPassword}
                  onChange={set("confirmPassword")}
                  isDisabled={loading}
                  startContent={<Lock size={14} className="text-default-400" />}
                  endContent={
                    <button type="button" onClick={() => setShowConfirm((v) => !v)}
                      className="text-default-400 hover:text-foreground transition-colors">
                      {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  }
                  classNames={inputClass}
                  required
                />
              </Field>
            </div>

            {/* Row 5 — Role */}
            <Field label="Role">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {roleOptions.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => { setForm((f) => ({ ...f, role: r.key })); setError(""); }}
                    className={`relative text-left p-3.5 rounded-xl border transition-all ${
                      form.role === r.key
                        ? "border-primary bg-primary/8 ring-1 ring-primary/30"
                        : "border-default-200 bg-default-50/50 dark:bg-default-100/5 hover:border-default-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldCheck
                        size={13}
                        className={form.role === r.key ? "text-primary" : "text-default-400"}
                      />
                      <span className={`text-xs font-semibold ${form.role === r.key ? "text-primary" : "text-foreground"}`}>
                        {r.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-default-400 leading-relaxed">{r.desc}</p>
                    {form.role === r.key && (
                      <motion.div
                        layoutId="role-indicator"
                        className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </Field>

            {/* Error */}
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

            {/* Submit */}
            <Button
              type="submit"
              color="primary"
              fullWidth
              isDisabled={loading || !isComplete}
              className="rounded-xl font-semibold h-11"
              startContent={!loading && <UserPlus size={15} />}
            >
              {loading
                ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" />Membuat Akun...</span>
                : "Buat Akun"
              }
            </Button>
          </form>

          <p className="text-[11px] text-default-300 text-center mt-6 leading-relaxed">
            Akun yang dibuat langsung aktif dan dapat login.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
