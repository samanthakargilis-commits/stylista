import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const sans = Inter({ variable: "--font-sans-family", subsets: ["latin"] });
const serif = Fraunces({ variable: "--font-serif-family", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Stylista",
  description: "Your personal stylist: a daily look from what's clean in your closet.",
  appleWebApp: { capable: true, title: "Stylista", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f5f0e6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable} antialiased`}>{children}</body>
    </html>
  );
}
