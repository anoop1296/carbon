'use client';
import { useEffect, useCallback, useState } from 'react';

export function useThemeParallax() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // On mount: read saved preference or system preference
  useEffect(() => {
    const saved = localStorage.getItem('cw-theme') as 'light' | 'dark' | null;
    const preferred = saved ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(preferred);
    document.documentElement.setAttribute('data-theme', preferred);
  }, []);

  // Toggle
  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('cw-theme', next);
      return next;
    });
  }, []);

  // Parallax mouse tracking
  useEffect(() => {
    const orbs = document.querySelectorAll<HTMLElement>('.orb');
    if (orbs.length === 0) return;

    const depths = [0.025, 0.018, 0.012, 0.020]; // movement factor per orb

    const handleMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;

      orbs.forEach((orb, i) => {
        const d = depths[i] ?? 0.015;
        orb.style.transform = `translate(${dx * d}px, ${dy * d}px)`;
      });
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return { theme, toggleTheme };
}

/* ─────────────────────────────────────────────────────────────
   JSX to add to your layout — insert BEFORE .dashboard-container
   (paste this into your layout.tsx or page.tsx)
─────────────────────────────────────────────────────────────

import { useThemeParallax } from '@/lib/useThemeParallax';

// Inside component:
const { theme, toggleTheme } = useThemeParallax();

// In JSX, as first child of your root:
<div className="parallax-scene">
  <div className="parallax-grid" />
  <div className="orb orb-1" />
  <div className="orb orb-2" />
  <div className="orb orb-3" />
  <div className="orb orb-4" />
</div>

// Theme toggle button (place in .topbar-right):
<button className="theme-toggle" onClick={toggleTheme}>
  <span className="theme-toggle-icon">{theme === 'dark' ? '☀' : '◑'}</span>
  {theme === 'dark' ? 'Light' : 'Dark'}
</button>

*/