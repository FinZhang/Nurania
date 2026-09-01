"use client";

/**
 * 索引名词悬浮释义的 Context 定义。
 * 单独成文件是为了打断 Provider ⇄ Popover ⇄ 名词标记 之间的循环 import。
 */

import { createContext, useContext } from "react";
import type { IndexTermData } from "@/lib/index-terms";

export interface IndexTermContextValue {
  getTerm: (termId: string) => IndexTermData | undefined;
  /** 在第 level 层打开某条目（会先关掉更深的层） */
  open: (level: number, termId: string, anchor: HTMLElement) => void;
  /** 关到只剩 level 层 */
  closeTo: (level: number) => void;
  /** 第 level 层当前展开的条目 id */
  openIdAt: (level: number) => string | undefined;
  /** 该名词在此层是否应退回普通文字（祖先链上已展开，或已达堆叠上限） */
  isSuppressed: (level: number, termId: string) => boolean;
}

export const IndexTermContext = createContext<IndexTermContextValue | null>(null);

/** 当前所处的嵌套层级：正文为 0，第 n 个悬浮窗内的名词为 n */
export const IndexTermLevelContext = createContext(0);

export function useIndexTerms(): IndexTermContextValue | null {
  return useContext(IndexTermContext);
}

export function useIndexTermLevel(): number {
  return useContext(IndexTermLevelContext);
}
