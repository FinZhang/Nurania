/**
 * 把文章 Markdown 洗成纯文本，供 <meta name="description"> 与分享卡片摘要使用。
 *
 * scripts/build-search-index.mjs 里有一份同逻辑的副本——那边是 .mjs，没法 import 本文件。
 * 两处的目标一致（去掉标记、留下能读的正文），改动时最好同步，但不同步也只是
 * 搜索摘要与分享摘要略有出入，不会出错。
 */

/** 题图、插图等注释代码在渲染时会被解析掉，不该出现在摘要里 */
const RE_HTML_COMMENT = /<!--[\s\S]*?-->/g;

export function stripMarkdown(md: string): string {
  return md
    .replace(RE_HTML_COMMENT, " ")
    .replace(/^```[\s\S]*?^```/gm, " ")
    .replace(/^\s*:::.*$/gm, " ")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s{0,3}[-*+]\s+/gm, "")
    .replace(/^\s{0,3}\d+\.\s+/gm, "")
    .replace(/^\s*\|/gm, " ")
    .replace(/\|/g, " ")
    .replace(/^\s*[-:\s|]{3,}\s*$/gm, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** 取开头一段作为摘要；截断处补省略号，不在标点前留半句 */
export function excerpt(text: string, max = 120): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trimEnd()}…`;
}
