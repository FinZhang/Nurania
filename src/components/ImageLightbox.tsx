"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

/** 打开时的初始缩放；滚轮/双指缩放的上下限 */
const INITIAL_SCALE = 1.2;
const MIN_SCALE = 0.3;
const MAX_SCALE = 4;

interface Props {
  open: boolean;
  onClose: () => void;
  src: string;
  alt: string;
  /** 图片宽高比（宽/高），用于计算灯箱内图框尺寸 */
  aspectRatio: number;
}

/**
 * 图片灯箱：全屏遮罩内可滚轮缩放、拖动平移、双指缩放，点击遮罩或关闭按钮退出。
 * 供正文中标记为「可放大」的插图使用。
 */
export default function ImageLightbox({ open, onClose, src, alt, aspectRatio }: Props) {
  const [scale, setScale] = useState(INITIAL_SCALE);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const pinchStart = useRef({ dist: 0, scale: 1 });
  const scaleRef = useRef(scale);
  const panRef = useRef(pan);
  const imageTransformRef = useRef<HTMLDivElement | null>(null);

  const handleClose = useCallback(() => {
    onClose();
    setScale(INITIAL_SCALE);
    setPan({ x: 0, y: 0 });
  }, [onClose]);

  // 让 scale/pan 的 ref 跟随 state（在 commit 后同步），供事件处理与直接改 DOM 时读取最新值
  useEffect(() => {
    scaleRef.current = scale;
    panRef.current = pan;
  }, [scale, pan]);

  const applyTransform = useCallback(() => {
    const el = imageTransformRef.current;
    if (el)
      el.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${scaleRef.current})`;
  }, []);

  // 拖动中：在 window 上监听 mousemove/mouseup，并直接改 DOM transform，不依赖 Portal 重渲染
  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const x = dragStart.current.panX + e.clientX - dragStart.current.x;
      const y = dragStart.current.panY + e.clientY - dragStart.current.y;
      panRef.current = { x, y };
      setPan(panRef.current);
      applyTransform();
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging, applyTransform]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // 用自建的 DOM 容器挂载灯箱，在其上直接绑定 wheel/mousedown，避免 Portal+ref 在 Chrome 下收不到事件
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const wrapper = document.createElement("div");
    wrapper.style.cssText = "position:fixed;inset:0;z-index:9999;pointer-events:auto;";
    document.body.appendChild(wrapper);
    containerRef.current = wrapper;
    // 命令式创建 portal 容器后需触发一次渲染把灯箱挂进去——此处 setState 刻意且必要
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContainer(wrapper);

    const onWheel = (e: WheelEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) return;
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scaleRef.current + delta));
      scaleRef.current = next;
      setScale(next);
      applyTransform();
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (!containerRef.current?.contains(e.target as Node)) return;
      const target = e.target as Element;
      if (target.closest?.('button[aria-label="关闭"]')) return;
      if (!target.closest?.("[data-lightbox-draggable]")) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        panX: panRef.current.x,
        panY: panRef.current.y,
      };
    };

    const opts = { capture: true, passive: false } as const;
    document.addEventListener("wheel", onWheel, opts);
    document.addEventListener("mousedown", onMouseDown, true);

    return () => {
      document.removeEventListener("wheel", onWheel, opts);
      document.removeEventListener("mousedown", onMouseDown, true);
    };
  }, [open, applyTransform]);

  const handleExitComplete = useCallback(() => {
    containerRef.current?.remove();
    containerRef.current = null;
    setContainer(null);
  }, []);

  const getTouchDist = (e: React.TouchEvent) => {
    if (e.touches.length < 2) return 0;
    return Math.hypot(
      e.touches[1].clientX - e.touches[0].clientX,
      e.touches[1].clientY - e.touches[0].clientY
    );
  };

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        setIsDragging(true);
        dragStart.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          panX: pan.x,
          panY: pan.y,
        };
      } else if (e.touches.length === 2) {
        pinchStart.current = { dist: getTouchDist(e), scale: scaleRef.current };
      }
    },
    [pan]
  );

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setPan({
        x: dragStart.current.panX + e.touches[0].clientX - dragStart.current.x,
        y: dragStart.current.panY + e.touches[0].clientY - dragStart.current.y,
      });
    } else if (e.touches.length === 2) {
      const dist = getTouchDist(e);
      if (pinchStart.current.dist > 0) {
        const ratio = dist / pinchStart.current.dist;
        setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchStart.current.scale * ratio)));
      }
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0) setIsDragging(false);
    if (e.touches.length < 2) pinchStart.current = { dist: 0, scale: 1 };
  }, []);

  if (!container) return null;

  /** 图框：不超过视口 95% 宽、90% 高，也不超过 72rem，并保持图片真实比例 */
  const frameWidth = `min(95vw, 72rem, ${(90 * aspectRatio).toFixed(2)}vh)`;

  return createPortal(
    <AnimatePresence onExitComplete={handleExitComplete}>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/60 flex items-center justify-center"
          style={{ zIndex: 9999 }}
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="absolute top-20 right-4 flex items-center justify-center w-12 h-12 rounded-full text-white/90 hover:text-white transition-colors"
            style={{ zIndex: 10001 }}
            aria-label="关闭"
          >
            <X className="h-7 w-7" strokeWidth={2.5} />
          </button>

          <div
            data-lightbox-draggable
            className="absolute inset-0 flex items-center justify-center overflow-hidden select-none"
            style={{ cursor: isDragging ? "grabbing" : "grab", zIndex: 10000 }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            onClick={(e) => e.target === e.currentTarget && handleClose()}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative flex items-center justify-center select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                ref={imageTransformRef}
                className="relative flex items-center justify-center select-none"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                  touchAction: "none",
                }}
              >
                <div
                  className="relative bg-[var(--parchment-dark)] rounded-lg overflow-hidden border-2 border-[var(--parchment-aged)] shadow-2xl pointer-events-none"
                  style={{ width: frameWidth, aspectRatio: String(aspectRatio) }}
                >
                  <Image
                    src={src}
                    alt={alt}
                    fill
                    className="object-contain object-center pointer-events-none"
                    sizes="95vw"
                    draggable={false}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    container
  );
}
