'use client';

import { getAlternativeOptions } from '@/utils/flightIssues';
import { LightBulbIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export function AlternativeOptions() {
  const options = getAlternativeOptions();

  return (
    <div className="rounded-lg bg-yellow-50 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <LightBulbIcon
            className="h-5 w-5 text-yellow-400"
            aria-hidden="true"
          />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">
            Alternative Möglichkeiten
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <ul className="list-disc pl-5 space-y-1">
              {options.map((option, index) => (
                <li key={index}>
                  <span>{option.description}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4">
            <div className="-mx-2 -my-1.5 flex">
              <Link
                href="/contact"
                className="rounded-md bg-yellow-50 px-2 py-1.5 text-sm font-medium text-yellow-800 hover:bg-yellow-100"
              >
                Kontakt aufnehmen
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
