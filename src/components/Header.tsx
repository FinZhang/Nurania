"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import { getBookBySlug } from "@/lib/books";
import SiteSearch from "./SiteSearch";
import ReadingSettings from "./ReadingSettings";
import { BASE_PATH } from "@/lib/basePath";

export default function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isShelf = pathname === "/";
  const bookSlug = pathname?.split("/")[1];
  const book = bookSlug ? getBookBySlug(bookSlug) : null;
  const isArticlePage = Boolean(bookSlug && pathname?.startsWith(`/${bookSlug}/article`));
  const sidebarOpen = searchParams?.get("sidebar") === "1";

  const handleTocClick = () => {
    if (!isArticlePage || !bookSlug) return;
    if (!sidebarOpen) {
      try {
        sessionStorage.setItem("nurania-scroll-before-sidebar", String(window.scrollY));
      } catch {
        /* ignore */
      }
    }
    if (sidebarOpen) {
      window.location.href = `${BASE_PATH}/${bookSlug}/toc`;
      return;
    } else {
      router.replace(pathname + "?sidebar=1", { scroll: false });
    }
  };

  return (
    <header className="border-b border-[var(--parchment-aged)] bg-[var(--parchment-light)]/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container-nurania flex h-14 items-center justify-between md:h-16">
        {isShelf ? (
          <span className="flex items-center gap-2 text-[var(--ink)] font-display text-lg md:text-xl tracking-wide">
            <BookOpen className="h-5 w-5 md:h-6 md:w-6" />
            尤里梅尔全集
          </span>
        ) : (
          <Link
            href="/"
            prefetch={false}
            className="flex items-center gap-2 text-[var(--ink)] hover:text-[var(--gold-dark)] transition-colors glow-hover rounded px-2 py-1"
          >
            <BookOpen className="h-5 w-5 md:h-6 md:w-6" />
            <span className="font-display text-lg md:text-xl tracking-wide">
              {book?.title ?? "尤里梅尔全集"}
            </span>
          </Link>
        )}
        <div className="flex items-center gap-3 md:gap-4">
          {!isShelf && (
            <nav className="flex items-center gap-4">
              <Link
                href="/"
                prefetch={false}
                className="text-sm md:text-base text-[var(--ink-muted)] hover:text-[var(--gold-dark)] transition-colors"
              >
                书架
              </Link>
              {isArticlePage && bookSlug && (
                <button
                  type="button"
                  onClick={handleTocClick}
                  className="md:hidden text-sm md:text-base text-[var(--ink-muted)] hover:text-[var(--gold-dark)] transition-colors"
                  aria-expanded={sidebarOpen}
                  aria-label={sidebarOpen ? "关闭导航" : "打开导航"}
                >
                  本书目录
                </button>
              )}
              {/* 用 book 而不是 bookSlug：404 之类的路径也有第一段，但并不是一本书 */}
              {book && (
                <a
                  href={`${BASE_PATH}/${book.slug}/toc`}
                  className={`text-sm md:text-base text-[var(--ink-muted)] hover:text-[var(--gold-dark)] transition-colors ${isArticlePage ? "hidden md:inline" : ""}`}
                >
                  本书目录
                </a>
              )}
            </nav>
          )}
          <SiteSearch />
          <ReadingSettings />
        </div>
      </div>
    </header>
  );
}
