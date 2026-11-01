import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/** Full-screen "BREAKING NEWS" takeover when the news drops; it clears itself after about three seconds. */
export function BreakingNewsFlash({ title }: { title: string }) {
  const [done, setDone] = useState(false)
  // Matches the 3.4 s CSS animation; a timer, because background tabs may never fire animationend.
  useEffect(() => {
    const t = setTimeout(() => setDone(true), 3400)
    return () => clearTimeout(t)
  }, [])
  if (done) return null
  const ticker = `BREAKING NEWS · ${title.toUpperCase()} · `
  // Portal to <body> so no transformed ancestor can shrink the fixed overlay.
  return createPortal(
    <div
      className="news-flash fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-red-600 text-white"
      onClick={() => setDone(true)}
      role="alert"
    >
      <p className="news-pop text-[clamp(2.5rem,9vw,8rem)] font-black leading-none tracking-tight">BREAKING NEWS</p>
      <p className="news-pop mt-4 px-6 text-center text-[clamp(1.25rem,3.5vw,3rem)] font-bold" style={{ animationDelay: '250ms' }}>
        {title}
      </p>
      <div className="absolute inset-x-0 bottom-0 overflow-hidden bg-white py-3 font-black text-red-600">
        <div className="news-ticker whitespace-nowrap text-2xl" aria-hidden>
          {ticker.repeat(8)}
        </div>
      </div>
    </div>,
    document.body,
  )
}
