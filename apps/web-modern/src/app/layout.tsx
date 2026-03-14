// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/providers/heroui-provider";
import { Footer } from "@/components/footer";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NEXUS | Time Banking Platform",
  description: "A modern time banking platform for community exchange",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <Providers>
          {/* Skip to main content link for keyboard / assistive technology users */}
          <a href="#main-content" className="skip-link">Skip to main content</a>

          {/* Animated gradient background */}
          <div className="gradient-background" aria-hidden="true" />

          {/* Main content */}
          <main id="main-content" className="relative min-h-screen flex flex-col">
            <div className="flex-1">
              {children}
            </div>
            <Footer />
          </main>
        </Providers>
      </body>
    </html>
  );
}
