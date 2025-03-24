import { NextResponse } from 'next/server';

// Tell Next.js not to try building this route
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'edge';

// This is a proxy handler for API routes
// All actual API logic is implemented in Netlify Functions
export async function GET() {
  // During build time or static generation, this route will be properly excluded
  // During runtime, requests will be rewritten to the Netlify Functions
  return NextResponse.json({
    message: 'API routes are handled by Netlify Functions',
    documentation: 'See netlify/functions directory for implementations'
  });
}

export async function POST() {
  // Same as GET handler
  return NextResponse.json({
    message: 'API routes are handled by Netlify Functions',
    documentation: 'See netlify/functions directory for implementations'
  });
}