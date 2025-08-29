import axios, { type AxiosResponse } from "axios";

const token_url: string = "https://dev.netclan.com/devChat/api/conferencing/token";

export const getToken = async (roomName: string, participantName: string) => {
  try {
    const response: AxiosResponse = await axios.post(token_url, {
      roomName,
      participantName
    });

    return response.data;
  } catch (error) {
    console.log("Get token error:", error);
  }
};
