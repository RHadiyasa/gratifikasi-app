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
  // ... (Logika fetch ke /api/s3 yang sudah Anda perbaiki)
  const response = await fetch(`/api/s3?key=${s3Key}`);

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
