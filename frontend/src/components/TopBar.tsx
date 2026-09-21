import GraphControls from './GraphControls'
import { ChatIcon, LogoIcon } from './icons'

interface TopBarProps {
  projectName: string | null
  nodeCount: number
  edgeCount: number
  sidebarCollapsed: boolean
  inspectorOpen: boolean
  hasGraph: boolean
  chatOpen: boolean
  onFitView: () => void
  onRelayout: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onToggleSidebar: () => void
  onToggleInspector: () => void
  onToggleChat: () => void
  onOpenAnalyze: () => void
}

const Stat = ({ label, value }: { label: string; value: number }) => (
  <span className="flex items-baseline gap-1">
    <span className="font-medium text-content-primary">{value}</span>
    <span className="text-content-muted">{label}</span>
  </span>
)

const TopBar = ({
  projectName,
  nodeCount,
  edgeCount,
  sidebarCollapsed,
  inspectorOpen,
  hasGraph,
  chatOpen,
  onFitView,
  onRelayout,
  onZoomIn,
  onZoomOut,
  onToggleSidebar,
  onToggleInspector,
  onToggleChat,
  onOpenAnalyze,
}: TopBarProps) => (
  <header className="flex h-14 flex-none items-center gap-3 border-b border-border bg-panel px-3 sm:px-4">
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-soft text-accent">
        <LogoIcon className="h-4 w-4" />
      </span>
      <span className="text-sm font-semibold text-content-primary">CodeGraph</span>
    </div>

    <span className="hidden h-5 w-px bg-border sm:block" />

    <div className="hidden min-w-0 items-center gap-3 text-xs sm:flex">
      <span className="truncate text-content-secondary" title={projectName ?? undefined}>
        {projectName ?? 'No project loaded'}
      </span>
      {hasGraph ? (
        <div className="flex items-center gap-3 text-xs">
          <Stat label="nodes" value={nodeCount} />
          <Stat label="edges" value={edgeCount} />
        </div>
      ) : null}
    </div>

    <div className="ml-auto flex items-center gap-2">
      <button
        type="button"
        onClick={onOpenAnalyze}
        className="rounded-md border border-border bg-raised px-2.5 py-1.5 text-xs font-medium text-content-secondary transition hover:border-border-strong hover:text-content-primary"
      >
        Analyze
      </button>
      <GraphControls
        onFitView={onFitView}
        onRelayout={onRelayout}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onToggleSidebar={onToggleSidebar}
        onToggleInspector={onToggleInspector}
        sidebarCollapsed={sidebarCollapsed}
        inspectorOpen={inspectorOpen}
        hasGraph={hasGraph}
      />
      <span className="mx-0.5 h-5 w-px bg-border" />
      <button
        type="button"
        onClick={onToggleChat}
        aria-pressed={chatOpen}
        title="AI Assistant"
        className={[
          'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition',
          chatOpen
            ? 'border-accent/60 bg-accent-soft text-content-primary'
            : 'border-border bg-raised text-content-secondary hover:border-border-strong hover:text-content-primary',
        ].join(' ')}
      >
        <ChatIcon className="h-4 w-4" />
        <span className="hidden md:inline">Assistant</span>
      </button>
    </div>
  </header>
)

export default TopBar
