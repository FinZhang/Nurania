import type { Metadata } from "next";
import { Suspense } from "react";
import { Cormorant_Garamond, Cinzel } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { READING_PREFS_BOOT_SCRIPT } from "@/lib/reading-prefs";
import { SITE_BASE_URL, absoluteUrl } from "@/lib/basePath";

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

const SITE_TITLE = "尤里梅尔全集 | Eurymare: The Complete Writings";
const SITE_DESCRIPTION = "纪念塞勒内斯·尤里梅尔诞辰150周年系列文集";
/** 分享卡片的兜底配图：第一本书的封面 */
const DEFAULT_OG_IMAGE = absoluteUrl("/compendium/book_cover.webp");

export const metadata: Metadata = {
  // 各页只给相对路径，由它补全成绝对地址——分享卡片里的相对路径别的 App 打不开
  metadataBase: new URL(SITE_BASE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_TITLE,
    locale: "zh_CN",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_BASE_URL,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <base href="/Nurania/" />
        {/* 首屏同步执行：在任何绘制之前把阅读偏好写到 <html> 上，避免刷新时闪一帧日间配色 */}
        <script dangerouslySetInnerHTML={{ __html: READING_PREFS_BOOT_SCRIPT }} />
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
