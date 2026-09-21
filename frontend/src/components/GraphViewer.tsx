import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import dagre from 'dagre'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
} from 'reactflow'
import type { Edge, EdgeMouseHandler, Node, NodeMouseHandler, ReactFlowInstance } from 'reactflow'
import 'reactflow/dist/style.css'

import type { GraphApiEdge, GraphApiNode, GraphNodeData } from '../types/graph'
import ArchitectureNode from './ArchitectureNode'
import { getTypeMeta } from '../lib/nodeMeta'

interface GraphViewerProps {
  graphNodes: GraphApiNode[]
  graphEdges: GraphApiEdge[]
  selectedNodeId: string | null
  onNodeSelect: (node: Node<GraphNodeData> | null) => void
}

export interface GraphViewerHandle {
  fitView: () => void
  relayout: () => void
  zoomIn: () => void
  zoomOut: () => void
  focusNode: (nodeId: string) => void
}

const nodeTypes = { graphNode: ArchitectureNode }

const NODE_WIDTH = 224
const NODE_HEIGHT = 78
const FIT_PADDING = 0.18
const FOCUS_ZOOM = 1.4
const MINIMAP_THRESHOLD = 25

const EDGE_IDLE = '#3a4150'
const EDGE_ACTIVE = '#6d7cff'

const computeLayout = (
  apiNodes: GraphApiNode[],
  apiEdges: GraphApiEdge[],
): Node<GraphNodeData>[] => {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  // Left-to-right architecture flow with consistent spacing, adapted to card size.
  dagreGraph.setGraph({ rankdir: 'LR', ranksep: 100, nodesep: 50, marginx: 40, marginy: 40 })

  const nodeIds = new Set(apiNodes.map((node) => node.id))
  const degree = new Map<string, number>()
  for (const node of apiNodes) dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  for (const edge of apiEdges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue
    dagreGraph.setEdge(edge.source, edge.target)
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1)
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1)
  }
  dagre.layout(dagreGraph)

  return apiNodes.map((node) => {
    const p = dagreGraph.node(node.id) ?? { x: NODE_WIDTH / 2, y: NODE_HEIGHT / 2 }
    return {
      id: node.id,
      type: 'graphNode',
      position: { x: p.x - NODE_WIDTH / 2, y: p.y - NODE_HEIGHT / 2 },
      data: {
        label: node.label,
        type: node.type,
        filePath: node.file_path,
        metadata: node.metadata ?? {},
        dependencyCount: degree.get(node.id) ?? 0,
        highlighted: false,
        dimmed: false,
      },
      zIndex: 4,
    }
  })
}

