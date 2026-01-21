interface TrackingSettings {
  claude: boolean
  codex: boolean
  cursor: boolean
}

interface SettingsPanelProps {
  tracking: TrackingSettings
  pollIntervalMs: number
  cursorToken: string
  onTrackingChange: (next: TrackingSettings) => void
  onPollIntervalChange: (nextPollIntervalMs: number) => void
  onCursorTokenChange: (token: string) => void
}

export function SettingsPanel({
  tracking,
  pollIntervalMs,
  cursorToken,
  onTrackingChange,
  onPollIntervalChange,
  onCursorTokenChange
}: SettingsPanelProps) {
  const pollIntervalSeconds = Math.round(pollIntervalMs / 1000)

  return (
    <section className="usage-card animate-scale-in">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-white tracking-tight">Settings</h2>
          <p className="text-sm text-slate-400">Choose what to track and how often to refresh.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold text-white uppercase tracking-[0.2em]">Tracking</h3>
          <div className="mt-4 flex flex-col gap-3 text-sm text-slate-300">
            <label className="flex items-center justify-between gap-4">
              <span>Claude usage</span>
              <input
                type="checkbox"
                checked={tracking.claude}
                onChange={(event) => onTrackingChange({ ...tracking, claude: event.target.checked })}
                className="h-4 w-4 accent-[var(--color-accent-1)]"
              />
            </label>
            <label className="flex items-center justify-between gap-4">
              <span>Codex usage</span>
              <input
                type="checkbox"
                checked={tracking.codex}
                onChange={(event) => onTrackingChange({ ...tracking, codex: event.target.checked })}
                className="h-4 w-4 accent-[var(--color-accent-2)]"
              />
            </label>
            <label className="flex items-center justify-between gap-4">
              <span>Cursor usage</span>
              <input
                type="checkbox"
                checked={tracking.cursor}
                onChange={(event) => onTrackingChange({ ...tracking, cursor: event.target.checked })}
                className="h-4 w-4 accent-[#f97316]"
              />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold text-white uppercase tracking-[0.2em]">Cursor Token</h3>
          <div className="mt-4 flex flex-col gap-2 text-sm text-slate-300">
            <input
              type="password"
              placeholder="WorkosCursorSessionToken"
              value={cursorToken}
              onChange={(event) => onCursorTokenChange(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 font-mono text-sm text-white placeholder:text-slate-600 focus:border-orange-500/50 focus:outline-none"
            />
            <p className="text-xs text-slate-500">
              Get this from browser cookies at cursor.com (WorkosCursorSessionToken).
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold text-white uppercase tracking-[0.2em]">Refresh rate</h3>
          <div className="mt-4 flex flex-col gap-2 text-sm text-slate-300">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="number"
                min={5}
                max={300}
                step={5}
                value={pollIntervalSeconds}
                onChange={(event) => {
                  const nextValue = Number(event.target.value)
                  if (Number.isNaN(nextValue)) return
                  onPollIntervalChange(nextValue * 1000)
                }}
                className="w-24 rounded-lg border border-white/10 bg-transparent px-3 py-2 font-mono text-sm text-white focus:border-white/30 focus:outline-none"
              />
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">seconds</span>
            </div>
            <p className="text-xs text-slate-500">Recommended range: 5-300 seconds.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
