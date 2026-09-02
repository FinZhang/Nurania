/**
 * 索引名词高亮：解析《索引 Index.md》，并在正文中为每个词条的**首次出现**打上标记。
 *
 * 索引文件的条目格式（一行一条）：
 *   **主名（别名1/别名2）**　释义正文。（出处1.md；出处2.md）
 *
 * 约定：
 * - 别名与主名指向同一条目：主名高亮过之后，后文再出现别名也不再高亮。
 * - 释义末尾的出处括号在展示时自动删去（悬浮窗只显示释义正文）。
 * - 长度为 1 的名称（如「虚」「旬」）不参与自动匹配，避免大量误命中。
 * - 条目可写忌配串（〔忌配：大海里〕），声明「这个上下文里的同形字不是我」。
 *
 * 标记形式为普通 Markdown 链接 `[原文](#idx-e123)`，
 * 由 `src/lib/article-md-components.tsx` 的 a 覆盖渲染为可悬停的名词。
 * 用链接而非自定义语法，是为了让 Markdown 解析器天然处理转义与嵌套；
 * 万一渲染侧未接管，也只是退化成一个失效锚点，不会破坏版式。
 *
 * 本文件为纯函数，无 fs 依赖，服务端与客户端均可使用。
 */

import { isFoldCloseLine, isFoldOpenLine } from "./fold-blocks";

export interface IndexEntry {
  /** 稳定的纯 ASCII id（按在索引文件中的出现顺序生成，如 e0、e1） */
  id: string;
  /** 主名 */
  primary: string;
  /** 别名，与主名共用同一条目与同一份「已高亮」记录 */
  aliases: string[];
  /** 释义正文（已去掉末尾的出处括号与忌配标注） */
  definition: string;
  /**
   * 忌配串：包含本条某个名称、但整体另有其义的更长上下文（如「海里」的「大海里」）。
   * 中文没有词边界，短名称必然会切进别的词中间；命中位置落在忌配串里时就不作数。
   */
  guards: string[];
}

/** 传给客户端的词条数据：body 为已打好标记的 Markdown，可直接渲染 */
export interface IndexTermData {
  id: string;
  title: string;
  aliases: string[];
  body: string;
}

/** 索引文件里的一个分类（### 小节） */
export interface IndexCategory {
  title: string;
  entryIds: string[];
}

/** 索引文件里的一个大部（## 甲 专有名词 / ## 乙 地名） */
export interface IndexPart {
  title: string;
  categories: IndexCategory[];
}

/** 索引速查页所需的骨架：词条正文走 IndexTermData，这里只保留分类与 id */
export interface IndexOutline {
  /** 首部说明文字（Markdown） */
  intro: string;
  /** 末尾附注（Markdown） */
  outro: string;
  parts: IndexPart[];
}

export interface IndexDocument extends IndexOutline {
  entries: IndexEntry[];
}

/** 一条忌配规则：忌配串本身，以及要挡下的名称在串中的起始位置 */
interface GuardRule {
  text: string;
  offset: number;
}

export interface TermMatcher {
  /** 名称（主名与别名）→ 条目 id */
  byName: Map<string, string>;
  /** 最长名称的字符数，扫描时的回溯上限 */
  maxNameLength: number;
  /** 名称 → 该名称的忌配规则；没写忌配的名称不在表中 */
  guards: Map<string, GuardRule[]>;
}

/** 标记链接的 href 前缀；纯 ASCII，避免 Markdown 对中文 URL 做百分号编码 */
export const TERM_HREF_PREFIX = "#idx-";

/** 从标记链接的 href 中取出条目 id，非标记链接返回 null */
export function parseTermHref(href: string | undefined): string | null {
  if (!href || !href.startsWith(TERM_HREF_PREFIX)) return null;
  const id = href.slice(TERM_HREF_PREFIX.length);
  return /^e\d+$/.test(id) ? id : null;
}

