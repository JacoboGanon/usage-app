import { usePollingProgress } from '../hooks/usePollingProgress'

interface FooterProps {
  pollStartTime: number
  pollIntervalMs: number
}

export function Footer({ pollStartTime, pollIntervalMs }: FooterProps) {
  const progress = usePollingProgress(pollStartTime, pollIntervalMs)
  const intervalSeconds = Number.isFinite(pollIntervalMs) ? Math.round(pollIntervalMs / 1000) : 30

  return (
    <footer className="flex flex-col items-center gap-2 pt-8 mt-auto">
      <div className="w-[200px] h-[3px] bg-white/10 rounded-full overflow-hidden">
        <div
          className="poll-progress h-full bg-gradient-to-r from-accent-1 via-accent-2 to-accent-3 rounded-full transition-[width] duration-100 linear"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">
        Auto-refresh every {intervalSeconds}s
      </span>
    </footer>
  )
}
