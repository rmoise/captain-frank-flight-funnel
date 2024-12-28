// Date formatting
export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// Time formatting
export const formatTime = (time: string): string => {
  return new Date(`1970-01-01T${time}`).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Price formatting
export const formatPrice = (
  price: number | undefined,
  currency: string = '€'
): string => {
  if (price === undefined) return '';
  return `${currency}${price.toFixed(2)}`;
};

// Flight duration calculation
export const calculateDuration = (
  departureTime: string,
  arrivalTime: string
): string => {
  const start = new Date(`1970-01-01T${departureTime}`);
  const end = new Date(`1970-01-01T${arrivalTime}`);
  const diff = end.getTime() - start.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

// Form validation
export const validateEmail = (email: string): boolean => {
  const regex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  return regex.test(email);
};

// Phone number formatting
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  // Format as: +XX XXX XXX XXX
  const match = cleaned.match(/^(\d{2})(\d{3})(\d{3})(\d{3})$/);
  if (match) {
    return `+${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
  }
  return phone;
};

// Experience type formatting
export const formatExperienceType = (type: string): string => {
  return type.charAt(0).toUpperCase() + type.slice(1);
};

interface ApiError {
  response?: {
    data: {
      message?: string;
    };
  };
  message?: string;
}

// Error handling
export const handleApiError = (error: ApiError): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  return error.message || 'Network error. Please try again.';
};

// Local storage helpers
export const storage = {
  set: <T extends Record<string, unknown>>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  },
  get: <T extends Record<string, unknown>>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : null;
    } catch (e) {
      console.error('Error reading from localStorage:', e);
      return null;
    }
  },
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Error removing from localStorage:', e);
    }
  },
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};
