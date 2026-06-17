"use client";

import { useEffect, useState } from "react";

const AUTO_RELOAD_THROTTLE_MS = 10000;

/**
 * 错误边界共用：发生错误时（生产环境）自动重载一次以从临时故障（如静态主机偶发
 * 把 RSC 连接中途关闭）中恢复。用 sessionStorage 时间戳节流：若距上次自动重载不足
 * AUTO_RELOAD_THROTTLE_MS 又立刻报错，说明大概率非临时问题，则停下交由手动恢复，避免死循环。
 *
 * @returns 是否正在自动重载（供 UI 显示「正在自动重新加载…」）
 */
export function useAutoReloadOnError(error: unknown, logLabel: string): boolean {
  const [autoReloading, setAutoReloading] = useState(false);

  useEffect(() => {
    console.error(logLabel, error);
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    const now = Date.now();
    const last = Number(sessionStorage.getItem("nurania-last-auto-reload") || "0");
    if (now - last < AUTO_RELOAD_THROTTLE_MS) return;
    sessionStorage.setItem("nurania-last-auto-reload", String(now));
    // 刻意的一次性瞬时过渡：切到「正在自动重新加载…」提示后随即 reload，不存在级联渲染问题
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAutoReloading(true);
    const t = setTimeout(() => window.location.reload(), 600);
    return () => clearTimeout(t);
  }, [error, logLabel]);

  return autoReloading;
}
