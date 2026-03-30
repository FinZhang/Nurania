"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { parseFoldBlocks } from "@/lib/fold-blocks";
import { ChevronDown, ChevronRight } from "lucide-react";

/** 吸顶时的 top 值（与 tailwind top-16 一致，单位 px） */
const STICKY_TOP_PX = 64;

/** 从可能带 Markdown 的标题中取出纯文本（如 "### 神启学派-祷言" -> "神启学派-祷言"） */
function getPlainTitle(mdTitle: string): string {
  return mdTitle.replace(/^#+\s*/, "").trim();
}

/** 标题行是否带格式标记（如 ###、** 等），无则视为正文格式 */
function isPlainTitle(title: string): boolean {
  const t = title.trimStart();
  return !t.startsWith("#") && !t.startsWith("**") && !t.startsWith("*");
}

/** 若折叠块内容以 ### 纯文本标题 开头且与块标题一致，去掉该行避免重复 */
function dropRedundantHeading(content: string, blockTitle: string): string {
  const plain = getPlainTitle(blockTitle);
  const escaped = plain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^###\\s+${escaped}\\s*\\n+`, "i");
  return content.replace(re, "").trim();
}

/** 将开头过多空行压缩为至多一个段落间距（\n\n），避免第一行离标题过远 */
function collapseLeadingBlankLines(content: string): string {
  const trimmed = content.trimStart();
  if (trimmed === content) return content;
  const leading = content.slice(0, content.length - trimmed.length);
  const newlineCount = (leading.match(/\n/g) ?? []).length;
  if (newlineCount <= 2) return content;
  return "\n\n" + trimmed;
}

/** 折叠块按钮内标题用：强制渲染为带 fold-heading 的标题标签，由 CSS 统一用 Cinzel 与层级字号 */
const foldTitleMarkdownComponents: Record<string, (props: { children?: React.ReactNode }) => React.ReactElement> = {
  h1: ({ children }) => <h1 className="fold-heading fold-heading-h1">{children}</h1>,
  h2: ({ children }) => <h2 className="fold-heading fold-heading-h2">{children}</h2>,
  h3: ({ children }) => <h3 className="fold-heading fold-heading-h3">{children}</h3>,
  h4: ({ children }) => <h4 className="fold-heading fold-heading-h4">{children}</h4>,
  h5: ({ children }) => <h5 className="fold-heading fold-heading-h5">{children}</h5>,
  h6: ({ children }) => <h6 className="fold-heading fold-heading-h6">{children}</h6>,
  p: ({ children }) => <span className="fold-heading-p">{children}</span>,
};

interface Props {
  content: string;
  /** 题图覆盖第一个折叠块起始行时为 true，第一个折叠块会加 margin-top 避免与题图重叠 */
  firstFoldClearImageMargin?: boolean;
}

export default function MarkdownWithFoldBlocks({ content, firstFoldClearImageMargin = false }: Props) {
  const blocks = parseFoldBlocks(content);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const sectionRefsRef = useRef<Record<number, HTMLElement | null>>({});
  /** 吸顶状态下收起时，待滚动的折叠块 key，使收起后标题停留在吸顶位置 */
  const collapsingStickyKeyRef = useRef<number | null>(null);

  useEffect(() => {
    const key = collapsingStickyKeyRef.current;
    if (key == null) return;
    collapsingStickyKeyRef.current = null;
    const section = sectionRefsRef.current[key];
    const btn = section?.querySelector("button");
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const delta = rect.top - STICKY_TOP_PX;
      if (Math.abs(delta) > 0.5) window.scrollBy(0, delta);
    }
  }, [expanded]);

  const toggle = useCallback((index: number) => {
    const currentlyExpanded = expanded[index];
    if (currentlyExpanded) {
      const section = sectionRefsRef.current[index];
      if (section) {
        const btn = section.querySelector("button");
        const contentEl = section.lastElementChild as HTMLElement | null;
        if (btn && contentEl && contentEl !== btn) {
          const rect = btn.getBoundingClientRect();
          const isSticky = rect.top >= STICKY_TOP_PX - 4 && rect.top <= STICKY_TOP_PX + 4;
          if (isSticky) collapsingStickyKeyRef.current = index;
        }
      }
    }
    setExpanded((prev) => ({ ...prev, [index]: !prev[index] }));
  }, [expanded]);

  let foldIndex = -1;
  return (
    <div className="markdown-with-folds">
      {blocks.map((block, i) => {
        if (block.type === "md") {
          return (
            <div key={i} className="article-markdown mb-6">
              <ReactMarkdown>{block.content}</ReactMarkdown>
            </div>
          );
        }
        foldIndex += 1;
        const key = foldIndex;
        const isExpanded = expanded[key] ?? false;
        const body = collapseLeadingBlankLines(dropRedundantHeading(block.content, block.title));

        const isFirstFold = key === 0;
        const sectionClassName = [
          "border border-[var(--parchment-aged)] rounded-lg mb-4 bg-[var(--parchment-light)]/50",
          firstFoldClearImageMargin && isFirstFold ? "fold-clear-title-image" : "",
        ].filter(Boolean).join(" ");

        return (
          <section
            ref={(el) => {
              sectionRefsRef.current[key] = el;
            }}
            key={i}
            className={sectionClassName}
          >
            <button
              type="button"
              onClick={() => toggle(key)}
              className={`w-full text-left py-3 px-4 md:px-5 font-medium text-[var(--ink)] transition-colors hover:bg-[var(--parchment-aged)]/20 shrink-0 ${
                isExpanded
                  ? "sticky z-10 top-16 bg-[var(--parchment-light)]/95 backdrop-blur-sm border-b border-[var(--parchment-aged)] shadow-sm rounded-t-lg"
                  : ""
              }`}
              aria-expanded={isExpanded}
            >
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-flex items-center justify-center text-[var(--ink-muted)] shrink-0 leading-none"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-[1em] w-[1em] translate-y-[0.06em]" />
                  ) : (
                    <ChevronRight className="h-[1em] w-[1em] translate-y-[0.06em]" />
                  )}
                </span>
                {isPlainTitle(block.title) ? (
                  <span className="fold-title-md fold-title-body">
                    {block.title}
                  </span>
                ) : (
                  <span className="fold-title-md">
                    <ReactMarkdown components={foldTitleMarkdownComponents}>{block.title}</ReactMarkdown>
                  </span>
                )}
              </span>
            </button>
            {isExpanded && (
              <div className="article-markdown fold-block-body px-4 pt-12 pb-5 md:px-5 md:pt-14 md:pb-6">
                <ReactMarkdown>{body}</ReactMarkdown>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
