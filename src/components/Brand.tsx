import { useState } from 'react'

/**
 * Drop the official logo at public/brand/lufthansa-logo.svg (or .png, adjust LOGO_SRC).
 * Until the file exists, a text wordmark is shown instead.
 */
const LOGO_SRC = '/brand/lufthansa-logo.svg'

export function Brand({ size = 'md', subtitle = 'CFO Office' }: { size?: 'sm' | 'md' | 'lg'; subtitle?: string }) {
  const [hasLogo, setHasLogo] = useState(true)
  const logoSize = { sm: 'h-7 w-7', md: 'h-9 w-9', lg: 'h-14 w-14' }[size]
  const text = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl' }[size]

  return (
    <div className="flex items-center gap-3">
      {hasLogo && (
        <img src={LOGO_SRC} alt="Lufthansa" className={`${logoSize} shrink-0 object-contain`} onError={() => setHasLogo(false)} />
      )}
      <div className="leading-tight">
        <p className={`${text} font-semibold tracking-tight text-white`}>Lufthansa</p>
        {subtitle && <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-gold">{subtitle}</p>}
      </div>
    </div>
  )
}

export function Disclaimer({ className = '' }: { className?: string }) {
  return (
    <p className={`text-xs ${className}`}>
      Teaching case for RFMP (EBC2055). Figures adjusted for teaching. Not affiliated with Deutsche Lufthansa AG.
    </p>
  )
}
