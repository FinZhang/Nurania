"use client";

/**
 * 根布局级错误边界：替代 Next 默认的「Application error: a client-side exception has occurred」白屏。
 * 因为它会整体替换根布局，globals.css 不一定生效，故用内联样式自带羊皮纸配色。
 * 自动重载策略与 src/app/error.tsx 一致（时间节流防死循环）。
 */

import { useEffect, useState } from "react";

const AUTO_RELOAD_THROTTLE_MS = 10000;

const card: React.CSSProperties = { maxWidth: 460 };
const btn: React.CSSProperties = {
  cursor: "pointer",
  border: "1px solid #cbb790",
  background: "#f7efe0",
  color: "#3a2f24",
  padding: "0.55rem 1.1rem",
  borderRadius: 4,
  fontSize: "1rem",
  fontFamily: "inherit",
};

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [autoReloading, setAutoReloading] = useState(false);

  useEffect(() => {
    console.error("[Nurania] 应用级错误：", error);
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    const now = Date.now();
    const last = Number(sessionStorage.getItem("nurania-last-auto-reload") || "0");
    if (now - last < AUTO_RELOAD_THROTTLE_MS) return;
    sessionStorage.setItem("nurania-last-auto-reload", String(now));
    setAutoReloading(true);
    const t = setTimeout(() => window.location.reload(), 600);
    return () => clearTimeout(t);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
          background: "#f3e9d6",
          color: "#3a2f24",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div style={card}>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 600, margin: "0 0 0.75rem" }}>
            页面加载遇到问题
          </h1>
          {autoReloading ? (
            <p style={{ color: "#6b5d49", lineHeight: 1.7, margin: 0 }}>正在自动重新加载…</p>
          ) : (
            <>
              <p style={{ color: "#6b5d49", lineHeight: 1.7, margin: "0 0 1.5rem" }}>
                加载内容时网络连接被中断。这通常是临时问题，刷新即可恢复。
              </p>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") window.location.reload();
                  }}
                  style={btn}
                >
                  刷新页面
                </button>
                <button type="button" onClick={() => reset()} style={{ ...btn, color: "#6b5d49" }}>
                  重试
                </button>
              </div>
            </>
          )}
        </div>
      </body>
    </html>
  );
}
