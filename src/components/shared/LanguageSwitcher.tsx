'use client';

import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';

export const LanguageSwitcher = () => {
  const params = useParams();
  const pathname = usePathname();
  const currentLang = (params?.lang as string) || 'de';

  // Remove the language prefix from pathname
  const pathWithoutLang = pathname?.replace(/^\/[^\/]+/, '') || '';

  return (
    <div className="flex gap-2">
      <Link
        href={`/de${pathWithoutLang}`}
        className={`${currentLang === 'de' ? 'font-bold' : ''}`}
      >
        DE
      </Link>
      <span>|</span>
      <Link
        href={`/en${pathWithoutLang}`}
        className={`${currentLang === 'en' ? 'font-bold' : ''}`}
      >
        EN
      </Link>
    </div>
  );
};
