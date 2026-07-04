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

function normalizeText(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * 按标题文本匹配分配 id，而非按位置：DOM 中的 h3 数量可能少于提取结果
 * （折叠块未展开时其内容不渲染），按位置分配会让后续锚点整体错位。
 * 题图文章宽/窄屏两套 DOM 会让同一标题出现两次：同名 id 队列循环分配，
 * 点击跳转时由 ArticleLayout 在同 id 候选中选取可见元素。
 */
function assignH3Ids(container: HTMLDivElement, headings: H3Heading[]) {
  const h3s = container.querySelectorAll<HTMLHeadingElement>("h3");
  h3s.forEach((el) => {
    el.removeAttribute("id");
  });
  if (headings.length === 0) return;

  const queues = new Map<string, { ids: string[]; next: number }>();
  for (const h of headings) {
    const key = normalizeText(h.text);
    const q = queues.get(key);
    if (q) q.ids.push(h.id);
    else queues.set(key, { ids: [h.id], next: 0 });
  }

  h3s.forEach((el) => {
    const q = queues.get(normalizeText(el.textContent ?? ""));
    if (!q) return;
    el.id = q.ids[q.next % q.ids.length];
    q.next += 1;
  });
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
