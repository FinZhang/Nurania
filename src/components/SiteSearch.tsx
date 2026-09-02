"use client";

import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { Search, X, FileText, Tag, CornerDownLeft } from "lucide-react";
import { getBooks, getBookBySlug } from "@/lib/books";
import { articleHref } from "@/lib/links";
import {
  MAX_HITS,
  searchBook,
  searchIndexUrl,
  type BookSearchIndex,
  type SearchHit,
} from "@/lib/search-index";

/**
 * 全站搜索。
 *
 * 索引是构建期生成的静态 JSON，整本书的正文都在里面（诺拉尼亚行思录约 850KB），
 * 因此只在第一次打开搜索时才拉，并缓存在模块作用域里——同一次会话内换页不会重下。
 *
 * 匹配逻辑放在 @/lib/search-index，这里只管交互。
 *
 * 浮层必须 portal 到 body：本组件长在页眉里，而页眉带 backdrop-blur，
 * 带 backdrop-filter 的祖先会成为 position:fixed 后代的包含块，
 * 不 portal 的话整个浮层会被裁进页眉那一条里。
 */

/** 已加载的索引；模块作用域，跨页面导航仍然有效 */
const indexCache = new Map<string, BookSearchIndex>();
const inflight = new Map<string, Promise<BookSearchIndex | null>>();

async function loadIndex(bookSlug: string): Promise<BookSearchIndex | null> {
  const cached = indexCache.get(bookSlug);
  if (cached) return cached;
  const running = inflight.get(bookSlug);
  if (running) return running;
  const p = fetch(searchIndexUrl(bookSlug))
    .then((r) => (r.ok ? (r.json() as Promise<BookSearchIndex>) : null))
    .then((data) => {
      if (data) indexCache.set(bookSlug, data);
      return data;
    })
    .catch(() => null)
    .finally(() => {
      inflight.delete(bookSlug);
    });
  inflight.set(bookSlug, p);
  return p;
}

function hitHref(hit: SearchHit): string {
  const base = articleHref(hit.bookSlug, hit.slug);
  // 词条落到索引速查页，并把词条名带过去预填搜索框
  if (hit.query) return `${base}?q=${encodeURIComponent(hit.query)}`;
  return hit.anchor ? `${base}#${encodeURIComponent(hit.anchor)}` : base;
}

export default function SiteSearch() {
  const pathname = usePathname();
  const router = useRouter();

  const currentBook = pathname?.split("/")[1] ?? "";
  const book = currentBook ? getBookBySlug(currentBook) : undefined;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // 书架页没有「当前书」，只能全站搜
  const [allBooks, setAllBooks] = useState(false);
  const [loaded, setLoaded] = useState<BookSearchIndex[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const searchAll = allBooks || !book;

  const scopeBooks = useMemo(
    () => (searchAll ? getBooks().map((b) => b.slug) : [book!.slug]),
    [searchAll, book]
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  const openSearch = useCallback(() => {
    setOpen(true);
    setActive(0);
    // 载入状态在这里置位而不是在 effect 里：effect 内同步 setState 会多跑一轮渲染
    if (scopeBooks.some((s) => !indexCache.has(s))) setLoading(true);
  }, [scopeBooks]);

  /** 打开（或改变范围）时把所需索引拉下来；已缓存的直接命中，不会重复请求 */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all(scopeBooks.map(loadIndex)).then((all) => {
      if (cancelled) return;
      setLoaded(all.filter((x): x is BookSearchIndex => x !== null));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, scopeBooks]);

  /** 全局快捷键：Ctrl/Cmd+K 或 /（正在别处输入时不抢） */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        openSearch();
        return;
      }
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openSearch]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // 每敲一个字都要扫全书；用 deferred 让输入框先响应，列表随后跟上
  const deferredQuery = useDeferredValue(query);
  const hits = useMemo(() => {
    if (!deferredQuery.trim()) return [];
    const all: SearchHit[] = [];
    for (const idx of loaded) all.push(...searchBook(idx, deferredQuery));
    return all.sort((a, b) => a.rank - b.rank).slice(0, MAX_HITS);
  }, [loaded, deferredQuery]);

  const go = useCallback(
    (hit: SearchHit) => {
      close();
      router.push(hitHref(hit));
    },
    [close, router]
  );

  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      // 在面板内就地消费掉，索引释义卡片的 Esc 处理不会跟着触发
      e.stopPropagation();
      close();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (hits.length === 0) return;
      const next =
        e.key === "ArrowDown"
          ? (active + 1) % hits.length
          : (active - 1 + hits.length) % hits.length;
      setActive(next);
      listRef.current?.children[next]?.scrollIntoView({ block: "nearest" });
      return;
    }
    if (e.key === "Enter" && hits[active]) {
      e.preventDefault();
      go(hits[active]);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openSearch}
        className="reading-settings-trigger"
        aria-label="搜索"
        title="搜索（Ctrl+K）"
      >
        <Search className="h-4 w-4 md:h-[1.125rem] md:w-[1.125rem]" aria-hidden />
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          className="site-search-overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            className="site-search-panel"
            role="dialog"
            aria-modal="true"
            aria-label="搜索"
            onKeyDown={onPanelKeyDown}
          >
            <div className="site-search-field">
              <Search className="h-4 w-4 flex-shrink-0 text-[var(--ink-faded)]" aria-hidden />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                placeholder={searchAll ? "在全站书籍内搜索…" : `在《${book!.title}》中搜索…`}
                aria-label="搜索"
              />
              <button type="button" onClick={close} aria-label="关闭搜索">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="site-search-meta">
              {book && (
                <label className="site-search-scope">
                  <input
                    type="checkbox"
                    checked={allBooks}
                    onChange={(e) => {
                      setAllBooks(e.target.checked);
                      if (e.target.checked) setLoading(true);
                    }}
                  />
                  全站搜索
                </label>
              )}
              <span className="site-search-count">
                {loading
                  ? "正在载入索引…"
                  : query.trim()
                    ? `${hits.length}${hits.length >= MAX_HITS ? "+" : ""} 条结果`
                    : "正文、小节标题与索引词条"}
              </span>
            </div>

            {query.trim() && !loading && hits.length === 0 && (
              <p className="site-search-empty">没有找到「{query.trim()}」。</p>
            )}

            <ul className="site-search-results" ref={listRef}>
              {hits.map((hit, i) => (
                <li key={hit.key}>
                  <a
                    href={hitHref(hit)}
                    className={i === active ? "is-active" : undefined}
                    onMouseEnter={() => setActive(i)}
                    onClick={(e) => {
                      e.preventDefault();
                      go(hit);
                    }}
                  >
                    <span className="site-search-kind" aria-hidden>
                      {hit.kind === "term" ? (
                        <Tag className="h-3.5 w-3.5" />
                      ) : (
                        <FileText className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <span className="site-search-body">
                      <span className="site-search-title">
                        {hit.title}
                        {hit.subtitle && (
                          <span className="site-search-subtitle">{hit.subtitle}</span>
                        )}
                        {searchAll && (
                          <span className="site-search-book">
                            {getBookBySlug(hit.bookSlug)?.title ?? hit.bookSlug}
                          </span>
                        )}
                      </span>
                      {hit.snippet && (
                        <span className="site-search-snippet">
                          {hit.snippet[0]}
                          <mark>{hit.snippet[1]}</mark>
                          {hit.snippet[2]}
                        </span>
                      )}
                    </span>
                    {i === active && (
                      <CornerDownLeft className="site-search-enter h-3.5 w-3.5" aria-hidden />
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
