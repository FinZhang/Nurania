/**
 * 阅读偏好（主题与正文字号）的存储约定。
 *
 * 站点是静态导出，服务端无从得知读者的偏好，页面只能先按默认配色渲染再由脚本纠正。
 * 若等到 React 挂载后才改，读者每次刷新都会看见一帧浅色闪光，因此偏好由
 * layout.tsx 注入的一段首屏内联脚本在绘制前写到 <html> 的属性上，
 * 具体样式则由 globals.css 的 [data-theme] / [data-reading-size] 承接。
 *
 * 键名与属性名在此单点定义，内联脚本亦由此生成，避免两处写法漂移。
 */

export const THEME_STORAGE_KEY = "nurania-theme";
export const SIZE_STORAGE_KEY = "nurania-reading-size";

export const THEME_ATTR = "data-theme";
export const SIZE_ATTR = "data-reading-size";

/** auto = 跟随系统（不写属性，交给 prefers-color-scheme） */
export type ThemeChoice = "auto" | "light" | "night";
export type ReadingSize = "sm" | "md" | "lg" | "xl";

export const THEME_CHOICES: { value: ThemeChoice; label: string }[] = [
  { value: "light", label: "日间" },
  { value: "night", label: "夜读" },
  { value: "auto", label: "跟随系统" },
];

export const READING_SIZES: { value: ReadingSize; label: string }[] = [
  { value: "sm", label: "小" },
  { value: "md", label: "中" },
  { value: "lg", label: "大" },
  { value: "xl", label: "特大" },
];

const DEFAULT_THEME: ThemeChoice = "auto";
const DEFAULT_SIZE: ReadingSize = "md";

function isTheme(v: string | null): v is ThemeChoice {
  return v === "auto" || v === "light" || v === "night";
}

function isSize(v: string | null): v is ReadingSize {
  return v === "sm" || v === "md" || v === "lg" || v === "xl";
}

/** 读当前生效的主题；以 <html> 上的属性为准，未设置即「跟随系统」 */
export function getTheme(): ThemeChoice {
  if (typeof document === "undefined") return DEFAULT_THEME;
  const v = document.documentElement.getAttribute(THEME_ATTR);
  return isTheme(v) ? v : DEFAULT_THEME;
}

export function getReadingSize(): ReadingSize {
  if (typeof document === "undefined") return DEFAULT_SIZE;
  const v = document.documentElement.getAttribute(SIZE_ATTR);
  return isSize(v) ? v : DEFAULT_SIZE;
}

export function setTheme(choice: ThemeChoice) {
  const el = document.documentElement;
  if (choice === "auto") el.removeAttribute(THEME_ATTR);
  else el.setAttribute(THEME_ATTR, choice);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    /* 隐私模式下写不进去，本次会话内仍然生效 */
  }
}

export function setReadingSize(size: ReadingSize) {
  document.documentElement.setAttribute(SIZE_ATTR, size);
  try {
    localStorage.setItem(SIZE_STORAGE_KEY, size);
  } catch {
    /* 同上 */
  }
}

/**
 * 首屏内联脚本：在 <head> 里同步执行，早于任何绘制。
 * 写得尽量短，因为它会原样出现在每一个导出的 HTML 里。
 */
export const READING_PREFS_BOOT_SCRIPT = `(function(){try{var d=document.documentElement;var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)});if(t==="night"||t==="light")d.setAttribute(${JSON.stringify(
  THEME_ATTR
)},t);var s=localStorage.getItem(${JSON.stringify(
  SIZE_STORAGE_KEY
)});if(s==="sm"||s==="md"||s==="lg"||s==="xl")d.setAttribute(${JSON.stringify(
  SIZE_ATTR
)},s);}catch(e){}})();`;
