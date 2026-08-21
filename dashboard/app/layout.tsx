import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Playfair_Display, DM_Mono } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-dm-mono",
  display: "swap",
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "Tokenix · AI Compute Price Index",
  description: "The standard measure of AI compute value — quality-adjusted pricing across 100+ providers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // ClerkProvider sits INSIDE <body>, not around <html>: wrapping the html
    // element makes Clerk own the document shell and breaks the font variables
    // set on it. It only supplies session context — it gates nothing;
    // middleware.ts decides what is protected.
    <html lang="en" className={`${playfair.variable} ${dmMono.variable}`}>
      <body className="min-h-full flex flex-col">
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
