"use client";

import { createContext, useCallback, useRef, useContext, type ReactNode } from "react";
import type { H3Heading } from "@/lib/headings";

/** 从 React 子节点递归取出纯文本（供需要时使用；当前 id 分配仅按顺序，不依赖此函数以避免 SSR/客户端 children 差异导致 hydration 不匹配） */
export function childrenToPlainText(children: ReactNode): string {
  if (children == null) return "";
  if (typeof children === "string") return children.trim();
  if (Array.isArray(children)) return children.map(childrenToPlainText).join("").trim();
  if (typeof children === "object" && children !== null && "props" in children) {
    const props = (children as { props?: { children?: ReactNode } }).props;
    if (props?.children != null) return childrenToPlainText(props.children);
  }
  return "";
}

/** 返回当前应分配的下一个 h3 id（按文档顺序），无参数以保证服务端与客户端结果一致 */
type GetNextH3Id = () => string | undefined;

const ArticleHeadingIdContext = createContext<GetNextH3Id | null>(null);

export function useArticleHeadingId(): GetNextH3Id | null {
  return useContext(ArticleHeadingIdContext);
}

interface ArticleHeadingIdProviderProps {
  headings: H3Heading[];
  children: ReactNode;
}

export function ArticleHeadingIdProvider({ headings, children }: ArticleHeadingIdProviderProps) {
  const indexRef = useRef(0);

  const getNextH3Id = useCallback<GetNextH3Id>(() => {
    const i = indexRef.current;
    if (i >= headings.length) return undefined;
    indexRef.current = i + 1;
    return headings[i].id;
  }, [headings]);

  return (
    <ArticleHeadingIdContext.Provider value={getNextH3Id}>
      {children}
    </ArticleHeadingIdContext.Provider>
  );
}
