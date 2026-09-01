/**
 * 内容相关类型与纯函数（可在客户端使用）
 */

import type { IndexOutline, IndexTermData } from "./index-terms";

export interface ArticleEntry {
  slug: string;
  title: string;
  titleEn?: string;
  children?: ArticleEntry[];
  isArticle?: boolean;
}

export interface ArticleContent {
  slug: string;
  title: string;
  titleEn?: string;
  content: string;
  /** 题图：由 MD 内 <!-- 题图 path --> 指定，path 相对本书 public 目录 */
  titleImagePath?: string;
  /** 题图代码所在行（0-based），窄屏时在此行位置插入图片 */
  titleImageInsertLine?: number;
  /** 本页正文用到的索引词条（含释义里递归引用到的），供悬浮释义窗渲染 */
  indexTerms?: IndexTermData[];
  /** 仅索引页有：分类骨架，用于渲染速查视图而非上千行散文 */
  indexOutline?: IndexOutline;
}

/** 扁平化，仅包含文章（叶子节点） */
export function flattenArticles(entries: ArticleEntry[]): ArticleEntry[] {
  const result: ArticleEntry[] = [];
  for (const entry of entries) {
    if (entry.isArticle) {
      result.push(entry);
    }
    if (entry.children?.length) {
      result.push(...flattenArticles(entry.children));
    }
  }
  return result;
}
