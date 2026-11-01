import { useEffect } from 'react'

/**
 * Sets the root font size while a page is mounted. Every Tailwind size is in rem,
 * so this scales the whole page (text, spacing, card width) in one place.
 */
export function useRootFontSize(size: string) {
  useEffect(() => {
    const root = document.documentElement
    const before = root.style.fontSize
    root.style.fontSize = size
    return () => {
      root.style.fontSize = before
    }
  }, [size])
}

/** Team screens: 16px on phones and tablets, ~20px on a 1440px laptop, up to 26px on large screens. */
export const TEAM_FONT_SIZE = 'clamp(16px, 1.1vw + 4.5px, 26px)'
