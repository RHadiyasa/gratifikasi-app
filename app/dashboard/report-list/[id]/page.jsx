"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Select, SelectItem, Skeleton } from "@heroui/react";
import { ArrowLeft, Download, Trash2 } from "lucide-react";

import { useReportById } from "@/hooks/useReportById";
import ConfirmModal from "@/components/confirmModal";
import DashboardBreadcrumb from "../../_components/DashboardBreadcumb";
import { PageHeader, Panel, PanelHeader } from "@/components/dashboard/PageHeader";
import {
  Chip,
  StatusChip,
  STATUS_OPTIONS,
} from "@/components/dashboard/StatusChip";
import { ErrorState } from "@/components/dashboard/States";
import { FieldSkeleton } from "@/components/dashboard/Skeletons";

const tanggal = (nilai) => {
  if (!nilai) return "—";
  const d = new Date(nilai);

  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
};

const rupiah = (nilai) =>
  Number.isFinite(Number(nilai))
    ? `Rp ${Number(nilai).toLocaleString("id-ID")}`
    : "—";

/** Satu baris label + isi. Nilai kosong tampil sebagai em dash, bukan kosong. */
const Field = ({ label, value, wide = false }) => (
  <div className={wide ? "sm:col-span-2" : undefined}>
    <p className="text-xs font-medium uppercase tracking-wider text-default-400">
      {label}
    </p>
    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
      {value === null || value === undefined || value === "" ? (
        <span className="text-default-300">—</span>
      ) : (
        value
      )}
    </p>
  </div>
);

const SectionGrid = ({ children }) => (
  <div className="grid grid-cols-1 gap-x-6 gap-y-5 p-5 sm:grid-cols-2">
    {children}
  </div>
);

