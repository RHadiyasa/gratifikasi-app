import axios from "axios";

export const loginService = async (nip, password) => {
  try {
    const response = await axios.post("api/auth/login", { nip, password });
    return response.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { success: false, message: "Unable to connect" };
  }
};

export const registerService = async (data) => {
  try {
    const response = await axios.post("api/auth/register", data);
    return response.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { success: false, message: "Unable to connect" };
  }
};
