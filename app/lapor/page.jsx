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
import {
  relasiOptions,
  peristiwaOptions,
  lokasiOptions,
  objekOptions,
} from "@/modules/data/reportOption";
import { Loader2 } from "lucide-react";

export default function LaporPage() {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure(); // Tambahkan onClose
  const [isLoading, setIsLoading] = useState(false);
  const [reportId, setReportId] = useState(null); // State baru untuk menyimpan ID laporan
  const [isSubmitted, setIsSubmitted] = useState(false); // State baru untuk menandakan sudah submit

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

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };
  
  // Fungsi untuk membuka modal konfirmasi
  const handleOpenConfirmModal = () => {
    setIsSubmitted(false); // Pastikan state submit direset saat membuka konfirmasi
    setReportId(null);
    onOpen();
  };


  const handleSubmit = async () => {
    console.log(form);
    console.log("nama : ", form.nama);

    try {
      setIsLoading(true);
      
      // LOGIC PEMBUATAN uniqueId dipindahkan di sini
      const uniqueId = `UPG-${new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "")}-${Math.floor(Math.random() * 900 + 100)}`;
      
      const dataToSend = { ...form, uniqueId };

      const res = await reportService(dataToSend);
      // Generate PDF setelah laporan sukses
      const pdfRes = await generatePdfService(dataToSend);
      
      if (pdfRes.success) {
        toast.success("✅ Laporan berhasil dikirim & PDF berhasil dibuat!");
      } else {
        toast.warn("⚠️ Laporan terkirim, tapi gagal membuat PDF");
      }

      console.log("Laporan:", res.data);
      
      // SET STATE HASIL:
      setReportId(uniqueId); // Simpan uniqueId ke state
      setIsSubmitted(true); // Tandai bahwa submit berhasil
      // Modal sudah terbuka, jadi tidak perlu onOpen() lagi

    } catch (err) {
      console.error(err);
      toast.error("❌ Terjadi kesalahan saat mengirim laporan");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-10 lg:mx-40 bg-background p-2 space-y-4">
      <ToastProvider />
      <h1 className="text-3xl font-bold mb-2 text-center py-5">
        Form Pelaporan Gratifikasi
      </h1>
      
      {/* ... (Semua input form tetap sama) ... */}

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
        <Modal
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          size="4xl"
          scrollBehavior="outside"
          // Tambahkan properti isDismissable untuk hasil sukses
          isDismissable={isSubmitted && reportId !== null} 
        >
          <ModalContent>
            {(onClose) => (
              <>
                {reportId && isSubmitted ? (
                  // ===============================
                  // KONTEN MODAL SETELAH SUBMIT SUKSES
                  // ===============================
                  <>
                    <ModalHeader className="text-2xl text-center font-semibold text-green-600">
                      ✅ Laporan Berhasil Dikirim!
                    </ModalHeader>
                    <ModalBody className="text-center">
                      <p className="text-lg">
                        Terima kasih atas laporan yang Anda sampaikan.
                      </p>
                      <div className="my-4 p-4 border-2 border-green-400 bg-green-50 rounded-lg">
                        <h4 className="text-xl font-bold text-green-700">
                          Nomor Pelaporan Anda:
                        </h4>
                        <p className="text-3xl font-extrabold text-green-900 mt-2 select-all">
                          {reportId}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 italic">
                        Mohon catat dan simpan Nomor Pelaporan ini untuk
                        keperluan tindak lanjut.
                      </p>
                    </ModalBody>
                    <ModalFooter>
                      <Button onPress={onClose} color="primary" fullWidth>
                        Selesai
                      </Button>
                    </ModalFooter>
                  </>
                ) : (
                  // ===============================
                  // KONTEN MODAL KONFIRMASI (SEBELUM SUBMIT)
                  // ===============================
                  <>
                    <ModalHeader className="text-2xl text-center font-semibold">
                      Konfirmasi Data Laporan
                    </ModalHeader>

                    <ModalBody>
                      <div className="space-y-6 text-sm">
                        {/* ======================== */}
                        {/* DATA PELAPOR & DATA PEMBERI */}
                        {/* ======================== */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* DATA PELAPOR */}
                          <div>
                            <h4 className="font-semibold mb-2">
                              🧍 Data Pelapor
                            </h4>

                            <p>
                              <span className="font-semibold">Nama:</span>{" "}
                              {form.nama || "-"}
                            </p>
                            <p>
                              <span className="font-semibold">NIP:</span>{" "}
                              {form.nip || "-"}
                            </p>
                            <p>
                              <span className="font-semibold">
                                Tempat, Tanggal Lahir:
                              </span>{" "}
                              {form.tempatLahir || "-"},{" "}
                              {form.tanggalLahir || "-"}
                            </p>
                            <p>
                              <span className="font-semibold">Instansi:</span>{" "}
                              {form.instansiPelapor || "-"}
                            </p>
                            <p>
                              <span className="font-semibold">Jabatan:</span>{" "}
                              {form.jabatanPelapor || "-"}
                            </p>
                            <p>
                              <span className="font-semibold">Email:</span>{" "}
                              {form.emailPelapor || "-"}
                            </p>
                            <p>
                              <span className="font-semibold">No. Telp:</span>{" "}
                              {form.noTelpPelapor || "-"}
                            </p>
                            <p>
                              <span className="font-semibold">Alamat:</span>{" "}
                              {form.alamatPelapor || "-"}
                            </p>
                          </div>

                          {/* DATA PEMBERI */}
                          <div>
                            <h4 className="font-semibold mb-2">
                              🎁 Pemberi Gratifikasi
                            </h4>

                            <p>
                              <span className="font-semibold">
                                Nama Pemberi:
                              </span>{" "}
                              {form.namaPemberi || "-"}
                            </p>
                            <p>
                              <span className="font-semibold">
                                Instansi Pemberi:
                              </span>{" "}
                              {form.instansiPemberi || "-"}
                            </p>
                            <p>
                              <span className="font-semibold">Alamat:</span>{" "}
                              {form.alamatPemberi || "-"}
                            </p>
                            <p>
                              <span className="font-semibold">Relasi:</span>{" "}
                              {form.relasi === "Lainnya"
                                ? form.relasiLainnya
                                : form.relasi || "-"}
                            </p>
                            <p>
                              <span className="font-semibold">Alasan:</span>{" "}
                              {form.alasan || "-"}
                            </p>
                          </div>
                        </div>

                        {/* ======================== */}
                        {/* OBJEK & KRONOLOGI */}
                        {/* ======================== */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* OBJEK GRATIFIKASI */}
                          <div>
                            <h4 className="font-semibold mb-2">
                              💰 Data Objek Gratifikasi
                            </h4>

                            <p>
                              <span className="font-semibold">Peristiwa:</span>{" "}
                              {form.peristiwaGratifikasi === "Lainnya"
                                ? form.peristiwaGratifikasiLainnya
                                : form.peristiwaGratifikasi || "-"}
                            </p>
                            <p>
                              <span className="font-semibold">Lokasi:</span>{" "}
                              {form.lokasiObjekGratifikasi === "Lainnya"
                                ? form.lokasiObjekGratifikasiLainnya
                                : form.lokasiObjekGratifikasi || "-"}
                            </p>
                            <p>
                              <span className="font-semibold">Objek:</span>{" "}
                              {form.objekGratifikasi
                                ?.toLowerCase()
                                .includes("lainnya")
                                ? form.objekGratifikasiLainnya
                                : form.objekGratifikasi || "-"}
                            </p>
                            <p>
                              <span className="font-semibold">
                                Uraian Objek:
                              </span>{" "}
                              {form.uraianObjekGratifikasi || "-"}
                            </p>
                            <p>
                              <span className="font-semibold">
                                Perkiraan Nilai:
                              </span>{" "}
                              Rp{" "}
                              {Number(form.perkiraanNilai).toLocaleString(
                                "id-ID"
                              )}
                            </p>
                          </div>

                          {/* KRONOLOGI */}
                          <div>
                            <h4 className="font-semibold mb-2">
                              📅 Kronologi Gratifikasi
                            </h4>

                            <p>
                              <span className="font-semibold">
                                Tanggal Penerimaan:
                              </span>{" "}
                              {form.tanggalPenerimaan || "-"}
                            </p>
                            <p>
                              <span className="font-semibold">
                                Tanggal Lapor:
                              </span>{" "}
                              {form.tanggalLapor || "-"}
                            </p>
                            <p>
                              <span className="font-semibold">
                                Tempat Penerimaan:
                              </span>{" "}
                              {form.tempatPenerimaan || "-"}
                            </p>
                            <p>
                              <span className="font-semibold">
                                Uraian Gratifikasi:
                              </span>{" "}
                              {form.uraianGratifikasi || "-"}
                            </p>
                          </div>
                        </div>

                        <Divider />

                        {/* ======================== */}
                        {/* KOMPENSASI */}
                        {/* ======================== */}
                        <div className="pt-2">
                          <p className="text-sm text-center text-gray-500 italic">
                            Pelapor gratifikasi bersedia untuk menyerahkan uang
                            sebagai kompensasi atas barang yang diterimanya
                            sebesar nilai yang tercantum dalam Surat Keputusan
                            Pimpinan KPK. Permintaan kompensasi yang telah
                            mendapatkan persetujuan KPK tidak dapat dibatalkan
                            sepihak oleh pelapor.
                          </p>

                          <RadioGroup
                            value={form.kompensasiPelaporan ? "true" : "false"}
                            onValueChange={(value) =>
                              handleChange(
                                "kompensasiPelaporan",
                                value === "true"
                              )
                            }
                            orientation="horizontal"
                            className="flex items-center gap-4 mt-2"
                          >
                            <Radio value="true">Iya</Radio>
                            <Radio value="false">Tidak</Radio>
                          </RadioGroup>
                        </div>
                      </div>
                    </ModalBody>

                    <ModalFooter className="flex flex-col">
                      <Button
                        onPress={handleSubmit}
                        variant="shadow"
                        color="primary"
                        fullWidth
                        isDisabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <p>Submit Laporan</p>
                        )}
                      </Button>
                    </ModalFooter>
                  </>
                )}
              </>
            )}
          </ModalContent>
        </Modal>
        <div className="grid gap-4">
          <div className="">
            {/* Ganti onPress dengan fungsi baru */}
            <Button className="w-full" color="primary" onPress={handleOpenConfirmModal}>
              Kirim Laporan
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}