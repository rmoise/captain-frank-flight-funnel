import { ApiResponse } from '@/types';

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function handleApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  if (!response.ok) {
    const error = await response.json();
    throw new ApiError(
      response.status,
      error.message || 'An error occurred',
      error.errors
    );
  }
  const data = await response.json();
  return {
    data,
    status: response.status,
    message: response.statusText
  };
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
} 