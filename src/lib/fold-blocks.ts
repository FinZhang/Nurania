/**
 * 解析 Markdown 中的可折叠块语法，便于在任意 .md 中使用。
 *
 * 语法：
 *   ::: fold 标题文字
 *   此处为折叠块内容（支持完整 Markdown）
 *   :::
 *
 * 也支持：:::fold 标题、::: endfold、:::endfold
 */

export type ParsedBlock =
  | { type: "md"; content: string }
  | { type: "fold"; title: string; content: string };

const RE_OPEN = /^::: ?fold (.+)$/i;
const RE_CLOSE = /^::: ?(?:endfold)?\s*$/i;

/** 去掉行尾 \r，避免 Windows 换行导致正则不匹配 */
function stripCr(s: string): string {
  return s.replace(/\r$/, "");
}

/** 检测是否为折叠开始行（允许行首空格） */
function isOpenLine(line: string): boolean {
  return RE_OPEN.test(line.trim());
}

/** 检测是否为折叠结束行（必须行首为 :::，仅去掉行尾 \r） */
function isCloseLine(line: string): boolean {
  return RE_CLOSE.test(stripCr(line));
}

export function parseFoldBlocks(raw: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const lines = raw.split(/\r?\n/);
  let i = 0;
  let currentMd: string[] = [];

  function flushMd() {
    const s = currentMd.join("\n").trim();
    if (s) blocks.push({ type: "md", content: s });
    currentMd = [];
  }

  while (i < lines.length) {
    const line = lines[i];
    if (isOpenLine(line)) {
      const openMatch = line.trim().match(RE_OPEN);
      if (!openMatch) {
        currentMd.push(line);
        i += 1;
        continue;
      }
      flushMd();
      const title = openMatch[1].trim();
      i += 1;
      const foldLines: string[] = [];
      while (i < lines.length && !isCloseLine(lines[i])) {
        foldLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1; // skip closing :::
      blocks.push({ type: "fold", title, content: foldLines.join("\n").trim() });
      continue;
    }
    currentMd.push(line);
    i += 1;
  }
  flushMd();
  return blocks;
}

/** 检测内容是否包含可折叠块语法，用于决定是否用折叠渲染器 */
export function hasFoldBlocks(content: string): boolean {
  return content.split(/\r?\n/).some((line) => isOpenLine(line));
}

/** 第一个折叠块起始行在正文中的行号（0-based），若无折叠块则返回 -1。用于题图与折叠块交互：若题图插入行覆盖此位置则需下移折叠块。 */
export function getFirstFoldLineIndex(content: string): number {
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (isOpenLine(lines[i])) return i;
  }
  return -1;
}
