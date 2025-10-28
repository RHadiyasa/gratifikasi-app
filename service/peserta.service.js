import axios from "axios";

const API_URL = "/api/peserta";

export const pesertaBatchOneService = async () => {
  try {
    const response = await axios.get(API_URL);
    return response.data;
  } catch (error) {
    console.error("Gagal memuat data peserta:", error);
    throw new Error("Failed to load participants data");
  }
};
