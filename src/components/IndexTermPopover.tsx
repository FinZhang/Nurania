"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import type { IndexTermData } from "@/lib/index-terms";
import articleMdComponents from "@/lib/article-md-components";
import { IndexTermLevelContext } from "./index-term-context";

/** 卡片与锚点、与视口边缘的间距；顶部另留出吸顶页眉的高度 */
const GAP_PX = 10;
const MARGIN_PX = 8;
const HEADER_SAFE_TOP_PX = 72;

interface Props {
  term: IndexTermData;
  anchor: HTMLElement;
  /** 在悬浮窗栈中的层号，0 为由正文打开的第一层 */
  depth: number;
  onRequestClose: () => void;
}

/**
 * 词条释义悬浮窗。释义正文用与文章相同的 Markdown 组件渲染，
 * 因此窗内的索引名词会再次变成可展开的名词标记，天然支持逐层嵌套。
 * 嵌套深度与循环引用由 IndexTermProvider 的 isSuppressed 约束。
 */
export default function IndexTermPopover({ term, anchor, depth, onRequestClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  /** 默认挂在锚点下方；下方放不下则翻到上方，并夹在视口内 */
  const place = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    const a = anchor.getBoundingClientRect();
    const { offsetWidth: w, offsetHeight: h } = el;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const left = Math.max(MARGIN_PX, Math.min(a.left + a.width / 2 - w / 2, vw - w - MARGIN_PX));

    let top = a.bottom + GAP_PX;
    if (top + h > vh - MARGIN_PX) {
      const above = a.top - h - GAP_PX;
      top = above >= HEADER_SAFE_TOP_PX ? above : Math.max(HEADER_SAFE_TOP_PX, vh - h - MARGIN_PX);
    }
    setPos({ top, left });
  }, [anchor]);

  useLayoutEffect(() => {
    place();
  }, [place, term.id]);

  /**
   * 锚点是否还在可视区域内。顶部以吸顶页眉的下沿为准——藏在页眉底下的名词
   * 对读者而言已经看不见了。
   *
   * 只有第 0 层的锚点长在正文里、会随页面滚动；更深的锚点长在 position:fixed
   * 的父卡片内，滚动时始终「可见」，所以真正会因滚动关闭的只有第 0 层，
   * 而关掉第 0 层本就连带关掉整条链。
   */
  const isAnchorVisible = useCallback(() => {
    const a = anchor.getBoundingClientRect();
    return a.bottom >= HEADER_SAFE_TOP_PX && a.top <= window.innerHeight;
  }, [anchor]);

  useEffect(() => {
    // 锚点被滚出屏幕后必须关闭：卡片是 position:fixed 且会被夹在视口内，
    // 否则它会脱离原文、被钉在视口边缘变成一张无处可依的幽灵卡片。
    const onViewportChange = () => {
      if (!isAnchorVisible()) {
        onRequestClose();
        return;
      }
      place();
    };
    window.addEventListener("scroll", onViewportChange, true);
    window.addEventListener("resize", onViewportChange);
    return () => {
      window.removeEventListener("scroll", onViewportChange, true);
      window.removeEventListener("resize", onViewportChange);
    };
  }, [place, isAnchorVisible, onRequestClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      ref={cardRef}
      data-index-term-popover
      role="dialog"
      aria-label={`索引词条：${term.title}`}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="index-term-popover"
      style={{
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        visibility: pos ? "visible" : "hidden",
        zIndex: 1000 + depth,
      }}
    >
      <div className="index-term-popover-head">
        <p className="index-term-popover-title">
          {term.title}
          {term.aliases.length > 0 && (
            <span className="index-term-popover-aliases">（{term.aliases.join(" / ")}）</span>
          )}
        </p>
        <button
          type="button"
          className="index-term-popover-close"
          aria-label="关闭"
          onClick={onRequestClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="index-term-popover-body">
        <IndexTermLevelContext.Provider value={depth + 1}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={articleMdComponents}>
            {term.body}
          </ReactMarkdown>
        </IndexTermLevelContext.Provider>
      </div>
    </motion.div>,
    document.body
  );
}
