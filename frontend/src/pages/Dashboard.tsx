import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Node } from 'reactflow'

import ChatPanel from '../components/ChatPanel'
import GraphSidebar from '../components/GraphSidebar'
import GraphViewer from '../components/GraphViewer'
import type { GraphViewerHandle } from '../components/GraphViewer'
import NodeInspector from '../components/NodeInspector'
import RepoInput from '../components/RepoInput'
import TopBar from '../components/TopBar'
import { ChevronIcon, CloseIcon } from '../components/icons'
import { normalizeType } from '../lib/nodeMeta'
import { analyzeRepo, askQuestion, fetchGraph } from '../services/api'
import type { ChatMessage, GraphApiEdge, GraphApiNode, GraphNodeData } from '../types/graph'

const isNarrowViewport = () => typeof window !== 'undefined' && window.innerWidth < 1024

const Dashboard = () => {
  const [repoId, setRepoId] = useState<string | null>(null)
  const [repoUrl, setRepoUrl] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isAsking, setIsAsking] = useState(false)

  const [graphNodes, setGraphNodes] = useState<GraphApiNode[]>([])
  const [graphEdges, setGraphEdges] = useState<GraphApiEdge[]>([])
  const [selectedNode, setSelectedNode] = useState<Node<GraphNodeData> | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [debugSteps, setDebugSteps] = useState<string[]>([])

  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set())
  const [hiddenEdgeTypes, setHiddenEdgeTypes] = useState<Set<string>>(new Set())

  const [sidebarCollapsed, setSidebarCollapsed] = useState(isNarrowViewport)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [chatOpen, setChatOpen] = useState(false)
  const [analyzeOpen, setAnalyzeOpen] = useState(false)

  const graphViewerRef = useRef<GraphViewerHandle | null>(null)

  const appendDebugStep = (message: string) => {
    const line = `[${new Date().toLocaleTimeString()}] ${message}`
    console.debug(line)
    setDebugSteps((prev) => [...prev, line])
  }

  const availableTypes = useMemo(() => {
    const present = new Set(graphNodes.map((node) => normalizeType(node.type)))
    return ['Module', 'File', 'Class', 'Function', 'Service', 'Concept'].filter((type) => present.has(type))
  }, [graphNodes])

  const availableEdgeTypes = useMemo(
    () => Array.from(new Set(graphEdges.map((edge) => edge.type))).sort((a, b) => a.localeCompare(b)),
    [graphEdges],
  )

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const node of graphNodes) {
      const type = normalizeType(node.type)
      counts[type] = (counts[type] ?? 0) + 1
    }
    return counts
  }, [graphNodes])

  const edgeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const edge of graphEdges) counts[edge.type] = (counts[edge.type] ?? 0) + 1
    return counts
  }, [graphEdges])

  const filteredNodes = useMemo(
    () => graphNodes.filter((node) => !hiddenTypes.has(normalizeType(node.type))),
    [graphNodes, hiddenTypes],
  )

  const filteredEdges = useMemo(() => {
    const visibleIds = new Set(filteredNodes.map((node) => node.id))
    return graphEdges.filter(
      (edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target) && !hiddenEdgeTypes.has(edge.type),
    )
  }, [filteredNodes, graphEdges, hiddenEdgeTypes])

  const projectName = repoUrl?.replace(/^https?:\/\/(www\.)?github\.com\//, '') ?? repoId ?? null
  const hasGraph = graphNodes.length > 0

  const handleNodeSelect = useCallback((node: Node<GraphNodeData> | null) => {
    setSelectedNode(node)
    if (node) setInspectorOpen(true)
  }, [])

  const revealAndFocus = useCallback(
    (nodeId: string) => {
      const target = graphNodes.find((node) => node.id === nodeId)
      if (!target) return
      const type = normalizeType(target.type)
      setHiddenTypes((prev) => {
        if (!prev.has(type)) return prev
        const next = new Set(prev)
        next.delete(type)
        return next
      })
      setSelectedNode({
        id: target.id,
        type: 'graphNode',
        position: { x: 0, y: 0 },
        data: {
          label: target.label,
          type: target.type,
          filePath: target.file_path,
          metadata: target.metadata ?? {},
          highlighted: true,
        },
      })
      setInspectorOpen(true)
      requestAnimationFrame(() => graphViewerRef.current?.focusNode(nodeId))
    },
    [graphNodes],
  )

  const toggleType = (type: string) =>
    setHiddenTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })

  const toggleEdgeType = (type: string) =>
    setHiddenEdgeTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })

  const handleAnalyze = async (url: string) => {
    setIsAnalyzing(true)
    setErrorMessage(null)
    setDebugSteps([])
    setStatusMessage('Analyzing repository...')
    appendDebugStep('Step 1/5: Validate input and send analyze request')
    try {
      const result = await analyzeRepo(url)
      appendDebugStep(`Step 2/5: Backend analysis completed (repo_id=${result.repo_id})`)
      setRepoId(result.repo_id)
      setRepoUrl(url)
      setStatusMessage(result.message)

      appendDebugStep('Step 3/5: Fetch graph data for analyzed repository')
      const graph = await fetchGraph(result.repo_id)
      setGraphNodes(graph.nodes)
      setGraphEdges(graph.edges)
      setSelectedNode(null)
      setHiddenTypes(new Set())
      setHiddenEdgeTypes(new Set())
      appendDebugStep(`Step 4/5: Graph loaded (nodes=${graph.nodes.length}, edges=${graph.edges.length})`)
      appendDebugStep('Step 5/5: UI ready for node inspection and AI queries')
      setAnalyzeOpen(false)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to analyze repository')
      setStatusMessage(null)
      appendDebugStep(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleAsk = async (question: string) => {
    if (!repoId) return
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: question }
    const thinkingId = crypto.randomUUID()
    setMessages((prev) => [...prev, userMessage, { id: thinkingId, role: 'assistant', text: 'thinking...', isPending: true }])
    setIsAsking(true)
    try {
      const result = await askQuestion(repoId, question)
      setMessages((prev) =>
        prev.map((message) =>
          message.id === thinkingId ? { ...message, text: result.answer, context: result.context, isPending: false } : message,
        ),
      )
    } catch (error) {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === thinkingId
            ? { ...message, text: `Error: ${error instanceof Error ? error.message : 'Failed to query API'}`, isPending: false }
            : message,
        ),
      )
    } finally {
      setIsAsking(false)
    }
  }

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (analyzeOpen) setAnalyzeOpen(false)
      else if (chatOpen) setChatOpen(false)
      else setSelectedNode(null)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [analyzeOpen, chatOpen])

  const inspectorVisible = Boolean(selectedNode) && inspectorOpen

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-app text-content-primary">
      <TopBar
        projectName={projectName}
        nodeCount={graphNodes.length}
        edgeCount={graphEdges.length}
        sidebarCollapsed={sidebarCollapsed}
        inspectorOpen={inspectorVisible}
        hasGraph={hasGraph}
        chatOpen={chatOpen}
        onFitView={() => graphViewerRef.current?.fitView()}
        onRelayout={() => graphViewerRef.current?.relayout()}
        onZoomIn={() => graphViewerRef.current?.zoomIn()}
        onZoomOut={() => graphViewerRef.current?.zoomOut()}
        onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
        onToggleInspector={() => setInspectorOpen((prev) => !prev)}
        onToggleChat={() => setChatOpen((prev) => !prev)}
        onOpenAnalyze={() => setAnalyzeOpen(true)}
      />

      <div className="relative flex min-h-0 flex-1">
        {!sidebarCollapsed ? (
          <div className="w-[248px] flex-none">
            <GraphSidebar
              graphNodes={graphNodes}
              totalNodes={graphNodes.length}
              totalEdges={graphEdges.length}
              visibleNodes={filteredNodes.length}
              availableTypes={availableTypes}
              availableEdgeTypes={availableEdgeTypes}
              typeCounts={typeCounts}
              edgeCounts={edgeCounts}
              hiddenTypes={hiddenTypes}
              hiddenEdgeTypes={hiddenEdgeTypes}
              onToggleType={toggleType}
              onToggleEdgeType={toggleEdgeType}
              onSearchSelect={revealAndFocus}
              onCollapse={() => setSidebarCollapsed(true)}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSidebarCollapsed(false)}
            aria-label="Expand sidebar"
            className="absolute left-2 top-2 z-20 inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-panel text-content-secondary shadow-panel transition hover:border-border-strong hover:text-content-primary"
          >
            <ChevronIcon direction="right" className="h-3.5 w-3.5" />
          </button>
        )}

        <main className="relative min-w-0 flex-1">
          <GraphViewer
            ref={graphViewerRef}
            graphNodes={filteredNodes}
            graphEdges={filteredEdges}
            selectedNodeId={selectedNode?.id ?? null}
            onNodeSelect={handleNodeSelect}
          />
          {!hasGraph ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="pointer-events-auto max-w-sm rounded-lg border border-border bg-panel px-5 py-4 text-center">
                <p className="text-sm font-medium text-content-primary">No graph loaded</p>
                <p className="mt-1 text-xs text-content-secondary">Analyze a repository to explore its architecture graph.</p>
                <button
                  type="button"
                  onClick={() => setAnalyzeOpen(true)}
                  className="mt-3 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
                >
                  Analyze repository
                </button>
              </div>
            </div>
          ) : null}
        </main>

        {inspectorVisible ? (
          <div className="absolute right-0 top-0 z-30 h-full w-[320px] shadow-panel lg:relative lg:z-auto lg:shadow-none">
            <NodeInspector
              selectedNode={selectedNode}
              graphNodes={graphNodes}
              graphEdges={graphEdges}
              onNavigateToNode={revealAndFocus}
              onCenter={() => selectedNode && graphViewerRef.current?.focusNode(selectedNode.id)}
              onHighlight={() => selectedNode && graphViewerRef.current?.focusNode(selectedNode.id)}
              onClose={() => setSelectedNode(null)}
            />
          </div>
        ) : null}
      </div>

      {chatOpen ? (
        <div className="absolute inset-0 z-40 flex justify-end bg-black/40" onClick={() => setChatOpen(false)}>
          <div
            className="flex h-full w-[360px] max-w-full flex-col border-l border-border bg-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <h2 className="text-sm font-semibold text-content-primary">AI Assistant</h2>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                aria-label="Close assistant"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-content-secondary transition hover:border-border-strong hover:text-content-primary"
              >
                <CloseIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <ChatPanel repoId={repoId} messages={messages} isLoading={isAsking} onAsk={handleAsk} />
            </div>
          </div>
        </div>
      ) : null}

      {analyzeOpen ? (
        <div
          className="absolute inset-0 z-50 flex items-start justify-center bg-black/50 px-4 py-16"
          onClick={() => setAnalyzeOpen(false)}
        >
          <div className="w-full max-w-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setAnalyzeOpen(false)}
                aria-label="Close"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-panel text-content-secondary transition hover:border-border-strong hover:text-content-primary"
              >
                <CloseIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            <RepoInput
              isLoading={isAnalyzing}
              onAnalyze={handleAnalyze}
              repoId={repoId}
              statusMessage={statusMessage}
              errorMessage={errorMessage}
              debugSteps={debugSteps}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default Dashboard
