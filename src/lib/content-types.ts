/**
 * 内容相关类型与纯函数（可在客户端使用）
 */

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
