import React from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import Footer from "@/components/footer";

const _inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AgriSense - Smart Farming Platform",
  description:
    "Smart farming platform with live weather data, soil analysis, and personalized crop recommendations",
  generator: "asadov.site",
  keywords: [
    "smart farming",
    "agriculture",
    "weather",
    "soil analysis",
    "crop recommendations",
    "AI",
  ],
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2d6a4f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem={false}
        >
          <>
            {children}
            <Footer />
          </>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
