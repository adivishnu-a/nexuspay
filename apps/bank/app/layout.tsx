import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "NexusPay Bank | Sandbox CBS",
  description: "Administrative interface for the NexusPay Sandbox Core Banking System.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      <body className={`${inter.variable} font-sans selection:bg-primary/10 selection:text-primary`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
