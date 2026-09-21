import { useMemo } from 'react'
import type { Node } from 'reactflow'

import type { GraphApiEdge, GraphApiNode, GraphNodeData } from '../types/graph'
import { getTypeMeta } from '../lib/nodeMeta'
import { CloseIcon, LinkIcon, TargetIcon } from './icons'

interface NodeInspectorProps {
  selectedNode: Node<GraphNodeData> | null
  graphNodes: GraphApiNode[]
  graphEdges: GraphApiEdge[]
  onNavigateToNode: (nodeId: string) => void
  onCenter: () => void
  onHighlight: () => void
  onClose: () => void
}

interface Relationship {
  nodeId: string
  label: string
  type: string
  relation: string
}

const DESCRIPTION_KEYS = ['description', 'docstring', 'summary', 'doc']

const extractDescription = (metadata?: Record<string, unknown>): string | null => {
  if (!metadata) return null
  for (const key of DESCRIPTION_KEYS) {
    const value = metadata[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

const NodeInspector = ({
  selectedNode,
  graphNodes,
  graphEdges,
  onNavigateToNode,
  onCenter,
  onHighlight,
  onClose,
}: NodeInspectorProps) => {
  const labelById = useMemo(() => {
    const map = new Map<string, GraphApiNode>()
    for (const node of graphNodes) map.set(node.id, node)
    return map
  }, [graphNodes])

  const { incoming, outgoing } = useMemo(() => {
    const inc: Relationship[] = []
    const out: Relationship[] = []
    if (!selectedNode) return { incoming: inc, outgoing: out }
    for (const edge of graphEdges) {
      if (edge.source === selectedNode.id) {
        const target = labelById.get(edge.target)
        out.push({ nodeId: edge.target, label: target?.label ?? edge.target, type: target?.type ?? 'Module', relation: edge.type })
      }
      if (edge.target === selectedNode.id) {
        const source = labelById.get(edge.source)
        inc.push({ nodeId: edge.source, label: source?.label ?? edge.source, type: source?.type ?? 'Module', relation: edge.type })
      }
    }
    return { incoming: inc, outgoing: out }
  }, [graphEdges, labelById, selectedNode])

  if (!selectedNode) return null

  const { accent } = getTypeMeta(selectedNode.data.type)
  const description = extractDescription(selectedNode.data.metadata)
  const extraMetadata = Object.fromEntries(
    Object.entries(selectedNode.data.metadata ?? {}).filter(([key]) => !DESCRIPTION_KEYS.includes(key)),
  )
  const hasExtraMetadata = Object.keys(extraMetadata).length > 0

  const renderRelationship = (item: Relationship, key: string) => {
    const meta = getTypeMeta(item.type)
    return (
      <li key={key}>
        <button
          type="button"
          onClick={() => onNavigateToNode(item.nodeId)}
          className="flex w-full items-center gap-2 rounded-md border border-border bg-raised px-2 py-1.5 text-left transition hover:border-border-strong"
        >
          <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ backgroundColor: meta.accent }} />
          <span className="min-w-0 flex-1 truncate text-[13px] text-content-primary">{item.label}</span>
          <span className="flex-none text-[10px] uppercase tracking-wide text-content-muted">{item.relation}</span>
        </button>
      </li>
    )
  }

  return (
    <aside className="flex h-full flex-col overflow-hidden border-l border-border bg-panel">
      <header className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 flex-none rounded-sm" style={{ backgroundColor: accent }} />
            <h2 className="truncate text-sm font-semibold text-content-primary">{selectedNode.data.label}</h2>
          </div>
          <p className="mt-0.5 text-[11px] uppercase tracking-wide text-content-muted">{selectedNode.data.type}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close inspector"
          className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-md border border-border text-content-secondary transition hover:border-border-strong hover:text-content-primary"
        >
          <CloseIcon className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="flex gap-2 border-b border-border px-4 py-2.5">
        <button
          type="button"
          onClick={onCenter}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-raised px-2 py-1.5 text-[11px] font-medium text-content-secondary transition hover:border-border-strong hover:text-content-primary"
        >
          <TargetIcon className="h-3.5 w-3.5" /> Center
        </button>
        <button
          type="button"
          onClick={onHighlight}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-raised px-2 py-1.5 text-[11px] font-medium text-content-secondary transition hover:border-border-strong hover:text-content-primary"
        >
          <LinkIcon className="h-3.5 w-3.5" /> Highlight
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
        {selectedNode.data.filePath ? (
          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-content-muted">Source</h3>
            <p className="mt-1 break-all rounded-md border border-border bg-raised px-2 py-1.5 font-mono text-[11px] text-content-secondary">
              {selectedNode.data.filePath}
            </p>
          </section>
        ) : null}

        {description ? (
          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-content-muted">Description</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-content-secondary">{description}</p>
          </section>
        ) : null}

        <section className="grid grid-cols-2 gap-2">
          <div className="rounded-md border border-border bg-raised px-3 py-2">
            <p className="text-lg font-semibold text-content-primary">{incoming.length}</p>
            <p className="text-[10px] uppercase tracking-wide text-content-muted">Incoming</p>
          </div>
          <div className="rounded-md border border-border bg-raised px-3 py-2">
            <p className="text-lg font-semibold text-content-primary">{outgoing.length}</p>
            <p className="text-[10px] uppercase tracking-wide text-content-muted">Outgoing</p>
          </div>
        </section>

        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-content-muted">Outgoing dependencies</h3>
          <ul className="mt-1.5 space-y-1">
            {outgoing.length === 0 ? (
              <li className="text-[12px] text-content-muted">None</li>
            ) : (
              outgoing.map((item, index) => renderRelationship(item, `out-${item.nodeId}-${index}`))
            )}
          </ul>
        </section>

        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-content-muted">Incoming references</h3>
          <ul className="mt-1.5 space-y-1">
            {incoming.length === 0 ? (
              <li className="text-[12px] text-content-muted">None</li>
            ) : (
              incoming.map((item, index) => renderRelationship(item, `in-${item.nodeId}-${index}`))
            )}
          </ul>
        </section>

        {hasExtraMetadata ? (
          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-content-muted">Metadata</h3>
            <pre className="mt-1.5 max-h-48 overflow-auto rounded-md border border-border bg-canvas p-2 text-[11px] text-content-secondary">
              {JSON.stringify(extraMetadata, null, 2)}
            </pre>
          </section>
        ) : null}
      </div>
    </aside>
  )
}

export default NodeInspector
