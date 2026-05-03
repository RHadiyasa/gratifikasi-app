"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Button, Input } from "@heroui/react";
import { Save, Loader2, UserCircle2 } from "lucide-react";
import { toast } from "react-toastify";
import { useAuthStore } from "@/store/authStore";
import { ROLE_LABELS } from "@/lib/permissions";

const EMPTY_FORM = {
  name: "",
  nip: "",
  jabatan: "",
  unitKerja: "",
  email: "",
  noTelp: "",
  role: "",
};

export default function ProfilePage() {
  const role = useAuthStore((s) => s.role);
  const user = useAuthStore((s) => s.user);
  const setProfile = useAuthStore((s) => s.setProfile);

  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");
        const { data } = await axios.get("/api/auth/profile");
        if (!active) return;

        const nextForm = {
          name: data.user?.name ?? "",
          nip: data.user?.nip ?? "",
          jabatan: data.user?.jabatan ?? "",
          unitKerja: data.user?.unitKerja ?? "",
          email: data.user?.email ?? "",
          noTelp: data.user?.noTelp ?? "",
          role: data.user?.role ?? "",
        };

        setForm(nextForm);
        setProfile({
          id: data.user?._id ?? user.id ?? null,
          name: data.user?.name ?? null,
          unitKerja: data.user?.unitKerja ?? null,
        });
      } catch (err) {
        if (!active) return;
        setError(
          err?.response?.data?.error ?? "Gagal memuat informasi akun.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, [setProfile, user.id]);

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      const payload = {
        name: form.name,
        nip: form.nip,
        jabatan: form.jabatan,
        unitKerja: form.unitKerja,
        email: form.email,
        noTelp: form.noTelp,
      };

      const { data } = await axios.patch("/api/auth/profile", payload);
      const updatedRole = data.user?.role ?? form.role;
      setForm((prev) => ({ ...prev, role: updatedRole }));
      setProfile({
        id: data.user?._id ?? user.id ?? null,
        name: data.user?.name ?? form.name,
        unitKerja: data.user?.unitKerja ?? form.unitKerja,
      });
      toast.success("Informasi akun berhasil diperbarui.");
    } catch (err) {
      setError(
        err?.response?.data?.error ?? "Gagal menyimpan perubahan akun.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-default-200 bg-content1 p-10 text-center text-default-400">
          <Loader2 size={20} className="mx-auto mb-3 animate-spin" />
          Memuat profile...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <UserCircle2 size={26} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profile Akun</h1>
          <p className="mt-1 text-sm text-default-500">
            Perbarui informasi akun yang sedang digunakan untuk masuk.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-default-200 bg-content1 p-6 shadow-sm">
        <div className="mb-5 grid gap-3 rounded-2xl border border-default-100 bg-default-50 p-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-default-400">
              Nama Akun
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {form.name || user.name || "-"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-default-400">
              Role
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {ROLE_LABELS[role] ?? ROLE_LABELS[form.role] ?? form.role ?? "-"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nama"
              value={form.name}
              onValueChange={(value) => setField("name", value)}
              variant="bordered"
            />
            <Input
              label="NIP"
              value={form.nip}
              onValueChange={(value) => setField("nip", value)}
              variant="bordered"
            />
            <Input
              label="Jabatan"
              value={form.jabatan}
              onValueChange={(value) => setField("jabatan", value)}
              variant="bordered"
            />
            <Input
              label="Unit Kerja"
              value={form.unitKerja}
              onValueChange={(value) => setField("unitKerja", value)}
              variant="bordered"
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onValueChange={(value) => setField("email", value)}
              variant="bordered"
            />
            <Input
              label="No. Telepon"
              value={form.noTelp}
              onValueChange={(value) => setField("noTelp", value)}
              variant="bordered"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              color="primary"
              isDisabled={saving}
              startContent={
                saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />
              }
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
