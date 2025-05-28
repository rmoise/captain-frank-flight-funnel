import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useStore } from "@/store";
import { PATH_TO_PHASE } from "@/hooks/useNavigation";
import { ValidationPhase } from "@/types/shared/validation";

export function NavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const setCurrentPhase = useStore(
    (state) => state.actions.navigation.setCurrentPhase
  );
  const isInitialized = useStore((state) => state.core.isInitialized);

  useEffect(() => {
    // Only run after store is initialized and we have a pathname
    if (!isInitialized || !pathname || !setCurrentPhase) {
      return;
    }

    // Extract the base path without language prefix
    const basePath = pathname.replace(/^\/de/, "");
    const phaseNumber = PATH_TO_PHASE[basePath] || PATH_TO_PHASE[pathname];

    if (phaseNumber && typeof phaseNumber === "number") {
      // Convert phase number to ValidationPhase enum
      const phase = Object.values(ValidationPhase)[phaseNumber - 1];
      if (phase) {
        try {
          setCurrentPhase(phase);
        } catch (error) {
          console.error("Failed to set navigation phase:", error);
        }
      }
    }
  }, [pathname, setCurrentPhase, isInitialized]);

  return <>{children}</>;
}
