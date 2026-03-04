import type { Metadata } from "next";
import { Suspense } from "react";
import { Cormorant_Garamond, Cinzel } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "诺拉尼亚行思录 | Under the Nuranian Skies",
  description: "[艾瑟瑞姆] 塞勒内斯 著",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <base href="/Nurania/" />
      </head>
      <body
        className={`${cormorant.variable} ${cinzel.variable} antialiased parchment-texture min-h-screen flex flex-col`}
        suppressHydrationWarning
      >
        <Suspense fallback={<header className="border-b border-[var(--parchment-aged)] bg-[var(--parchment-light)]/80 h-14 md:h-16" />}>
          <Header />
        </Suspense>
        <main className="flex-1 min-h-0 pb-12 md:pb-16">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
