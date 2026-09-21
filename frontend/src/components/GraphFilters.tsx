import { getTypeMeta } from '../lib/nodeMeta'

interface GraphFiltersProps {
  availableTypes: string[]
  availableEdgeTypes: string[]
  typeCounts: Record<string, number>
  edgeCounts: Record<string, number>
  hiddenTypes: Set<string>
  hiddenEdgeTypes: Set<string>
  onToggleType: (type: string) => void
  onToggleEdgeType: (type: string) => void
}

const GraphFilters = ({
  availableTypes,
  availableEdgeTypes,
  typeCounts,
  edgeCounts,
  hiddenTypes,
  hiddenEdgeTypes,
  onToggleType,
  onToggleEdgeType,
}: GraphFiltersProps) => (
  <div className="space-y-5">
    {availableTypes.length > 0 ? (
      <section>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-content-muted">Node types</h3>
        <div className="space-y-1">
          {availableTypes.map((type) => {
            const meta = getTypeMeta(type)
            const active = !hiddenTypes.has(type)
            return (
              <button
                key={type}
                type="button"
                onClick={() => onToggleType(type)}
                aria-pressed={active}
                className={[
                  'flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-[13px] transition',
                  active
                    ? 'border-border bg-raised text-content-primary'
                    : 'border-transparent bg-transparent text-content-muted hover:bg-raised/60',
                ].join(' ')}
              >
                <span
                  className="h-2 w-2 flex-none rounded-sm"
                  style={{ backgroundColor: active ? meta.accent : '#3a4150' }}
                />
                <span className="flex-1 text-left">{type}</span>
                <span className="text-[11px] text-content-muted">{typeCounts[type] ?? 0}</span>
              </button>
            )
          })}
        </div>
      </section>
    ) : null}

    {availableEdgeTypes.length > 0 ? (
      <section>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-content-muted">Relationships</h3>
        <div className="flex flex-wrap gap-1.5">
          {availableEdgeTypes.map((type) => {
            const active = !hiddenEdgeTypes.has(type)
            return (
              <button
                key={type}
                type="button"
                onClick={() => onToggleEdgeType(type)}
                aria-pressed={active}
                className={[
                  'rounded border px-1.5 py-0.5 text-[11px] transition',
                  active
                    ? 'border-accent/50 bg-accent-soft text-content-primary'
                    : 'border-border bg-raised text-content-muted hover:text-content-secondary',
                ].join(' ')}
              >
                {type}
                <span className="ml-1 text-content-muted">{edgeCounts[type] ?? 0}</span>
              </button>
            )
          })}
        </div>
      </section>
    ) : null}
  </div>
)

export default GraphFilters
