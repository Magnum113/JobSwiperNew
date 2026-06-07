import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { BottomNav } from "@/components/layout/bottom-nav";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JobSwiper — вакансии HH.ru как в Tinder",
  description:
    "Свайпай вакансии с hh.ru, узнавай ИИ-совместимость с резюме и получай готовое сопроводительное письмо.",
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-dvh">
        <Providers>
          <div className="app-aurora relative mx-auto flex min-h-dvh w-full max-w-2xl flex-col">
            <main className="flex flex-1 flex-col pb-24">{children}</main>
            <BottomNav />
          </div>
        </Providers>
      </body>
    </html>
  );
}
