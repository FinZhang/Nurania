"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const MAP_SRC = "/world-map-labelled.jpg";

export default function MapWithLightbox() {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [scale, setScale] = useState(1.2);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const pinchStart = useRef({ dist: 0, scale: 1 });
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const handleOpen = () => setLightboxOpen(true);
  const handleClose = () => {
    setLightboxOpen(false);
    setScale(1.2);
    setPan({ x: 0, y: 0 });
  };

  const panRef = useRef(pan);
  panRef.current = pan;
  const mapTransformRef = useRef<HTMLDivElement | null>(null);

  const applyTransform = useCallback(() => {
    const el = mapTransformRef.current;
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
    if (lightboxOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [lightboxOpen]);

  // 用自建的 DOM 容器挂载灯箱，在其上直接绑定 wheel/mousedown，避免 Portal+ref 在 Chrome 下收不到事件
  const [lightboxContainer, setLightboxContainer] = useState<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!lightboxOpen) return;

    const wrapper = document.createElement("div");
    wrapper.style.cssText =
      "position:fixed;inset:0;z-index:9999;pointer-events:auto;";
    document.body.appendChild(wrapper);
    containerRef.current = wrapper;
    setLightboxContainer(wrapper);

    const onWheel = (e: WheelEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) return;
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      const next = Math.min(4, Math.max(0.3, scaleRef.current + delta));
      scaleRef.current = next;
      setScale(next);
      const el = mapTransformRef.current;
      if (el)
        el.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${scaleRef.current})`;
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
  }, [lightboxOpen]);

  const handleExitComplete = useCallback(() => {
    containerRef.current?.remove();
    containerRef.current = null;
    setLightboxContainer(null);
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

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        setPan({
          x: dragStart.current.panX + e.touches[0].clientX - dragStart.current.x,
          y: dragStart.current.panY + e.touches[0].clientY - dragStart.current.y,
        });
      } else if (e.touches.length === 2) {
        const dist = getTouchDist(e);
        if (pinchStart.current.dist > 0) {
          const ratio = dist / pinchStart.current.dist;
          setScale((s) =>
            Math.min(4, Math.max(0.3, pinchStart.current.scale * ratio))
          );
        }
      }
    },
    []
  );

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0) setIsDragging(false);
    if (e.touches.length < 2) pinchStart.current = { dist: 0, scale: 1 };
  }, []);

  return (
    <>
      {/* 内联地图：与文章同宽，高度等比，描边+阴影，可点击 */}
      <button
        type="button"
        onClick={handleOpen}
        className="w-full mb-8 rounded-lg overflow-hidden border-2 border-[var(--parchment-aged)] shadow-[0_8px_24px_rgba(0,0,0,0.15),0_4px_12px_rgba(0,0,0,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-dark)] focus:ring-offset-2 cursor-pointer block"
      >
        <div className="relative w-full aspect-[16/9] min-h-[200px] bg-[var(--parchment-dark)]/30">
          <Image
            src={MAP_SRC}
            alt="诺拉尼亚大陆地图（标注版）"
            fill
            className="object-contain object-center"
            sizes="(max-width: 768px) 100vw, 80vw"
          />
        </div>
      </button>

      {/* 灯箱：渲染到自建 wrapper（其上已绑定 wheel/mousedown），关闭动画结束后再移除 wrapper */}
      {lightboxContainer &&
        createPortal(
          <AnimatePresence onExitComplete={handleExitComplete}>
            {lightboxOpen && (
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
                  style={{
                    cursor: isDragging ? "grabbing" : "grab",
                    zIndex: 10000,
                  }}
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
                      ref={mapTransformRef}
                      className="relative flex items-center justify-center select-none"
                      style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                        touchAction: "none",
                      }}
                    >
                    <div className="relative w-[95vw] max-w-6xl aspect-[16/9] bg-[var(--parchment-dark)] rounded-lg overflow-hidden border-2 border-[var(--parchment-aged)] shadow-2xl pointer-events-none">
                      <Image
                        src={MAP_SRC}
                        alt="诺拉尼亚大陆地图（标注版）"
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
          lightboxContainer
        )}
    </>
  );
}
