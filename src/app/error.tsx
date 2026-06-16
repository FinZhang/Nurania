"use client";

/**
 * 路由段错误边界：当文章/目录等子页面在客户端渲染或软跳转取数据失败时触发。
 * 典型场景：静态部署主机偶发把 RSC 负载的连接中途关闭（控制台报 "Connection closed."）。
 * 这类错误几乎都是临时的——硬加载同一地址即可恢复，因此生产环境下自动重载一次兜底，
 * 自动重载用 sessionStorage 限制为每个地址每次会话仅一次，避免无限循环。
 */

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Nurania] 页面加载出错：", error);
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    const key = "nurania-auto-reloaded:" + window.location.pathname;
    if (sessionStorage.getItem(key)) return; // 本会话已自动重载过，避免循环
    sessionStorage.setItem(key, "1");
    window.location.reload();
  }, [error]);

  return (
    <div className="container-nurania py-20 md:py-28 flex flex-col items-center text-center gap-5">
      <h1 className="font-display text-2xl md:text-3xl font-semibold text-[var(--ink)]">
        页面加载遇到问题
      </h1>
      <p className="max-w-md leading-relaxed text-[var(--ink-muted)]">
        加载内容时网络连接被中断。这通常是临时问题，刷新即可恢复。
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") window.location.reload();
          }}
          className="rounded border border-[var(--parchment-aged)] bg-[var(--parchment-light)] px-4 py-2 text-[var(--ink)] transition-colors hover:text-[var(--gold-dark)]"
        >
          刷新页面
        </button>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded border border-[var(--parchment-aged)] bg-[var(--parchment-light)] px-4 py-2 text-[var(--ink-muted)] transition-colors hover:text-[var(--gold-dark)]"
        >
          重试
        </button>
      </div>
    </div>
  );
}
