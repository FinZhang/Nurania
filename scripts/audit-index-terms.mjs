/**
 * 索引名词标记审计：列出全站每一处实际打上的名词标记及其上下文，供人工复核误匹配。
 *
 * 为什么需要它：中文没有词边界，二字词条会切进别的词中间（「大海里」里的「海里」）。
 * 误匹配不会报错、页面也照常渲染，只有把命中处连同上下文摊开看才发现得了。
 * 复核出来的误配写回索引文件的忌配标注（〔忌配：大海里〕，见 siteDocu/02 第 7 节）。
 *
 * 与 scripts/build-search-index.mjs 的取舍不同：那边是刻意重复 src/lib 的少量逻辑，
 * 这边**直接 import** `src/lib/content.ts` 走真实渲染管线——审计报告一旦与正文实际标记
 * 有出入就会骗人，而标记规则（折叠块分段、受保护片段、题图注释…）多到不可能靠重写维持一致。
 * 代价是要靠 Node 的类型擦除跑 .ts：需 Node ≥ 22.18（更早的 22.6+ 加 --experimental-strip-types）。
 * 因此它是**手动运行的维护工具**，不挂进 prebuild，免得构建被 Node 版本卡住。
 *
 * 用法（在项目根目录）：
 *   npm run audit:index                  仅列二字名称的命中（误配几乎都出在这里）
 *   npm run audit:index -- --all         列出全部命中
 *   npm run audit:index -- --term 海里   只看某个名称
 *   npm run audit:index -- --book compendium
 */

import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
/** 已带扩展名的相对路径原样交给 Node；注意 `./index-terms.server` 不算带扩展名 */
const RE_HAS_EXTENSION = /\.(ts|tsx|js|mjs|cjs|json)$/;
// src/lib 下的相对 import 不带扩展名（TS 的写法），Node 解析不了，这里补上 .ts
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !RE_HAS_EXTENSION.test(specifier)) {
      try {
        return nextResolve(specifier + ".ts", context);
      } catch {}
    }
    return nextResolve(specifier, context);
  },
});

// content.ts 里的 dataDir 是相对项目根的路径，脚本从哪儿调用都要先站到根上
process.chdir(ROOT);
const importLib = (name) => import(pathToFileURL(path.join(ROOT, "src", "lib", name)).href);
const { getBooks } = await importLib("books.ts");
const { getAllArticleSlugs, getArticleBySlug } = await importLib("content.ts");
const { getIndexTermSource } = await importLib("index-terms.server.ts");
const { findUselessGuards, parseTermHref } = await importLib("index-terms.ts");

/** 命令行参数：--all / --term <名称> / --book <slug> */
function parseArgs(argv) {
  const options = { all: false, term: null, book: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--all") options.all = true;
    else if (argv[i] === "--term") options.term = argv[++i];
    else if (argv[i] === "--book") options.book = argv[++i];
    else {
      console.error(`未知参数：${argv[i]}`);
      process.exit(1);
    }
  }
  return options;
}

/** 只有二字名称会切进别的词中间：三字以上的巧合几乎不存在，一字的本就不参与匹配 */
const RISKY_NAME_LENGTH = 2;
/** 上下文取命中处左右各多少字 */
const CONTEXT_CHARS = 12;

const RE_LINK = /\[([^\]]*)\]\(([^()]*)\)/g;

/**
 * 把已标记的 Markdown 还原成纯文本，同时记下每处名词标记在纯文本中的位置。
 * 还原时把所有链接（含普通外链）压成其文字，上下文才读得像原文。
 */
function collectMarks(marked) {
  const marks = [];
  let plain = "";
  let last = 0;
  RE_LINK.lastIndex = 0;
  let m;
  while ((m = RE_LINK.exec(marked)) !== null) {
    plain += marked.slice(last, m.index);
    const id = parseTermHref(m[2]);
    if (id !== null) marks.push({ id, text: m[1], at: plain.length });
    plain += m[1];
    last = m.index + m[0].length;
  }
  plain += marked.slice(last);
  return { plain, marks };
}

/** 命中处上下文：换行与连续空白压成空格，命中本身用【】框出 */
function contextOf(plain, at, length) {
  const before = plain.slice(Math.max(0, at - CONTEXT_CHARS), at);
  const after = plain.slice(at + length, at + length + CONTEXT_CHARS);
  const tidy = (s) => s.replace(/\s+/g, " ");
  return `${at > CONTEXT_CHARS ? "…" : ""}${tidy(before)}【${plain.substr(at, length)}】${tidy(after)}…`;
}

function auditBook(book, options) {
  const { entries } = getIndexTermSource(book.dataDir);
  if (entries.length === 0) return null;

  const primaryById = new Map(entries.map((e) => [e.id, e.primary]));
  const rows = [];
  let total = 0;

  for (const slug of getAllArticleSlugs(book.slug)) {
    const article = getArticleBySlug(book.slug, slug);
    if (!article?.content) continue;
    const { plain, marks } = collectMarks(article.content);
    for (const mark of marks) {
      total += 1;
      if (options.term && mark.text !== options.term) continue;
      if (!options.all && !options.term && mark.text.length > RISKY_NAME_LENGTH) continue;
      rows.push({
        name: mark.text,
        primary: primaryById.get(mark.id) ?? mark.id,
        slug,
        context: contextOf(plain, mark.at, mark.text.length),
      });
    }
  }

  return { entries, rows, total };
}

const options = parseArgs(process.argv.slice(2));
const books = getBooks().filter((b) => !options.book || b.slug === options.book);
if (books.length === 0) {
  console.error(`没有这本书：${options.book}`);
  process.exit(1);
}

for (const book of books) {
  const result = auditBook(book, options);
  console.log(`\n=== ${book.title}（${book.slug}）===`);
  if (result === null) {
    // 没有索引文件的书自动不启用名词高亮，不是出错
    console.log("没有索引文件，本书未启用名词高亮");
    continue;
  }

  // 别名命中时把主名带上，方便回索引文件里找那一行；名称几乎全是等宽的汉字，按字数对齐即可
  const labels = result.rows.map((r) => (r.name === r.primary ? r.name : `${r.name}→${r.primary}`));
  const width = Math.max(0, ...labels.map((l) => l.length));
  result.rows.forEach((row, i) => {
    console.log(`${labels[i].padEnd(width)}  ${row.context}  《${row.slug}》`);
  });

  const useless = findUselessGuards(result.entries);
  for (const { entry, guard } of useless) {
    console.log(`⚠ 忌配串「${guard}」不含「${entry.primary}」的任何可匹配名称，永远不会生效`);
  }

  const scope = options.term
    ? `「${options.term}」命中 ${result.rows.length} 处`
    : options.all
      ? `列出全部 ${result.rows.length} 处`
      : `其中二字名称 ${result.rows.length} 处（--all 看全部）`;
  console.log(`—— 全书标记 ${result.total} 处，${scope}；失效忌配 ${useless.length} 条`);
}
