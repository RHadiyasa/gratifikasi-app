"use client";
import { useState } from "react";

// Ikon Pencarian (SVG)
const SearchIcon = (props) => (
  <svg
    aria-hidden="true"
    fill="none"
    focusable="false"
    role="presentation"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    {...props}
  >
    <path
      d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function TrackingSection() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingData, setTrackingData] = useState(null);
  const [isTracking, setIsTracking] = useState(false);

  const handleTrack = async () => {
    if (trackingNumber.trim() === "") return;

    setIsTracking(true);
    setTrackingData(null);

    try {
      const res = await fetch(`/api/tracking?uniqueId=${trackingNumber}`);
      const data = await res.json();
      console.log(data);

      if (!data.success) {
        setTrackingData({
          type: "error",
          message: "Nomor laporan tidak ditemukan.",
        });
      } else {
        setTrackingData({
          type: data.status,
          message: `Status Laporan: ${data.status}`,
          createdAt: data.createdAt,
          deskripsi: data.deskripsi,
        });
      }
    } catch (error) {
      setTrackingData({
        type: "error",
        message: "Terjadi kesalahan server.",
      });
    }

    setIsTracking(false);
  };

  const statusColor = {
    Diajukan:
      "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700",
    Diverifikasi:
      "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700",
    "Diteruskan ke KPK":
      "bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-200 border-violet-300 dark:border-violet-700",
    Selesai:
      "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700",
    error:
      "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700",
  };

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <div className="w-full max-w-lg mx-auto p-6 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl shadow-2xl border border-violet-200 dark:border-violet-700">
        <h3 className="text-2xl font-bold mb-4 text-violet-600 dark:text-violet-400 flex items-center justify-center gap-3">
          <SearchIcon className="w-6 h-6" />
          Lacak Status Laporan
        </h3>

        <p className="text-base text-gray-600 dark:text-gray-400 mb-6">
          Masukkan Nomor Laporan (e.g., UPG-20251127-861) untuk mengetahui
          status tindak lanjut secara real-time.
        </p>

        <div className="flex w-full gap-2">
          <input
            type="text"
            placeholder="Nomor Laporan Anda..."
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            className="flex-grow p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-violet-500 focus:border-violet-500 dark:bg-gray-800 dark:text-white transition-colors text-base"
            disabled={isTracking}
          />

          <button
            onClick={handleTrack}
            disabled={trackingNumber.trim() === "" || isTracking}
            className={`px-6 py-3 rounded-lg font-semibold text-white transition-all duration-300 flex items-center justify-center min-w-[100px] ${
              trackingNumber.trim() === "" || isTracking
                ? "bg-violet-400 dark:bg-violet-700 cursor-not-allowed"
                : "bg-violet-600 hover:bg-violet-700 active:bg-violet-800 shadow-md"
            }`}
          >
            {isTracking ? (
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              "Lacak"
            )}
          </button>
        </div>

        {trackingData && (
          <div
            className={`mt-4 p-4 rounded-lg text-base border transition-all duration-300 ${
              statusColor[trackingData.type] || statusColor.error
            }`}
          >
            <p className="font-semibold mb-1">Hasil Pelacakan:</p>

            {/* Status Laporan */}
            <p>{trackingData.message}</p>

            {/* Tanggal Pembuatan Laporan */}
            {trackingData.createdAt && (
              <p className="mt-2 text-sm opacity-90">
                <span className="font-semibold">Dibuat pada:</span>{" "}
                {new Date(trackingData.createdAt).toLocaleString("id-ID", {
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </p>
            )}

            {/* Deskripsi Tambahan */}
            {trackingData.deskripsi && (
              <p className="mt-2 text-sm opacity-90">
                <span className="font-semibold">Keterangan:</span>{" "}
                {trackingData.deskripsi}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
