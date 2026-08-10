import axios from "axios";

export const reportService = async (laporan) => {
  try {
    const response = await axios.post("/api/report", laporan);

    return { success: true, data: response.data?.data };
  } catch (error) {
    // Jangan kembalikan body error seolah-olah data normal — pemanggil harus
    // bisa membedakan laporan yang benar-benar tersimpan dari yang gagal.
    return {
      success: false,
      message:
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Laporan gagal disimpan",
    };
  }
};