const GraphViewer = forwardRef<GraphViewerHandle, GraphViewerProps>(
  ({ graphNodes, graphEdges, selectedNodeId, onNodeSelect }, ref) => {
    const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null)
    const [nodes, setNodes, onNodesChange] = useNodesState<GraphNodeData>([])
    const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)
    const shouldFitRef = useRef(false)

    const layout = useMemo(() => computeLayout(graphNodes, graphEdges), [graphNodes, graphEdges])

    const connectedNodeIds = useMemo(() => {
      if (!selectedNodeId) return null
      const set = new Set<string>([selectedNodeId])
      for (const edge of graphEdges) {
        if (edge.source === selectedNodeId) set.add(edge.target)
        if (edge.target === selectedNodeId) set.add(edge.source)
      }
      return set
    }, [graphEdges, selectedNodeId])

    // Reset positions when the underlying (filtered) data changes.
    useEffect(() => {
      setNodes(layout)
      shouldFitRef.current = true
    }, [layout, setNodes])

    // Apply selection dimming/highlight without disturbing manual positions.
    useEffect(() => {
      setNodes((prev) =>
        prev.map((node) => ({
          ...node,
          selected: node.id === selectedNodeId,
          data: {
            ...node.data,
            highlighted: node.id === selectedNodeId,
            dimmed: connectedNodeIds ? !connectedNodeIds.has(node.id) : false,
          },
        })),
      )
    }, [connectedNodeIds, selectedNodeId, setNodes])

    const edges = useMemo<Edge[]>(() => {
      const nodeIds = new Set(graphNodes.map((node) => node.id))
      return graphEdges
        .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
        .map((edge, index) => {
          const id = `${edge.source}-${edge.target}-${index}`
          const isActive = Boolean(selectedNodeId) && (edge.source === selectedNodeId || edge.target === selectedNodeId)
          const isHovered = hoveredEdgeId === id
          const dimmed = Boolean(selectedNodeId) && !isActive
          const showLabel = isActive || isHovered
          return {
            id,
            source: edge.source,
            target: edge.target,
            type: 'smoothstep',
            label: showLabel ? edge.type : undefined,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 16,
              height: 16,
              color: isActive ? EDGE_ACTIVE : EDGE_IDLE,
            },
            style: {
              stroke: isActive ? EDGE_ACTIVE : EDGE_IDLE,
              strokeWidth: isActive || isHovered ? 1.6 : 1.2,
              strokeOpacity: dimmed ? 0.12 : isActive ? 0.9 : 0.45,
            },
            zIndex: isActive ? 6 : 1,
          }
        })
    }, [graphEdges, graphNodes, hoveredEdgeId, selectedNodeId])

    const runFitView = useCallback(
      (duration = 500) => {
        if (!flowInstance) return
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            flowInstance.fitView({ duration, padding: FIT_PADDING, minZoom: 0.15, maxZoom: 1.1 })
          })
        })
      },
      [flowInstance],
    )

    // Auto-fit after a fresh layout.
    useEffect(() => {
      if (!flowInstance || !shouldFitRef.current || nodes.length === 0) return
      shouldFitRef.current = false
      runFitView(520)
    }, [flowInstance, nodes, runFitView])

    const focusNode = useCallback(
      (nodeId: string) => {
        if (!flowInstance) return
        const attempt = (remaining: number) => {
          const target = flowInstance.getNode(nodeId)
          if (!target) {
            if (remaining <= 0) return
            requestAnimationFrame(() => attempt(remaining - 1))
            return
          }
          const focus = target.positionAbsolute ?? target.position
          flowInstance.setCenter(focus.x + NODE_WIDTH / 2, focus.y + NODE_HEIGHT / 2, {
            zoom: FOCUS_ZOOM,
            duration: 620,
          })
        }
        attempt(8)
      },
      [flowInstance],
    )

    const relayout = useCallback(() => {
      const fresh = computeLayout(graphNodes, graphEdges)
      setNodes(fresh)
      shouldFitRef.current = true
    }, [graphEdges, graphNodes, setNodes])

    useImperativeHandle(
      ref,
      () => ({
        fitView: () => runFitView(500),
        relayout,
        zoomIn: () => flowInstance?.zoomIn({ duration: 200 }),
        zoomOut: () => flowInstance?.zoomOut({ duration: 200 }),
        focusNode: (nodeId: string) => focusNode(nodeId),
      }),
      [flowInstance, focusNode, relayout, runFitView],
    )

    const handleNodeClick: NodeMouseHandler = (_, node) => {
      onNodeSelect(node as Node<GraphNodeData>)
    }

    const handleEdgeEnter: EdgeMouseHandler = (_, edge) => setHoveredEdgeId(edge.id)
    const handleEdgeLeave: EdgeMouseHandler = () => setHoveredEdgeId(null)

    return (
      <div className="h-full w-full bg-canvas">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onNodeClick={handleNodeClick}
            onPaneClick={() => onNodeSelect(null)}
            onEdgeMouseEnter={handleEdgeEnter}
            onEdgeMouseLeave={handleEdgeLeave}
            onInit={setFlowInstance}
            fitView
            fitViewOptions={{ padding: FIT_PADDING }}
            minZoom={0.1}
            maxZoom={1.75}
            proOptions={{ hideAttribution: false }}
            panOnDrag
            zoomOnScroll
            className="bg-canvas"
          >
            {graphNodes.length > MINIMAP_THRESHOLD ? (
              <MiniMap
                pannable
                zoomable
                maskColor="rgba(9,11,16,0.72)"
                style={{ backgroundColor: '#0b0e14' }}
                nodeColor={(node) => getTypeMeta((node.data as GraphNodeData)?.type ?? '').accent}
                nodeStrokeWidth={2}
              />
            ) : null}
            <Controls showInteractive={false} />
            <Background variant={BackgroundVariant.Dots} color="#252b36" gap={22} size={1.4} />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    )
  },
)

GraphViewer.displayName = 'GraphViewer'

export default GraphViewer
