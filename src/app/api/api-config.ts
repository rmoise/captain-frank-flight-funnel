// Configuration that should be imported by all API routes
// to prevent Next.js from trying to generate them at build time

// Tell Next.js this is a dynamic route that should not be pre-rendered
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Ensure this is treated as a runtime-only route
export const runtime = 'edge';

// Base URL for the backend API
export const API_BASE_URL = 'https://secure.captain-frank.net/api/services/euflightclaim';

/**
 * Helper function to create CORS headers
 */
export function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Standard OPTIONS handler for all API routes
 */
export async function standardOptionsHandler() {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(),
  });
}