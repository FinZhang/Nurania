/**
 * 解析 Markdown 中的插图代码，便于在正文任意位置插入「文字环绕」的插图。
 *
 * 语法：
 *   <!-- 插图 路径 [左|右] [宽度] [比例=宽/高] [注=图注文字] -->
 *
 * 说明：
 * - 路径相对全局 public 目录，如 compendium/诸国列志/索拉瑞斯.webp
 * - 左/右：浮动方向，缺省为右（正文在左侧环绕）
 * - 宽度：宽屏下的图片宽度，可写 320 / 320px / 40% / 20rem，缺省见 globals.css
 * - 比例：占位宽高比（如 3/2），图片加载完成后仍会按真实比例修正
 * - 注：图注文字，写在最后（其后的内容都算作图注）
 *
 * 与题图（见 src/lib/content.ts 的 <!-- 题图 --> ）的区别：
 * 题图固定悬挂在文章右上角，一篇仅一张；插图可出现任意多次，
 * 上沿与代码所在行的正文对齐，随正文一起流动。
 */

export interface Illustration {
  /** 相对全局 public 的路径，已补前导 "/" */
  path: string;
  alt: string;
  /** 浮动方向；窄屏一律占整行 */
  side: "left" | "right";
  /** 宽屏下的图片宽度（CSS 值），未指定时用样式表默认值 */
  width?: string;
  /** 占位宽高比（CSS aspect-ratio 写法），图片加载后按真实比例修正 */
  aspectRatio?: string;
  caption?: string;
}

export type IllustrationSegment =
  | { type: "md"; content: string }
  | { type: "illustration"; illustration: Illustration };

/** 插图代码；参数部分非贪婪匹配到注释结束 */
const RE_ILLUSTRATION = "<!--\s*插图\s+([\s\S]*?)\s*-->";

/** 图注：关键字之后（含空格）的全部内容都是图注 */
const RE_CAPTION = /(?:注|图注|caption)\s*[=＝:：]\s*([\s\S]+)$/i;
/** 宽度：320 / 320px / 40% / 20rem，允许写成 宽=320、宽度：40% */
const RE_WIDTH = /^(?:宽|宽度|width)?\s*[=＝:：]?\s*(\d+(?:\.\d+)?)(px|%|rem|em)?$/i;
/** 比例：比例=3/2、宽高比:16:9 */
const RE_RATIO = /^(?:比例|宽高比|ratio)\s*[=＝:：]\s*(\d+(?:\.\d+)?)\s*[/:：]\s*(\d+(?:\.\d+)?)$/i;

const SIDE_LEFT = new Set(["左", "左侧", "left"]);
const SIDE_RIGHT = new Set(["右", "右侧", "right"]);

/** 用文件名兜底 alt，如 compendium/诸国列志/索拉瑞斯.webp -> 索拉瑞斯 */
function altFromPath(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base.replace(/\.[^.]+$/, "") || "插图";
}

/** 把插图代码的参数串解析为一张插图；路径缺失时返回 null（此时保留原文不渲染） */
function parseIllustrationArgs(rawArgs: string): Illustration | null {
  let args = rawArgs.trim();
  if (!args) return null;

  let caption: string | undefined;
  const captionMatch = args.match(RE_CAPTION);
  if (captionMatch) {
    caption = captionMatch[1].trim() || undefined;
    args = args.slice(0, captionMatch.index).trim();
  }

  const tokens = args.split(/\s+/).filter(Boolean);
  const rawPath = tokens.shift();
  if (!rawPath) return null;

  let side: Illustration["side"] = "right";
  let width: string | undefined;
  let aspectRatio: string | undefined;

  for (const token of tokens) {
    if (SIDE_LEFT.has(token.toLowerCase())) {
      side = "left";
      continue;
    }
    if (SIDE_RIGHT.has(token.toLowerCase())) {
      side = "right";
      continue;
    }
    const ratio = token.match(RE_RATIO);
    if (ratio) {
      aspectRatio = `${ratio[1]}/${ratio[2]}`;
      continue;
    }
    const w = token.match(RE_WIDTH);
    if (w) {
      width = `${w[1]}${w[2] ?? "px"}`;
      continue;
    }
    /* 其余 token 忽略，避免写错一个参数导致整张插图不显示 */
  }

  const path = `/${rawPath.replace(/^\/+/, "")}`;
  return { path, alt: caption ?? altFromPath(path), side, width, aspectRatio, caption };
}

/**
 * 按插图代码把正文切成「正文片段 / 插图」序列。
 * 插图代码本身从正文中移除，不会显示为文本。
 */
export function parseIllustrations(content: string): IllustrationSegment[] {
  const segments: IllustrationSegment[] = [];
  const re = new RegExp(RE_ILLUSTRATION, "g");
  let lastIndex = 0;

  const pushMd = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed) segments.push({ type: "md", content: trimmed });
  };

  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    const illustration = parseIllustrationArgs(match[1]);
    if (!illustration) continue;
    pushMd(content.slice(lastIndex, match.index));
    segments.push({ type: "illustration", illustration });
    lastIndex = match.index + match[0].length;
  }

  if (segments.length === 0) return [{ type: "md", content }];
  pushMd(content.slice(lastIndex));
  return segments;
}
