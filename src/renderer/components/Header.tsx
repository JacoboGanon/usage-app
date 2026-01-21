interface HeaderProps {
  isSettingsOpen: boolean
  onToggleSettings: () => void
}

export function Header({ isSettingsOpen, onToggleSettings }: HeaderProps) {
  return (
    <header className="flex justify-between items-center py-6 border-b border-white/[0.08] mb-8 animate-slide-down max-md:flex-col max-md:gap-4 max-md:text-center">
      <div className="flex items-center gap-3">
        <svg className="w-6 h-6 text-accent-1 drop-shadow-[0_0_8px_var(--color-accent-1)] animate-pulse-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-semibold bg-gradient-to-br from-accent-1 via-accent-2 to-accent-3 bg-clip-text text-transparent tracking-tight">Usage Console</h1>
          <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">Multi-provider usage</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggleSettings}
        className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-300 transition hover:border-white/30 hover:text-white"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.7l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.7-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.7.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.7 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.7.3 1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.7-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.7 1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
        </svg>
        {isSettingsOpen ? 'Back' : 'Settings'}
      </button>
    </header>
  )
}
