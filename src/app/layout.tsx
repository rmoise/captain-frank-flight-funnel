import "./globals.css";
import "@/styles/autofill.css";
import { heebo } from "@/fonts";

export const metadata = {
  title: "Captain Frank Fresh",
  description: "Get compensation for your flight delays and cancellations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Root layout must define an html and body
  // This layout will be inherited by all nested layouts
  return (
    <html lang="de" className={heebo.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
