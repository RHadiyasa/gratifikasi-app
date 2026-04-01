"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Input,
  Button,
  Select,
  SelectItem,
  Checkbox,
  Textarea,
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
import {
  Loader2,
  ChevronRight,
  ChevronLeft,
  FileText,
  User,
  Gift,
  PackageSearch,
  CalendarDays,
  CheckCircle2,
  Copy,
  Check,
} from "lucide-react";

// ─── Steps config ─────────────────────────────────────────────────────────────

const STEPS = [
  { id: 0, label: "Jenis",     icon: FileText       },
  { id: 1, label: "Pelapor",   icon: User           },
  { id: 2, label: "Pemberi",   icon: Gift           },
  { id: 3, label: "Objek",     icon: PackageSearch  },
  { id: 4, label: "Kronologi", icon: CalendarDays   },
];

// ─── Small helpers ────────────────────────────────────────────────────────────

function FieldGroup({ children }) {
  return <div className="grid gap-3">{children}</div>;
}

function Row({ children, cols = 2 }) {
  return (
    <div className={`grid gap-3 ${cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-default-400 mb-1">
      {children}
    </p>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3 py-1.5 border-b border-default-100 last:border-0">
      <span className="text-xs text-default-400 sm:w-40 shrink-0">{label}</span>
      <span className="text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LaporPage() {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [step, setStep]           = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const [isLoading, setIsLoading] = useState(false);
  const [reportId, setReportId]   = useState(null);
  const [copied, setCopied]       = useState(false);

  const [form, setForm] = useState({
    secretReport:                   false,
    reportType:                     "",
    nama:                           "",
    nip:                            "",
    tempatLahir:                    "",
    tanggalLahir:                   "",
    instansiPelapor:                "",
    jabatanPelapor:                 "",
    emailPelapor:                   "",
    alamatPelapor:                  "",
    kecamatanPelapor:               "",
    kabupatenPelapor:               "",
    provinsiPelapor:                "",
    noTelpPelapor:                  "",
    noTelpReferensi:                "",
    namaPemberi:                    "",
    instansiPemberi:                "",
    alamatPemberi:                  "",
    relasi:                         "",
    relasiLainnya:                  "",
    alasan:                         "",
    peristiwaGratifikasi:           "",
    peristiwaGratifikasiLainnya:    "",
    lokasiObjekGratifikasi:         "",
    lokasiObjekGratifikasiLainnya:  "",
    objekGratifikasi:               "",
    objekGratifikasiLainnya:        "",
    uraianObjekGratifikasi:         "",
    perkiraanNilai:                 "",
    tanggalPenerimaan:              "",
    tanggalLapor:                   "",
    tempatPenerimaan:               "",
    uraianGratifikasi:              "",
    kompensasiPelaporan:            false,
  });

  const set = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const go = (next) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      const uniqueId = `UPG-${new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "")}-${Math.floor(Math.random() * 900 + 100)}`;

      const dataToSend = { ...form, uniqueId };
      await reportService(dataToSend);
      const pdfRes = await generatePdfService(dataToSend);

      if (pdfRes.success) {
        toast.success("Laporan berhasil dikirim & PDF dibuat!");
      } else {
        toast.warn("Laporan terkirim, namun gagal membuat PDF.");
      }

      setReportId(uniqueId);
    } catch {
      toast.error("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyId = () => {
    if (!reportId) return;
    navigator.clipboard.writeText(reportId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Slide variants ────────────────────────────────────────────────────────
  const variants = {
    enter:  (d) => ({ x: d > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (d) => ({ x: d > 0 ? -40 : 40, opacity: 0 }),
  };

  // ── Step content ─────────────────────────────────────────────────────────

  const stepContent = [
    // ── Step 0: Jenis Laporan ───────────────────────────────────────────────
    <FieldGroup key="step0">
      <SectionLabel>Jenis laporan</SectionLabel>
      <Select
        label="Jenis Laporan"
        selectedKeys={form.reportType ? [form.reportType] : []}
        onChange={(e) => set("reportType", e.target.value)}
        variant="bordered"
      >
        <SelectItem key="Laporan Penerimaan">Laporan Penerimaan</SelectItem>
        <SelectItem key="Laporan Penolakan">Laporan Penolakan</SelectItem>
      </Select>

      <div className="rounded-2xl border border-default-200 bg-default-50 dark:bg-default-100/5 p-5">
        <Checkbox
          isSelected={form.secretReport}
          onChange={(e) => set("secretReport", e.target.checked)}
          classNames={{ label: "text-sm" }}
        >
          Laporan Ini Bersifat Rahasia
        </Checkbox>
        <p className="text-xs text-default-400 mt-2 ml-7 leading-relaxed">
          Aktifkan opsi ini jika Anda ingin identitas Anda dilindungi. Sistem
          tetap menyimpan laporan secara aman.
        </p>
      </div>
    </FieldGroup>,

    // ── Step 1: Data Pelapor ────────────────────────────────────────────────
    <FieldGroup key="step1">
      <SectionLabel>Identitas</SectionLabel>
      <Row>
        <Input variant="bordered" label="Nama Lengkap"
          value={form.nama} onChange={(e) => set("nama", e.target.value)} />
        <Input variant="bordered" label="NIP"
          value={form.nip} onChange={(e) => set("nip", e.target.value)} />
      </Row>
      <Row>
        <Input variant="bordered" label="Tempat Lahir"
          value={form.tempatLahir} onChange={(e) => set("tempatLahir", e.target.value)} />
        <Input variant="bordered" type="date" label="Tanggal Lahir"
          value={form.tanggalLahir} onChange={(e) => set("tanggalLahir", e.target.value)} />
      </Row>

      <Divider className="my-1" />
      <SectionLabel>Pekerjaan</SectionLabel>
      <Row>
        <Input variant="bordered" label="Instansi"
          value={form.instansiPelapor} onChange={(e) => set("instansiPelapor", e.target.value)} />
        <Input variant="bordered" label="Jabatan"
          value={form.jabatanPelapor} onChange={(e) => set("jabatanPelapor", e.target.value)} />
      </Row>

      <Divider className="my-1" />
      <SectionLabel>Kontak</SectionLabel>
      <Row>
        <Input variant="bordered" label="Email" type="email"
          value={form.emailPelapor} onChange={(e) => set("emailPelapor", e.target.value)} />
        <Input variant="bordered" label="No. Telepon"
          value={form.noTelpPelapor} onChange={(e) => set("noTelpPelapor", e.target.value)} />
      </Row>

      <Divider className="my-1" />
      <SectionLabel>Alamat</SectionLabel>
      <Textarea variant="bordered" label="Alamat Lengkap" minRows={2}
        value={form.alamatPelapor} onChange={(e) => set("alamatPelapor", e.target.value)} />
      <Row>
        <Input variant="bordered" label="Kecamatan"
          value={form.kecamatanPelapor} onChange={(e) => set("kecamatanPelapor", e.target.value)} />
        <Input variant="bordered" label="Kabupaten / Kota"
          value={form.kabupatenPelapor} onChange={(e) => set("kabupatenPelapor", e.target.value)} />
      </Row>
      <Input variant="bordered" label="Provinsi"
        value={form.provinsiPelapor} onChange={(e) => set("provinsiPelapor", e.target.value)} />
    </FieldGroup>,

    // ── Step 2: Data Pemberi ────────────────────────────────────────────────
    <FieldGroup key="step2">
      <SectionLabel>Identitas pemberi</SectionLabel>
      <Row>
        <Input variant="bordered" label="Nama Pemberi"
          value={form.namaPemberi} onChange={(e) => set("namaPemberi", e.target.value)} />
        <Input variant="bordered" label="Instansi Pemberi"
          value={form.instansiPemberi} onChange={(e) => set("instansiPemberi", e.target.value)} />
      </Row>
      <Textarea variant="bordered" label="Alamat Pemberi" minRows={2}
        value={form.alamatPemberi} onChange={(e) => set("alamatPemberi", e.target.value)} />

      <Divider className="my-1" />
      <SectionLabel>Relasi & alasan</SectionLabel>
      <Select variant="bordered" label="Hubungan / Relasi"
        selectedKeys={form.relasi ? [form.relasi] : []}
        onChange={(e) => set("relasi", e.target.value)}
      >
        {relasiOptions.map((opt) => (
          <SelectItem key={opt}>{opt}</SelectItem>
        ))}
      </Select>
      {form.relasi === "Lainnya" && (
        <Input variant="bordered" label="Jelaskan relasi lainnya"
          value={form.relasiLainnya} onChange={(e) => set("relasiLainnya", e.target.value)} />
      )}
      <Textarea variant="bordered" label="Alasan Pemberian" minRows={2}
        value={form.alasan} onChange={(e) => set("alasan", e.target.value)} />
    </FieldGroup>,

    // ── Step 3: Objek Gratifikasi ───────────────────────────────────────────
    <FieldGroup key="step3">
      <SectionLabel>Peristiwa</SectionLabel>
      <Select variant="bordered" label="Peristiwa Gratifikasi"
        selectedKeys={form.peristiwaGratifikasi ? [form.peristiwaGratifikasi] : []}
        onChange={(e) => set("peristiwaGratifikasi", e.target.value)}
      >
        {peristiwaOptions.map((opt) => (
          <SelectItem key={opt}>{opt}</SelectItem>
        ))}
      </Select>
      {form.peristiwaGratifikasi === "Lainnya" && (
        <Input variant="bordered" label="Peristiwa lainnya"
          value={form.peristiwaGratifikasiLainnya}
          onChange={(e) => set("peristiwaGratifikasiLainnya", e.target.value)} />
      )}

      <Divider className="my-1" />
      <SectionLabel>Objek & lokasi</SectionLabel>
      <Select variant="bordered" label="Lokasi Objek Gratifikasi"
        selectedKeys={form.lokasiObjekGratifikasi ? [form.lokasiObjekGratifikasi] : []}
        onChange={(e) => set("lokasiObjekGratifikasi", e.target.value)}
      >
        {lokasiOptions.map((opt) => (
          <SelectItem key={opt}>{opt}</SelectItem>
        ))}
      </Select>
      {form.lokasiObjekGratifikasi === "Lainnya" && (
        <Input variant="bordered" label="Lokasi lainnya"
          value={form.lokasiObjekGratifikasiLainnya}
          onChange={(e) => set("lokasiObjekGratifikasiLainnya", e.target.value)} />
      )}
      <Select variant="bordered" label="Objek Gratifikasi"
        selectedKeys={form.objekGratifikasi ? [form.objekGratifikasi] : []}
        onChange={(e) => set("objekGratifikasi", e.target.value)}
      >
        {objekOptions.map((opt) => (
          <SelectItem key={opt}>{opt}</SelectItem>
        ))}
      </Select>
      {form.objekGratifikasi?.toLowerCase().includes("lainnya") && (
        <Input variant="bordered" label="Objek lainnya"
          value={form.objekGratifikasiLainnya}
          onChange={(e) => set("objekGratifikasiLainnya", e.target.value)} />
      )}

      <Divider className="my-1" />
      <SectionLabel>Rincian nilai</SectionLabel>
      <Textarea variant="bordered" label="Uraian Objek Gratifikasi" minRows={2}
        value={form.uraianObjekGratifikasi}
        onChange={(e) => set("uraianObjekGratifikasi", e.target.value)} />
      <Input variant="bordered" type="number" label="Perkiraan Nilai (Rp)"
        value={form.perkiraanNilai}
        onChange={(e) => set("perkiraanNilai", e.target.value)} />
    </FieldGroup>,

    // ── Step 4: Kronologi ───────────────────────────────────────────────────
    <FieldGroup key="step4">
      <SectionLabel>Waktu & tempat</SectionLabel>
      <Row>
        <Input variant="bordered" type="date" label="Tanggal Penerimaan"
          value={form.tanggalPenerimaan}
          onChange={(e) => set("tanggalPenerimaan", e.target.value)} />
        <Input variant="bordered" type="date" label="Tanggal Lapor"
          value={form.tanggalLapor}
          onChange={(e) => set("tanggalLapor", e.target.value)} />
      </Row>
      <Input variant="bordered" label="Tempat Penerimaan"
        value={form.tempatPenerimaan}
        onChange={(e) => set("tempatPenerimaan", e.target.value)} />

      <Divider className="my-1" />
      <SectionLabel>Uraian kejadian</SectionLabel>
      <Textarea variant="bordered" label="Uraian Gratifikasi" minRows={4}
        placeholder="Jelaskan secara kronologis bagaimana peristiwa gratifikasi terjadi..."
        value={form.uraianGratifikasi}
        onChange={(e) => set("uraianGratifikasi", e.target.value)} />
    </FieldGroup>,
  ];

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="relative border-b border-default-100 px-4 py-8 text-center overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,hsl(var(--heroui-primary)/0.1),transparent)]" />
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
          Inspektorat V · Kementerian ESDM
        </p>
        <h1 className="text-2xl md:text-3xl font-bold">Form Pelaporan Gratifikasi</h1>
        <p className="text-default-500 text-sm mt-1">
          Lengkapi {STEPS.length} langkah berikut untuk mengirim laporan Anda.
        </p>
      </div>

      {/* ── Stepper ────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-default-100">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between relative">
            {/* connector line */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-default-200 -z-0" />
            {STEPS.map((s) => {
              const Icon = s.icon;
              const done    = s.id < step;
              const current = s.id === step;
              return (
                <button
                  key={s.id}
                  onClick={() => s.id < step && go(s.id)}
                  className="flex flex-col items-center gap-1 z-10"
                >
                  <div
                    className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                      done
                        ? "bg-primary text-white shadow-md shadow-primary/30"
                        : current
                        ? "bg-primary/15 border-2 border-primary text-primary"
                        : "bg-default-100 text-default-400"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 size={15} />
                    ) : (
                      <Icon size={14} />
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-medium hidden sm:block ${
                      current ? "text-primary" : done ? "text-default-500" : "text-default-300"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* progress bar */}
          <div className="mt-3 h-0.5 bg-default-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: `${((step) / (STEPS.length - 1)) * 100}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* ── Form body ──────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 py-8 pb-32">

        {/* Step title */}
        <div className="flex items-center gap-3 mb-6">
          {(() => {
            const Icon = STEPS[step].icon;
            return (
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Icon size={17} />
              </div>
            );
          })()}
          <div>
            <p className="text-xs text-default-400">
              Langkah {step + 1} dari {STEPS.length}
            </p>
            <h2 className="font-bold text-base">
              {["Jenis Laporan", "Data Pelapor", "Data Pemberi", "Objek Gratifikasi", "Kronologi Kejadian"][step]}
            </h2>
          </div>
        </div>

        {/* Animated step */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            {stepContent[step]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Bottom nav (fixed) ─────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-md border-t border-default-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex gap-3">
          {step > 0 && (
            <Button
              variant="flat"
              onPress={() => go(step - 1)}
              startContent={<ChevronLeft size={16} />}
              className="flex-1 sm:flex-none"
            >
              Kembali
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button
              color="primary"
              onPress={() => go(step + 1)}
              endContent={<ChevronRight size={16} />}
              className="flex-1"
            >
              Lanjut
            </Button>
          ) : (
            <Button
              color="primary"
              variant="shadow"
              onPress={onOpen}
              className="flex-1"
            >
              Tinjau & Kirim Laporan
            </Button>
          )}
        </div>
      </div>

      {/* ── Modal Konfirmasi & Sukses ───────────────────────────────────── */}
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="3xl"
        scrollBehavior="inside"
        classNames={{
          base: "max-h-[90dvh]",
        }}
      >
        <ModalContent>
          {(onClose) =>
            reportId ? (
              // ── Sukses ──────────────────────────────────────────────────
              <>
                <ModalBody className="py-12 flex flex-col items-center text-center gap-4">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center"
                  >
                    <CheckCircle2 size={36} className="text-green-500" />
                  </motion.div>
                  <div>
                    <h2 className="text-xl font-bold mb-1">Laporan Berhasil Dikirim!</h2>
                    <p className="text-default-500 text-sm">
                      Simpan nomor pelaporan berikut untuk memantau status laporan Anda.
                    </p>
                  </div>
                  <div className="w-full rounded-2xl border border-default-200 bg-default-50 dark:bg-default-100/5 p-5">
                    <p className="text-xs text-default-400 mb-2">Nomor Pelaporan</p>
                    <p className="font-mono text-xl font-bold tracking-wider">{reportId}</p>
                  </div>
                  <Button
                    variant="flat"
                    size="sm"
                    startContent={copied ? <Check size={14} /> : <Copy size={14} />}
                    onPress={copyId}
                    color={copied ? "success" : "default"}
                  >
                    {copied ? "Tersalin!" : "Salin Nomor"}
                  </Button>
                  <p className="text-xs text-default-400 italic max-w-xs leading-relaxed">
                    Catat dan simpan nomor ini. Anda memerlukan nomor ini untuk
                    melacak perkembangan laporan.
                  </p>
                </ModalBody>
                <ModalFooter>
                  <Button color="primary" fullWidth onPress={onClose}>
                    Selesai
                  </Button>
                </ModalFooter>
              </>
            ) : (
              // ── Konfirmasi ───────────────────────────────────────────────
              <>
                <ModalHeader className="flex flex-col gap-0.5 border-b border-default-100">
                  <h2 className="text-lg font-bold">Tinjau Data Laporan</h2>
                  <p className="text-xs text-default-400 font-normal">
                    Pastikan seluruh data sudah benar sebelum mengirim.
                  </p>
                </ModalHeader>

                <ModalBody className="py-5 space-y-6">
                  {/* Pelapor */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
                      Data Pelapor
                    </p>
                    <ReviewRow label="Nama"              value={form.nama} />
                    <ReviewRow label="NIP"               value={form.nip} />
                    <ReviewRow label="Tempat / Tgl Lahir" value={`${form.tempatLahir}, ${form.tanggalLahir}`} />
                    <ReviewRow label="Instansi"          value={form.instansiPelapor} />
                    <ReviewRow label="Jabatan"           value={form.jabatanPelapor} />
                    <ReviewRow label="Email"             value={form.emailPelapor} />
                    <ReviewRow label="No. Telepon"       value={form.noTelpPelapor} />
                    <ReviewRow label="Alamat"            value={form.alamatPelapor} />
                  </div>

                  {/* Pemberi */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-default-400 mb-3">
                      Pemberi Gratifikasi
                    </p>
                    <ReviewRow label="Nama"      value={form.namaPemberi} />
                    <ReviewRow label="Instansi"  value={form.instansiPemberi} />
                    <ReviewRow label="Alamat"    value={form.alamatPemberi} />
                    <ReviewRow label="Relasi"    value={form.relasi === "Lainnya" ? form.relasiLainnya : form.relasi} />
                    <ReviewRow label="Alasan"    value={form.alasan} />
                  </div>

                  {/* Objek */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-default-400 mb-3">
                      Objek Gratifikasi
                    </p>
                    <ReviewRow label="Peristiwa" value={form.peristiwaGratifikasi === "Lainnya" ? form.peristiwaGratifikasiLainnya : form.peristiwaGratifikasi} />
                    <ReviewRow label="Lokasi"    value={form.lokasiObjekGratifikasi === "Lainnya" ? form.lokasiObjekGratifikasiLainnya : form.lokasiObjekGratifikasi} />
                    <ReviewRow label="Objek"     value={form.objekGratifikasi?.toLowerCase().includes("lainnya") ? form.objekGratifikasiLainnya : form.objekGratifikasi} />
                    <ReviewRow label="Uraian"    value={form.uraianObjekGratifikasi} />
                    <ReviewRow label="Nilai (Rp)" value={form.perkiraanNilai ? `Rp ${Number(form.perkiraanNilai).toLocaleString("id-ID")}` : ""} />
                  </div>

                  {/* Kronologi */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-default-400 mb-3">
                      Kronologi
                    </p>
                    <ReviewRow label="Tgl Penerimaan" value={form.tanggalPenerimaan} />
                    <ReviewRow label="Tgl Lapor"      value={form.tanggalLapor} />
                    <ReviewRow label="Tempat"         value={form.tempatPenerimaan} />
                    <ReviewRow label="Uraian"         value={form.uraianGratifikasi} />
                  </div>

                  {/* Kompensasi */}
                  <div className="rounded-2xl border border-default-200 bg-default-50 dark:bg-default-100/5 p-4">
                    <p className="text-xs text-default-500 italic leading-relaxed mb-4">
                      Pelapor gratifikasi bersedia menyerahkan uang sebagai kompensasi
                      atas barang yang diterima sesuai nilai dalam Surat Keputusan
                      Pimpinan KPK. Persetujuan yang telah diberikan tidak dapat
                      dibatalkan sepihak.
                    </p>
                    <p className="text-sm font-semibold mb-2">Bersedia memberikan kompensasi?</p>
                    <RadioGroup
                      value={form.kompensasiPelaporan ? "true" : "false"}
                      onValueChange={(v) => set("kompensasiPelaporan", v === "true")}
                      orientation="horizontal"
                    >
                      <Radio value="true">Ya, bersedia</Radio>
                      <Radio value="false">Tidak</Radio>
                    </RadioGroup>
                  </div>
                </ModalBody>

                <ModalFooter className="border-t border-default-100">
                  <Button variant="flat" onPress={onClose} className="flex-1 sm:flex-none">
                    Periksa Ulang
                  </Button>
                  <Button
                    color="primary"
                    variant="shadow"
                    onPress={handleSubmit}
                    isDisabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 size={15} className="animate-spin" />
                        Mengirim...
                      </span>
                    ) : (
                      "Kirim Laporan"
                    )}
                  </Button>
                </ModalFooter>
              </>
            )
          }
        </ModalContent>
      </Modal>
    </div>
  );
}
