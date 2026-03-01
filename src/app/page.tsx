"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";

export default function HomePage() {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);

  const handleBookClick = () => {
    if (exiting) return;
    setExiting(true);
  };

  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex items-center justify-center overflow-hidden">
      {/* 半透明地图背景：大屏放大填满，小屏居中裁剪 */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <Image
          src="/world-map.jpg"
          alt="诺拉尼亚大陆地图"
          fill
          className="object-cover object-center opacity-40 min-w-full min-h-full md:scale-110 lg:scale-125"
          sizes="100vw"
          priority
          loading="eager"
        />
      </div>

      {/* 书籍封面：点击后向左移动并淡出，再进入目录页 */}
      <div className="relative z-10 flex justify-center items-center p-4 md:p-6 flex-shrink-0">
        <motion.div
          role="button"
          tabIndex={0}
          onClick={handleBookClick}
          onKeyDown={(e) => e.key === "Enter" && handleBookClick()}
          className="group block w-[min(45vw,38vh)] sm:w-[min(50vw,42vh)] md:w-[min(55vw,48vh)] lg:w-[min(60vw,52vh)] cursor-pointer glow-hover"
          initial={false}
          animate={{
            x: exiting ? -180 : 0,
            opacity: exiting ? 0 : 1,
          }}
          transition={{
            duration: 0.5,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          onAnimationComplete={() => {
            if (exiting) router.push("/toc");
          }}
        >
          <div className="relative w-full aspect-[3/4] overflow-hidden rounded-lg border-2 border-[var(--gold-dark)]/60 bg-transparent shadow-[0_8px_30px_rgba(0,0,0,0.25),0_12px_40px_rgba(0,0,0,0.15)]">
            <Image
              src="/book_cover.png"
              alt="诺拉尼亚行思录封面"
              fill
              priority
              className="object-cover object-center group-hover:scale-[1.02] transition-transform duration-300"
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
