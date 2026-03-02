/**
 * 从 data 目录自动读取文章结构（仅服务端）
 * 目录结构：data/大条目文件夹/次级.md 或 data/大条目/子文件夹/三级.md
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { ArticleEntry, ArticleContent } from "./content-types";
import { flattenArticles } from "./content-types";

export type { ArticleEntry, ArticleContent } from "./content-types";

const DATA_DIR = path.join(process.cwd(), "data");

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
function scanDir(dirPath: string, baseSlug: string): ArticleEntry[] {
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
export function getSiteToc(): ArticleEntry[] {
  return scanDir(DATA_DIR, "");
}

/** 获取所有文章 slug（仅 .md 文件） */
export function getAllArticleSlugs(): string[] {
  return flattenArticles(getSiteToc()).map((e) => e.slug);
}

/** 根据 slug 获取文章内容 */
/** 诸国列志目录的 slug 前缀，该目录下文章在首段引用块下方插入同名配图 */
const NATIONS_SLUG_PREFIX = "诸国列志 Chorography of the Nations/";
const NATIONS_IMAGE_DIR = path.join(process.cwd(), "public", "pic", "诸国列志");

/** 若当前文章属于诸国列志且存在同名配图，返回图片 URL 路径（如 /pic/诸国列志/索拉瑞斯.jpg），否则返回 null */
export function getNationImagePath(slug: string): string | null {
  if (!slug.startsWith(NATIONS_SLUG_PREFIX)) return null;
  const baseName = slug.slice(NATIONS_SLUG_PREFIX.length).split("/")[0] || slug.split("/").pop() || "";
  if (!baseName) return null;
  const exts = [".jpg", ".jpeg", ".png", ".webp"];
  for (const ext of exts) {
    const filePath = path.join(NATIONS_IMAGE_DIR, baseName + ext);
    if (fs.existsSync(filePath)) return `/pic/诸国列志/${baseName}${ext}`;
  }
  return null;
}

export function getArticleBySlug(slug: string): ArticleContent | null {
  const filePath = path.join(DATA_DIR, `${slug}.md`);

  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  const baseName = slug.split("/").pop() || slug;

  return {
    slug,
    title: (data.title as string) ?? baseName,
    titleEn: data.titleEn as string | undefined,
    content,
  };
}
