"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";

export default function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isArticlePage = pathname?.startsWith("/article");
  const sidebarOpen = searchParams?.get("sidebar") === "1";

  const handleTocClick = () => {
    if (!isArticlePage) return;
    // 窄屏打开/关闭侧栏时保留当前滚动位置（Next 有时仍会滚到顶部）
    if (!sidebarOpen) {
      try {
        sessionStorage.setItem("nurania-scroll-before-sidebar", String(window.scrollY));
      } catch {
        /* ignore */
      }
    }
    if (sidebarOpen) {
      router.replace(pathname ?? "/toc", { scroll: false });
    } else {
      router.replace(pathname + "?sidebar=1", { scroll: false });
    }
  };

  return (
    <header className="border-b border-[var(--parchment-aged)] bg-[var(--parchment-light)]/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container-nurania flex h-14 items-center justify-between md:h-16">
        <Link
          href="/"
          className="flex items-center gap-2 text-[var(--ink)] hover:text-[var(--gold-dark)] transition-colors glow-hover rounded px-2 py-1"
        >
          <BookOpen className="h-5 w-5 md:h-6 md:w-6" />
          <span className="font-display text-lg md:text-xl tracking-wide">
            诺拉尼亚行思录
          </span>
        </Link>
        <nav className="flex items-center gap-4">
          {isArticlePage && (
            <button
              type="button"
              onClick={handleTocClick}
              className="md:hidden text-sm md:text-base text-[var(--ink-muted)] hover:text-[var(--gold-dark)] transition-colors"
              aria-expanded={sidebarOpen}
              aria-label={sidebarOpen ? "关闭导航" : "打开导航"}
            >
              目录
            </button>
          )}
          <Link
            href="/toc"
            className={`text-sm md:text-base text-[var(--ink-muted)] hover:text-[var(--gold-dark)] transition-colors ${isArticlePage ? "hidden md:inline" : ""}`}
          >
            目录
          </Link>
        </nav>
      </div>
    </header>
  );
}