/** 条目头部：**主名（别名1/别名2）**，后接全角空格与释义 */
const RE_ENTRY_LINE = /^\*\*([^*]+)\*\*[　\s]*(.*)$/;
/** 头部中的别名括号 */
const RE_ALIASES = /^([^（]+)（([^）]+)）$/;
/** 释义末尾的出处括号 */
const RE_TRAILING_PAREN = /（[^（）]*）\s*$/;

/** 忌配标注：〔忌配：大海里、海里面〕，可写在释义任意位置，解析后从释义中删去 */
const RE_GUARDS = /〔忌配：([^〕]*)〕/g;

/** 取出释义里的忌配标注，并把标注本身从释义中删去 */
function extractGuards(definition: string): { rest: string; guards: string[] } {
  const guards: string[] = [];
  const rest = definition.replace(RE_GUARDS, (_, list: string) => {
    for (const item of list.split(/[、，,/／;；]/)) {
      const guard = item.trim();
      if (guard) guards.push(guard);
    }
    return "";
  });
  return { rest, guards };
}

/** 末尾括号是否为出处：分号分隔的各段全部以 .md 结尾 */
function isSourceParen(paren: string): boolean {
  const inner = paren.replace(/^（/, "").replace(/）\s*$/, "");
  const parts = inner.split(/[；;]/).map((s) => s.trim());
  return parts.length > 0 && parts.every((p) => p.endsWith(".md"));
}

/** 去掉释义末尾的出处括号；不符合出处特征时原样保留 */
function stripSources(definition: string): string {
  const d = definition.trim();
  const m = d.match(RE_TRAILING_PAREN);
  if (!m || !isSourceParen(m[0])) return d;
  return d.slice(0, m.index).trim();
}

/** 去掉文件头部的 frontmatter 块 */
function stripFrontmatter(raw: string): string {
  const lines = raw.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return raw;
  const end = lines.indexOf("---", 1);
  return end === -1 ? raw : lines.slice(end + 1).join("\n");
}

