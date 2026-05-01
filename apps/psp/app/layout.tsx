import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "NexusPay | Modern UPI Payments",
  description: "Secure, instant, and modern VPA transfers.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#005da7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      <body className={`${inter.variable} font-sans selection:bg-primary/10 selection:text-primary`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
