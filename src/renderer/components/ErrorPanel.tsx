interface ErrorPanelProps {
  message: string
  visible: boolean
}

export function ErrorPanel({ message, visible }: ErrorPanelProps) {
  if (!visible) return null

  return (
    <div className="error-panel visible flex items-center gap-6 p-6 bg-red-500/10 border border-red-500/30 rounded-xl mt-6 animate-shake">
      <div className="shrink-0 w-6 h-6">
        <svg className="w-6 h-6 text-red-500 animate-pulse-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-red-500 mb-1">Connection Issue</h3>
        <p className="font-mono text-xs text-slate-400">{message}</p>
      </div>
    </div>
  )
}
