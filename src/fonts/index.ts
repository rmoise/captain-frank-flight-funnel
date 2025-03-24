import { Heebo } from 'next/font/google';

// Define the Heebo font using Google Fonts instead of local files
export const heebo = Heebo({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-heebo',
  weight: ['400', '500', '700']
});