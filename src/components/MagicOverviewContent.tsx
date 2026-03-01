"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";

const SECTION_MARKERS = [
  "### 神启学派-祷言",
  "### 星空学派-星术",
  "### 尼希尔秘术",
  "### 精灵与蛮族",
] as const;

const SECTION_TITLES = [
  "神启学派-祷言",
  "星空学派-星术",
  "尼希尔秘术",
  "精灵与蛮族",
] as const;

function splitMagicContent(content: string): [string, ...string[]] {
  const i0 = content.indexOf(SECTION_MARKERS[0]);
  if (i0 < 0) return [content.trim(), "", "", "", ""];

  const i1 = content.indexOf(SECTION_MARKERS[1], i0);
  const i2 = content.indexOf(SECTION_MARKERS[2], i1);
  const i3 = content.indexOf(SECTION_MARKERS[3], i2);

  return [
    content.slice(0, i0).trim(),
    content.slice(i0, i1).trim(),
    content.slice(i1, i2).trim(),
    content.slice(i2, i3).trim(),
    content.slice(i3).trim(),
  ];
}

/** 去掉段落开头的 ### 标题行，避免与吸顶栏重复且被挡住 */
function dropFirstHeadingLine(partContent: string): string {
  return partContent.replace(/^### [^\n]+\n+/i, "").trim();
}

interface Props {
  content: string;
}

export default function MagicOverviewContent({ content }: Props) {
  const parts = splitMagicContent(content);
  const [expanded, setExpanded] = useState<[boolean, boolean, boolean, boolean]>([
    false,
    false,
    false,
    false,
  ]);

  const toggle = useCallback((index: number) => {
    setExpanded((prev) => {
      const next = [...prev] as [boolean, boolean, boolean, boolean];
      next[index] = !next[index];
      return next;
    });
  }, []);

  return (
    <div className="magic-overview">
      {/* 第一部分：第一段，不折叠 */}
      <div className="article-markdown mb-6">
        <ReactMarkdown>{parts[0]}</ReactMarkdown>
      </div>

      {/* 第二至五部分：可折叠，单行标题 + 展开后内容，滚动时标题吸顶 */}
      {SECTION_TITLES.map((title, index) => {
        const partContent = parts[index + 1];
        if (!partContent) return null;
        const isExpanded = expanded[index];

        return (
          <section
            key={title}
            className="border border-[var(--parchment-aged)] rounded-lg mb-4 bg-[var(--parchment-light)]/50"
          >
            <button
              type="button"
              onClick={() => toggle(index)}
              className={`w-full text-center py-3 px-4 md:px-5 font-medium text-[var(--ink)] transition-colors hover:bg-[var(--parchment-aged)]/20 shrink-0 ${
                isExpanded
                  ? "sticky z-10 top-16 bg-[var(--parchment-light)]/95 backdrop-blur-sm border-b border-[var(--parchment-aged)] shadow-sm"
                  : ""
              }`}
              aria-expanded={isExpanded}
            >
              {title}
            </button>
            {isExpanded && (
              <div className="article-markdown px-4 pt-12 pb-5 md:px-5 md:pt-14 md:pb-6">
                <ReactMarkdown>{dropFirstHeadingLine(partContent)}</ReactMarkdown>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
