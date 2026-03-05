/**
 * 从 data 目录自动读取文章结构（仅服务端）
 * 每本书对应独立 data 目录，由 books 配置的 dataDir 指定
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { ArticleEntry, ArticleContent } from "./content-types";
import { flattenArticles } from "./content-types";
import { getBookBySlug } from "./books";

export type { ArticleEntry, ArticleContent } from "./content-types";

function getDataDir(bookSlug: string): string {
  const book = getBookBySlug(bookSlug);
  const dir = book?.dataDir ?? "data";
  return path.join(process.cwd(), dir);
}

/** 从文件名或 frontmatter 获取显示标题 */
function getTitleFromFile(filePath: string, baseName: string): { title: string; titleEn?: string } {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data } = matter(raw);
    return {
      title: (data.title as string) ?? baseName,
      titleEn: data.titleEn as string | undefined,
    };
  } catch {
    return { title: baseName };
  }
}

/** 递归扫描目录，构建层级结构 */
function scanDir(dirPath: string, baseSlug: string, _dataDir: string): ArticleEntry[] {
  if (!fs.existsSync(dirPath)) return [];

  const entries: ArticleEntry[] = [];
  const items = fs.readdirSync(dirPath, { withFileTypes: true });

  // 先处理文件夹，再处理 .md 文件，保持顺序
  const dirs = items.filter((d) => d.isDirectory() && !d.name.startsWith("."));
  const files = items.filter(
    (d) =>
      d.isFile() &&
      d.name.endsWith(".md") &&
      d.name.toLowerCase() !== "readme.md" &&
      !d.name.startsWith("_")
  );

  /** 读取该目录下的 _order.json 获取自定义顺序（名称数组） */
  let orderList: string[] = [];
  const orderPath = path.join(dirPath, "_order.json");
  if (fs.existsSync(orderPath)) {
    try {
      const raw = fs.readFileSync(orderPath, "utf-8");
      const parsed = JSON.parse(raw) as unknown;
      orderList = Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      /* 忽略无效 _order.json */
    }
  }

  /** 收集所有条目（文件夹 + 文件）及用于排序的名称，再按 _order.json 统一排序 */
  const sortByName = (a: { name: string }, b: { name: string }) => {
    const ai = orderList.indexOf(a.name);
    const bi = orderList.indexOf(b.name);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.name.localeCompare(b.name, "zh-CN");
  };

  const sortableItems: { name: string; entry: ArticleEntry }[] = [];

  for (const dir of dirs) {
    const subPath = path.join(dirPath, dir.name);
    const slug = baseSlug ? `${baseSlug}/${dir.name}` : dir.name;
    const children = scanDir(subPath, slug, _dataDir);
    sortableItems.push({
      name: dir.name,
      entry: {
        slug,
        title: dir.name,
        children,
        isArticle: false,
      },
    });
  }

  for (const file of files) {
    const baseName = file.name.replace(/\.md$/, "");
    const slug = baseSlug ? `${baseSlug}/${baseName}` : baseName;
    const filePath = path.join(dirPath, file.name);
    const { title, titleEn } = getTitleFromFile(filePath, baseName);
    sortableItems.push({
      name: baseName,
      entry: {
        slug,
        title,
        titleEn,
        isArticle: true,
      },
    });
  }

  sortableItems.sort((a, b) => sortByName({ name: a.name }, { name: b.name }));

  for (const { entry } of sortableItems) {
    entries.push(entry);
  }

  return entries;
}

/** 获取站点目录结构（层级） */
export function getSiteToc(bookSlug: string): ArticleEntry[] {
  return scanDir(getDataDir(bookSlug), "", getDataDir(bookSlug));
}

/** 最近更新条目（按文件 mtime，取前 5 篇） */
export type RecentArticle = {
  slug: string;
  title: string;
  titleEn?: string;
  updatedAt: string;
};

function collectArticlePaths(dirPath: string, baseSlug: string): { slug: string; filePath: string }[] {
  const result: { slug: string; filePath: string }[] = [];
  if (!fs.existsSync(dirPath)) return result;
  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const d of items) {
    const full = path.join(dirPath, d.name);
    if (d.isDirectory() && !d.name.startsWith(".")) {
      const slug = baseSlug ? `${baseSlug}/${d.name}` : d.name;
      result.push(...collectArticlePaths(full, slug));
    } else if (
      d.isFile() &&
      d.name.endsWith(".md") &&
      d.name.toLowerCase() !== "readme.md" &&
      !d.name.startsWith("_")
    ) {
      const baseName = d.name.replace(/\.md$/, "");
      const slug = baseSlug ? `${baseSlug}/${baseName}` : baseName;
      result.push({ slug, filePath: full });
    }
  }
  return result;
}

/** 按文章文件最后修改时间取最近 5 篇 */
export function getRecentArticles(bookSlug: string, limit = 5): RecentArticle[] {
  const dataDir = getDataDir(bookSlug);
  const all = collectArticlePaths(dataDir, "");
  const withMtime = all
    .map(({ slug, filePath }) => {
      const stat = fs.statSync(filePath);
      const baseName = path.basename(filePath, ".md");
      const { title, titleEn } = getTitleFromFile(filePath, baseName);
      return {
        slug,
        title,
        titleEn,
        updatedAt: stat.mtime,
      };
    })
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, limit);
  return withMtime.map(({ slug, title, titleEn, updatedAt }) => ({
    slug,
    title,
    titleEn,
    updatedAt: updatedAt.toISOString().slice(0, 10),
  }));
}

/** 获取所有文章 slug（仅 .md 文件） */
export function getAllArticleSlugs(bookSlug: string): string[] {
  return flattenArticles(getSiteToc(bookSlug)).map((e) => e.slug);
}

/** 题图代码：在 MD 正文中写 <!-- 题图 path -->，path 相对全局 public 目录，如 Nurania/诸国列志/索拉瑞斯.png */
const RE_TITLE_IMAGE = /<!--\s*题图\s+(\S+)\s*-->/;

/**
 * 从正文中解析题图代码，若存在则返回路径（相对全局 public）、插入行号，并从正文中移除该行。
 */
function parseTitleImage(content: string): {
  contentWithoutLine: string;
  titleImageRelativePath: string | null;
  titleImageInsertLine: number;
} {
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(RE_TITLE_IMAGE);
    if (m) {
      const path = m[1].trim();
      const rest = [...lines.slice(0, i), ...lines.slice(i + 1)].join("\n");
      return { contentWithoutLine: rest, titleImageRelativePath: path, titleImageInsertLine: i };
    }
  }
  return { contentWithoutLine: content, titleImageRelativePath: null, titleImageInsertLine: 0 };
}

export function getArticleBySlug(bookSlug: string, slug: string): ArticleContent | null {
  const filePath = path.join(getDataDir(bookSlug), `${slug}.md`);

  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  const baseName = slug.split("/").pop() || slug;

  const { contentWithoutLine, titleImageRelativePath, titleImageInsertLine } = parseTitleImage(content);

  const result: ArticleContent = {
    slug,
    title: (data.title as string) ?? baseName,
    titleEn: data.titleEn as string | undefined,
    content: contentWithoutLine,
  };
  if (titleImageRelativePath) {
    result.titleImagePath = `/${titleImageRelativePath.replace(/^\/+/, "")}`;
    result.titleImageInsertLine = titleImageInsertLine;
  }

  return result;
}
