export const validateLocation = (value: string | null): boolean => {
  if (!value) return false;
  return value.trim().length === 3;
};
