"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Settings2, Sun, Moon, Laptop, Printer, ALargeSmall } from "lucide-react";
import {
  READING_SIZES,
  THEME_CHOICES,
  getReadingSize,
  getTheme,
  setReadingSize,
  setTheme,
  type ReadingSize,
  type ThemeChoice,
} from "@/lib/reading-prefs";

const THEME_ICON = {
  light: Sun,
  night: Moon,
  auto: Laptop,
} as const;

/**
 * 页眉里的阅读设置：主题（日间 / 夜读 / 跟随系统）与正文字号。
 *
 * 当前值以 <html> 上的属性为准——首屏内联脚本已经把它们写好了。属性只在打开面板的那一刻读一次：
 * 面板不展开时读了也没人看，而且服务端渲染阶段根本读不到，挂载后再补读会引起 hydration 不匹配。
 */
export default function ReadingSettings() {
  const pathname = usePathname();
  const isArticlePage = Boolean(pathname && pathname.split("/")[2] === "article");

  const [open, setOpen] = useState(false);
  const [theme, setThemeState] = useState<ThemeChoice | null>(null);
  const [size, setSizeState] = useState<ReadingSize | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // 属性在打开的那一刻读，读完再翻开面板；更新函数里不能塞副作用，因此这里直接用当前 open
  const toggleOpen = useCallback(() => {
    if (!open) {
      setThemeState(getTheme());
      setSizeState(getReadingSize());
    }
    setOpen(!open);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    // 捕获阶段：索引释义卡片也在监听 Esc，设置面板是更上层的浮层，应当先被关掉
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  const chooseTheme = useCallback((v: ThemeChoice) => {
    setTheme(v);
    setThemeState(v);
  }, []);

  const chooseSize = useCallback((v: ReadingSize) => {
    setReadingSize(v);
    setSizeState(v);
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={toggleOpen}
        className="reading-settings-trigger"
        aria-expanded={open}
        aria-label="阅读设置"
        title="阅读设置"
      >
        <Settings2 className="h-4 w-4 md:h-[1.125rem] md:w-[1.125rem]" aria-hidden />
      </button>

      {open && (
        <div className="reading-settings-panel" role="dialog" aria-label="阅读设置">
          <p className="reading-settings-label">主题</p>
          <div className="reading-settings-row" role="group" aria-label="主题">
            {THEME_CHOICES.map(({ value, label }) => {
              const Icon = THEME_ICON[value];
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={theme === value}
                  onClick={() => chooseTheme(value)}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>

          <p className="reading-settings-label">
            <ALargeSmall className="h-4 w-4" aria-hidden />
            正文字号
          </p>
          <div className="reading-settings-row" role="group" aria-label="正文字号">
            {READING_SIZES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={size === value}
                onClick={() => chooseSize(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {isArticlePage && (
            <button
              type="button"
              className="reading-settings-print"
              onClick={() => {
                setOpen(false);
                // 折叠块会在 beforeprint 时自行全部展开，见 MarkdownWithFoldBlocks
                window.print();
              }}
            >
              <Printer className="h-4 w-4" aria-hidden />
              打印本篇 / 存为 PDF
            </button>
          )}
        </div>
      )}
    </div>
  );
}
