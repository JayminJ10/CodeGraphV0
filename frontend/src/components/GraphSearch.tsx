import { useMemo, useState } from 'react'

import type { GraphApiNode } from '../types/graph'
import { getTypeMeta } from '../lib/nodeMeta'
import { SearchIcon } from './icons'

interface GraphSearchProps {
  graphNodes: GraphApiNode[]
  onSelect: (nodeId: string) => void
}

const MAX_RESULTS = 8

const GraphSearch = ({ graphNodes, onSelect }: GraphSearchProps) => {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return []
    return graphNodes
      .filter((node) => node.label.toLowerCase().includes(term) || (node.file_path ?? '').toLowerCase().includes(term))
      .slice(0, MAX_RESULTS)
  }, [graphNodes, query])

  const choose = (nodeId: string) => {
    onSelect(nodeId)
    setQuery('')
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-md border border-border bg-raised px-2.5 py-1.5 focus-within:border-border-strong">
        <SearchIcon className="h-3.5 w-3.5 flex-none text-content-muted" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && results[0]) choose(results[0].id)
          }}
          placeholder="Search nodes..."
          className="w-full bg-transparent text-[13px] text-content-primary placeholder:text-content-muted focus:outline-none"
        />
      </div>

      {query.trim() ? (
        <ul className="mt-1.5 max-h-64 space-y-1 overflow-y-auto rounded-md border border-border bg-raised p-1">
          {results.length === 0 ? (
            <li className="px-2 py-1.5 text-[12px] text-content-muted">No matches</li>
          ) : (
            results.map((node) => {
              const meta = getTypeMeta(node.type)
              return (
                <li key={node.id}>
                  <button
                    type="button"
                    onClick={() => choose(node.id)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition hover:bg-panel"
                  >
                    <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ backgroundColor: meta.accent }} />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-content-primary">{node.label}</span>
                    <span className="flex-none text-[10px] uppercase tracking-wide text-content-muted">{node.type}</span>
                  </button>
                </li>
              )
            })
          )}
        </ul>
      ) : null}
    </div>
  )
}

export default GraphSearch
