'use client';

import * as React from 'react';
import Image from 'next/image';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';

interface LogoProps {
  imageUrl: string;
  altText: string;
}

const Logo: React.FC<LogoProps> = ({ imageUrl, altText }) => {
  const params = useParams();
  const currentLang = (params?.lang as string) || 'de';

  return (
    <Link
      href={`/${currentLang}/phases/initial-assessment`}
      className="cursor-pointer"
    >
      <div className="flex z-10 flex-col justify-center items-start px-8 py-7 bg-white max-md:px-5 max-md:max-w-full">
        <div className="relative w-56 aspect-[5.46]">
          <Image
            src={imageUrl}
            alt={altText}
            fill
            priority
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 224px"
          />
        </div>
      </div>
    </Link>
  );
};

const LanguageSwitcher = () => {
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

export const Navbar: React.FC = () => {
  return (
    <nav className="w-full bg-white shadow-sm">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Logo
          imageUrl="https://cdn.builder.io/api/v1/image/assets/15e77c7c76c740da9eda9e882a44a213/420155349e6308775ebfb983a34c128993459367208ac08ec6661da399a2a9e2?apiKey=15e77c7c76c740da9eda9e882a44a213&"
          altText="Company Logo"
        />
        <div className="px-8 py-7">
          <LanguageSwitcher />
        </div>
      </div>
    </nav>
  );
};
