import axios from "axios";

export const reportService = async (laporan) => {
  try {
    const response = await axios.post("api/report", laporan);
    return response.data;
  } catch (error) {
    if (error.response) {
      return error.response.data;
    } else {
      return { success: false, message: "Unable to create report" };
    }
  }
};
