'use client';

import { motion } from 'framer-motion';

/**
 * HeroScene — paper airplane following a dashed flight path.
 *
 * The trail traces an arc across the canvas. The airplane sits at the end of
 * the trail and gently floats up/down to suggest flight. A subtle starting
 * point anchors the bottom-left.
 */
export function HeroScene({ className = '' }: { className?: string }) {
  return (
    <div className={`relative w-full ${className}`}>
      <svg
        viewBox="0 0 500 500"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        aria-hidden="true"
      >
        {/* Subtle warm halo behind the trajectory */}
        <motion.circle
          cx="350"
          cy="180"
          r="140"
          fill="#F5BE25"
          fillOpacity="0.06"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
        />
        <motion.circle
          cx="120"
          cy="340"
          r="100"
          fill="#7458E8"
          fillOpacity="0.05"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.4, delay: 0.1, ease: 'easeOut' }}
        />

        {/* Soft trail behind the dotted path — gives the plane a "breath".
            A double-curve makes the trajectory more playful than a straight arc. */}
        <motion.path
          d="M 80 400 C 160 380 220 320 240 270 C 260 220 320 200 360 210 C 390 218 400 195 410 170"
          stroke="#D2C6FF"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.28 }}
          transition={{ duration: 1.8, ease: 'easeOut', delay: 0.2 }}
        />

        {/* Dotted flight path — perfect dots instead of dashes for a lighter, airier feel */}
        <motion.path
          d="M 80 400 C 160 380 220 320 240 270 C 260 220 320 200 360 210 C 390 218 400 195 410 170"
          stroke="#7458E8"
          strokeWidth="3"
          fill="none"
          strokeDasharray="0.1 10"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.85 }}
          transition={{ duration: 2.0, ease: 'easeOut', delay: 0.3 }}
        />

        {/* Starting point — lavender pulse */}
        <motion.g
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.1 }}
        >
          <circle cx="80" cy="400" r="22" fill="#7458E8" fillOpacity="0.14" />
          <circle cx="80" cy="400" r="10" fill="#7458E8" />
          <circle cx="80" cy="400" r="4" fill="#FBF8F2" />
        </motion.g>

        {/* Sparkle accents along the journey */}
        <motion.circle
          cx="180"
          cy="320"
          r="2.5"
          fill="#F5BE25"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.5, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: 1.6 }}
        />
        <motion.circle
          cx="330"
          cy="240"
          r="2"
          fill="#7458E8"
          fillOpacity="0.6"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.8, 0.3, 0.8] }}
          transition={{ duration: 2.6, repeat: Infinity, delay: 2.0 }}
        />

        {/* Paper airplane — anchored at end of trail, gentle float */}
        <motion.g
          initial={{ opacity: 0, x: -30, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.8 }}
        >
          <motion.g
            animate={{
              y: [0, -8, 0],
              rotate: [0, -2, 0, 2, 0],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{ transformOrigin: '410px 170px' }}
          >
            {/* Slight rotation to face the trajectory direction */}
            <g transform="translate(410, 170) rotate(-22)">
              {/* Soft shadow under plane */}
              <ellipse cx="0" cy="22" rx="40" ry="3" fill="#2C2620" fillOpacity="0.08" />

              {/* Plane body — two folded triangles */}
              <path
                d="M -42 0 L 52 -22 L 28 0 L 52 22 Z"
                fill="#FFFFFF"
                stroke="#2C2620"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              {/* Center crease */}
              <path
                d="M -42 0 L 28 0"
                stroke="#2C2620"
                strokeWidth="1.2"
                fill="none"
              />
              {/* Inner wing fold */}
              <path
                d="M 52 -22 L 28 0 L 52 22"
                stroke="#2C2620"
                strokeWidth="1.2"
                fill="none"
                strokeLinejoin="round"
              />
              {/* Soft fold lines on the tail */}
              <path
                d="M -42 0 L -22 -8 M -42 0 L -25 0 M -42 0 L -22 8"
                stroke="#2C2620"
                strokeWidth="0.8"
                fill="none"
                opacity="0.5"
              />
            </g>
          </motion.g>
        </motion.g>
      </svg>
    </div>
  );
}

/** Small inline illustration used in testimonials / footer */
export function MiniTraveler({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="#F5EFE3" />
        <path d="M 14 50 Q 32 38 50 22" stroke="#7458E8" strokeWidth="1.5" fill="none" strokeDasharray="3 4" strokeLinecap="round" />
        <g transform="translate(50, 22) rotate(-22)">
          <path d="M -10 0 L 12 -5 L 7 0 L 12 5 Z" fill="#FFFFFF" stroke="#2C2620" strokeWidth="1" strokeLinejoin="round" />
          <path d="M -10 0 L 7 0" stroke="#2C2620" strokeWidth="0.8" />
        </g>
        <circle cx="14" cy="50" r="3" fill="#7458E8" />
      </svg>
    </div>
  );
}
