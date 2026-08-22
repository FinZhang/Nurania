/**
 * 解析 Markdown 中的插图代码，便于在正文任意位置插入「文字环绕」的插图。
 *
 * 语法：
 *   <!-- 插图 路径 [左|右|整行] [宽度] [比例=宽/高] [可放大] [注=图注] [描述=替代文本] -->
 *
 * 说明：
 * - 路径相对全局 public 目录，如 compendium/诸国列志/索拉瑞斯.webp
 * - 左/右：浮动方向，缺省为右（正文在左侧环绕）；整行：不浮动，独占一整行
 * - 宽度：宽屏下的图片宽度，可写 320 / 320px / 40% / 20rem，缺省见 globals.css
 * - 比例：占位宽高比（如 3/2），图片加载完成后仍会按真实比例修正
 * - 可放大：点击后打开灯箱，可滚轮缩放、拖动平移、双指缩放
 * - 注：图注文字，显示在图片下方
 * - 描述：图片替代文本（alt），不写时依次取图注、文件名
 *
 * 与题图（见 src/lib/content.ts 的 <!-- 题图 --> ）的区别：
 * 题图固定悬挂在文章右上角，一篇仅一张；插图可出现任意多次，
 * 上沿与代码所在行的正文对齐，随正文一起流动。
 */

export interface Illustration {
  /** 相对全局 public 的路径，已补前导 "/" */
  path: string;
  alt: string;
  /** 版式：浮动于左/右侧，或不浮动独占整行；窄屏一律占整行 */
  placement: "left" | "right" | "block";
  /** 宽屏下的图片宽度（CSS 值），未指定时用样式表默认值 */
  width?: string;
  /** 占位宽高比（CSS aspect-ratio 写法），图片加载后按真实比例修正 */
  aspectRatio?: string;
  /** 点击是否打开可缩放/拖动的灯箱 */
  zoomable: boolean;
  caption?: string;
}

export type IllustrationSegment =
  | { type: "md"; content: string }
  | { type: "illustration"; illustration: Illustration };

/** 插图代码；参数部分非贪婪匹配到注释结束 */
const RE_ILLUSTRATION = /<!--\s*插图\s+([\s\S]*?)\s*-->/;

/** 取值到下一个文字参数（或参数串结束）的参数：图注与替代文本 */
const RE_TEXT_OPTION = /(注|图注|caption|描述|替代文本|alt)\s*[=＝:：]\s*/gi;
/** 宽度：320 / 320px / 40% / 20rem，允许写成 宽=320、宽度：40% */
const RE_WIDTH = /^(?:宽|宽度|width)?\s*[=＝:：]?\s*(\d+(?:\.\d+)?)(px|%|rem|em)?$/i;
/** 比例：比例=3/2、宽高比:16:9 */
const RE_RATIO = /^(?:比例|宽高比|ratio)\s*[=＝:：]\s*(\d+(?:\.\d+)?)\s*[/:：]\s*(\d+(?:\.\d+)?)$/i;

const PLACEMENT_BY_TOKEN = new Map<string, Illustration["placement"]>([
  ["左", "left"],
  ["左侧", "left"],
  ["left", "left"],
  ["右", "right"],
  ["右侧", "right"],
  ["right", "right"],
  ["整行", "block"],
  ["独占", "block"],
  ["整幅", "block"],
  ["block", "block"],
  ["full", "block"],
]);

const ZOOM_TOKENS = new Set(["可放大", "放大", "可缩放", "点击放大", "lightbox", "zoom"]);
const CAPTION_KEYS = new Set(["注", "图注", "caption"]);

/** 用文件名兜底 alt，如 compendium/诸国列志/索拉瑞斯.webp -> 索拉瑞斯 */
function altFromPath(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base.replace(/\.[^.]+$/, "") || "插图";
}

/**
 * 取出参数串里的文字参数（注=…、描述=…），返回其值与剩余的短参数串。
 * 文字参数各自取值到下一个文字参数开头，因此两者可同时出现且顺序不限。
 */
function extractTextOptions(args: string): {
  rest: string;
  caption?: string;
  alt?: string;
} {
  const matches = [...args.matchAll(RE_TEXT_OPTION)];
  if (matches.length === 0) return { rest: args };

  let caption: string | undefined;
  let alt: string | undefined;

  matches.forEach((match, i) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : args.length;
    const value = args.slice(start, end).trim();
    if (!value) return;
    if (CAPTION_KEYS.has(match[1].toLowerCase())) caption = value;
    else alt = value;
  });

  return { rest: args.slice(0, matches[0].index).trim(), caption, alt };
}

/** 把插图代码的参数串解析为一张插图；路径缺失时返回 null（此时保留原文不渲染） */
function parseIllustrationArgs(rawArgs: string): Illustration | null {
  const args = rawArgs.trim();
  if (!args) return null;

  const { rest, caption, alt: altOption } = extractTextOptions(args);
  const tokens = rest.split(/\s+/).filter(Boolean);
  const rawPath = tokens.shift();
  if (!rawPath) return null;

  let placement: Illustration["placement"] = "right";
  let width: string | undefined;
  let aspectRatio: string | undefined;
  let zoomable = false;

  for (const token of tokens) {
    const key = token.toLowerCase();
    const placementToken = PLACEMENT_BY_TOKEN.get(key);
    if (placementToken) {
      placement = placementToken;
      continue;
    }
    if (ZOOM_TOKENS.has(key)) {
      zoomable = true;
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
  return {
    path,
    alt: altOption ?? caption ?? altFromPath(path),
    placement,
    width,
    aspectRatio,
    zoomable,
    caption,
  };
}

/**
 * 按插图代码把正文切成「正文片段 / 插图」序列。
 * 插图代码本身从正文中移除，不会显示为文本。
 */
export function parseIllustrations(content: string): IllustrationSegment[] {
  const segments: IllustrationSegment[] = [];
  const re = new RegExp(RE_ILLUSTRATION.source, "g");
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
