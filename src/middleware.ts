import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Only handle phase routes
  if (request.nextUrl.pathname.startsWith('/phases/')) {
    const response = NextResponse.next();

    // Get the current phase from the URL
    const urlPhase = getPhaseFromUrl(request.nextUrl.pathname);
    if (urlPhase) {
      // Set the phase in a cookie to persist it
      response.cookies.set('currentPhase', urlPhase.toString(), {
        path: '/',
        sameSite: 'lax',
      });
    }

    return response;
  }

  return NextResponse.next();
}

function getPhaseFromUrl(url: string): number | null {
  if (url.includes('/phases/initial-assessment')) return 1;
  if (url.includes('/phases/compensation-estimate')) return 2;
  if (url.includes('/phases/flight-details')) return 3;
  if (url.includes('/phases/trip-experience')) return 4;
  if (url.includes('/phases/claim-success')) return 5;
  if (url.includes('/phases/agreement')) return 6;
  return null;
}

export const config = {
  matcher: ['/api/:path*', '/phases/:path*'],
};
