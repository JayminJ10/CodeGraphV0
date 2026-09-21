import type { GraphApiNode } from '../types/graph'
import GraphFilters from './GraphFilters'
import GraphSearch from './GraphSearch'
import { ChevronIcon } from './icons'

interface GraphSidebarProps {
  graphNodes: GraphApiNode[]
  totalNodes: number
  totalEdges: number
  visibleNodes: number
  availableTypes: string[]
  availableEdgeTypes: string[]
  typeCounts: Record<string, number>
  edgeCounts: Record<string, number>
  hiddenTypes: Set<string>
  hiddenEdgeTypes: Set<string>
  onToggleType: (type: string) => void
  onToggleEdgeType: (type: string) => void
  onSearchSelect: (nodeId: string) => void
  onCollapse: () => void
}

const OverviewStat = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-md border border-border bg-raised px-2.5 py-2">
    <p className="text-base font-semibold text-content-primary">{value}</p>
    <p className="text-[10px] uppercase tracking-wide text-content-muted">{label}</p>
  </div>
)

const GraphSidebar = ({
  graphNodes,
  totalNodes,
  totalEdges,
  visibleNodes,
  availableTypes,
  availableEdgeTypes,
  typeCounts,
  edgeCounts,
  hiddenTypes,
  hiddenEdgeTypes,
  onToggleType,
  onToggleEdgeType,
  onSearchSelect,
  onCollapse,
}: GraphSidebarProps) => (
  <aside className="flex h-full w-full flex-col overflow-hidden border-r border-border bg-panel">
    <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-content-secondary">Explorer</h2>
      <button
        type="button"
        onClick={onCollapse}
        aria-label="Collapse sidebar"
        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border text-content-secondary transition hover:border-border-strong hover:text-content-primary"
      >
        <ChevronIcon direction="left" className="h-3.5 w-3.5" />
      </button>
    </div>

    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-3">
      <section>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-content-muted">Overview</h3>
        <div className="grid grid-cols-3 gap-2">
          <OverviewStat label="Nodes" value={totalNodes} />
          <OverviewStat label="Edges" value={totalEdges} />
          <OverviewStat label="Visible" value={visibleNodes} />
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-content-muted">Search</h3>
        <GraphSearch graphNodes={graphNodes} onSelect={onSearchSelect} />
      </section>

      <GraphFilters
        availableTypes={availableTypes}
        availableEdgeTypes={availableEdgeTypes}
        typeCounts={typeCounts}
        edgeCounts={edgeCounts}
        hiddenTypes={hiddenTypes}
        hiddenEdgeTypes={hiddenEdgeTypes}
        onToggleType={onToggleType}
        onToggleEdgeType={onToggleEdgeType}
      />
    </div>
  </aside>
)

export default GraphSidebar
