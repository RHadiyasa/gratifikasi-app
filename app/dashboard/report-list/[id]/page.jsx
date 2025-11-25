"use client";

import { useParams, useRouter } from "next/navigation";
import { useReportById } from "@/hooks/useReportById";
import { Select, SelectItem, Button } from "@heroui/react";
import { useState } from "react";
import ConfirmModal from "@/components/confirmModal";
import DashboardBreadcrumb from "../../_components/DashboardBreadcumb";

export default function ReportDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data, loading, error, setData } = useReportById(id);

  const [modalDelete, setModalDelete] = useState(false);
  const [modalStatus, setModalStatus] = useState(false);
  const [tempStatus, setTempStatus] = useState("");

  const STATUS_OPTIONS = [
    "Diajukan",
    "Diverifikasi",
    "Diteruskan ke KPK",
    "Selesai",
  ];

  const confirmUpdateStatus = async () => {
    const res = await fetch(`/api/report/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: tempStatus }),
    });

    const json = await res.json();

    if (res.ok) {
      setData((prev) => ({ ...prev, status: tempStatus }));
    } else {
      console.log("Error update status:", json.message);
    }

    setModalStatus(false); // tutup modal
  };

  const onSelectStatus = (newStatus) => {
    setTempStatus(newStatus);
    setModalStatus(true); // buka modal
  };

  // --------------------------------------------------------------------------------
  // DELETE LAPORAN
  // --------------------------------------------------------------------------------
  const confirmDelete = async () => {
    const res = await fetch(`/api/report/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      router.push("/dashboard/report-list");
    } else {
      console.log("Gagal menghapus laporan");
    }

    setModalDelete(false);
  };

  // --------------------------------------------------------------------------------

  if (loading) return <p className="p-4">Loading...</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;
  if (!data) return <p className="p-4">Data tidak ditemukan</p>;

  return (
    <div className="p-4 space-y-6 mx-40">
      <DashboardBreadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Report List", href: "/dashboard/report-list" },
          { label: `Laporan #${data.uniqueId}` }, // halaman aktif
        ]}
      />

      <h1 className="text-xl font-semibold">Detail Laporan #{data.uniqueId}</h1>

      <div className="flex items-center gap-3">
        <Select
          label="Ubah Status"
          selectedKeys={[data.status]}
          onChange={(e) => onSelectStatus(e.target.value)}
          className="max-w-xs"
          size="sm"
        >
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s}>{s}</SelectItem>
          ))}
        </Select>

        <Button
          color="danger"
          variant="flat"
          onPress={() => setModalDelete(true)}
        >
          Hapus Laporan
        </Button>
      </div>

      <div className="bg-background shadow p-4 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h2 className="font-semibold mb-2">Data Pelapor</h2>
          <p>
            <strong>Nama:</strong> {data.nama}
          </p>
          <p>
            <strong>NIP:</strong> {data.nip}
          </p>
          <p>
            <strong>Instansi:</strong> {data.instansiPelapor}
          </p>
          <p>
            <strong>Jabatan:</strong> {data.jabatanPelapor}
          </p>
          <p>
            <strong>Email:</strong> {data.emailPelapor}
          </p>
          <p>
            <strong>No Telp:</strong> {data.noTelpPelapor}
          </p>
          <p>
            <strong>Alamat:</strong> {data.alamatPelapor}
          </p>
        </div>

        <div>
          <h2 className="font-semibold mb-2">Data Pemberi</h2>
          <p>
            <strong>Nama:</strong> {data.namaPemberi}
          </p>
          <p>
            <strong>Instansi:</strong> {data.instansiPemberi}
          </p>
          <p>
            <strong>Alamat:</strong> {data.alamatPemberi}
          </p>
          <p>
            <strong>Relasi:</strong> {data.relasi} {data.relasiLainnya}
          </p>
          <p>
            <strong>Alasan:</strong> {data.alasan}
          </p>
        </div>

        <div>
          <h2 className="font-semibold mb-2">Objek Gratifikasi</h2>
          <p>
            <strong>Objek:</strong> {data.objekGratifikasi}{" "}
            {data.objekGratifikasiLainnya}
          </p>
          <p>
            <strong>Nilai:</strong> Rp{" "}
            {Number(data.perkiraanNilai).toLocaleString("id-ID")}
          </p>
          <p>
            <strong>Uraian:</strong> {data.uraianObjekGratifikasi}
          </p>
        </div>

        <div>
          <h2 className="font-semibold mb-2">Informasi Lain</h2>
          <p>
            <strong>Tanggal Penerimaan:</strong>{" "}
            {new Date(data.tanggalPenerimaan).toLocaleDateString("id-ID")}
          </p>
          <p>
            <strong>Tanggal Lapor:</strong>{" "}
            {new Date(data.tanggalLapor).toLocaleDateString("id-ID")}
          </p>
          <p>
            <strong>Kerahasiaan:</strong>{" "}
            {data.secretReport ? "Rahasia" : "Tidak"}
          </p>
          <p>
            <strong>Status:</strong> {data.status}
          </p>
        </div>
      </div>

      {/* ---------------------------- */}
      {/* MODAL UPDATE STATUS */}
      {/* ---------------------------- */}
      <ConfirmModal
        isOpen={modalStatus}
        onClose={() => setModalStatus(false)}
        title="Konfirmasi Perubahan Status"
        message={`Ubah status menjadi "${tempStatus}"?`}
        confirmText="Ubah"
        onConfirm={confirmUpdateStatus}
      />

      {/* ---------------------------- */}
      {/* MODAL DELETE */}
      {/* ---------------------------- */}
      <ConfirmModal
        isOpen={modalDelete}
        onClose={() => setModalDelete(false)}
        title="Hapus Laporan"
        message="Laporan ini akan dihapus secara permanen. Yakin ingin melanjutkan?"
        confirmText="Hapus"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
