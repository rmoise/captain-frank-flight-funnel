import { useEffect } from "react";

/**
 * Hook to scroll to the top of the page on component mount
 * @param deps - Optional dependencies array to control when scrolling happens
 */
export const useScrollToTop = (deps: any[] = []) => {
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check for scrollTop parameter in the URL
      const searchParams = new URLSearchParams(window.location.search);
      const shouldScrollTop = searchParams.has("scrollTop");

      // Always scroll to top if scrollTop parameter is present or no dependencies provided
      if (shouldScrollTop || deps.length === 0) {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    }
  }, deps);
};

export default useScrollToTop;
