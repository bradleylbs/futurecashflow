'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const isDark = (theme ?? resolvedTheme) === 'dark'

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={[
        'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        'bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground',
        className,
      ].join(' ')}
    >
      <span className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: isDark ? 'var(--brand-blue)' : '#2D2D2D' }}
      />
      {isDark ? 'Dark' : 'Light'}
    </button>
  )
}

