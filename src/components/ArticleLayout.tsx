"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import type { ArticleEntry, ArticleContent } from "@/lib/content-types";
import { flattenArticles } from "@/lib/content-types";
import ArticleNavTree from "./ArticleNavTree";
import MarkdownContent from "./MarkdownContent";
import MapWithLightbox from "./MapWithLightbox";
import MagicOverviewContent from "./MagicOverviewContent";
import MarkdownWithNationImage from "./MarkdownWithNationImage";

/** 大陆总览-地理概述页的 slug，该页正文上方显示可放大地图 */
const GEOGRAPHY_OVERVIEW_SLUG = "大陆总览 Overview/地理";
/** 大陆总览-魔法概述页的 slug，该页使用可折叠分节展示 */
const MAGIC_OVERVIEW_SLUG = "大陆总览 Overview/魔法";

interface ArticleLayoutProps {
  bookSlug: string;
  toc: ArticleEntry[];
  currentSlug: string;
  article: ArticleContent;
  /** 诸国列志文章若有同名配图，由服务端传入图片路径 */
  nationImagePath?: string | null;
}

export default function ArticleLayout({
  bookSlug,
  toc,
  currentSlug,
  article,
  nationImagePath = null,
}: ArticleLayoutProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isHoveringNav, setIsHoveringNav] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const activeLinkRef = useRef<HTMLAnchorElement | null>(null);
  const lastAutoScrolledSlugRef = useRef<string | null>(null);

  /** 文章页：URL ?sidebar=1 与导航面板状态同步 */
  useEffect(() => {
    setMobileNavOpen(searchParams?.get("sidebar") === "1");
  }, [searchParams]);

  /** 窄屏打开侧栏后恢复点击前的滚动位置，避免被 Next 或浏览器滚到顶部 */
  useEffect(() => {
    if (!mobileNavOpen) return;
    const raw = typeof window !== "undefined" ? sessionStorage.getItem("nurania-scroll-before-sidebar") : null;
    if (raw == null) return;
    sessionStorage.removeItem("nurania-scroll-before-sidebar");
    const y = parseInt(raw, 10);
    if (Number.isNaN(y)) return;
    const id = requestAnimationFrame(() => {
      window.scrollTo({ top: y, behavior: "auto" });
    });
    return () => cancelAnimationFrame(id);
  }, [mobileNavOpen]);

  const closeMobileNav = () => {
    setMobileNavOpen(false);
    if (pathname) router.replace(pathname, { scroll: false });
  };

  /** 导航栏内当前选中项居中（宽屏非悬停时，或移动端打开时） */
  const scrollActiveIntoView = () => {
    if (!navContainerRef.current || !activeLinkRef.current) return;
    const container = navContainerRef.current;
    const active = activeLinkRef.current;
    const activeCenter = active.offsetTop + active.offsetHeight / 2;
    const targetScroll = activeCenter - container.clientHeight / 2;
    const maxScroll = container.scrollHeight - container.clientHeight;
    container.scrollTo({
      top: Math.max(0, Math.min(targetScroll, maxScroll)),
      behavior: "smooth",
    });
  };

  /** 宽屏：仅在切换文章时将当前项滚到可视区（避免鼠标移出导航栏时触发导致“自动回顶”错觉） */
  useEffect(() => {
    if (isHoveringNav) return;
    if (lastAutoScrolledSlugRef.current === currentSlug) return;
    if (!navContainerRef.current || !activeLinkRef.current) return;
    lastAutoScrolledSlugRef.current = currentSlug;
    const t = setTimeout(scrollActiveIntoView, 150);
    return () => clearTimeout(t);
  }, [currentSlug, isHoveringNav]);

  /** 移动端打开导航时也滚动到当前项 */
  useEffect(() => {
    if (!mobileNavOpen) return;
    const t = setTimeout(scrollActiveIntoView, 100);
    return () => clearTimeout(t);
  }, [mobileNavOpen]);

  /** 宽屏：悬停在左侧导航栏时，滚轮只滚动导航栏，不滚动整页（需 passive: false 才能 preventDefault） */
  useEffect(() => {
    const el = navContainerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const canScrollUp = scrollTop > 0;
      const canScrollDown = scrollTop < scrollHeight - clientHeight - 1;
      const scrollingDown = e.deltaY > 0;
      const scrollingUp = e.deltaY < 0;
      if ((scrollingUp && canScrollUp) || (scrollingDown && canScrollDown)) {
        e.preventDefault();
        el.scrollTop += e.deltaY;
      } else {
        e.preventDefault();
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const flatEntries = flattenArticles(toc);
  const currentIndex = flatEntries.findIndex((e) => e.slug === currentSlug);
  const prevEntry = currentIndex > 0 ? flatEntries[currentIndex - 1] : null;
  const nextEntry = currentIndex >= 0 && currentIndex < flatEntries.length - 1 ? flatEntries[currentIndex + 1] : null;

  const navContent = (
    <>
      <Link
        href={`/${bookSlug}/toc`}
        className="inline-flex items-center gap-2 text-[var(--ink-muted)] hover:text-[var(--gold-dark)] mb-4 transition-colors text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        返回目录
      </Link>
      <p className="text-xs uppercase tracking-wider text-[var(--ink-faded)] mb-2">
        目录
      </p>
      <ArticleNavTree
        bookSlug={bookSlug}
        entries={toc}
        currentSlug={currentSlug}
        activeLinkRef={activeLinkRef}
      />
    </>
  );

  const sidebarInner = (
    <div
      ref={navContainerRef}
      className="nav-sidebar-scrollbar h-full overflow-y-auto overflow-x-hidden border-l-2 border-[var(--parchment-aged)] pl-4 pr-2 py-2 overscroll-contain"
      onMouseEnter={() => setIsHoveringNav(true)}
      onMouseLeave={() => setIsHoveringNav(false)}
      style={{ scrollBehavior: isHoveringNav ? "auto" : "smooth" }}
    >
      {navContent}
    </div>
  );

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      {/* 10% 透明度世界地图背景：固定于视口，不随内容滚动 */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <Image
          src="/Nurania/world-map.jpg"
          alt=""
          fill
          className="object-cover object-center opacity-10 min-w-full min-h-full md:scale-110 lg:scale-125"
          sizes="100vw"
          loading="eager"
        />
      </div>
      <div className="relative z-10 container-nurania py-8 md:py-12">
      <div className="flex flex-col md:flex-row gap-8 md:gap-16 relative">
        {/* 移动端：导航遮罩与浮层侧栏（仅窄屏，由 ?sidebar=1 控制）；宽屏不渲染 */}
        <AnimatePresence>
          {mobileNavOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="md:hidden fixed inset-0 z-40 bg-black/30"
                onClick={closeMobileNav}
                aria-hidden
              />
              <aside
                className="md:hidden fixed right-0 top-14 bottom-0 z-40 w-64 max-w-[85vw] bg-[var(--parchment-light)] shadow-xl pt-4"
                aria-label="导航"
              >
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  {sidebarInner}
                </motion.div>
              </aside>
            </>
          )}
        </AnimatePresence>

        {/* 宽屏：左侧导航栏，固定高度以便内部可滚动，吸顶 */}
        <aside
          className="hidden md:block w-56 flex-shrink-0 sticky top-20 self-start h-[calc(100vh-6rem)] min-h-0"
          aria-label="导航"
        >
          {sidebarInner}
        </aside>

        {/* 右侧：文章主内容 */}
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex-1 min-w-0"
        >
          <header className="mb-8">
            <h1 className="font-display text-2xl md:text-3xl font-semibold text-[var(--ink)]">
              {article.title}
            </h1>
            {article.titleEn && (
              <p className="text-[var(--ink-muted)] mt-1 font-medium italic">
                {article.titleEn}
              </p>
            )}
          </header>
          {currentSlug === GEOGRAPHY_OVERVIEW_SLUG && <MapWithLightbox />}
          {currentSlug === MAGIC_OVERVIEW_SLUG ? (
            <MagicOverviewContent content={article.content} />
          ) : nationImagePath ? (
            <MarkdownWithNationImage
              content={article.content}
              imagePath={nationImagePath}
              imageAlt={article.title}
            />
          ) : (
            <MarkdownContent content={article.content} />
          )}

          {/* 上一篇 / 下一篇 */}
          <nav className="mt-12 pt-8 border-t border-[var(--parchment-aged)] flex flex-wrap justify-between gap-4">
            {prevEntry ? (
              <Link
                href={`/${bookSlug}/article/${prevEntry.slug.split("/").map(encodeURIComponent).join("/")}`}
                className="inline-flex items-center gap-1.5 text-[var(--ink-muted)] hover:text-[var(--gold-dark)] transition-colors text-sm max-w-[45%]"
              >
                <ChevronLeft className="h-4 w-4 flex-shrink-0" />
                <span>上一篇：{prevEntry.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {nextEntry ? (
              <Link
                href={`/${bookSlug}/article/${nextEntry.slug.split("/").map(encodeURIComponent).join("/")}`}
                className="inline-flex items-center gap-1.5 text-[var(--ink-muted)] hover:text-[var(--gold-dark)] transition-colors text-sm max-w-[45%] ml-auto text-right"
              >
                <span>下一篇：{nextEntry.title}</span>
                <ChevronRight className="h-4 w-4 flex-shrink-0" />
              </Link>
            ) : null}
          </nav>
        </motion.article>
      </div>
      </div>
    </div>
  );
}
