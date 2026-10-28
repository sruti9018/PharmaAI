import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { Suspense } from "react";
import { AuthProvider } from "@/lib/authContext";
import { ThemeProvider } from "@/lib/themeContext";
import { ToastProvider } from "@/components/ui/toast";
import { AppShell } from "@/components/layout/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PharmaLink AI — Smart Pharmacy Assistance Dashboard",
  description:
    "Smart pharmacy assistance dashboard interfacing with ESP32 load cell weight verification, RFID medicine identification, and camera prescription OCR.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="relative min-h-full flex flex-col font-sans">
        <div className="isolate relative flex min-h-svh flex-col">
          <ThemeProvider>
            <AuthProvider>
              <ToastProvider position="bottom-right">
                <Suspense fallback={<div className="h-svh w-full bg-background" />}>
                  <AppShell>{children}</AppShell>
                </Suspense>
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
