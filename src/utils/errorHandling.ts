export const handleApiError = (error: Error): string => {
  console.error('API Error:', error);
  return error.message || 'An unexpected error occurred';
};

export const isValidResponse = <T>(response: T): boolean => {
  return response !== null && response !== undefined;
};
