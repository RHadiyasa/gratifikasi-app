"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  Switch,
  Input,
  Textarea,
  Button,
  Card,
  CardBody,
  CardHeader,
} from "@heroui/react";
import { Settings, Save, Loader2, CheckCircle, AlertCircle, Lock } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { hasPermission } from "@/lib/permissions";

type SettingsData = {
  uploadEnabled: boolean;
  uploadDisabledMessage: string;
  tahunAktif: number | null;
  batchAktif: string;
  deadlineUpload: string | null;
  adminContact: string;
  updatedAt?: string;
  updatedBy?: string | null;
};

export default function ElearningSettingsPage() {
  const router = useRouter();
  const { role, isLoggedIn } = useAuthStore();
  const canManage = hasPermission(role, "elearning:settings:manage");

  const [form, setForm] = useState<SettingsData>({
    uploadEnabled: true,
    uploadDisabledMessage: "",
    tahunAktif: null,
    batchAktif: "",
    deadlineUpload: null,
    adminContact: "",
  });
  const [meta, setMeta] = useState<{ updatedAt?: string; updatedBy?: string | null }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    if (!canManage) {
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      try {
        const res = await axios.get("/api/elearning/settings");
        const data = res.data?.data;
        if (data) {
          setForm({
            uploadEnabled: data.uploadEnabled ?? true,
            uploadDisabledMessage: data.uploadDisabledMessage ?? "",
            tahunAktif: data.tahunAktif ?? null,
            batchAktif: data.batchAktif ?? "",
            deadlineUpload: data.deadlineUpload
              ? new Date(data.deadlineUpload).toISOString().slice(0, 10)
              : null,
            adminContact: data.adminContact ?? "",
          });
          setMeta({ updatedAt: data.updatedAt, updatedBy: data.updatedBy });
        }
      } catch (err) {
        console.error(err);
        setFeedback({ type: "error", message: "Gagal memuat pengaturan." });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isLoggedIn, canManage, router]);

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const payload = {
        uploadEnabled: form.uploadEnabled,
        uploadDisabledMessage: form.uploadDisabledMessage,
        tahunAktif: form.tahunAktif,
        batchAktif: form.batchAktif,
        deadlineUpload: form.deadlineUpload || null,
        adminContact: form.adminContact,
      };
      const res = await axios.patch("/api/elearning/settings", payload);
      const data = res.data?.data;
      setMeta({ updatedAt: data?.updatedAt, updatedBy: data?.updatedBy });
      setFeedback({
        type: "success",
        message: "Pengaturan berhasil disimpan.",
      });
    } catch (err: any) {
      console.error(err);
      setFeedback({
        type: "error",
        message: err.response?.data?.message || "Gagal menyimpan pengaturan.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center mt-20">
        <Loader2 className="w-8 h-8 animate-spin text-default-400" />
        <p className="text-sm text-default-400 mt-3">Memuat pengaturan...</p>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center mt-20 px-6">
        <div className="max-w-md w-full rounded-3xl border border-red-500/30 bg-red-500/5 p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/15 mx-auto mb-5 flex items-center justify-center">
            <Lock size={24} className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold mb-2">Akses Ditolak</h1>
          <p className="text-default-500 text-sm">
            Halaman ini hanya bisa diakses oleh Admin E-Learning atau yang lebih
            tinggi.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <div>
        <p className="text-xs font-semibold text-default-400 uppercase tracking-widest mb-1">
          E-Learning · Pengaturan
        </p>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <Settings size={22} className="text-primary" />
          Pengaturan E-Learning
        </h1>
        <p className="text-sm text-default-500 mt-2">
          Kelola ketersediaan fitur upload sertifikat dan informasi batch aktif.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col items-start gap-1">
          <h2 className="text-base font-semibold">Status Upload Sertifikat</h2>
          <p className="text-xs text-default-500">
            Saat dimatikan, peserta tidak bisa mengupload sertifikat dan akan
            melihat pesan kustom.
          </p>
        </CardHeader>
        <CardBody className="space-y-5">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-default-50 dark:bg-default-100/5">
            <div>
              <p className="font-semibold text-sm">
                {form.uploadEnabled ? "Upload Aktif" : "Upload Dinonaktifkan"}
              </p>
              <p className="text-xs text-default-500 mt-0.5">
                {form.uploadEnabled
                  ? "Peserta dapat mengupload sertifikat."
                  : "Peserta tidak dapat mengupload sertifikat."}
              </p>
            </div>
            <Switch
              isSelected={form.uploadEnabled}
              onValueChange={(val) =>
                setForm((f) => ({ ...f, uploadEnabled: val }))
              }
              size="lg"
            />
          </div>

          <Textarea
            label="Pesan saat upload dimatikan"
            placeholder="Contoh: E-learning batch 1 sudah berakhir. Tunggu pengumuman batch berikutnya."
            value={form.uploadDisabledMessage}
            onChange={(e) =>
              setForm((f) => ({ ...f, uploadDisabledMessage: e.target.value }))
            }
            description="Pesan ini akan ditampilkan ke peserta saat upload dimatikan. Maksimal 500 karakter."
            maxLength={500}
            minRows={3}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex flex-col items-start gap-1">
          <h2 className="text-base font-semibold">Cohort Aktif</h2>
          <p className="text-xs text-default-500">
            Tentukan tahun + batch yang sedang berjalan. Dashboard akan default
            menampilkan data cohort ini. Kosongkan untuk menampilkan semua
            cohort sebagai default.
          </p>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              type="number"
              label="Tahun Aktif"
              placeholder="Contoh: 2026"
              value={form.tahunAktif != null ? String(form.tahunAktif) : ""}
              onChange={(e) => {
                const raw = e.target.value.trim();
                if (!raw) {
                  setForm((f) => ({ ...f, tahunAktif: null }));
                  return;
                }
                const parsed = parseInt(raw, 10);
                setForm((f) => ({
                  ...f,
                  tahunAktif: isNaN(parsed) ? null : parsed,
                }));
              }}
              min={2020}
              max={2100}
            />
            <Input
              label="Batch Aktif"
              placeholder='Contoh: "1" atau "2"'
              value={form.batchAktif}
              onChange={(e) =>
                setForm((f) => ({ ...f, batchAktif: e.target.value }))
              }
              maxLength={100}
              description="Isi dengan angka batch saja (1, 2, dst). Akan ditampilkan ke peserta."
            />
          </div>
          <Input
            type="date"
            label="Deadline Upload"
            value={form.deadlineUpload ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                deadlineUpload: e.target.value || null,
              }))
            }
            description="Hanya bersifat informatif untuk peserta. Setelah tanggal ini, upload tidak otomatis dimatikan — Anda tetap perlu mengubah toggle di atas."
          />
          <Textarea
            label="Kontak Admin E-Learning"
            placeholder="Contoh: Hubungi Bu Ani via Telegram @ani_esdm atau email ani@esdm.go.id"
            value={form.adminContact}
            onChange={(e) =>
              setForm((f) => ({ ...f, adminContact: e.target.value }))
            }
            description="Ditampilkan ke peserta di halaman upload sebagai info kontak jika namanya tidak terdaftar."
            maxLength={500}
            minRows={2}
          />
        </CardBody>
      </Card>

      {feedback && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${
            feedback.type === "success"
              ? "bg-green-500/10 text-green-600 border border-green-500/20"
              : "bg-red-500/10 text-red-600 border border-red-500/20"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {meta.updatedAt && (
        <p className="text-xs text-default-400">
          Terakhir diubah:{" "}
          {new Date(meta.updatedAt).toLocaleString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {meta.updatedBy ? ` oleh ${meta.updatedBy}` : ""}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button
          color="primary"
          variant="shadow"
          size="lg"
          onPress={handleSave}
          isDisabled={saving}
          startContent={
            saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )
          }
        >
          {saving ? "Menyimpan..." : "Simpan Pengaturan"}
        </Button>
      </div>
    </div>
  );
}
