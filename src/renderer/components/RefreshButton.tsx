interface RefreshButtonProps {
  onClick: () => void
  isRefreshing: boolean
}

export function RefreshButton({ onClick, isRefreshing }: RefreshButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isRefreshing}
      className="p-1 rounded-md hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title="Refresh"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`text-slate-400 hover:text-slate-300 ${isRefreshing ? 'animate-spin' : ''}`}
      >
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
      </svg>
    </button>
  )
}
