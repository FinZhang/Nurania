"use client";

/**
 * 路由段错误边界：当文章/目录等子页面在客户端渲染或软跳转取数据失败时触发。
 * 典型场景：静态部署主机偶发把 RSC 负载的连接中途关闭（控制台报 "Connection closed."）。
 * 这类错误几乎都是临时的——硬加载同一地址即可恢复，因此生产环境下自动重载兜底。
 *
 * 防死循环：用 sessionStorage 记录上次自动重载的时间戳，若距上次自动重载不足
 * AUTO_RELOAD_THROTTLE_MS 又立刻报错，说明大概率不是临时问题，则停下显示手动选项。
 * 否则每次发生都会自动重载（不再像旧版那样每地址只自动一次）。
 */

import { useEffect, useState } from "react";

const AUTO_RELOAD_THROTTLE_MS = 10000;

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [autoReloading, setAutoReloading] = useState(false);

  useEffect(() => {
    console.error("[Nurania] 页面加载出错：", error);
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    const now = Date.now();
    const last = Number(sessionStorage.getItem("nurania-last-auto-reload") || "0");
    if (now - last < AUTO_RELOAD_THROTTLE_MS) return; // 刚自动重载过又报错 → 非临时问题，停下
    sessionStorage.setItem("nurania-last-auto-reload", String(now));
    setAutoReloading(true);
    const t = setTimeout(() => window.location.reload(), 600);
    return () => clearTimeout(t);
  }, [error]);

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
