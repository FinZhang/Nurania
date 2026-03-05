"use client";

import { useRef, useLayoutEffect, useCallback, type ReactNode } from "react";
import type { H3Heading } from "@/lib/headings";

/**
 * 在客户端挂载后按顺序为容器内所有 h3 设置 id，避免服务端/客户端渲染顺序差异导致 hydration 不匹配。
 * 服务端与客户端均不渲染 id，由 useLayoutEffect 在 paint 前注入。
 * 折叠块展开后新增的 h3 通过 MutationObserver 再次注入。
 */
interface Props {
  headings: H3Heading[];
  children: ReactNode;
}

function assignH3Ids(container: HTMLDivElement, headings: H3Heading[]) {
  const h3s = container.querySelectorAll<HTMLHeadingElement>("h3");
  h3s.forEach((el) => {
    el.removeAttribute("id");
  });
  if (headings.length === 0) return;
  const n = Math.min(h3s.length, headings.length);
  // 带题图时可能同时存在两套 DOM（如 md:hidden + hidden md:block），后一套为当前视口可见；将 id 赋给最后 n 个 h3，保证可见的那套有正确 id
  const start = h3s.length - n;
  for (let i = 0; i < n; i++) {
    h3s[start + i].id = headings[i].id;
  }
}

export default function ArticleHeadingIdInjector({ headings, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const assignRef = useCallback(() => {
    const container = containerRef.current;
    if (container) assignH3Ids(container, headings);
  }, [headings]);

  useLayoutEffect(() => {
    assignRef();
    const container = containerRef.current;
    if (!container || headings.length === 0) return;
    const observer = new MutationObserver(assignRef);
    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [headings, assignRef]);

  return <div ref={containerRef}>{children}</div>;
}
