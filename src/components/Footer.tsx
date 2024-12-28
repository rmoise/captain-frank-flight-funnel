'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-white">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <Image
                src="/images/logo.png"
                alt="Captain Frank Logo"
                width={150}
                height={40}
                className="h-8 w-auto"
              />
            </Link>
          </div>
          <div className="flex space-x-6">
            <Link href="/privacy" className="text-gray-500 hover:text-gray-900">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-gray-500 hover:text-gray-900">
              Terms of Service
            </Link>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-200 pt-8">
          <p className="text-center text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} Captain Frank. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
