import { useCountdown } from '../hooks/useCountdown'

interface ProgressBarProps {
  label: string
  value: number
  windowLabel: string
  resetTime: string | null | undefined
  variant?: 'claude' | 'codex' | 'codex-secondary' | 'cursor' | 'cursor-secondary'
  showGlow?: boolean
}

export function ProgressBar({
  label,
  value,
  windowLabel,
  resetTime,
  variant = 'claude',
  showGlow = false
}: ProgressBarProps) {
  const countdown = useCountdown(resetTime)

  const gradientClass = variant === 'codex'
    ? 'from-emerald-400 to-lime-400'
    : variant === 'codex-secondary'
    ? 'from-sky-500 to-teal-400'
    : variant === 'cursor'
    ? 'from-orange-400 to-amber-400'
    : variant === 'cursor-secondary'
    ? 'from-rose-400 to-orange-400'
    : 'from-accent-1 via-accent-2 to-accent-3'

  const shadowClass = variant === 'codex'
    ? 'shadow-[0_0_12px_rgba(52,211,153,0.4)]'
    : variant === 'codex-secondary'
    ? 'shadow-[0_0_12px_rgba(56,189,248,0.35)]'
    : variant === 'cursor'
    ? 'shadow-[0_0_12px_rgba(251,146,60,0.4)]'
    : variant === 'cursor-secondary'
    ? 'shadow-[0_0_12px_rgba(251,113,133,0.35)]'
    : 'shadow-[0_0_12px_rgba(102,126,234,0.35)]'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-medium text-white">{label}</span>
        <span className="model-value font-mono text-sm text-slate-400">{value}%</span>
      </div>
      <div className={`${showGlow ? 'relative' : ''} h-2 bg-white/5 rounded-full overflow-hidden`}>
        <div
          className={`${showGlow ? 'linear-fill absolute left-0 top-0 bottom-0' : 'model-fill h-full'} rounded-full bg-gradient-to-r ${gradientClass} ${shadowClass} transition-all duration-1000 ease-out`}
          style={{ width: `${value}%` }}
        />
        {showGlow && (
          <div
            className={`linear-glow absolute left-0 -top-1 -bottom-1 bg-gradient-to-r ${gradientClass} rounded-full blur-lg opacity-40 transition-all duration-1000 ease-out`}
            style={{ width: `${value}%` }}
          />
        )}
      </div>
      <div className="flex justify-between mt-1">
        <span className="font-mono text-[10px] text-slate-500">{windowLabel}</span>
        <span className="font-mono text-[10px] text-slate-500">{countdown}</span>
      </div>
    </div>
  )
}
