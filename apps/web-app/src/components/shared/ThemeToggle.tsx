'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  // Render the server default ('dark') until mounted so the server HTML and
  // the client's first paint are identical — prevents the theme from causing
  // a hydration mismatch for users who toggled to light mode.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const shown = mounted ? theme : 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="rounded-ds-md p-ds-2 text-[var(--content-tertiary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--content-primary)] transition-colors"
      title={shown === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={shown === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      suppressHydrationWarning
    >
      {shown === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
