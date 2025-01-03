import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const pathname = request.nextUrl.pathname;

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
  matcher: ['/claim-success'],
};
