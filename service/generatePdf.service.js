import axios from "axios";

export const generatePdfService = async (laporan) => {
  try {
    const response = await axios.post("/api/generate-pdf", laporan, {
      responseType: "blob", // 📄 penting: agar hasil berupa file PDF
    });

    // 🔹 Buat URL blob dan unduh otomatis
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = `Laporan-${laporan.uniqueId}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error("PDF Error:", error);
    return { success: false, message: "Gagal membuat PDF" };
  }
};
