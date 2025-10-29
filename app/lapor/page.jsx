"use client";
import { useState } from "react";
import {
  Input,
  Button,
  Select,
  SelectItem,
  Checkbox,
  Textarea,
  ToastProvider,
  Divider,
  RadioGroup,
  Radio,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import { toast } from "react-toastify";
import { reportService } from "@/service/createReport.service";
import { generatePdfService } from "@/service/generatePdf.service";

export default function LaporPage() {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [form, setForm] = useState({
    secretReport: false,
    reportType: "",
    nama: "",
    nip: "",
    tempatLahir: "",
    tanggalLahir: "",
    instansiPelapor: "",
    jabatanPelapor: "",
    emailPelapor: "",
    alamatPelapor: "",
    kecamatanPelapor: "",
    kabupatenPelapor: "",
    provinsiPelapor: "",
    noTelpPelapor: "",
    noTelpReferensi: "",

    namaPemberi: "",
    instansiPemberi: "",
    alamatPemberi: "",
    relasi: "",
    relasiLainnya: "",
    alasan: "",

    peristiwaGratifikasi: "",
    peristiwaGratifikasiLainnya: "",
    lokasiObjekGratifikasi: "",
    lokasiObjekGratifikasiLainnya: "",
    objekGratifikasi: "",
    objekGratifikasiLainnya: "",
    uraianObjekGratifikasi: "",
    perkiraanNilai: "",

    tanggalPenerimaan: "",
    tanggalLapor: "",
    tempatPenerimaan: "",
    uraianGratifikasi: "",

    kompensasiPelaporan: false,
  });

  // 🔹 Relasi Options
  const relasiOptions = [
    "Merupakan Pemberan dalam keluarga",
    "Penyedia Barang & Jasa/Penerima Layanan/terkait Pengawasan/Pemeriksaan",
    "Antara sesama Pegawai di lingkungan internal instansi",
    "Identitas Pemberi tidak diketahui",
    "Lainnya",
  ];

  const peristiwaOptions = [
    "Pemberian dalam rangka pisah sambut/pensiun/mutasi jabatan/ulang tahun",
    "Pemberian terkait dengan pelaksanaan Tugas Pokok dan Fungsi (Tupoksi)",
    "Pemberian tidak terkait dengan pelaksanaan Tugas Pokok dan Fungsi (Tupoksi)",
    "Pemberian terkait dengan pernikahan/upacara adat/agama lainnya atau terkait musibah/bencana (Lebih dari 1,000,000 per Orang)",
    "Keuntungan Investasi/Manfaat dari Koperasi/Hadiah Undian atau Langsung",
    "Lainnya",
  ];

  const lokasiOptions = [
    "Disimpan Pelapor",
    "Dititipkan di UPG",
    "Dititipkan di KPK",
    "Lainnya",
  ];

  const objekOptions = [
    "Hidangan/Oleh-oleh/Makanan/Minuman kemasan dengan masa berlaku",
    "Karangan Bunga/Cindera mata/Plakat/Barang dengan logo instansi pemberi",
    "Barang lainnya",
    "Tiket Perjalanan/Fasilitas Penginapan/Fasilitas lainnya",
    "Uang/Alat tukar lainnya",
  ];

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    try {
      const uniqueId = `UPG-${new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "")}-${Math.floor(Math.random() * 900 + 100)}`;

      const dataToSend = { ...form, uniqueId };

      const res = await reportService(dataToSend);

      // if (!res.success) {
      //   toast.error("❌ Gagal mengirim laporan");
      //   return;
      // }

      // 🔹 Generate PDF setelah laporan sukses
      const pdfRes = await generatePdfService(dataToSend);
      if (pdfRes.success) {
        toast.success("✅ Laporan berhasil dikirim & PDF berhasil dibuat!");
      } else {
        toast.warn("⚠️ Laporan terkirim, tapi gagal membuat PDF");
      }

      console.log("Laporan:", res.data);
    } catch (err) {
      console.error(err);
      toast.error("❌ Terjadi kesalahan saat mengirim laporan");
    }
  };

  return (
    <div className="mx-auto bg-background shadow-md p-2 space-y-4">
      <ToastProvider />
      <h1 className="text-3xl font-bold mb-2 text-center py-5">
        Form Pelaporan Gratifikasi
      </h1>

      {/* Jenis Laporan */}
      <div className="grid md:grid-cols-2 gap-4">
        <Select
          label="Jenis Laporan"
          onChange={(e) => handleChange("reportType", e.target.value)}
        >
          <SelectItem key="Laporan Penerimaan" value="Laporan Penerimaan">
            Laporan Penerimaan
          </SelectItem>
          <SelectItem key="Laporan Penolakan" value="Laporan Penolakan">
            Laporan Penolakan
          </SelectItem>
        </Select>

        <Checkbox
          isSelected={form.secretReport}
          onChange={(e) => handleChange("secretReport", e.target.checked)}
        >
          <p className="text-sm lg:text-base">Laporan Ini Bersifat Rahasia</p>
        </Checkbox>
      </div>

      <Divider />
      {/* Data Pelapor */}
      <h2 className="font-semibold mt-4">🧍‍♂️ Data Pelapor</h2>
      <div className="grid gap-4">
        <div className="flex flex-col md:flex-row gap-3">
          <Input
            label="Nama"
            onChange={(e) => handleChange("nama", e.target.value)}
          />
          <Input
            label="NIP"
            onChange={(e) => handleChange("nip", e.target.value)}
          />
        </div>
        <div className="flex flex-row gap-2 sm:gap-3">
          <Input
            className="w-2/3 sm:w-full"
            label="Tempat Lahir"
            onChange={(e) => handleChange("tempatLahir", e.target.value)}
          />
          <Input
            className="w-1/3 sm:w-full"
            type="date"
            label="Tanggal Lahir"
            onChange={(e) => handleChange("tanggalLahir", e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            label="Instansi Pelapor"
            onChange={(e) => handleChange("instansiPelapor", e.target.value)}
          />
          <Input
            label="Jabatan"
            onChange={(e) => handleChange("jabatanPelapor", e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            label="Email"
            onChange={(e) => handleChange("emailPelapor", e.target.value)}
          />
          <Input
            label="No Telepon"
            onChange={(e) => handleChange("noTelpPelapor", e.target.value)}
          />
        </div>
      </div>

      <Textarea
        label="Alamat"
        onChange={(e) => handleChange("alamatPelapor", e.target.value)}
      />

      <div className="grid gap-3">
        <div className="flex gap-3">
          <Input
            label="Kecamatan"
            onChange={(e) => handleChange("kecamatanPelapor", e.target.value)}
          />
          <Input
            label="Kabupaten/Kota"
            onChange={(e) => handleChange("kabupatenPelapor", e.target.value)}
          />
        </div>
        <div>
          <Input
            label="Provinsi"
            onChange={(e) => handleChange("provinsiPelapor", e.target.value)}
          />
        </div>
      </div>

      <Divider />

      {/* Data Pemberi */}
      <h2 className="font-semibold mt-4">🎁 Pemberi Gratifikasi</h2>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Nama Pemberi"
          onChange={(e) => handleChange("namaPemberi", e.target.value)}
        />
        <Input
          label="Instansi Pemberi"
          onChange={(e) => handleChange("instansiPemberi", e.target.value)}
        />
      </div>
      <Textarea
        label="Alamat Pemberi"
        onChange={(e) => handleChange("alamatPemberi", e.target.value)}
      />

      <Select
        label="Hubungan / Relasi"
        onChange={(e) => handleChange("relasi", e.target.value)}
      >
        {relasiOptions.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {opt}
          </SelectItem>
        ))}
      </Select>
      {form.relasi === "Lainnya" && (
        <Input
          variant="bordered"
          color="default"
          label="Jelaskan Relasi Lainnya"
          onChange={(e) => handleChange("relasiLainnya", e.target.value)}
        />
      )}
      <Textarea
        label="Alasan Pemberian"
        onChange={(e) => handleChange("alasan", e.target.value)}
      />

      <Divider />
      {/* Data Objek Gratifikasi */}
      <h2 className="font-semibold mt-4">💰 Data Objek Gratifikasi</h2>

      <Select
        label="Peristiwa Gratifikasi"
        onChange={(e) => handleChange("peristiwaGratifikasi", e.target.value)}
      >
        {peristiwaOptions.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {opt}
          </SelectItem>
        ))}
      </Select>
      {form.peristiwaGratifikasi === "Lainnya" && (
        <Input
          label="Peristiwa Lainnya"
          variant="bordered"
          onChange={(e) =>
            handleChange("peristiwaGratifikasiLainnya", e.target.value)
          }
        />
      )}

      <Select
        label="Lokasi Objek Gratifikasi"
        onChange={(e) => handleChange("lokasiObjekGratifikasi", e.target.value)}
      >
        {lokasiOptions.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {opt}
          </SelectItem>
        ))}
      </Select>
      {form.lokasiObjekGratifikasi === "Lainnya" && (
        <Input
          label="Lokasi Lainnya"
          variant="bordered"
          onChange={(e) =>
            handleChange("lokasiObjekGratifikasiLainnya", e.target.value)
          }
        />
      )}

      <Select
        label="Objek Gratifikasi"
        onChange={(e) => handleChange("objekGratifikasi", e.target.value)}
      >
        {objekOptions.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {opt}
          </SelectItem>
        ))}
      </Select>
      {form.objekGratifikasi &&
        form.objekGratifikasi.toLowerCase().includes("lainnya") && (
          <Input
            variant="bordered"
            label="Objek Lainnya"
            onChange={(e) =>
              handleChange("objekGratifikasiLainnya", e.target.value)
            }
          />
        )}

      <Textarea
        label="Uraian Objek Gratifikasi"
        onChange={(e) => handleChange("uraianObjekGratifikasi", e.target.value)}
      />
      <Input
        type="number"
        label="Perkiraan Nilai (Rp)"
        onChange={(e) => handleChange("perkiraanNilai", e.target.value)}
      />

      <Divider />
      {/* Kronologi */}
      <h2 className="font-semibold mt-4">📅 Kronologi Gratifikasi</h2>
      <div className="grid gap-4">
        <div className="flex gap-3">
          <Input
            type="date"
            label="Tanggal Penerimaan"
            onChange={(e) => handleChange("tanggalPenerimaan", e.target.value)}
          />
          <Input
            type="date"
            label="Tanggal Lapor"
            onChange={(e) => handleChange("tanggalLapor", e.target.value)}
          />
        </div>
        <Input
          label="Tempat Penerimaan"
          onChange={(e) => handleChange("tempatPenerimaan", e.target.value)}
        />
      </div>
      <Textarea
        label="Uraian Gratifikasi"
        onChange={(e) => handleChange("uraianGratifikasi", e.target.value)}
      />
      <div className="flex gap-5 items-center justify-between py-4 mx-auto">
        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="text-2xl text-center font-semibold">
                  Permohonan kompensasi Objek Gratifikasi
                </ModalHeader>
                <ModalBody>
                  <p className="text-sm text-center">
                    Pelapor gratifikasi bersedia untuk menyerahkan uang sebagai
                    kompensasi atas barang yang diterimanya sebesar nilai yang
                    tercantum dalam Surat Keputusan Pimpinan KPK. Permintaan
                    kompensasi yang telah mendapatkan persetujuan KPK tidak
                    dapat dibatalkan sepihak oleh pelapor.
                  </p>
                  <RadioGroup
                    label=""
                    value={form.kompensasiPelaporan ? "true" : "false"}
                    onValueChange={(value) =>
                      handleChange("kompensasiPelaporan", value === "true")
                    }
                    orientation="horizontal"
                    className="flex items-center gap-4"
                  >
                    <Radio
                      value="true"
                      className="text-sm font-semibold text-amber-100"
                    >
                      Iya
                    </Radio>
                    <Radio
                      value="false"
                      className="text-sm font-semibold text-amber-100"
                    >
                      Tidak
                    </Radio>
                  </RadioGroup>
                </ModalBody>
                <ModalFooter className="flex flex-col">
                  <p className="text-xs text-center text-foreground/50 italic">
                    Fitur Aktualisasi sementara di Non-Aktifkan hingga Kegiatan E-Learning Gratifikasi selesai
                  </p>
                  <Button
                    onPress={handleSubmit}
                    variant="shadow"
                    color="primary"
                    isDisabled
                    fullWidth
                  >
                    (Fitur Non Aktif)
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
        <div className="grid gap-4">
          <div className="">
            <Button className="w-full" color="primary" onPress={onOpen}>
              Kirim Laporan
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
