interface StatusIndicatorProps {
  status: string
  text: string
  className?: string
}

export function StatusIndicator({ status, text, className = '' }: StatusIndicatorProps) {
  const baseClasses = 'status-indicator flex items-center gap-2 px-3 py-1 bg-white/[0.03] border border-white/[0.08] rounded-full'

  return (
    <div className={`${baseClasses} ${status} ${className}`}>
      <span className="status-dot w-2 h-2 rounded-full bg-slate-500 animate-blink"></span>
      <span className="status-text font-mono text-xs text-slate-400 uppercase tracking-wider">{text}</span>
    </div>
  )
}
