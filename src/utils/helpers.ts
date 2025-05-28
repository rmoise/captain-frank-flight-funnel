// Date formatting
export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Time formatting
export const formatTime = (time: string): string => {
  return new Date(`1970-01-01T${time}`).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Price formatting
export const formatPrice = (
  price: number | undefined,
  currency = "€"
): string => {
  if (price === undefined) return "";
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
  const cleaned = phone.replace(/\D/g, "");
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
  return error.message || "Network error. Please try again.";
};

// Local storage size management
const LOCAL_STORAGE_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB limit (typical browser limit)
const COMPRESSION_THRESHOLD = 3 * 1024 * 1024; // 3MB threshold for compression

/**
 * Utility to check localStorage size and manage storage
 */
export const localStorageManager = {
  /**
   * Get the total size of data in localStorage
   * @returns Size in bytes
   */
  getTotalSize: (): number => {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += key.length + value.length * 2; // Unicode strings use 2 bytes per character
      }
    }
    return totalSize;
  },

  /**
   * Check if localStorage is near capacity
   * @returns Boolean indicating if localStorage is close to full
   */
  isNearCapacity: (): boolean => {
    return localStorageManager.getTotalSize() > COMPRESSION_THRESHOLD;
  },

  /**
   * Simple object pruning to reduce size
   * @param data Object to prune
   * @returns Pruned object with non-essential fields removed
   */
  pruneObject: (data: any): any => {
    if (!data || typeof data !== "object") return data;

    // If it's an array, prune each item
    if (Array.isArray(data)) {
      return data.map((item) => localStorageManager.pruneObject(item));
    }

    // Skip certain large properties that can be recreated
    const skipProps = ["searchResults", "flightHistory", "originalFlights"];

    const result: any = {};

    for (const key in data) {
      // Skip functions and certain known large properties
      if (
        typeof data[key] !== "function" &&
        !skipProps.includes(key) &&
        data[key] !== undefined
      ) {
        // Recursively prune objects
        if (typeof data[key] === "object" && data[key] !== null) {
          result[key] = localStorageManager.pruneObject(data[key]);
        } else {
          result[key] = data[key];
        }
      }
    }

    return result;
  },

  /**
   * Store a value with optimization if needed
   * @param key Storage key
   * @param value Value to store
   * @returns Boolean indicating success
   */
  safeSetItem: (key: string, value: string): boolean => {
    try {
      // For large values, try to reduce size by parsing and eliminating unnecessary data
      if (value.length > 100000) {
        // ~100KB
        try {
          // Parse the JSON to prune unnecessary data
          const parsed = JSON.parse(value);
          const pruned = localStorageManager.pruneObject(parsed);
          const prunedValue = JSON.stringify(pruned);

          console.log(
            `[Storage] Optimized ${key}: ${(value.length / 1024).toFixed(
              1
            )}KB → ${(prunedValue.length / 1024).toFixed(1)}KB`
          );

          localStorage.setItem(key, prunedValue);
          return true;
        } catch (e) {
          // If pruning fails, store original but log warning
          console.warn(`[Storage] Pruning failed for ${key}, storing original`);
          localStorage.setItem(key, value);
          return true;
        }
      } else {
        // For smaller values, just store directly
        localStorage.setItem(key, value);
        return true;
      }
    } catch (error) {
      console.error(`[Storage] Error setting ${key}:`, error);

      // If storage fails, try again with more aggressive pruning
      if (
        error instanceof DOMException &&
        error.name === "QuotaExceededError"
      ) {
        console.warn(`[Storage] Quota exceeded, cleaning up storage`);
        localStorageManager.cleanup();

        try {
          // Try to parse and store minimal data
          const parsed = JSON.parse(value);
          // More aggressive pruning - only keep critical data
          const minimalData = {
            timestamp: Date.now(),
            // Keep just enough state to avoid breaking the app
            critical: true,
          };
          localStorage.setItem(key, JSON.stringify(minimalData));
          return true;
        } catch (e) {
          console.error(`[Storage] Final storage attempt failed for ${key}`);
          return false;
        }
      }
      return false;
    }
  },

  /**
   * Get a value from localStorage
   * @param key Storage key
   * @returns The stored value or null
   */
  safeGetItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`[Storage] Error getting ${key}:`, error);
      return null;
    }
  },

  /**
   * Remove a key from localStorage
   * @param key Storage key
   */
  safeRemoveItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`[Storage] Error removing ${key}:`, error);
    }
  },

  /**
   * Clean up old or redundant localStorage items
   */
  cleanup: (): void => {
    try {
      // Find all Zustand state keys
      const stateKeys = Object.keys(localStorage).filter(
        (key) => key.includes("state") || key.endsWith("store")
      );

      // Keep only the newest version of each store
      const storeGroups: Record<string, string[]> = {};
      stateKeys.forEach((key) => {
        const baseName = key.split("-")[0]; // Extract base name like "captain-frank"
        if (!storeGroups[baseName]) {
          storeGroups[baseName] = [];
        }
        storeGroups[baseName].push(key);
      });

      // For each group, identify old versions
      Object.values(storeGroups).forEach((keys) => {
        if (keys.length <= 1) return;

        // Sort by timestamp (assuming they contain timestamp in name or in content)
        keys.sort((a, b) => {
          const aItem = localStorage.getItem(a);
          const bItem = localStorage.getItem(b);
          if (!aItem || !bItem) return 0;

          // Try to extract timestamp from content
          try {
            const aTime = JSON.parse(aItem)?.timestamp || 0;
            const bTime = JSON.parse(bItem)?.timestamp || 0;
            return bTime - aTime; // Descending order (newest first)
          } catch {
            return 0;
          }
        });

        // Keep newest, remove others
        const [newest, ...rest] = keys;
        rest.forEach((key) => {
          localStorage.removeItem(key);
          console.log(`[Storage Cleanup] Removed old store: ${key}`);
        });
      });

      console.log(
        `[Storage Cleanup] Completed, current size: ${(
          localStorageManager.getTotalSize() /
          1024 /
          1024
        ).toFixed(2)}MB`
      );
    } catch (error) {
      console.error("[Storage Cleanup] Error:", error);
    }
  },
};

// Enhance the existing storage helpers with our new functionality
export const storage = {
  set: <T extends Record<string, unknown>>(key: string, value: T): void => {
    try {
      const stringValue = JSON.stringify(value);
      localStorageManager.safeSetItem(key, stringValue);
    } catch (e) {
      console.error("Error saving to localStorage:", e);
    }
  },
  get: <T extends Record<string, unknown>>(key: string): T | null => {
    try {
      const item = localStorageManager.safeGetItem(key);
      return item ? (JSON.parse(item) as T) : null;
    } catch (e) {
      console.error("Error reading from localStorage:", e);
      return null;
    }
  },
  remove: (key: string): void => {
    try {
      localStorageManager.safeRemoveItem(key);
    } catch (e) {
      console.error("Error removing from localStorage:", e);
    }
  },
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};
