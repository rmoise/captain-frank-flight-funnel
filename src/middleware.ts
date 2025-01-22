import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DEFAULT_LANGUAGE, isValidLanguage } from '@/config/language';

export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const pathname = request.nextUrl.pathname;

  // Get the first segment of the path which should be the language
  const segments = pathname.split('/');
  const firstSegment = segments[1];

  // If the path doesn't start with a language code, redirect to the default language
  if (!firstSegment || !isValidLanguage(firstSegment)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${DEFAULT_LANGUAGE}${pathname}`;
    return NextResponse.redirect(url);
  }

  // Handle /claim-success route
  if (pathname === '/claim-success') {
    // Create a new URL for the rewrite
    const url = request.nextUrl.clone();

    // Preserve all query parameters
    const searchParams = new URLSearchParams(request.nextUrl.search);

    // Add flags to indicate this is a redirected request and bypass phase check
    searchParams.set('redirected', 'true');
    searchParams.set('bypass_phase_check', 'true');

    // Update the pathname and search params
    url.pathname = '/phases/claim-success';
    url.search = searchParams.toString();

    // Use temporary redirect (307) to preserve the request method and body
    return NextResponse.redirect(url, { status: 307 });
  }

  // Continue with the request for all other routes
  return NextResponse.next();
}

// Configure the paths that should trigger this middleware
export const config = {
  matcher: [
    // Match all paths except for:
    // - api routes (/api/*)
    // - static files (/_next/*)
    // - favicon.ico
    '/((?!api|_next|favicon.ico).*)',
  ],
};
