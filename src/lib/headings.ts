/**
 * 从 Markdown 正文中提取所有 ### 三级标题（按出现顺序），并生成用于锚点的唯一 id。
 */

/** 将标题文本转为可作 id 的 slug（空格变 -，去掉非法字符） */
function slugify(text: string): string {
  const t = text.trim().replace(/\s+/g, "-").replace(/[^\w\u4e00-\u9fff\-]/g, "");
  return t || "heading";
}

/** 去掉简单的 Markdown 格式得到纯文本（用于与渲染后的标题匹配） */
function toPlainTitle(line: string): string {
  return line
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export interface H3Heading {
  text: string;
  id: string;
}

/**
 * 按出现顺序提取所有 ### 标题行；id 基于纯文本生成，重复时追加 -2、-3…
 */
export function extractH3Headings(content: string): H3Heading[] {
  const result: H3Heading[] = [];
  const idCount = new Map<string, number>();
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^###\s+(.+)$/);
    if (!match) continue;
    const raw = match[1].trim();
    const text = toPlainTitle(raw);
    const baseId = slugify(text);
    const count = idCount.get(baseId) ?? 0;
    idCount.set(baseId, count + 1);
    const id = count === 0 ? baseId : `${baseId}-${count + 1}`;
    result.push({ text, id });
  }

  return result;
}
