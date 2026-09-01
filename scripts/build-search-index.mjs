/**
 * 构建期生成全站搜索索引：public/search/<bookSlug>.json
 *
 * 为什么不做分词与倒排：中文没有词边界，真要分词就得引依赖；而全书正文压成纯文本
 * 也就八十万字符上下，浏览器里一次 indexOf 是微秒级的事。因此这里只负责把 Markdown
 * 洗成纯文本，匹配与排序全交给客户端的 includes。
 *
 * 目录约定沿用《项目说明.md》第 4 节：每本书在 data/ 下占一个平级文件夹，
 * 文件夹名即该书的 slug。若将来某本书的 dataDir 不再等于 data/<slug>，这里要同步改。
 *
 * 与 src/lib 的两处刻意重复（脚本是 .mjs，没法 import 那边的 .ts）：
 * - stripMarkdown 对应 src/lib/plain-text.ts
 * - headingId 对应 src/lib/headings.ts 的 slugify + 重名编号规则，
 *   两边必须一致，否则搜索结果里的小节锚点会跳空。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT, "data");
const OUT_DIR = path.join(ROOT, "public", "search");

/** 与 src/lib/index-terms.server.ts 的 INDEX_BASENAME 一致 */
const INDEX_BASENAME = "索引 Index";

/** 正文里被解析掉、不该出现在搜索结果中的注释代码（题图、插图） */
const RE_HTML_COMMENT = /<!--[\s\S]*?-->/g;

function isArticleFile(name) {
  return name.endsWith(".md") && name.toLowerCase() !== "readme.md" && !name.startsWith("_");
}

/** 递归收集某本书下的全部文章：{ slug, filePath } */
function collectArticles(dir, baseSlug = []) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (e.name.startsWith(".")) continue;
      out.push(...collectArticles(path.join(dir, e.name), [...baseSlug, e.name]));
    } else if (e.isFile() && isArticleFile(e.name)) {
      const base = e.name.replace(/\.md$/, "");
      out.push({ slug: [...baseSlug, base].join("/"), base, filePath: path.join(dir, e.name) });
    }
  }
  return out;
}

/** 去掉 Markdown 标记，得到可供 includes 扫描的纯文本 */
function stripMarkdown(md) {
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

/** 与 src/lib/headings.ts 的 slugify 保持一致 */
function slugify(text) {
  const t = text.trim().replace(/\s+/g, "-").replace(/[^\w\u4e00-\u9fff\-]/g, "");
  return t || "heading";
}

/** 与 src/lib/headings.ts 的 toPlainTitle 保持一致 */
function toPlainTitle(line) {
  return line
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 按 ### 把正文切成小节，让搜索结果能直接落到小节锚点上。
 * 首个 ### 之前的部分归入一个无标题小节。
 */
function splitSections(content) {
  const lines = content.split("\n");
  const sections = [{ heading: null, id: null, lines: [] }];
  const idCount = new Map();
  for (const line of lines) {
    const m = line.trim().match(/^###\s+(.+)$/);
    if (m) {
      const text = toPlainTitle(m[1].trim());
      const baseId = slugify(text);
      const n = idCount.get(baseId) ?? 0;
      idCount.set(baseId, n + 1);
      sections.push({ heading: text, id: n === 0 ? baseId : `${baseId}-${n + 1}`, lines: [] });
    } else {
      sections[sections.length - 1].lines.push(line);
    }
  }
  return sections
    .map((s) => ({ h: s.heading, i: s.id, t: stripMarkdown(s.lines.join("\n")) }))
    .filter((s) => s.t || s.h);
}

/**
 * 解析索引词条。格式见 siteDocu/02 第 7 节：**主名（别名1/别名2）**　释义（出处.md）
 * 这里只做搜索用，出处括号按同样规则去掉。
 */
function parseTerms(raw) {
  const terms = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith("**")) continue;
    const m = line.match(/^\*\*([^*]+)\*\*[　\s]*(.*)$/);
    if (!m) continue;
    let head = m[1].trim();
    let aliases = [];
    const am = head.match(/^([^（]+)（([^）]+)）$/);
    if (am) {
      head = am[1].trim();
      aliases = am[2].split(/[/／、]/).map((s) => s.trim()).filter(Boolean);
    }
    let def = m[2].trim();
    const paren = def.match(/（[^（）]*）\s*$/);
    if (paren) {
      const inner = paren[0].replace(/^（/, "").replace(/）\s*$/, "");
      const parts = inner.split(/[；;]/).map((s) => s.trim());
      if (parts.length > 0 && parts.every((p) => p.endsWith(".md"))) {
        def = def.slice(0, paren.index).trim();
      }
    }
    if (def) terms.push({ n: head, a: aliases, d: def });
  }
  return terms;
}

function buildBook(bookSlug) {
  const bookDir = path.join(DATA_DIR, bookSlug);
  const articles = [];
  let terms = [];
  // 该书索引页的 slug；词条命中要能跳回速查页，没有索引文件的书为 null
  let indexSlug = null;

  for (const { slug, base, filePath } of collectArticles(bookDir)) {
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);
    if (base === INDEX_BASENAME) {
      // 索引不作为文章参与搜索：它自己有速查页，正文塞进来只会让每条正文命中都撞上索引
      terms = parseTerms(content);
      indexSlug = slug;
      continue;
    }
    const sections = splitSections(content);
    if (sections.length === 0) continue;
    const entry = { s: slug, t: data.title ?? base, c: sections };
    if (data.titleEn) entry.e = data.titleEn;
    articles.push(entry);
  }

  return { book: bookSlug, indexSlug, articles, terms };
}

function main() {
  if (!fs.existsSync(DATA_DIR)) {
    console.error("找不到 data 目录，跳过搜索索引生成");
    return;
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const books = fs
    .readdirSync(DATA_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name);

  for (const book of books) {
    const payload = buildBook(book);
    const file = path.join(OUT_DIR, `${book}.json`);
    fs.writeFileSync(file, JSON.stringify(payload));
    const chars = payload.articles.reduce(
      (n, a) => n + a.c.reduce((m, s) => m + s.t.length, 0),
      0
    );
    console.log(
      `搜索索引 ${book}: ${payload.articles.length} 篇 / ${payload.terms.length} 条词条 / ${chars} 字符 -> ${path.relative(ROOT, file)}`
    );
  }
}

main();
