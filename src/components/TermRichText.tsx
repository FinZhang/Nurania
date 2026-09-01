"use client";

import React from "react";
import { TERM_HREF_PREFIX } from "@/lib/index-terms";
import IndexTermMark from "./IndexTermMark";

/**
 * 渲染一段「已打好标记的释义」。
 *
 * 释义正文是纯文本（索引里五百余条释义无一使用 Markdown 语法），
 * 打标记后唯一的标记就是 `[原文](#idx-e123)`，因此不必动用 ReactMarkdown：
 * 速查页的「详解」模式一次要渲染全部释义，用完整 Markdown 解析器会在
 * 每次敲搜索词时重解析一遍，卡顿明显。
 *
 * 悬浮窗那边仍走 ReactMarkdown——一次至多四张卡片，也保留了将来在释义里
 * 写 Markdown 的可能。
 */

/** 用 split 的捕获组切分，避免手动推进 lastIndex（split 天然是全局的，不需要 g 标志） */
const RE_MARK_SPLIT = new RegExp(`\\[([^\\]]*)\\]\\(${TERM_HREF_PREFIX}(e\\d+)\\)`);
const RE_MARK_GLOBAL = new RegExp(RE_MARK_SPLIT.source, "g");

export default function TermRichText({ text }: { text: string }) {
  // split 带捕获组的结果依次是：文本、词面、条目 id、文本、词面、条目 id…
  const chunks = text.split(RE_MARK_SPLIT);
  return (
    <>
      {chunks.map((chunk, i) => {
        if (i % 3 === 0) return chunk;
        if (i % 3 === 2) return null; // id 由前一项消费
        return (
          <IndexTermMark key={i} termId={chunks[i + 1]}>
            {chunk}
          </IndexTermMark>
        );
      })}
    </>
  );
}

/** 去掉标记还原为纯文本，供搜索匹配使用 */
export function stripTermMarks(text: string): string {
  return text.replace(RE_MARK_GLOBAL, "$1");
}