/** 解析一行条目；不是条目行则返回 null */
function parseEntryLine(line: string, id: string): IndexEntry | null {
  if (!line.startsWith("**")) return null;
  const m = line.match(RE_ENTRY_LINE);
  if (!m) return null;
  const head = m[1].trim();
  // 先摘忌配再去出处：忌配标注写在出处括号之前还是之后都不影响解析
  const { rest, guards } = extractGuards(m[2]);
  const definition = stripSources(rest);
  if (!definition) return null;

  let primary = head;
  let aliases: string[] = [];
  const am = head.match(RE_ALIASES);
  if (am) {
    primary = am[1].trim();
    aliases = am[2]
      .split(/[/／、]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (!primary) return null;
  return { id, primary, aliases, definition, guards };
}

/** 兜底分类：收容没有落在任何 ### 之下的词条 */
export const UNCATEGORIZED_TITLE = "未分类";

/**
 * 解析整份索引：条目、分类骨架与首尾说明文字。
 *
 * 条目 id 按在文件中出现的顺序生成（e0、e1…），分类只引用 id，
 * 因此速查页的分组与正文标记用的一定是同一套编号，不会各算各的。
 *
 * 文件结构相当宽松：大标题、首尾说明、`---` 分隔线、各级章节名与顺序都可随意改动，
 * 唯一的约定是词条要落在某个 `###` 之下。落在外面的会被收进末尾的「未分类」，
 * 而不是解析出来却在速查页上消失。
 */
export function parseIndexDocument(raw: string): IndexDocument {
  const lines = stripFrontmatter(raw).split(/\r?\n/);
  const entries: IndexEntry[] = [];
  const parts: IndexPart[] = [];
  const introLines: string[] = [];
  const uncategorizedIds: string[] = [];
  let lastEntryLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const partTitle = line.match(/^##\s+(.+)$/);
    if (partTitle) {
      parts.push({ title: partTitle[1].trim(), categories: [] });
      continue;
    }
    const categoryTitle = line.match(/^###\s+(.+)$/);
    if (categoryTitle) {
      if (parts.length === 0) parts.push({ title: "", categories: [] });
      parts[parts.length - 1].categories.push({ title: categoryTitle[1].trim(), entryIds: [] });
      continue;
    }

    const entry = parseEntryLine(line, `e${entries.length}`);
    if (entry) {
      entries.push(entry);
      lastEntryLine = i;
      const categories = parts[parts.length - 1]?.categories;
      const current = categories?.[categories.length - 1];
      if (current) current.entryIds.push(entry.id);
      else uncategorizedIds.push(entry.id);
      continue;
    }

    // 首个 ## 之前、且非大标题与分隔线的行归入首部说明
    if (parts.length === 0 && !/^#\s/.test(line) && line.trim() !== "---") {
      introLines.push(line);
    }
  }

  // 没归属的词条单独成一部挂在最后：不塞进最后一个大部，免得让它们看起来
  // 属于「乙 地名」之类实际无关的分类。无标题的大部不会渲染出多余的 h2。
  if (uncategorizedIds.length > 0) {
    parts.push({ title: "", categories: [{ title: UNCATEGORIZED_TITLE, entryIds: uncategorizedIds }] });
  }

  const outro = lines
    .slice(lastEntryLine + 1)
    .filter((l) => l.trim() !== "" && l.trim() !== "---")
    .join("\n");

  return { entries, parts, intro: introLines.join("\n").trim(), outro: outro.trim() };
}

/** 只需要条目列表时的薄封装 */
export function parseIndexMarkdown(raw: string): IndexEntry[] {
  return parseIndexDocument(raw).entries;
}

/** 单字名称歧义太大（「虚」「旬」），不参与自动匹配 */
const MIN_NAME_LENGTH = 2;

export function buildMatcher(entries: IndexEntry[]): TermMatcher {
  const byName = new Map<string, string>();
  const guards = new Map<string, GuardRule[]>();
  let maxNameLength = 0;
  for (const entry of entries) {
    const names = [entry.primary, ...entry.aliases].filter((n) => n.length >= MIN_NAME_LENGTH);
    for (const name of names) {
      // 同名先到先得，避免后出现的条目抢走已有名称
      if (!byName.has(name)) byName.set(name, entry.id);
      if (name.length > maxNameLength) maxNameLength = name.length;
    }
    // 忌配登记在名称上而非条目上：名称与条目本就一一对应，而扫描时手上只有命中的那串字。
    // 一条忌配串可能包含同一名称多次（「海里海里」这类），逐个位置都要登记。
    for (const guard of entry.guards) {
      for (const name of names) {
        for (let at = guard.indexOf(name); at !== -1; at = guard.indexOf(name, at + 1)) {
          const rules = guards.get(name);
          if (rules) rules.push({ text: guard, offset: at });
          else guards.set(name, [{ text: guard, offset: at }]);
        }
      }
    }
  }
  return { byName, maxNameLength, guards };
}

/**
 * 不含本条任何可匹配名称的忌配串永远不会生效（多半是写错字，或写给了不参与匹配的单字名）。
 * 解析期不便报错——索引文件是内容不是代码——因此交由审计脚本列出来提醒。
 */
export function findUselessGuards(entries: IndexEntry[]): { entry: IndexEntry; guard: string }[] {
  const useless: { entry: IndexEntry; guard: string }[] = [];
  for (const entry of entries) {
    const names = [entry.primary, ...entry.aliases].filter((n) => n.length >= MIN_NAME_LENGTH);
    for (const guard of entry.guards) {
      if (!names.some((name) => guard.includes(name))) useless.push({ entry, guard });
    }
  }
  return useless;
}

/** 命中位置是否落在该名称的某条忌配串之内 */
function isGuarded(text: string, at: number, name: string, matcher: TermMatcher): boolean {
  const rules = matcher.guards.get(name);
  if (rules === undefined) return false;
  return rules.some((rule) => at >= rule.offset && text.startsWith(rule.text, at - rule.offset));
}

/**
 * 行内不参与匹配的区域：行内代码、链接与图片、HTML 标签。
 * （HTML 注释跨行，由 markFirstOccurrences 单独按行状态处理。）
 */
const RE_PROTECTED = /(`+[^`]*`+)|(!?\[[^\]]*\]\((?:[^()]|\([^()]*\))*\))|(!?\[[^\]]*\]\[[^\]]*\])|(<[^>]+>)/g;

/** 把一行按「可匹配 / 受保护」切成若干片段 */
function splitProtected(line: string): { text: string; protectedSpan: boolean }[] {
  const parts: { text: string; protectedSpan: boolean }[] = [];
  let last = 0;
  RE_PROTECTED.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RE_PROTECTED.exec(line)) !== null) {
    if (m.index > last) parts.push({ text: line.slice(last, m.index), protectedSpan: false });
    parts.push({ text: m[0], protectedSpan: true });
    last = m.index + m[0].length;
  }
  if (last < line.length) parts.push({ text: line.slice(last), protectedSpan: false });
  return parts;
}

/**
 * 在一段纯文本中标记各条目的首次出现。
 * 逐字符扫描、最长优先：索引中有 50 余组名称互为子串（如「秘术」⊂「秘术式」），
 * 必须先试最长的名称，命中后整体跳过，才不会把长词切碎。
 * 命中若落在该名称的忌配串里则不作数，继续试更短的名称（如「大海里」挡掉「海里」）。
 */
function markPlainText(text: string, matcher: TermMatcher, seen: Set<string>): string {
  const { byName, maxNameLength } = matcher;
  let out = "";
  let i = 0;
  while (i < text.length) {
    let matchedLength = 0;
    let matchedId: string | undefined;
    const limit = Math.min(maxNameLength, text.length - i);
    for (let len = limit; len >= MIN_NAME_LENGTH; len--) {
      const name = text.substr(i, len);
      const id = byName.get(name);
      if (id === undefined) continue;
      if (isGuarded(text, i, name, matcher)) continue;
      matchedLength = len;
      matchedId = id;
      break;
    }
    if (matchedId === undefined) {
      out += text[i];
      i += 1;
      continue;
    }
    const raw = text.substr(i, matchedLength);
    if (seen.has(matchedId)) {
      // 已高亮过的条目：原样输出，但整体跳过，避免在其内部再匹配到更短的名称
      out += raw;
    } else {
      seen.add(matchedId);
      out += `[${raw}](${TERM_HREF_PREFIX}${matchedId})`;
    }
    i += matchedLength;
  }
  return out;
}

/** 围栏代码块起止行 */
const RE_FENCE = /^\s{0,3}(```|~~~)/;
/** ATX 标题行 */
const RE_HEADING = /^\s{0,3}#{1,6}\s/;

/**
 * 为正文中每个条目的首次出现打上标记。
 *
 * - 标题行、代码块、既有链接、HTML 注释（题图/插图代码）内不匹配，也不占用「第一次」。
 * - 折叠块（::: fold）内单独计数：每个块像一篇小文章各自从零开始，
 *   否则首次出现可能藏在默认收起的块里，正文中反而一处高亮都看不到。
 * - 不改变行数，因此题图插入行号、折叠块行号、### 锚点等既有机制不受影响。
 */
export function markFirstOccurrences(
  markdown: string,
  matcher: TermMatcher,
  seen: Set<string> = new Set()
): string {
  if (matcher.byName.size === 0) return markdown;

  const lines = markdown.split("\n");
  const seenStack: Set<string>[] = [seen];
  let inFence = false;
  let inComment = false;

  const out = lines.map((line) => {
    const bare = line.replace(/\r$/, "");

    if (RE_FENCE.test(bare)) {
      inFence = !inFence;
      return line;
    }
    if (inFence) return line;

    if (isFoldOpenLine(bare)) {
      seenStack.push(new Set());
      return line;
    }
    if (isFoldCloseLine(bare)) {
      if (seenStack.length > 1) seenStack.pop();
      return line;
    }
    if (RE_HEADING.test(bare)) return line;

    const current = seenStack[seenStack.length - 1];
    let rest = line;
    let result = "";

    // 跨行 HTML 注释（题图 / 插图代码）整段跳过
    while (rest.length > 0) {
      if (inComment) {
        const end = rest.indexOf("-->");
        if (end === -1) {
          result += rest;
          rest = "";
          break;
        }
        result += rest.slice(0, end + 3);
        rest = rest.slice(end + 3);
        inComment = false;
        continue;
      }
      const start = rest.indexOf("<!--");
      if (start === -1) break;
      const head = rest.slice(0, start);
      result += splitProtected(head)
        .map((p) => (p.protectedSpan ? p.text : markPlainText(p.text, matcher, current)))
        .join("");
      rest = rest.slice(start);
      inComment = true;
    }

    if (!inComment && rest.length > 0) {
      result += splitProtected(rest)
        .map((p) => (p.protectedSpan ? p.text : markPlainText(p.text, matcher, current)))
        .join("");
    }
    return result;
  });

  return out.join("\n");
}

/** 从已标记的 Markdown 中取出被引用的条目 id */
function collectMarkedIds(marked: string): string[] {
  const ids: string[] = [];
  const re = new RegExp(`\\(${TERM_HREF_PREFIX}(e\\d+)\\)`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(marked)) !== null) ids.push(m[1]);
  return ids;
}

/**
 * 求某页需要的词条数据：正文直接命中的条目，加上它们的释义里递归引用到的条目
 * （悬浮窗可无限嵌套，因此要取传递闭包）。
 *
 * 每条释义各自独立计数——同一条目无论从哪条路径打开，看到的高亮都一致，
 * 因此可在此处（构建期）一次算好，客户端不必再携带匹配器。
 */
export function collectTermClosure(
  entries: IndexEntry[],
  matcher: TermMatcher,
  rootIds: Iterable<string>
): IndexTermData[] {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const bodies = new Map<string, string>();

  const bodyOf = (entry: IndexEntry) => {
    let body = bodies.get(entry.id);
    if (body === undefined) {
      // 预置自身 id：条目释义里提到自己时不做成指向自己的悬浮窗
      body = markFirstOccurrences(entry.definition, matcher, new Set([entry.id]));
      bodies.set(entry.id, body);
    }
    return body;
  };

  const included = new Set<string>();
  const queue: string[] = [];
  for (const id of rootIds) {
    if (byId.has(id) && !included.has(id)) {
      included.add(id);
      queue.push(id);
    }
  }
  while (queue.length > 0) {
    const entry = byId.get(queue.shift()!)!;
    for (const id of collectMarkedIds(bodyOf(entry))) {
      if (!included.has(id) && byId.has(id)) {
        included.add(id);
        queue.push(id);
      }
    }
  }

  return entries
    .filter((e) => included.has(e.id))
    .map((e) => ({ id: e.id, title: e.primary, aliases: e.aliases, body: bodyOf(e) }));
}

/** 便捷入口：标记正文并返回该页所需的词条数据 */
export function applyIndexTerms(
  content: string,
  entries: IndexEntry[],
  matcher: TermMatcher
): { content: string; terms: IndexTermData[] } {
  const marked = markFirstOccurrences(content, matcher);
  const rootIds = collectMarkedIds(marked);
  if (rootIds.length === 0) return { content, terms: [] };
  return { content: marked, terms: collectTermClosure(entries, matcher, rootIds) };
}
