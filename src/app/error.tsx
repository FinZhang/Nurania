"use client";

/**
 * 路由段错误边界：文章/目录等子页面在客户端渲染或软跳转取数据失败时触发。
 * 自动重载策略见 useAutoReloadOnError（时间节流防死循环）。
 */

import { useAutoReloadOnError } from "@/lib/useAutoReloadOnError";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const autoReloading = useAutoReloadOnError(error, "[Nurania] 页面加载出错：");

  return (
    <div className="container-nurania py-20 md:py-28 flex flex-col items-center text-center gap-5">
      <h1 className="font-display text-2xl md:text-3xl font-semibold text-[var(--ink)]">
        页面加载遇到问题
      </h1>
      {autoReloading ? (
        <p className="text-[var(--ink-muted)]">正在自动重新加载…</p>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
