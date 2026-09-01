"use client";

import React, { useDeferredValue, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlignLeft, LayoutList, Search, X } from "lucide-react";
import type { IndexOutline, IndexTermData } from "@/lib/index-terms";
import IndexTermMark from "./IndexTermMark";
import TermRichText, { stripTermMarks } from "./TermRichText";

type ViewMode = "brief" | "full";

interface Props {
  outline: IndexOutline;
  terms: IndexTermData[];
}

/**
 * 索引页的速查视图。
 *
 * 索引不适合当散文读：五百余条词条按主题分成二十余类，读者要的是
 * 「按名字查」和「按类浏览」，而不是从头滚到尾。因此这里默认只铺开
 * 词条名，释义交给正文里同一套悬浮卡片；需要通读时可切到「详解」。
 *
 * 分类标题一律渲染，命中为零时用 CSS 隐藏而不是卸载：搜索每敲一个字都会重算命中，
 * 卸载再挂载二十余个小节纯属浪费，隐藏只是一次样式切换。
 */
export default function IndexQuickLookup({ outline, terms }: Props) {
  // 全站搜索命中词条时会跳到这里并带上 ?q=，用它预填搜索框
  const searchParams = useSearchParams();
  const paramQuery = searchParams?.get("q") ?? "";
  const [typed, setTyped] = useState<string | null>(null);
  // 已经在索引页时又搜到另一个词，组件不会重新挂载；改用渲染期对比来丢掉上一次的输入
  const [lastParamQuery, setLastParamQuery] = useState(paramQuery);
  if (paramQuery !== lastParamQuery) {
    setLastParamQuery(paramQuery);
    setTyped(null);
  }
  const query = typed ?? paramQuery;
  const setQuery = setTyped;
  const [mode, setMode] = useState<ViewMode>("brief");

  const byId = useMemo(() => new Map(terms.map((t) => [t.id, t])), [terms]);

  /** 每条词条的可搜索文本：主名 + 别名 + 释义（还原成纯文本） */
  const haystack = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of terms) {
      map.set(t.id, `${t.title} ${t.aliases.join(" ")} ${stripTermMarks(t.body)}`.toLowerCase());
    }
    return map;
  }, [terms]);

  // 「详解」模式下每次改动查询都要重排五百余条，用 deferred 值过滤，
  // 让输入框先响应、列表随后跟上，敲字不会被列表渲染拖住
  const q = useDeferredValue(query).trim().toLowerCase();
  const isHit = (id: string) => !q || (haystack.get(id) ?? "").includes(q);
  const hitCount = q ? terms.filter((t) => isHit(t.id)).length : terms.length;

  return (
    <div className="index-lookup">
      {outline.intro && (
        <div className="index-lookup-intro article-markdown">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{outline.intro}</ReactMarkdown>
        </div>
      )}

      <div className="index-lookup-toolbar">
        <div className="index-lookup-search">
          <Search className="index-lookup-search-icon h-4 w-4" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setQuery("");
            }}
            placeholder="搜索词条名、别名或释义…"
            aria-label="搜索索引词条"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="清空搜索">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="index-lookup-modes" role="group" aria-label="显示方式">
          <button
            type="button"
            aria-pressed={mode === "brief"}
            onClick={() => setMode("brief")}
            title="只列词条名，点开看释义"
          >
            <LayoutList className="h-3.5 w-3.5" aria-hidden />
            简目
          </button>
          <button
            type="button"
            aria-pressed={mode === "full"}
            onClick={() => setMode("full")}
            title="逐条列出释义"
          >
            <AlignLeft className="h-3.5 w-3.5" aria-hidden />
            详解
          </button>
        </div>
      </div>

      <p className="index-lookup-count">
        {q ? `匹配 ${hitCount} 条，共 ${terms.length} 条` : `共 ${terms.length} 条词条`}
      </p>

      {outline.parts.map((part) => {
        const partHits = part.categories.reduce(
          (sum, c) => sum + c.entryIds.filter(isHit).length,
          0
        );
        return (
          <section
            key={part.title}
            className={`index-lookup-part${partHits === 0 ? " is-empty" : ""}`}
          >
            {part.title && <h2>{part.title}</h2>}
            {part.categories.map((category) => {
              const ids = category.entryIds.filter(isHit);
              return (
                <section
                  key={category.title}
                  className={`index-lookup-category${ids.length === 0 ? " is-empty" : ""}`}
                >
                  <h3>
                    {category.title}
                    <span className="index-lookup-badge">
                      {q ? `${ids.length} / ${category.entryIds.length}` : category.entryIds.length}
                    </span>
                  </h3>
                  {mode === "brief" ? (
                    <div className="index-lookup-chips">
                      {ids.map((id) => (
                        <IndexTermMark key={id} termId={id}>
                          {byId.get(id)?.title}
                        </IndexTermMark>
                      ))}
                    </div>
                  ) : (
                    <div className="index-lookup-entries">
                      {ids.map((id) => {
                        const term = byId.get(id);
                        if (!term) return null;
                        return (
                          <p key={id}>
                            <strong>{term.title}</strong>
                            {term.aliases.length > 0 && (
                              <span className="index-lookup-aliases">
                                （{term.aliases.join(" / ")}）
                              </span>
                            )}
                            <span className="index-lookup-definition">
                              <TermRichText text={term.body} />
                            </span>
                          </p>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </section>
        );
      })}

      {hitCount === 0 && <p className="index-lookup-empty">没有匹配「{query.trim()}」的词条。</p>}

      {outline.outro && (
        <div className="index-lookup-outro article-markdown">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{outline.outro}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
