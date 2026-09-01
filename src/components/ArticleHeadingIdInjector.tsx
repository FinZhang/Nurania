"use client";

import { useRef, useLayoutEffect, useCallback, type ReactNode } from "react";
import type { H3Heading } from "@/lib/headings";
import { scrollToHeading } from "@/lib/headings";

/**
 * 在客户端挂载后按顺序为容器内所有 h3 设置 id，避免服务端/客户端渲染顺序差异导致 hydration 不匹配。
 * 服务端与客户端均不渲染 id，由 useLayoutEffect 在 paint 前注入。
 * 折叠块展开后新增的 h3 通过 MutationObserver 再次注入。
 *
 * 同时负责两件与 id 直接相关的事：
 * - 冷启动 hash 跳转：id 是挂载后才注入的，浏览器解析 `#小节` 的那一刻还没有对应元素，
 *   因此别人打开一个带锚点的分享链接不会滚到位置，需要在注入完成后补一次滚动。
 * - 每个 h3 追加一个复制链接按钮，方便读者把某一节分享出去。
 */
interface Props {
  headings: H3Heading[];
  children: ReactNode;
}

/** 复制按钮的标记类名；每轮重扫时先清掉上一轮插入的，保证幂等 */
const ANCHOR_CLASS = "heading-anchor";
const COPIED_HINT_MS = 1200;

function makeAnchorButton(id: string): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = ANCHOR_CLASS;
  btn.setAttribute("aria-label", "复制本节链接");
  btn.title = "复制本节链接";
  btn.textContent = "#";
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}#${encodeURIComponent(id)}`;
    const done = () => {
      btn.dataset.copied = "1";
      window.setTimeout(() => {
        delete btn.dataset.copied;
      }, COPIED_HINT_MS);
    };
    // clipboard API 在非安全上下文（如局域网 http 预览）不可用，退回到旧接口
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(() => undefined);
      return;
    }
    const ta = document.createElement("textarea");
    ta.value = url;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      done();
    } catch {
      /* 复制失败就静默放弃，链接本身仍在地址栏可手动取得 */
    }
    document.body.removeChild(ta);
  });
  return btn;
}

function assignH3Ids(container: HTMLDivElement, headings: H3Heading[]): Set<string> {
  const assigned = new Set<string>();
  const h3s = container.querySelectorAll<HTMLHeadingElement>("h3");
  h3s.forEach((el) => {
    el.removeAttribute("id");
    el.querySelectorAll(`.${ANCHOR_CLASS}`).forEach((btn) => btn.remove());
  });
  if (headings.length === 0) return assigned;
  const n = Math.min(h3s.length, headings.length);
  // 带题图时可能同时存在两套 DOM（如 md:hidden + hidden md:block），后一套为当前视口可见；将 id 赋给最后 n 个 h3，保证可见的那套有正确 id
  const start = h3s.length - n;
  for (let i = 0; i < n; i++) {
    const el = h3s[start + i];
    el.id = headings[i].id;
    el.appendChild(makeAnchorButton(headings[i].id));
    assigned.add(headings[i].id);
  }
  return assigned;
}

export default function ArticleHeadingIdInjector({ headings, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const didHashScrollRef = useRef(false);

  const assignRef = useCallback(() => {
    const container = containerRef.current;
    if (!container) return new Set<string>();
    // 自己插入的按钮同样是 childList 变更，不断开观察会把回调打成死循环；
    // disconnect() 会连带丢弃已排队的记录，因此先断开、改完再重新观察。
    observerRef.current?.disconnect();
    const assigned = assignH3Ids(container, headings);
    if (observerRef.current && headings.length > 0) {
      observerRef.current.observe(container, { childList: true, subtree: true });
    }
    return assigned;
  }, [headings]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new MutationObserver(() => assignRef());
    observerRef.current = observer;
    const assigned = assignRef();

    // 冷启动 hash 跳转：只做一次，之后的滚动交给用户与右侧导航
    if (!didHashScrollRef.current) {
      didHashScrollRef.current = true;
      const raw = window.location.hash.slice(1);
      if (raw) {
        let id = raw;
        try {
          id = decodeURIComponent(raw);
        } catch {
          /* 非法编码就按原样比对 */
        }
        if (assigned.has(id)) {
          const el = container.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
          // 等一帧让布局稳定（浮动题图/插图占位会影响位置）再滚
          if (el) requestAnimationFrame(() => scrollToHeading(el));
        }
      }
    }

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [headings, assignRef]);

  return <div ref={containerRef}>{children}</div>;
}
