/**
 * Empty declarations for problematic modules
 * This tells TypeScript that these modules exist but don't have any exports
 * This prevents the TS2688 errors
 */

// Empty declarations for babel__parser modules
declare module 'babel__parser' {}
declare module 'babel__parser 2' {}

// Empty declarations for tailwindcss modules
declare module 'tailwindcss' {}
declare module 'tailwindcss 2' {}
declare module 'tailwindcss 3' {}
