import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import useStore from '@/lib/state/store';

export function NavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { initializeNavigationFromUrl } = useStore();

  useEffect(() => {
    // Initialize navigation state when the pathname changes
    if (pathname) {
      initializeNavigationFromUrl(pathname);
    }
  }, [pathname, initializeNavigationFromUrl]);

  return <>{children}</>;
}
