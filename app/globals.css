@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap');

:root {
  --font-body: 'Manrope', system-ui, sans-serif;
}

html[lang="ar"] {
  --font-body: 'Noto Naskh Arabic', system-ui, sans-serif;
}

html {
  scroll-behavior: smooth;
  -webkit-text-size-adjust: 100%;
}

body {
  font-family: var(--font-body);
  font-feature-settings: 'ss01', 'ss02', 'cv01', 'cv02';
  color: theme('colors.ink.500');
  background-color: theme('colors.cream.50');
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  position: relative;
}

/* Living background: dot grid + soft color halos.
   Sits BEHIND the page content via a ::before pseudo-element so it never
   blocks clicks. Halos use lavender and butter from the brand palette. */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-color: theme('colors.cream.50');
  background-image:
    radial-gradient(circle at 12% 18%, rgba(116, 88, 232, 0.11) 0%, transparent 38%),
    radial-gradient(circle at 90% 12%, rgba(245, 190, 37, 0.14) 0%, transparent 40%),
    radial-gradient(circle at 78% 88%, rgba(116, 88, 232, 0.09) 0%, transparent 42%),
    radial-gradient(rgba(44, 38, 32, 0.075) 0.8px, transparent 0.8px);
  background-size: auto, auto, auto, 24px 24px;
  background-position: 0 0, 0 0, 0 0, 0 0;
  mask-image: radial-gradient(ellipse 85% 65% at 50% 40%, black 30%, transparent 95%);
  -webkit-mask-image: radial-gradient(ellipse 85% 65% at 50% 40%, black 30%, transparent 95%);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-body);
  font-weight: 700;
  letter-spacing: -0.022em;
  color: theme('colors.ink.600');
}

h1 { letter-spacing: -0.032em; }
h2 { letter-spacing: -0.028em; }

html[lang="ar"] h1,
html[lang="ar"] h2,
html[lang="ar"] h3,
html[lang="ar"] h4 {
  letter-spacing: 0;
}

/* RTL helpers */
html[dir="rtl"] .lg\:order-1 { order: 2; }
html[dir="rtl"] .lg\:order-2 { order: 1; }
html[dir="rtl"] .rtl-flip { transform: scaleX(-1); }

::selection {
  background: theme('colors.lavender.200');
  color: theme('colors.ink.600');
}

@layer utilities {
  .text-balance { text-wrap: balance; }
  .text-pretty { text-wrap: pretty; }

  /* Editorial eyebrow label - replaces all floating pill chips */
  .eyebrow {
    font-size: 0.8125rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: theme('colors.ink.300');
    line-height: 1.4;
  }
  .eyebrow-accent {
    color: theme('colors.lavender.600');
  }

  /* Subtle backgrounds - much less "AI gradient" */
  .bg-cream-grain {
    background-color: theme('colors.cream.50');
    background-image:
      radial-gradient(rgba(42, 36, 29, 0.018) 1px, transparent 1px);
    background-size: 5px 5px;
  }

  /* Use on sections that should hide the page-level dot grid behind them
     (creates a visual "break" / breathing room between gridded sections). */
  .section-solid {
    background-color: theme('colors.cream.100');
    position: relative;
    isolation: isolate;
  }

  .section-card {
    background-color: theme('colors.cream.50');
    position: relative;
    isolation: isolate;
  }

  /* Hairline divider used between sections */
  .divider-soft {
    border-top: 1px solid theme('colors.ink.50');
  }

  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar { display: none; }

  /* Focus ring more refined */
  .focus-ring:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px theme('colors.cream.50'), 0 0 0 4px theme('colors.lavender.400');
  }

  /* Number lockup for big counters */
  .num-display {
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum', 'ss01';
    letter-spacing: -0.04em;
  }
}
