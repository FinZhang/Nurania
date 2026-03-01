import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { getSiteToc } from "@/lib/content";
import { TOC_INTRO } from "@/data/toc_intro";
import TocList from "@/components/TocList";
import TocSidebar from "@/components/TocSidebar";

export default function TocPage() {
  const siteToc = getSiteToc();

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      {/* 半透明地图背景：固定于视口，不随内容滚动 */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <Image
          src="/world-map.jpg"
          alt=""
          fill
          className="object-cover object-center opacity-10 min-w-full min-h-full md:scale-110 lg:scale-125"
          sizes="100vw"
          loading="eager"
        />
      </div>
      <div className="relative z-10 container-nurania py-12 md:py-20">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-[var(--ink-muted)] hover:text-[var(--gold-dark)] mb-8 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        返回封面
      </Link>

      {/* 窄屏：简介在目录上方，封面隐藏 */}
      <div className="md:hidden mb-6 text-base text-[var(--ink-muted)] leading-relaxed whitespace-pre-wrap">
        {TOC_INTRO}
      </div>

      <div className="flex flex-col md:flex-row md:items-start gap-8 md:gap-12">
        {/* 左侧：目录标题 + 列表 */}
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-[var(--ink)] mb-2">
            目录
          </h1>
          <p className="text-[var(--ink-muted)] mb-12">
            Table of Contents
          </p>
          <TocList entries={siteToc} />
        </div>

        {/* 宽屏：右侧悬浮封面 + 简介（带进入动画） */}
        <TocSidebar intro={TOC_INTRO} />
      </div>
      </div>
    </div>
  );
}
