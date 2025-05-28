import { localStorageManager } from "./helpers";

/**
 * Memory Manager Utility
 * Provides functionality to monitor and optimize memory usage in the application
 */
export const memoryManager = {
  /**
   * Monitors browser performance over time to detect memory leaks
   * @returns A cleanup function to stop monitoring
   */
  startMemoryMonitoring: () => {
    let samples: number[] = [];
    let warningIssued = false;
    let intervalId: number | undefined;

    // Check if memory API is available in this browser
    const hasMemoryAPI =
      typeof window !== "undefined" &&
      "performance" in window &&
      (window.performance as any).memory !== undefined;

    if (!hasMemoryAPI) {
      console.log(
        "[Memory Monitor] Performance.memory API not available in this browser. Memory monitoring disabled."
      );
      return () => {}; // No-op cleanup
    }

    // Setup periodic memory checks
    intervalId = window.setInterval(() => {
      try {
        const memoryInfo = (window.performance as any).memory;
        const usedJSHeapSize = memoryInfo.usedJSHeapSize / (1024 * 1024); // Convert to MB

        // Keep last 5 samples for trend analysis
        samples.push(usedJSHeapSize);
        if (samples.length > 5) samples.shift();

        // Check for increasing memory trend
        if (samples.length >= 3) {
          const isIncreasing = samples.every(
            (val, i, arr) => i === 0 || val >= arr[i - 1]
          );

          // Only warn if memory is both increasing and above threshold (100MB)
          if (isIncreasing && usedJSHeapSize > 100 && !warningIssued) {
            console.warn(
              `[Memory Warning] Memory usage is steadily increasing: ${usedJSHeapSize.toFixed(
                2
              )}MB`
            );
            warningIssued = true;

            // Reset warning after 1 minute to prevent spam
            setTimeout(() => {
              warningIssued = false;
            }, 60000);
          }
        }

        // Log memory status every 10 samples (to not flood console)
        if (Math.random() < 0.1) {
          console.log(
            `[Memory Status] JS Heap: ${usedJSHeapSize.toFixed(2)}MB`
          );
        }
      } catch (error) {
        // If any error occurs during monitoring, stop to prevent console spam
        console.error("[Memory Monitor] Error monitoring memory:", error);
        if (intervalId) {
          clearInterval(intervalId);
        }
      }
    }, 30000); // Check every 30 seconds (increased from 10 to reduce overhead)

    // Return cleanup function
    return () => {
      if (intervalId !== undefined) {
        clearInterval(intervalId);
      }
    };
  },

  /**
   * Perform memory optimization tasks
   */
  optimizeMemory: () => {
    if (typeof window === "undefined") return;

    try {
      // Check localStorage size and clean up if needed
      const storageSize = localStorageManager.getTotalSize();
      const storageSizeMB = storageSize / (1024 * 1024);

      console.log(
        `[Memory Manager] Current localStorage size: ${storageSizeMB.toFixed(
          2
        )}MB`
      );

      if (storageSizeMB > 3) {
        console.log(
          `[Memory Manager] Running localStorage cleanup due to large size`
        );
        localStorageManager.cleanup();
      }
    } catch (error) {
      console.error("[Memory Manager] Error during optimization:", error);
    }
  },

  /**
   * Setup all necessary memory monitoring and optimization
   * This should be called once at application startup
   */
  initializeMemoryManagement: () => {
    if (typeof window === "undefined") return;

    // Add a small delay to let the app initialize first
    const timeoutId = window.setTimeout(() => {
      try {
        // Start memory monitoring
        const stopMonitoring = memoryManager.startMemoryMonitoring();

        // Perform initial optimization with delay
        window.setTimeout(() => {
          memoryManager.optimizeMemory();
        }, 5000); // Wait 5 seconds after init

        // Schedule periodic optimization
        const optimizationInterval = window.setInterval(() => {
          memoryManager.optimizeMemory();
        }, 10 * 60 * 1000); // Every 10 minutes (increased from 5 to reduce overhead)

        // Add event listeners for page visibility to help with cleanup
        window.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "hidden") {
            // User navigated away, good time to clean up
            memoryManager.optimizeMemory();
          }
        });

        // Return cleanup function
        return () => {
          stopMonitoring();
          clearInterval(optimizationInterval);
        };
      } catch (error) {
        console.error(
          "[Memory Manager] Error initializing memory management:",
          error
        );
        return undefined;
      }
    }, 3000); // Wait 3 seconds before initializing

    // Return cleanup for the initial timeout
    return () => {
      clearTimeout(timeoutId);
    };
  },
};

export default memoryManager;
