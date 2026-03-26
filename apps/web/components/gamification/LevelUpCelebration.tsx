"use client";

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useGamificationStore } from "../../stores/gamification";

// Ambient floating particle
function Particle({ color, index }: { color: string; index: number }) {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) return null;

  const size = 6 + (index % 5) * 2;
  const xStart = 20 + (index * 37) % 60; // 20–80% of width spread
  const duration = 3 + (index * 0.7) % 4;
  const delay = (index * 0.3) % 3;
  const xSwayAmount = 12 + (index * 7) % 20;

  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        left: `${xStart}%`,
        bottom: "-10px",
        backgroundColor: index % 3 === 0 ? color : index % 3 === 1 ? "#4ECDC4" : "white",
        opacity: index % 3 === 0 ? 0.55 : index % 3 === 1 ? 0.4 : 0.25,
        filter: "blur(1.5px)",
      }}
      animate={{
        y: [0, -(280 + (index % 3) * 80)],
        x: [0, xSwayAmount * Math.sin(index), -xSwayAmount * 0.5, xSwayAmount * 0.7, 0],
        opacity: [0, index % 3 === 0 ? 0.55 : 0.35, 0.2, 0],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeOut",
        times: [0, 0.3, 0.7, 1],
      }}
    />
  );
}

// Burst ring that expands from the medallion center
function BurstRing({ color, delay }: { color: string; delay: number }) {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) return null;

  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        border: `2px solid ${color}`,
        top: "50%",
        left: "50%",
        translateX: "-50%",
        translateY: "-50%",
      }}
      initial={{ width: 0, height: 0, opacity: 0.6 }}
      animate={{ width: 160, height: 160, opacity: 0 }}
      transition={{ duration: 0.8, delay, ease: "easeOut" }}
    />
  );
}

// Animated stagger children wrapper
const staggerChildren = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.9 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

export default function LevelUpCelebration() {
  const { levelUpEvent, dismissLevelUp } = useGamificationStore();
  const prefersReduced = useReducedMotion();
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (levelUpEvent) {
      autoTimerRef.current = setTimeout(dismissLevelUp, 8000);
    }
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, [levelUpEvent, dismissLevelUp]);

  // Keyboard dismiss
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && levelUpEvent) dismissLevelUp();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [levelUpEvent, dismissLevelUp]);

  return (
    <AnimatePresence>
      {levelUpEvent && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="levelup-name"
          className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(26,26,46,0.92)", backdropFilter: "blur(12px)" }}
            onClick={dismissLevelUp}
          />

          {/* Radial glow */}
          {!prefersReduced && (
            <motion.div
              className="absolute pointer-events-none"
              style={{
                width: "100%",
                height: "100%",
                background: `radial-gradient(ellipse 60% 50% at 50% 45%, ${levelUpEvent.levelColor}30 0%, transparent 70%)`,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.08, duration: 0.4 }}
            />
          )}

          {/* Particles */}
          {!prefersReduced && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 14 }).map((_, i) => (
                <Particle key={i} index={i} color={levelUpEvent.levelColor} />
              ))}
            </div>
          )}

          {/* Card */}
          <motion.div
            className="relative w-full max-w-[480px] rounded-3xl overflow-hidden"
            style={{
              background: "rgba(26,26,46,0.85)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
            }}
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.88, y: 16 }}
            animate={prefersReduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: -12 }}
            transition={prefersReduced
              ? { duration: 0.2 }
              : { type: "spring", stiffness: 260, damping: 22, delay: 0.2 }
            }
          >
            {/* × close */}
            <motion.button
              className="absolute top-4 right-4 h-9 w-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors z-10"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
              onClick={dismissLevelUp}
              aria-label="Fechar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.2 }}
            >
              <X className="h-4 w-4" />
            </motion.button>

            <div className="px-10 pt-12 pb-9 flex flex-col items-center text-center">
              {/* Medallion with burst rings */}
              <div className="relative mb-6">
                {!prefersReduced && (
                  <>
                    <BurstRing color={levelUpEvent.levelColor} delay={0.34} />
                    <BurstRing color={levelUpEvent.levelColor} delay={0.54} />
                  </>
                )}
                <motion.div
                  className="relative h-24 w-24 rounded-full flex items-center justify-center"
                  style={{
                    background: `radial-gradient(circle at 40% 35%, ${levelUpEvent.levelColor}cc, ${levelUpEvent.levelColor}66)`,
                    border: "3px solid rgba(255,255,255,0.2)",
                    boxShadow: `0 0 0 6px ${levelUpEvent.levelColor}26, 0 0 32px ${levelUpEvent.levelColor}66`,
                  }}
                  initial={prefersReduced ? { opacity: 0 } : { scale: 0 }}
                  animate={prefersReduced ? { opacity: 1 } : { scale: [0, 1.08, 1] }}
                  transition={prefersReduced
                    ? { duration: 0.2, delay: 0.68 }
                    : { type: "spring", stiffness: 300, damping: 18, delay: 0.68 }
                  }
                >
                  <motion.span
                    className="font-display font-black text-white text-4xl leading-none"
                    animate={prefersReduced ? {} : { scale: [1, 1.03, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {levelUpEvent.newLevel}
                  </motion.span>
                </motion.div>
              </div>

              <motion.div
                variants={staggerChildren}
                initial="hidden"
                animate="show"
                className="w-full flex flex-col items-center gap-0"
              >
                {/* Eyebrow */}
                <motion.p
                  variants={fadeUp}
                  className="text-[11px] font-medium tracking-[0.2em] uppercase mb-2"
                  style={{ color: "#4ECDC4" }}
                >
                  Nível Alcançado
                </motion.p>

                {/* Level name */}
                <motion.h2
                  id="levelup-name"
                  variants={fadeUp}
                  className="font-display font-bold text-3xl mb-5"
                  style={{
                    color: levelUpEvent.levelColor,
                    textShadow: levelUpEvent.newLevel >= 6
                      ? `0 0 24px ${levelUpEvent.levelColor}99`
                      : undefined,
                  }}
                >
                  {levelUpEvent.levelName}
                </motion.h2>

                {/* Divider */}
                <motion.div
                  className="mb-5"
                  style={{ height: 1, backgroundColor: "rgba(255,255,255,0.12)" }}
                  initial={{ width: 0 }}
                  animate={{ width: 40 }}
                  transition={{ delay: 1.2, duration: 0.25 }}
                />

                {/* Benefit block */}
                <motion.div
                  variants={fadeUp}
                  className="w-full rounded-xl px-4 py-3 mb-8 text-left"
                  style={{
                    background: "rgba(78,205,196,0.08)",
                    border: "1px solid rgba(78,205,196,0.2)",
                  }}
                >
                  <p
                    className="text-[10px] font-medium tracking-[0.15em] uppercase mb-1.5"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    Novo Benefício
                  </p>
                  <p
                    className="text-sm leading-relaxed line-clamp-2"
                    style={{ color: "rgba(255,255,255,0.85)" }}
                  >
                    {levelUpEvent.benefit}
                  </p>
                </motion.div>

                {/* CTA */}
                <motion.button
                  variants={fadeUp}
                  className="w-full h-12 rounded-xl font-semibold text-white text-sm transition-all active:scale-[0.98]"
                  style={{
                    background: levelUpEvent.levelColor,
                    boxShadow: `0 4px 20px ${levelUpEvent.levelColor}40`,
                  }}
                  whileHover={{ filter: "brightness(1.1)" }}
                  onClick={dismissLevelUp}
                >
                  Continuar
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
