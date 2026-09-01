"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { IndexTermData } from "@/lib/index-terms";
import { IndexTermContext, type IndexTermContextValue } from "./index-term-context";
import IndexTermPopover from "./IndexTermPopover";

/** 同时可堆叠的卡片数上限（含由正文打开的第一张）；再深屏幕上就互相遮挡了 */
const MAX_STACK = 4;

interface StackItem {
  /** 每次打开都换一个 key，同一条目重复打开时也能重建定位 */
  key: number;
  termId: string;
  anchor: HTMLElement;
}

interface Props {
  terms?: IndexTermData[];
  children: React.ReactNode;
}

/**
 * 索引名词悬浮释义的状态中枢：持有本页词条数据与「悬浮窗栈」。
 *
 * 栈的第 i 项由第 i 层的名词打开，于是「在第 N 层打开新词」＝「截断到 N 再压栈」，
 * 关闭第 N 层自然连带关闭其后代，不必逐层维护父子引用。
 *
 * 卡片只在「点击卡片与名词之外的位置」「点卡片上的 ×」「按 Esc」时关闭：
 * 指针移开不再自动关，否则读者稍一挪动鼠标释义就没了，根本来不及读完。
 */
export default function IndexTermProvider({ terms, children }: Props) {
  const termMap = useMemo(() => new Map((terms ?? []).map((t) => [t.id, t])), [terms]);
  const [stack, setStack] = useState<StackItem[]>([]);
  const nextKey = useRef(0);

  // 切换文章时清空弹窗栈：App Router 会复用本组件实例，
  // 否则上一篇留下的卡片会带着已被卸载的锚点元素继续挂在屏幕上。
  // （卡片不再随指针移开自动关闭，这一步就成了必要的兜底。）
  const [lastTermMap, setLastTermMap] = useState(termMap);
  if (lastTermMap !== termMap) {
    setLastTermMap(termMap);
    setStack([]);
  }

  const closeTo = useCallback((level: number) => {
    setStack((prev) => (prev.length <= level ? prev : prev.slice(0, level)));
  }, []);

  const open = useCallback((level: number, termId: string, anchor: HTMLElement) => {
    setStack((prev) => {
      if (prev.length === level + 1 && prev[level].termId === termId) return prev;
      return [...prev.slice(0, level), { key: nextKey.current++, termId, anchor }];
    });
  }, []);

  const value = useMemo<IndexTermContextValue>(
    () => ({
      getTerm: (termId) => termMap.get(termId),
      open,
      closeTo,
      openIdAt: (level) => stack[level]?.termId,
      // 索引条目之间存在循环引用（四大元素→神启魔法→神启学派→四大元素…）。
      // 每个窗口各自独立计数本身没问题，但会让读者在环里无限点下去，
      // 因此把「已高亮」的作用域从「每个窗口」收窄到「每条弹窗链」：
      // 祖先链上已经展开着的条目，在下游卡片里退回普通文字。
      isSuppressed: (level, termId) =>
        level >= MAX_STACK || stack.slice(0, level).some((item) => item.termId === termId),
    }),
    [termMap, open, closeTo, stack]
  );

  // Esc 关最上层；在悬浮窗与名词之外按下指针则全部关闭
  useEffect(() => {
    if (stack.length === 0) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeTo(stack.length - 1);
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (target?.closest?.("[data-index-term], [data-index-term-popover]")) return;
      closeTo(0);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [stack.length, closeTo]);

  // 本页没有任何词条时完全不介入，正文按原样渲染
  if (termMap.size === 0) return <>{children}</>;

  return (
    <IndexTermContext.Provider value={value}>
      {children}
      {stack.map((item, depth) => {
        const term = termMap.get(item.termId);
        if (!term) return null;
        return (
          <IndexTermPopover
            key={item.key}
            term={term}
            anchor={item.anchor}
            depth={depth}
            onRequestClose={() => closeTo(depth)}
          />
        );
      })}
    </IndexTermContext.Provider>
  );
}
