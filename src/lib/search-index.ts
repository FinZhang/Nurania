/**
 * 全站搜索的数据形状与匹配逻辑（纯函数，可在客户端使用）。
 *
 * 索引由 scripts/build-search-index.mjs 在构建期生成到 public/search/<bookSlug>.json，
 * 字段名压到一个字母是因为整本书的正文都在里面，key 重复上万次。
 *
 * 不做分词与倒排：中文没有词边界，而全书纯文本也就二十几万字符，
 * 一次 indexOf 是微秒级的事，客户端直接 includes 即可。
 */

import { BASE_PATH } from "./basePath";

export interface SearchSection {
  /** 小节标题（###）；首个 ### 之前的部分为 null */
  h: string | null;
  /** 小节锚点 id，与 headings.ts 的生成规则一致 */
  i: string | null;
  /** 该小节正文的纯文本 */
  t: string;
}

export interface SearchArticle {
  /** 文章 slug（不含书名） */
  s: string;
  /** 中文标题 */
  t: string;
  /** 英文标题 */
  e?: string;
  c: SearchSection[];
}

export interface SearchTerm {
  n: string;
  a: string[];
  d: string;
}

export interface BookSearchIndex {
  book: string;
  indexSlug: string | null;
  articles: SearchArticle[];
  terms: SearchTerm[];
}

export type HitKind = "article" | "term";

export interface SearchHit {
  key: string;
  kind: HitKind;
  bookSlug: string;
  /** 目标文章 slug；词条指向该书索引页 */
  slug: string;
  /** 小节锚点，没有则跳到文章开头 */
  anchor: string | null;
  /** 词条命中时用于给索引页预填搜索框 */
  query?: string;
  title: string;
  /** 副标题：文章的英文名，或小节标题 */
  subtitle?: string;
  /** 摘要三段，中间那段是命中的原文 */
  snippet: [string, string, string] | null;
  rank: number;
}

/** 摘要在命中处前后各留多少字符 */
const SNIPPET_PAD = 36;
/** 单篇文章最多贡献几条结果，避免一篇长文霸占整个列表 */
const MAX_HITS_PER_ARTICLE = 3;
export const MAX_HITS = 40;

function makeSnippet(text: string, at: number, len: number): [string, string, string] {
  const from = Math.max(0, at - SNIPPET_PAD);
  const to = Math.min(text.length, at + len + SNIPPET_PAD);
  const before = (from > 0 ? "…" : "") + text.slice(from, at);
  const after = text.slice(at + len, to) + (to < text.length ? "…" : "");
  return [before, text.slice(at, at + len), after];
}

function countOccurrences(haystack: string, needle: string): number {
  let n = 0;
  let i = haystack.indexOf(needle);
  while (i !== -1) {
    n++;
    i = haystack.indexOf(needle, i + needle.length);
  }
  return n;
}

/**
 * 在一本书的索引里搜。排序意图：先给「这就是你要找的那篇/那个词」，
 * 再给「正文里提到过」，所以标题命中永远排在正文命中前面。
 */
export function searchBook(index: BookSearchIndex, rawQuery: string): SearchHit[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return [];
  const hits: SearchHit[] = [];

  for (const a of index.articles) {
    const titleHit =
      a.t.toLowerCase().includes(q) || (a.e ? a.e.toLowerCase().includes(q) : false);
    if (titleHit) {
      hits.push({
        key: `${index.book}|${a.s}`,
        kind: "article",
        bookSlug: index.book,
        slug: a.s,
        anchor: null,
        title: a.t,
        subtitle: a.e,
        snippet: null,
        rank: 0,
      });
    }

    let perArticle = 0;
    for (const sec of a.c) {
      if (perArticle >= MAX_HITS_PER_ARTICLE) break;
      const headingHit = sec.h ? sec.h.toLowerCase().includes(q) : false;
      const body = sec.t.toLowerCase();
      const at = body.indexOf(q);
      if (!headingHit && at === -1) continue;
      perArticle++;
      hits.push({
        key: `${index.book}|${a.s}|${sec.i ?? ""}|${at}`,
        kind: "article",
        bookSlug: index.book,
        slug: a.s,
        anchor: sec.i,
        title: a.t,
        subtitle: sec.h ?? a.e,
        snippet: at === -1 ? null : makeSnippet(sec.t, at, q.length),
        // 小节标题命中比正文命中更值得看
        rank: headingHit ? 2 : 3 - Math.min(countOccurrences(body, q) - 1, 0.5),
      });
    }
  }

  if (index.indexSlug) {
    for (const t of index.terms) {
      const nameHit =
        t.n.toLowerCase().includes(q) || t.a.some((x) => x.toLowerCase().includes(q));
      const defAt = t.d.toLowerCase().indexOf(q);
      if (!nameHit && defAt === -1) continue;
      hits.push({
        key: `${index.book}|term|${t.n}`,
        kind: "term",
        bookSlug: index.book,
        slug: index.indexSlug,
        anchor: null,
        query: t.n,
        title: t.n,
        subtitle: t.a.length > 0 ? t.a.join(" / ") : undefined,
        snippet: defAt === -1 ? [t.d.slice(0, 80), "", ""] : makeSnippet(t.d, defAt, q.length),
        rank: nameHit ? 1 : 3.5,
      });
    }
  }

  return hits.sort((x, y) => x.rank - y.rank);
}

/** 索引文件地址；basePath 要手写，fetch 不吃 next/link 那套自动前缀 */
export function searchIndexUrl(bookSlug: string): string {
  return `${BASE_PATH}/search/${encodeURIComponent(bookSlug)}.json`;
}
