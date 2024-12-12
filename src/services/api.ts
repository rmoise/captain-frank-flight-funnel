import { ApiResponse, Flight, FlightNotListedData } from '@/types';
import { handleApiResponse } from '@/utils/errorHandling';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const api = {
  async getFlights(): Promise<ApiResponse<Flight[]>> {
    const response = await fetch(`${API_BASE_URL}/flights`);
    return handleApiResponse(response);
  },

  async submitNotListedFlight(
    data: FlightNotListedData
  ): Promise<ApiResponse<void>> {
    const response = await fetch(`${API_BASE_URL}/flights/not-listed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleApiResponse(response);
  },
};
