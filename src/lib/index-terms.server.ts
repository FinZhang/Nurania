/**
 * 索引词条的服务端入口：从某本书的 data 目录读取《索引 Index.md》并解析、缓存。
 *
 * 该书的 data 目录下没有索引文件时返回空，此书便自动不启用名词高亮；
 * 将来哪本书需要，放一个同名索引文件即可，无需改代码。
 */

import fs from "fs";
import path from "path";
import { buildMatcher, parseIndexDocument, type IndexDocument, type IndexEntry, type TermMatcher } from "./index-terms";

/** 索引文件名（不含扩展名的部分即为其文章 slug） */
export const INDEX_BASENAME = "索引 Index";
const INDEX_FILE_NAME = `${INDEX_BASENAME}.md`;

export interface IndexTermSource {
  entries: IndexEntry[];
  matcher: TermMatcher;
  /** 分类骨架与首尾说明，供索引页的速查视图使用 */
  document: IndexDocument;
}

const EMPTY_DOCUMENT: IndexDocument = { entries: [], parts: [], intro: "", outro: "" };
const EMPTY: IndexTermSource = { entries: [], matcher: buildMatcher([]), document: EMPTY_DOCUMENT };

/** 按 data 目录缓存解析结果；带 mtime 校验，dev 下改动索引文件即刻生效 */
const cache = new Map<string, { mtimeMs: number; source: IndexTermSource }>();

export function getIndexTermSource(dataDir: string): IndexTermSource {
  const filePath = path.join(dataDir, INDEX_FILE_NAME);
  let mtimeMs: number;
  try {
    mtimeMs = fs.statSync(filePath).mtimeMs;
  } catch {
    return EMPTY;
  }

  const cached = cache.get(filePath);
  if (cached && cached.mtimeMs === mtimeMs) return cached.source;

  const document = parseIndexDocument(fs.readFileSync(filePath, "utf-8"));
  const source: IndexTermSource = {
    entries: document.entries,
    matcher: buildMatcher(document.entries),
    document,
  };
  cache.set(filePath, { mtimeMs, source });
  return source;
}
