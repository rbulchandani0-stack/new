import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export const HeroBackground: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  // Static fallback for reduced motion
  if (prefersReducedMotion) {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#121212] to-[#0A0A0A]" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00C853]/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00C853]/5 rounded-full blur-[100px]" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl z-0 bg-[#0A0A0A]">
      {/* Deep Space Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#121212] via-[#0A0A0A] to-[#050505] opacity-90" />
      
      {/* Ambient Glow Orbs */}
      <motion.div
        className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-[#00C853]/10 rounded-full blur-[120px]"
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-32 -right-32 w-[600px] h-[600px] bg-[#00C853]/5 rounded-full blur-[150px]"
        animate={{
          x: [0, -40, 0],
          y: [0, -50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {/* Subtle Futuristic Grid */}
      <motion.div 
        className="absolute inset-0 w-[200%] h-[200%] opacity-[0.03]"
        initial={{ y: 0, x: 0 }}
        animate={{ y: "-50%", x: "-50%" }}
        transition={{ duration: 120, ease: "linear", repeat: Infinity }}
      >
        <svg width="100%" height="100%" className="absolute inset-0">
          <pattern id="premium-grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#FFFFFF" strokeWidth="0.5" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#premium-grid)" />
        </svg>
      </motion.div>

      {/* Elegant Flowing Light Streaks */}
      <div className="absolute inset-0 opacity-20">
        <motion.div
          className="absolute h-[1px] w-[300px] bg-gradient-to-r from-transparent via-[#00C853] to-transparent blur-[1px]"
          initial={{ x: "-100%", y: "30%", opacity: 0 }}
          animate={{ x: "200%", opacity: [0, 1, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.div
          className="absolute h-[1px] w-[400px] bg-gradient-to-r from-transparent via-[#00C853] to-transparent blur-[1px]"
          initial={{ x: "-100%", y: "60%", opacity: 0 }}
          animate={{ x: "200%", opacity: [0, 0.8, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        />
        <motion.div
          className="absolute h-[1px] w-[250px] bg-gradient-to-r from-transparent via-[#00C853] to-transparent blur-[1px]"
          initial={{ x: "-100%", y: "80%", opacity: 0 }}
          animate={{ x: "200%", opacity: [0, 0.6, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 7 }}
        />
      </div>

      {/* Subtle Floating Financial Particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-[#00C853]"
          style={{
            width: Math.random() * 2 + 1 + "px",
            height: Math.random() * 2 + 1 + "px",
          }}
          initial={{
            x: Math.random() * 100 + "%",
            y: Math.random() * 100 + "%",
            opacity: Math.random() * 0.3 + 0.1,
          }}
          animate={{
            y: [null, Math.random() * 100 + "%"],
            x: [null, Math.random() * 100 + "%"],
            opacity: [0.1, 0.5, 0.1]
          }}
          transition={{
            duration: Math.random() * 30 + 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      ))}
      
      {/* Vignette Overlay for Depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_#050505_120%)] opacity-80" />
    </div>
  );
};
