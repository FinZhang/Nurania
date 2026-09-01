"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { useIndexTermLevel, useIndexTerms } from "./index-term-context";

/** 悬停多久才弹出：卡片不再随指针移开自动关闭，弹得太轻率就会一路留下卡片 */
const OPEN_DELAY_MS = 250;

interface Props {
  termId: string;
  children?: React.ReactNode;
}

/**
 * 正文（及悬浮窗内）里被标记的索引名词。
 * 桌面悬停弹出、触屏点按弹出。
 *
 * 用带 role="button" 的 span 而非真的 button 或 a：
 * button 在 Chrome 下强制块化、长词无法跨行折行，会在正文里留出空档；
 * a 则会继承 .article-markdown a 的链接样式并造成嵌套链接。
 */
export default function IndexTermMark({ termId, children }: Props) {
  const ctx = useIndexTerms();
  const level = useIndexTermLevel();
  const ref = useRef<HTMLSpanElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelOpen = useCallback(() => {
    if (openTimer.current !== null) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  }, []);

  useEffect(() => cancelOpen, [cancelOpen]);

  const term = ctx?.getTerm(termId);
  const isOpen = ctx?.openIdAt(level) === termId;

  const openNow = useCallback(() => {
    cancelOpen();
    if (ref.current) ctx?.open(level, termId, ref.current);
  }, [cancelOpen, ctx, level, termId]);

  if (!ctx || !term || ctx.isSuppressed(level, termId)) return <>{children}</>;

  return (
    <span
      ref={ref}
      role="button"
      tabIndex={0}
      data-index-term
      className="index-term"
      aria-expanded={isOpen}
      aria-label={`索引：${term.title}`}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        cancelOpen();
        openTimer.current = setTimeout(openNow, OPEN_DELAY_MS);
      }}
      onPointerLeave={(e) => {
        // 只取消「还没弹出的那次悬停」，已经弹出的卡片不因移开而关闭
        if (e.pointerType !== "mouse") return;
        cancelOpen();
      }}
      onClick={() => {
        if (isOpen) ctx.closeTo(level);
        else openNow();
      }}
      onFocus={openNow}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        if (isOpen) ctx.closeTo(level);
        else openNow();
      }}
    >
      {children}
    </span>
  );
}
