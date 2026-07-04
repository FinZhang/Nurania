/**
 * 从 data 目录自动读取文章结构（仅服务端）
 * 每本书对应独立 data 目录，由 books 配置的 dataDir 指定
 */

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
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

/** 内容目录：非隐藏（不以 "." 开头）的子目录 */
function isContentDir(d: fs.Dirent): boolean {
  return d.isDirectory() && !d.name.startsWith(".");
}

/** 文章文件：.md 文件，排除 README 与以 "_" 开头的文件 */
function isArticleFile(d: fs.Dirent): boolean {
  return (
    d.isFile() &&
    d.name.endsWith(".md") &&
    d.name.toLowerCase() !== "readme.md" &&
    !d.name.startsWith("_")
  );
}

/** 递归扫描目录，构建层级结构 */
function scanDir(dirPath: string, baseSlug: string): ArticleEntry[] {
  if (!fs.existsSync(dirPath)) return [];

  const entries: ArticleEntry[] = [];
  const items = fs.readdirSync(dirPath, { withFileTypes: true });

  // 先处理文件夹，再处理 .md 文件，保持顺序
  const dirs = items.filter(isContentDir);
  const files = items.filter(isArticleFile);

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
    const children = scanDir(subPath, slug);
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
  return scanDir(getDataDir(bookSlug), "");
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
    if (isContentDir(d)) {
      const slug = baseSlug ? `${baseSlug}/${d.name}` : d.name;
      result.push(...collectArticlePaths(full, slug));
    } else if (isArticleFile(d)) {
      const baseName = d.name.replace(/\.md$/, "");
      const slug = baseSlug ? `${baseSlug}/${baseName}` : baseName;
      result.push({ slug, filePath: full });
    }
  }
  return result;
}

/**
 * data 下所有文件的 git 最后提交时间（仓库相对 posix 路径 -> ISO 时间）。
 * 文件 mtime 在 clone/checkout 后会整体重置为检出时间，不能反映真实更新日期，
 * 因此「最近更新」以 git 提交时间为准；工作区有未提交改动的文件从表中剔除，回退用 mtime。
 * undefined = 未初始化；null = git 不可用（此时全部回退 mtime）。
 */
let gitDatesCache: Map<string, string> | null | undefined;

function stripGitQuotes(p: string): string {
  return p.replace(/^"(.*)"$/, "$1");
}

function getGitLastCommitDates(): Map<string, string> | null {
  if (gitDatesCache !== undefined) return gitDatesCache;
  gitDatesCache = null;
  try {
    const gitOpts = { cwd: process.cwd(), encoding: "utf8" as const, windowsHide: true, maxBuffer: 32 * 1024 * 1024 };
    const log = spawnSync(
      "git",
      ["-c", "core.quotepath=false", "log", "--pretty=format:%x00%cI", "--name-only", "--", "data"],
      gitOpts
    );
    if (log.status !== 0 || typeof log.stdout !== "string") return null;

    // 输出按提交倒序：每块首行为 \0+ISO 时间，其后为该次提交涉及的文件；首次出现即最后提交时间
    const map = new Map<string, string>();
    let currentDate = "";
    for (const rawLine of log.stdout.split("\n")) {
      const line = rawLine.replace(/\r$/, "");
      if (line.startsWith("\0")) {
        currentDate = line.slice(1).trim();
        continue;
      }
      if (!line || !currentDate) continue;
      const p = stripGitQuotes(line);
      if (!map.has(p)) map.set(p, currentDate);
    }

    const status = spawnSync(
      "git",
      ["-c", "core.quotepath=false", "status", "--porcelain", "--", "data"],
      gitOpts
    );
    if (status.status === 0 && typeof status.stdout === "string") {
      for (const rawLine of status.stdout.split("\n")) {
        const entry = rawLine.replace(/\r$/, "").slice(3);
        // 重命名条目形如 "old -> new"，两侧都按脏文件处理
        for (const part of entry.split(" -> ")) {
          const p = stripGitQuotes(part.trim());
          if (p) map.delete(p);
        }
      }
    }
    gitDatesCache = map;
  } catch {
    gitDatesCache = null;
  }
  return gitDatesCache;
}

/** 单个文件的更新时间：git 最后提交时间优先，无记录（未提交/无 git）时回退 mtime */
function getUpdatedAt(filePath: string): Date {
  const gitDates = getGitLastCommitDates();
  if (gitDates) {
    const relPosix = path.relative(process.cwd(), filePath).split(path.sep).join("/");
    const iso = gitDates.get(relPosix);
    if (iso) {
      const d = new Date(iso);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return fs.statSync(filePath).mtime;
}

/** 按文章最后更新时间（git 提交时间，回退 mtime）取最近 5 篇 */
export function getRecentArticles(bookSlug: string, limit = 5): RecentArticle[] {
  const dataDir = getDataDir(bookSlug);
  const all = collectArticlePaths(dataDir, "");
  const withDate = all
    .map(({ slug, filePath }) => {
      const baseName = path.basename(filePath, ".md");
      const { title, titleEn } = getTitleFromFile(filePath, baseName);
      return {
        slug,
        title,
        titleEn,
        updatedAt: getUpdatedAt(filePath),
      };
    })
    .sort(
      (a, b) =>
        b.updatedAt.getTime() - a.updatedAt.getTime() ||
        a.slug.localeCompare(b.slug, "zh-CN")
    )
    .slice(0, limit);
  return withDate.map(({ slug, title, titleEn, updatedAt }) => ({
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

/** 题图代码：在 MD 正文中写 <!-- 题图 path -->，path 相对全局 public 目录，如 compendium/诸国列志/索拉瑞斯.webp */
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
  const dataDir = getDataDir(bookSlug);
  const filePath = path.resolve(dataDir, `${slug}.md`);

  // slug 来自 URL：拒绝解析到 dataDir 之外的路径（如含 ".." 的穿越）
  if (!filePath.startsWith(path.resolve(dataDir) + path.sep)) return null;
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