export default function ReportDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data, loading, error, setData } = useReportById(id);

  const [modalDelete, setModalDelete] = useState(false);
  const [modalStatus, setModalStatus] = useState(false);
  const [tempStatus, setTempStatus] = useState("");
  const [proses, setProses] = useState(false);
  const [pesanGagal, setPesanGagal] = useState("");

  const confirmUpdateStatus = async () => {
    setProses(true);
    setPesanGagal("");

    try {
      const res = await fetch(`/api/report/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: tempStatus }),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.message || "Gagal memperbarui status");

      setData((prev) => ({ ...prev, status: tempStatus }));
      setModalStatus(false);
    } catch (e) {
      setPesanGagal(e.message);
    } finally {
      setProses(false);
    }
  };

  const confirmDelete = async () => {
    setProses(true);
    setPesanGagal("");

    try {
      const res = await fetch(`/api/report/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));

        throw new Error(json.message || "Gagal menghapus laporan");
      }

      router.push("/dashboard/report-list");
    } catch (e) {
      setPesanGagal(e.message);
      setProses(false);
      setModalDelete(false);
    }
  };

  const breadcrumb = (
    <DashboardBreadcrumb
      items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Daftar Laporan", href: "/dashboard/report-list" },
        { label: data?.uniqueId ? `#${data.uniqueId}` : "Detail" },
      ]}
    />
  );

  const bungkus = (isi) => (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-6">
      {breadcrumb}
      {isi}
    </div>
  );

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return bungkus(
      <>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28 rounded-md" />
            <Skeleton className="h-8 w-64 rounded-lg" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-40 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        </div>

        {[0, 1].map((i) => (
          <Panel key={i}>
            <div className="border-b border-default-100 px-5 py-4">
              <Skeleton className="h-4 w-36 rounded-md" />
            </div>
            <SectionGrid>
              {[0, 1, 2, 3].map((j) => (
                <FieldSkeleton key={j} />
              ))}
            </SectionGrid>
          </Panel>
        ))}
      </>
    );
  }

  if (error || !data) {
    return bungkus(
      <Panel>
        <ErrorState
          message={error || "Laporan yang Anda cari tidak ditemukan."}
          title={error ? "Gagal memuat laporan" : "Laporan tidak ditemukan"}
          onRetry={() => router.refresh()}
        />
        <div className="flex justify-center pb-8">
          <Button
            size="sm"
            startContent={<ArrowLeft size={14} />}
            variant="flat"
            onPress={() => router.push("/dashboard/report-list")}
          >
            Kembali ke daftar
          </Button>
        </div>
      </Panel>
    );
  }

  return bungkus(
    <>
      <PageHeader
        actions={
          <>
            <Select
              aria-label="Ubah status laporan"
              className="w-48"
              selectedKeys={data.status ? [data.status] : []}
              size="sm"
              variant="bordered"
              onChange={(e) => {
                if (!e.target.value || e.target.value === data.status) return;
                setTempStatus(e.target.value);
                setModalStatus(true);
              }}
            >
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s}>{s}</SelectItem>
              ))}
            </Select>

            <Button
              as="a"
              color="primary"
              download
              href={`/api/generate-pdf/${id}`}
              size="sm"
              startContent={<Download size={15} />}
              variant="flat"
            >
              Unduh PDF
            </Button>

            <Button
              isIconOnly
              aria-label="Hapus laporan"
              color="danger"
              size="sm"
              variant="light"
              onPress={() => setModalDelete(true)}
            >
              <Trash2 size={15} />
            </Button>
          </>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusChip status={data.status} />
            {data.secretReport && <Chip tone="rose">Rahasia</Chip>}
            <Chip tone={data.reportType === "Laporan Penerimaan" ? "blue" : "slate"}>
              {data.reportType?.replace("Laporan ", "") || "—"}
            </Chip>
          </span>
        }
        eyebrow="Detail Laporan"
        title={`#${data.uniqueId}`}
      />

      {pesanGagal && (
        <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger dark:border-danger-500/30 dark:bg-danger-500/10">
          {pesanGagal}
        </div>
      )}

      <Panel>
        <PanelHeader eyebrow="Identitas" title="Data Pelapor" />
        <SectionGrid>
          <Field label="Nama" value={data.nama} />
          <Field label="NIP" value={data.nip} />
          <Field label="Instansi" value={data.instansiPelapor} />
          <Field label="Jabatan" value={data.jabatanPelapor} />
          <Field label="Email" value={data.emailPelapor} />
          <Field label="No. Telepon" value={data.noTelpPelapor} />
          <Field
            label="Pihak lain yang dapat dihubungi"
            value={
              [data.namaReferensi, data.noTelpReferensi]
                .filter(Boolean)
                .join(" · ") || ""
            }
          />
          <Field
            label="Tempat / Tanggal Lahir"
            value={
              data.tempatLahir || data.tanggalLahir
                ? `${data.tempatLahir || "—"}, ${tanggal(data.tanggalLahir)}`
                : ""
            }
          />
          <Field
            label="Alamat"
            value={
              [
                data.alamatPelapor,
                data.kecamatanPelapor,
                data.kabupatenPelapor,
                data.provinsiPelapor,
              ]
                .filter(Boolean)
                .join(", ")
            }
            wide
          />
        </SectionGrid>
      </Panel>

      <Panel>
        <PanelHeader eyebrow="Sumber" title="Data Pemberi" />
        <SectionGrid>
          <Field label="Nama Pemberi" value={data.namaPemberi} />
          <Field label="Instansi Pemberi" value={data.instansiPemberi} />
          <Field label="Alamat Pemberi" value={data.alamatPemberi} wide />
          <Field
            label="Relasi"
            value={
              data.relasi === "Lainnya" ? data.relasiLainnya : data.relasi
            }
            wide
          />
          <Field label="Alasan Pemberian" value={data.alasan} wide />
        </SectionGrid>
      </Panel>

      <Panel>
        <PanelHeader eyebrow="Penerimaan" title="Objek Gratifikasi" />
        <SectionGrid>
          <Field
            label="Objek"
            value={
              data.objekGratifikasi?.toLowerCase().includes("lainnya")
                ? data.objekGratifikasiLainnya
                : data.objekGratifikasi
            }
          />
          <Field label="Perkiraan Nilai" value={rupiah(data.perkiraanNilai)} />
          <Field
            label="Peristiwa"
            value={
              data.peristiwaGratifikasi === "Lainnya"
                ? data.peristiwaGratifikasiLainnya
                : data.peristiwaGratifikasi
            }
          />
          <Field
            label="Lokasi Objek"
            value={
              data.lokasiObjekGratifikasi === "Lainnya"
                ? data.lokasiObjekGratifikasiLainnya
                : data.lokasiObjekGratifikasi
            }
          />
          <Field label="Uraian Objek" value={data.uraianObjekGratifikasi} wide />
        </SectionGrid>
      </Panel>

      <Panel>
        <PanelHeader eyebrow="Kronologi" title="Waktu & Uraian Kejadian" />
        <SectionGrid>
          <Field
            label="Tanggal Penerimaan"
            value={tanggal(data.tanggalPenerimaan)}
          />
          <Field label="Tanggal Lapor" value={tanggal(data.tanggalLapor)} />
          <Field label="Tempat Penerimaan" value={data.tempatPenerimaan} wide />
          <Field label="Uraian Kejadian" value={data.uraianGratifikasi} wide />
          <Field
            label="Bersedia Memberikan Kompensasi"
            value={data.kompensasiPelaporan ? "Ya" : "Tidak"}
          />
          <Field label="Laporan Dibuat" value={tanggal(data.createdAt)} />
        </SectionGrid>
      </Panel>

      <ConfirmModal
        confirmColor="primary"
        confirmText="Ubah Status"
        isLoading={proses}
        isOpen={modalStatus}
        message={`Ubah status laporan menjadi "${tempStatus}"?`}
        title="Konfirmasi Perubahan Status"
        onClose={() => setModalStatus(false)}
        onConfirm={confirmUpdateStatus}
      />

      <ConfirmModal
        confirmText="Hapus Permanen"
        isLoading={proses}
        isOpen={modalDelete}
        message="Laporan ini akan dihapus secara permanen dan tidak dapat dikembalikan. Yakin ingin melanjutkan?"
        title="Hapus Laporan"
        onClose={() => setModalDelete(false)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
