"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useGamificationStore } from "../../stores/gamification";

const HOLD_DURATION = 2800;
const MILESTONE_HOLD = 3800;

function SingleToast({ id, points, action, isMilestone }: {
  id: string;
  points: number;
  action: string;
  isMilestone: boolean;
}) {
  const { removePointsToast } = useGamificationStore();
  const prefersReduced = useReducedMotion();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paused, setPaused] = useState(false);

  const startTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(
      () => removePointsToast(id),
      isMilestone ? MILESTONE_HOLD : HOLD_DURATION
    );
  };

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPaused(true);
  };

  const handleMouseLeave = () => {
    setPaused(false);
    startTimer();
  };

  const pointsColor = isMilestone ? "#4ECDC4" : "#FF6B2B";

  return (
    <motion.div
      layout
      key={id}
      initial={prefersReduced
        ? { opacity: 0 }
        : { opacity: 0, x: 24, scale: 0.92 }
      }
      animate={prefersReduced
        ? { opacity: 1 }
        : { opacity: 1, x: 0, scale: 1 }
      }
      exit={prefersReduced
        ? { opacity: 0 }
        : { opacity: 0, x: 16, scale: 0.95 }
      }
      transition={prefersReduced
        ? { duration: 0.2 }
        : { type: "spring", stiffness: 320, damping: 26 }
      }
      className="flex items-center h-11 min-w-[160px] max-w-[280px] px-4 rounded-full cursor-pointer select-none"
      style={{
        background: "rgba(26,26,46,0.92)",
        border: paused
          ? "1px solid rgba(255,255,255,0.2)"
          : "1px solid rgba(255,255,255,0.10)",
        backdropFilter: "blur(16px)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
        transition: "border-color 150ms",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => removePointsToast(id)}
    >
      <span className="font-bold text-sm shrink-0" style={{ color: pointsColor }}>
        +{points} pts
      </span>
      <span className="mx-2 text-sm shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>
        ·
      </span>
      <span
        className="text-[13px] truncate"
        style={{ color: "rgba(255,255,255,0.7)" }}
      >
        {action}
      </span>
    </motion.div>
  );
}

export default function PointsToastStack() {
  const { pointsToasts } = useGamificationStore();

  return (
    <div
      className="fixed bottom-6 right-6 z-[9998] flex flex-col-reverse gap-2 pointer-events-none"
      style={{ bottom: "24px", right: "24px" }}
    >
      <AnimatePresence mode="popLayout">
        {pointsToasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <SingleToast {...toast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
