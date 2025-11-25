"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";

export default function DocumentationPage() {
  return (
    <div className="min-h-screen p-4 md:p-10 md:mx-20">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-gray-600 mb-6">
        <span className="text-gray-400">Documentation</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <BookOpen className="text-indigo-600" />
        <h1 className="text-3xl md:text-2xl font-bold text-gray-900">
          Panduan Pengguna Pelaporan Gratifikasi
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Sidebar */}
        <aside
          className="bg-white rounded-xl shadow p-5 border border-gray-200 h-fit 
             sticky top-24"
        >
          <h2 className="font-semibold text-gray-700 mb-4">Daftar Isi</h2>

          <ul className="space-y-3 text-sm">
            {[
              "Tujuan Fitur",
              "Alur Pelaporan",
              "Pengisian Form Laporan",
              "Konfirmasi Pelaporan",
              "Hasil PDF",
              "Status Laporan",
              "Hak Pelapor",
              "Bantuan Pelapor",
            ].map((id, i) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="block px-2 py-1 rounded hover:bg-indigo-100 hover:text-indigo-700 transition"
                >
                  {i + 1}. {id.charAt(0).toUpperCase() + id.slice(1)}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-2 space-y-12">
          {/* SECTION TEMPLATE */}
          {/* 
            Untuk menambah section baru:
            <section id="id" className="space-y-3 border-b pb-10">
              <h2 className="text-2xl font-bold text-gray-900">Judul</h2>
              <p className="text-gray-700 leading-relaxed">
                Konten.
              </p>
            </section> 
          */}

          {/* 1. Tujuan */}
          <section
            id="Tujuan Fitur"
            className="space-y-4 border-b pb-10 scroll-mt-28"
          >
            <h2 className="text-2xl font-bold text-gray-900">
              1. Tujuan Fitur Pelaporan
            </h2>

            <p className="text-gray-700 leading-relaxed">
              Fitur pelaporan gratifikasi ini dirancang untuk mempermudah
              pegawai maupun masyarakat umum dalam menyampaikan laporan terkait
              penerimaan, penolakan, atau pemberian gratifikasi. Sistem dibuat
              agar proses pelaporan menjadi lebih cepat, terstruktur, dan sesuai
              ketentuan yang telah ditetapkan oleh Komisi Pemberantasan Korupsi
              (KPK).
            </p>

            <p className="text-gray-700 leading-relaxed">
              Melalui aplikasi ini, proses pelaporan dilakukan tanpa hambatan
              dan tanpa memerlukan login, sehingga semua orang dapat melaporkan
              gratifikasi dengan mudah, bahkan secara anonim. Setiap laporan
              yang dikirim akan diproses otomatis oleh sistem sehingga pelapor
              tidak perlu melakukan pengisian tambahan atau mengirim email
              terpisah.
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
              <h3 className="font-semibold text-gray-800 mb-2">
                Secara lebih rinci, tujuan fitur pelaporan ini adalah untuk:
              </h3>

              <ul className="list-disc pl-6 space-y-2 text-gray-700 text-sm md:text-base">
                <li>
                  <span className="font-medium">
                    Mempermudah proses pelaporan
                  </span>{" "}
                  – pelapor dapat mengirim laporan dengan cepat tanpa perlu
                  mendaftar akun atau login.
                </li>

                <li>
                  <span className="font-medium">
                    Mendukung pelaporan anonim
                  </span>{" "}
                  – pelapor dapat memilih untuk tidak menampilkan identitasnya
                  sehingga meningkatkan keberanian dalam melaporkan gratifikasi.
                </li>

                <li>
                  <span className="font-medium">
                    Menghasilkan Unique ID otomatis
                  </span>{" "}
                  untuk setiap laporan, sehingga memudahkan proses tracking oleh
                  Unit Pengendalian Gratifikasi (UPG).
                </li>

                <li>
                  <span className="font-medium">
                    Menyimpan data laporan secara aman
                  </span>{" "}
                  ke dalam database, lengkap dengan seluruh informasi terkait
                  pelapor, pemberi, objek gratifikasi, serta kronologi kejadian.
                </li>

                <li>
                  <span className="font-medium">
                    Menghasilkan dokumen PDF laporan otomatis
                  </span>{" "}
                  dengan format yang mengikuti ketentuan dari KPK, sehingga
                  mempermudah proses pelaporan lanjutan.
                </li>

                <li>
                  <span className="font-medium">
                    Mempercepat proses verifikasi oleh UPG
                  </span>{" "}
                  melalui data yang rapi, lengkap, dan terstruktur dalam sistem.
                </li>

                <li>
                  <span className="font-medium">
                    Meningkatkan pemahaman pegawai terhadap gratifikasi
                  </span>{" "}
                  melalui proses pengisian form yang sudah disesuaikan dengan
                  juknis dan aturan yang berlaku.
                </li>

                <li>
                  <span className="font-medium">Meningkatkan transparansi</span>{" "}
                  dan akuntabilitas pelaporan, sebagai bagian dari upaya
                  pencegahan korupsi di lingkungan Kementerian ESDM.
                </li>
              </ul>
            </div>

            <p className="text-gray-700 leading-relaxed">
              Dengan adanya fitur ini, proses pelaporan gratifikasi menjadi
              lebih mudah, cepat, dan tidak membebani pelapor. Selain itu, fitur
              ini membantu UPG dalam meningkatkan monitoring, evaluasi, serta
              tindak lanjut atas laporan yang masuk.
            </p>
          </section>

          {/* 2. Alur Pelaporan */}
          <section
            id="Alur Pelaporan"
            className="space-y-4 border-b pb-10 scroll-mt-28"
          >
            <h2 className="text-2xl font-bold text-gray-900">
              2. Alur Pelaporan
            </h2>

            <p className="text-gray-700 leading-relaxed">
              Proses pelaporan gratifikasi melalui aplikasi ini dirancang agar
              sederhana, jelas, dan mudah diikuti oleh pelapor. Setiap tahapan
              telah disesuaikan dengan alur kerja Unit Pengendalian Gratifikasi
              (UPG) serta juknis yang berlaku, sehingga laporan yang diterima
              lebih lengkap dan mudah diverifikasi.
            </p>

            <p className="text-gray-700 leading-relaxed">
              Berikut adalah alur pelaporan yang harus dilakukan oleh pengguna
              sebelum laporan diproses oleh sistem:
            </p>

            {/* CARD LIST */}
            <div className="grid gap-4">
              {/* Step 1 */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <h3 className="font-semibold text-gray-800">
                  1. Mengisi Form Pelaporan
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  Pelapor mengisi seluruh data yang diperlukan, mulai dari data
                  pelapor, data pemberi gratifikasi, objek gratifikasi, hingga
                  kronologi penerimaan. Setiap isian mengacu pada ketentuan
                  format laporan sesuai standar KPK.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <h3 className="font-semibold text-gray-800">
                  2. Melihat Ringkasan Data pada Modal Konfirmasi
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  Setelah mengisi seluruh data, pelapor menekan tombol{" "}
                  <span className="font-medium">“Kirim Laporan”</span>. Sistem
                  akan menampilkan modal konfirmasi berisi rangkuman seluruh
                  informasi yang telah diinput untuk memastikan tidak ada data
                  yang salah atau terlewat.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <h3 className="font-semibold text-gray-800">
                  3. Menekan Tombol Submit
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  Jika seluruh data sudah benar, pelapor menekan tombol{" "}
                  <span className="font-medium">Submit</span> di dalam modal
                  untuk mengirim laporan ke sistem.
                </p>
              </div>

              {/* Step 4 */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <h3 className="font-semibold text-gray-800">
                  4. Sistem Menyimpan Laporan & Membuat PDF Otomatis
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  Sistem menghasilkan{" "}
                  <span className="font-medium">Unique ID</span> untuk laporan,
                  menyimpannya ke database, dan membuat file PDF otomatis yang
                  formatnya mengikuti template laporan KPK. PDF ini bisa
                  digunakan untuk proses tindak lanjut internal ataupun
                  pelaporan lanjutan.
                </p>
              </div>

              {/* Step 5 */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <h3 className="font-semibold text-gray-800">
                  5. Pelapor Menerima Notifikasi Berhasil
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  Setelah proses berhasil, sistem menampilkan notifikasi bahwa
                  laporan telah diterima. PDF laporan juga dapat diunduh oleh
                  pelapor apabila dibutuhkan.
                </p>
              </div>
            </div>

            <p className="text-gray-700 leading-relaxed">
              Dengan mengikuti alur ini, pelaporan gratifikasi dapat dilakukan
              dengan lebih cepat, akurat, dan sesuai ketentuan. Sistem
              memastikan bahwa setiap laporan memiliki data lengkap sehingga
              memudahkan proses pemeriksaan dan verifikasi oleh UPG.
            </p>
          </section>

          {/* 3. Cara Mengisi Form Pelaporan */}
          <section
            id="Pengisian Form Pelaporan"
            className="space-y-4 border-b pb-10 scroll-mt-28"
          >
            <h2 className="text-2xl font-bold text-gray-900">
              3. Cara Mengisi Form Pelaporan
            </h2>

            <p className="text-gray-700 leading-relaxed">
              Form pelaporan gratifikasi disusun agar mudah digunakan oleh
              pegawai maupun masyarakat. Setiap bagian perlu diisi dengan benar
              agar laporan dapat diproses dengan cepat oleh Unit Pengendalian
              Gratifikasi (UPG). Berikut penjelasan lengkap mengenai
              langkah-langkah pengisian form:
            </p>

            {/* Grid Cards */}
            <div className="grid gap-5">
              {/* A. Jenis Laporan */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <h3 className="font-semibold text-gray-800">
                  A. Jenis Laporan
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  Pilih jenis laporan sesuai peristiwa yang dialami, misalnya{" "}
                  <span className="font-medium">Laporan Penerimaan</span> atau{" "}
                  <span className="font-medium">Laporan Penolakan</span>. Jika
                  pelapor menginginkan identitasnya dirahasiakan, aktifkan opsi{" "}
                  <span className="italic">Laporan Bersifat Rahasia</span>.
                  Sistem tetap menyimpan data secara aman tanpa menampilkan
                  identitas kepada pihak lain.
                </p>
              </div>

              {/* B. Data Pelapor */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <h3 className="font-semibold text-gray-800">B. Data Pelapor</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Isi identitas pelapor dengan lengkap meliputi: nama, NIP (jika
                  pegawai internal), tempat & tanggal lahir, instansi, jabatan,
                  email, nomor telepon, serta alamat lengkap. Informasi ini
                  membantu UPG melakukan verifikasi dan memastikan keabsahan
                  laporan.
                </p>
              </div>

              {/* C. Data Pemberi */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <h3 className="font-semibold text-gray-800">C. Data Pemberi</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Isi identitas pihak yang memberikan gratifikasi, seperti nama,
                  instansi, alamat, hubungan/relasi dengan pelapor, serta alasan
                  pemberian. Jika hubungan atau alasan tidak tersedia dalam
                  pilihan, pelapor dapat mengisi opsi{" "}
                  <span className="font-medium">Lainnya</span> secara manual.
                </p>
              </div>

              {/* D. Objek Gratifikasi */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <h3 className="font-semibold text-gray-800">
                  D. Objek Gratifikasi
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  Pilih jenis objek gratifikasi (misal: uang, barang, fasilitas,
                  dan sebagainya). Isi lokasi objek disimpan atau diterima,
                  serta isi nilai perkiraan gratifikasi dalam rupiah. Uraian
                  objek perlu dituliskan secara jelas agar UPG dapat
                  mengidentifikasi bentuk gratifikasi tersebut.
                </p>
              </div>

              {/* E. Kronologi */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <h3 className="font-semibold text-gray-800">E. Kronologi</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Isi tanggal penerimaan, tanggal pelaporan, tempat penerimaan,
                  serta uraian lengkap mengenai kejadian. Kronologi yang jelas
                  sangat membantu UPG dalam menilai apakah peristiwa termasuk
                  kategori gratifikasi wajib lapor sesuai peraturan.
                </p>
              </div>

              {/* F. Pernyataan Kompensasi */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <h3 className="font-semibold text-gray-800">
                  F. Pernyataan Kompensasi
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  Pelapor diminta memilih apakah bersedia menyerahkan kompensasi
                  atas barang yang diterima sesuai ketentuan dalam Surat
                  Keputusan Pimpinan KPK. Informasi ini diperlukan ketika objek
                  gratifikasi tidak dapat atau tidak perlu diserahkan secara
                  fisik.
                </p>
              </div>
            </div>

            <p className="text-gray-700 leading-relaxed">
              Pastikan seluruh data telah diisi dengan benar sebelum melanjutkan
              ke tahap konfirmasi. Informasi yang lengkap akan mempercepat
              proses analisis dan verifikasi oleh UPG.
            </p>
          </section>

          {/* 4. Konfirmasi */}
          <section
            id="Konfirmasi Pelaporan"
            className="space-y-4 border-b pb-10 scroll-mt-28"
          >
            <h2 className="text-2xl font-bold text-gray-900">
              4. Konfirmasi Sebelum Submit
            </h2>

            <p className="text-gray-700 leading-relaxed">
              Sebelum laporan dikirim, sistem akan menampilkan
              <span className="font-semibold"> modal konfirmasi</span> berisi
              seluruh data yang telah diisi pada form. Fitur ini memastikan
              pelapor dapat meninjau kembali setiap informasi dan menghindari
              kesalahan input sebelum laporan benar-benar diproses.
            </p>

            {/* Card Sederhana */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
              <h3 className="font-semibold text-gray-800">
                Apa yang ditampilkan pada modal konfirmasi?
              </h3>

              <ul className="list-disc pl-5 text-gray-600 text-sm space-y-2">
                <li>
                  Data Pelapor — nama, NIP, instansi, jabatan, email, nomor
                  telepon, serta alamat.
                </li>
                <li>
                  Data Pemberi — nama pemberi, instansi, alamat, relasi, dan
                  alasan pemberian.
                </li>
                <li>
                  Data Objek Gratifikasi — jenis objek, nilai, lokasi, dan
                  uraian objek.
                </li>
                <li>
                  Kronologi Kejadian — tanggal penerimaan, tanggal pelaporan,
                  tempat, dan uraian kronologi.
                </li>
                <li>
                  Pernyataan kompensasi — persetujuan atau penolakan kompensasi
                  sesuai ketentuan KPK.
                </li>
              </ul>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
              <h3 className="font-semibold text-gray-800">
                Mengapa konfirmasi ini penting?
              </h3>

              <p className="text-gray-600 text-sm leading-relaxed">
                Modal konfirmasi membantu pelapor memeriksa ulang data sebelum
                laporan dikirim. Setelah tombol Submit ditekan, sistem langsung
                menyimpan laporan dan membuat file PDF secara otomatis.
                Kesalahan data dapat memperlambat proses validasi oleh UPG,
                sehingga pemeriksaan awal ini sangat penting.
              </p>
            </div>

            <p className="text-gray-700 leading-relaxed">
              Jika semua data sudah benar, pelapor dapat menekan tombol{" "}
              <span className="font-semibold">Submit</span> untuk melanjutkan
              proses pelaporan.
            </p>
          </section>

          {/* 5. PDF */}
          {/* 5. Pembuatan & Pengiriman PDF */}
          <section
            id="Hasil PDF"
            className="space-y-4 border-b pb-10 scroll-mt-28"
          >
            <h2 className="text-2xl font-bold text-gray-900">
              5. Pembuatan & Pengiriman PDF
            </h2>

            <p className="text-gray-700 leading-relaxed">
              Setelah menekan tombol{" "}
              <span className="font-semibold">Submit</span> pada modal
              konfirmasi, sistem secara otomatis akan memulai serangkaian proses
              akhir yang krusial. Proses ini meliputi penyimpanan data,
              pembuatan dokumen resmi, dan notifikasi kepada pelapor.
            </p>

            {/* Card Rincian Proses */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
              <h3 className="font-semibold text-gray-800">
                Langkah-Langkah Otomatis Setelah Submit
              </h3>

              <ul className="list-disc pl-5 text-gray-600 text-sm space-y-2">
                <li>
                  <span className="font-semibold">Pembuatan Unique ID:</span>{" "}
                  Sistem akan membuat ID unik (Tracking ID) secara otomatis
                  berdasarkan tanggal dan waktu laporan. ID ini menjadi kode
                  pelacakan resmi laporan.
                </li>
                <li>
                  <span className="font-semibold">
                    Penyimpanan ke Database:
                  </span>{" "}
                  Seluruh data laporan yang telah divalidasi akan dikirim dan
                  disimpan ke database melalui API, memastikan integritas dan
                  ketersediaan data.
                </li>
                <li>
                  <span className="font-semibold">Generasi Dokumen PDF:</span>{" "}
                  Dokumen laporan gratifikasi resmi dengan format standar yang
                  ditetapkan oleh KPK (Komisi Pemberantasan Korupsi) dibuat
                  secara otomatis oleh sistem.
                </li>
                <li>
                  <span className="font-semibold">
                    Notifikasi & Konfirmasi:
                  </span>{" "}
                  Sebuah
                  <span className="font-semibold"> popup notifikasi</span> akan
                  muncul untuk memberitahu pelapor bahwa proses pengiriman
                  berhasil dan menyertakan Tracking ID laporan.
                </li>
              </ul>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
              <h3 className="font-semibold text-gray-800">
                Manfaat Dokumen PDF Otomatis
              </h3>

              <p className="text-gray-600 text-sm leading-relaxed">
                Dokumen PDF yang dihasilkan secara instan berfungsi sebagai
                bukti resmi telah dilakukannya pelaporan gratifikasi. Dokumen
                ini memenuhi standar formal yang dibutuhkan untuk proses
                validasi lebih lanjut oleh Unit Pengendalian Gratifikasi (UPG)
                dan instansi terkait, menghilangkan kebutuhan untuk pengisian
                dokumen manual.
              </p>
            </div>

            <p className="text-gray-700 leading-relaxed">
              Pelapor disarankan untuk{" "}
              <span className="font-semibold">mencatat</span> atau{" "}
              <span className="font-semibold">menyimpan Tracking ID</span> yang
              muncul pada notifikasi untuk memantau status perkembangan
              laporannya.
            </p>
          </section>

          {/* 6. Status Laporan */}
          <section
            id="Status Laporan"
            className="space-y-4 border-b pb-10 scroll-mt-28"
          >
            <h2 className="text-2xl font-bold text-gray-900">
              6. Pemantauan Status Laporan 📊
            </h2>

            <p className="text-gray-700 leading-relaxed">
              Setelah laporan berhasil dikirim dan disimpan, pelapor dapat
              memantau perkembangan dan posisi laporannya melalui dashboard
              menggunakan
              <span className="font-semibold"> Tracking ID</span> yang telah
              diperoleh. Sistem akan menampilkan status pelaporan yang
              diperbarui secara real-time sesuai tahapan proses yang dilakukan
              oleh Unit Pengendalian Gratifikasi (UPG).
            </p>

            {/* Card Rincian Status */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
              <h3 className="font-semibold text-gray-800">
                Detail Tahapan Status Laporan
              </h3>

              <ul className="list-disc pl-5 text-gray-600 text-sm space-y-2">
                <li>
                  <span className="font-semibold">Diajukan:</span> Status awal
                  setelah laporan berhasil disubmit. Laporan telah masuk ke
                  sistem dan menunggu untuk ditinjau oleh petugas UPG.
                </li>
                <li>
                  <span className="font-semibold">Diverifikasi:</span> Laporan
                  sedang dalam proses peninjauan oleh petugas UPG. Petugas
                  memeriksa kelengkapan data, keabsahan informasi, dan
                  kesesuaian dengan kriteria gratifikasi.
                </li>
                <li>
                  <span className="font-semibold">Diteruskan ke KPK:</span>{" "}
                  Setelah laporan diverifikasi dan dinyatakan memenuhi syarat,
                  laporan akan diteruskan secara resmi ke Komisi Pemberantasan
                  Korupsi (KPK) untuk penanganan dan penetapan status lebih
                  lanjut.
                </li>
                <li>
                  <span className="font-semibold">Selesai:</span> Tahap akhir.
                  Status ini menandakan bahwa seluruh proses pelaporan
                  gratifikasi, termasuk penetapan tindak lanjut (misalnya:
                  ditetapkan menjadi milik negara, diserahkan kepada pelapor,
                  dll.), telah diselesaikan dan dicatat.
                </li>
              </ul>
            </div>

            <p className="text-gray-700 leading-relaxed">
              Pemantauan status ini penting untuk memberikan{" "}
              <span className="font-semibold">transparansi </span>
              kepada pelapor mengenai sejauh mana laporannya telah diproses.
            </p>
          </section>

          {/* 7. Hak */}
          {/* 7. Hak & Kewajiban Pelapor */}
          <section
            id="Hak Pelapor"
            className="space-y-4 border-b pb-10 scroll-mt-28"
          >
            <h2 className="text-2xl font-bold text-gray-900">
              7. Hak & Kewajiban Pelapor ⚖️
            </h2>

            <p className="text-gray-700 leading-relaxed">
              Proses pelaporan gratifikasi melibatkan tanggung jawab dari kedua
              belah pihak: sistem/instansi dan pelapor. Untuk memastikan proses
              berjalan efektif dan aman, setiap pelapor memiliki hak yang
              dilindungi serta kewajiban yang harus dipenuhi.
            </p>

            {/* Card Hak Pelapor */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
              <h3 className="font-semibold text-blue-800">Hak Pelapor</h3>

              <ul className="list-disc pl-5 text-gray-800 text-sm space-y-2">
                <li>
                  <span className="font-semibold">Perlindungan Identitas:</span>{" "}
                  Pelapor berhak mendapatkan kerahasiaan identitas penuh sesuai
                  peraturan perundang-undangan. Sistem menjamin bahwa informasi
                  pribadi pelapor tidak akan disebarluaskan dan hanya diakses
                  oleh petugas yang berwenang.
                </li>
                <li>
                  <span className="font-semibold">
                    Informasi Status Laporan:
                  </span>{" "}
                  Pelapor berhak memantau dan mendapatkan informasi terkini
                  mengenai status dan perkembangan laporannya melalui Tracking
                  ID.
                </li>
                <li>
                  <span className="font-semibold">
                    Kompensasi (jika disetujui):
                  </span>
                  Sesuai ketentuan KPK, pelapor berhak mendapatkan
                  kompensasi/penggantian biaya atas gratifikasi yang dilaporkan,
                  jika memenuhi syarat dan disetujui oleh instansi terkait.
                </li>
              </ul>
            </div>

            {/* Card Kewajiban Pelapor */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
              <h3 className="font-semibold text-gray-800">Kewajiban Pelapor</h3>

              <ul className="list-disc pl-5 text-gray-600 text-sm space-y-2">
                <li>
                  <span className="font-semibold">
                    Memberikan Data yang Benar dan Sah:
                  </span>
                  Kewajiban utama pelapor adalah memastikan seluruh data yang
                  diinput ke dalam formulir pelaporan adalah{" "}
                  <span className="font-bold">benar, lengkap, dan sah</span>.
                </li>
                <li>
                  <span className="font-semibold">Bersikap Kooperatif:</span>{" "}
                  Pelapor wajib bersikap kooperatif jika petugas UPG memerlukan
                  konfirmasi atau informasi tambahan terkait laporan yang
                  diajukan.
                </li>
              </ul>
            </div>

            <p className="text-gray-700 leading-relaxed">
              Kepatuhan terhadap kewajiban memastikan proses verifikasi berjalan
              lancar, sementara pemenuhan hak menjamin keamanan dan kenyamanan
              pelapor.
            </p>
          </section>

          {/* 8. Bantuan */}
          {/* 8. Kontak Bantuan */}
          <section id="Bantuan Pelapor" className="space-y-4 pb-10 scroll-mt-28">
            <h2 className="text-2xl font-bold text-gray-900">
              8. Kontak Bantuan 📞
            </h2>

            <p className="text-gray-700 leading-relaxed">
              Jika pelapor menemui kesulitan, kebingungan, atau memerlukan
              klarifikasi selama proses pelaporan, Unit Pengendalian Gratifikasi
              (UPG) menyediakan saluran komunikasi resmi untuk bantuan.
            </p>

            {/* Card Kontak */}
            <div className="p-5 bg-indigo-50 border border-indigo-200 rounded-xl space-y-3">
              <h3 className="font-semibold text-indigo-800">
                Hubungi UPG Instansi
              </h3>
              <p className="text-gray-800 leading-relaxed">
                Untuk pertanyaan teknis mengenai sistem pelaporan, regulasi
                gratifikasi, atau status laporan, silakan hubungi kontak
                berikut:
              </p>

              <div className="space-y-2">
                <p className="text-gray-800">
                  <span className="font-semibold">Email:</span>{" "}
                  <strong>upg@instansi.go.id</strong> (Disarankan untuk
                  pertanyaan formal dan mendetail)
                </p>
                <p className="text-gray-800">
                  <span className="font-semibold">Telepon:</span>{" "}
                  <strong>021-xxxx-xxxx</strong> (Tersedia pada jam kerja
                  operasional)
                </p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
              <h3 className="font-semibold text-gray-800">
                Kapan Harus Menghubungi?
              </h3>

              <ul className="list-disc pl-5 text-gray-600 text-sm space-y-2">
                <li>Mengalami kendala saat pengisian formulir.</li>
                <li>
                  Membutuhkan penjelasan lebih lanjut mengenai definisi objek
                  gratifikasi.
                </li>
                <li>
                  Memerlukan informasi tambahan terkait proses verifikasi
                  laporan.
                </li>
              </ul>
            </div>

            <p className="text-700 leading-relaxed">
              Tim UPG siap membantu Anda memastikan proses pelaporan berjalan
              dengan lancar dan sesuai dengan ketentuan yang berlaku.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
