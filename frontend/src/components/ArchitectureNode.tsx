import { Handle, Position } from 'reactflow'
import type { NodeProps } from 'reactflow'

import type { GraphNodeData } from '../types/graph'
import { getTypeMeta } from '../lib/nodeMeta'

const ArchitectureNode = ({ data, selected }: NodeProps<GraphNodeData>) => {
  const nodeType = data.type || 'Module'
  const { accent, glyph } = getTypeMeta(nodeType)
  const dependencyCount = data.dependencyCount ?? 0

  return (
    <div
      className={[
        'group relative min-h-[72px] w-[224px] overflow-hidden rounded-lg border bg-raised px-3 py-2.5 transition',
        selected
          ? 'border-border-strong bg-[#1a1f2b] shadow-panel ring-1 ring-accent/60'
          : 'border-border hover:-translate-y-px hover:border-border-strong',
        data.dimmed ? 'opacity-30' : 'opacity-100',
      ].join(' ')}
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <Handle position={Position.Left} type="target" className="!h-2 !w-2 !border-0 !bg-content-muted" />

      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex h-5 w-5 flex-none items-center justify-center rounded text-[12px]"
            style={{ color: accent, backgroundColor: `${accent}1f` }}
          >
            {glyph}
          </span>
          <p className="truncate text-sm font-semibold text-content-primary">{data.label}</p>
        </div>
        <span
          className="flex-none rounded border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide"
          style={{ color: accent, borderColor: `${accent}59`, backgroundColor: `${accent}14` }}
        >
          {nodeType}
        </span>
      </div>

      {data.filePath ? (
        <p className="mt-1.5 truncate text-[11px] text-content-secondary">{data.filePath}</p>
      ) : null}

      {dependencyCount > 0 ? (
        <p className="mt-1 text-[11px] text-content-muted">
          {dependencyCount} {dependencyCount === 1 ? 'dependency' : 'dependencies'}
        </p>
      ) : null}

      <Handle position={Position.Right} type="source" className="!h-2 !w-2 !border-0 !bg-content-muted" />
    </div>
  )
}

export default ArchitectureNode
