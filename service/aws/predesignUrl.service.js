import axios from "axios";

export const getPresignedUrlFromBackendForDownload = async (s3Key) => {
  // ... (Logika fetch ke /api/s3 yang sudah Anda perbaiki)
  const response = await fetch(`/api/elearning/download-sertif?key=${s3Key}`);

  if (!response.ok) {
    // Tangani error
    const errorText = await response.text();
    console.error("Error fetching presigned URL:", errorText);
    throw new Error(
      `Gagal mendapatkan Presigned URL. Status: ${response.status}`
    );
  }

  // Backend harus mengembalikan JSON seperti { url: "https://yourbucket.s3.aws..." }
  const data = await response.json();
  return data.url; // Asumsi backend mengembalikan properti 'url'
};

export const getPresignedUrlFromBackend = async (s3Key) => {
  const response = await fetch(`/api/s3?key=${s3Key}`);

  if (!response.ok) {
    // Tangani error
    const errorText = await response.text();
    console.error("Error fetching presigned URL:", errorText);
    throw new Error(
      `Gagal mendapatkan Presigned URL. Status: ${response.status}`
    );
  }

  const data = await response.json();
  return data.url;
};

export const getPresignedZipUrlFromBackend = async (unitName) => {
  try {
    const res = await axios.get(`/api/aws/getPresignedZipUrl?unit=${unitName}`);

    if (res.data.success && res.data.url) {
      // Buka link ZIP di tab baru
      window.open(res.data.url, "_blank");
    } else {
      throw new Error(res.data.message || "Gagal mendapatkan URL download");
    }
  } catch (error) {
    console.error("Gagal mengambil ZIP URL:", error);
    throw error;
  }
};

export const downloadZipDirectly = async (unitName) => {
  try {
    // Panggil endpoint baru yang langsung kirim ZIP
    const response = await fetch(
      `/api/aws/getPresignedZipUrl?unit=${unitName}`,
      {
        method: "GET",
      }
    );

    if (!response.ok) {
      throw new Error(`Gagal mengunduh ZIP: ${response.statusText}`);
    }

    // Konversi ke blob (binary data)
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    // Buat link download manual
    const link = document.createElement("a");
    link.href = url;
    link.download = `${unitName.replace(/\s+/g, "_")}_certificates.zip`;
    document.body.appendChild(link);
    link.click();

    // Bersihkan
    link.remove();
    window.URL.revokeObjectURL(url);

    console.log("✅ ZIP berhasil diunduh langsung!");
  } catch (error) {
    console.error("Gagal mengambil ZIP:", error);
    throw error;
  }
};
