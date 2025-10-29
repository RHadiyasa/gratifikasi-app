import axios from "axios";

const API_URL2 = "/api/elearning/getAllParticipants";

// export const pesertaBatchOneService = async () => {
//   try {
//     const response = await axios.get(API_URL);
//     return response.data;
//   } catch (error) {
//     console.error("Gagal memuat data peserta:", error);
//     throw new Error("Failed to load participants data");
//   }
// };

export const getAllParticipants = async () => {
  try {
    const response = await axios.get(API_URL2);
    return response.data.data;
  } catch (error) {
    console.error("Gagal memuat data peserta:", error);
    throw new Error("Failed to load participants data");
  }
};
