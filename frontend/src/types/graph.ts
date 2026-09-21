export type GraphNodeType = 'File' | 'Class' | 'Function' | 'Module' | 'Service' | 'Concept' | string

export interface GraphNodeData {
  label: string
  type: GraphNodeType
  filePath?: string | null
  metadata?: Record<string, unknown>
  highlighted?: boolean
  dependencyCount?: number
  dimmed?: boolean
}

export interface GraphApiNode {
  id: string
  label: string
  type: GraphNodeType
  file_path?: string | null
  metadata?: Record<string, unknown>
}

export interface GraphApiEdge {
  source: string
  target: string
  type: string
  metadata?: Record<string, unknown>
}

export interface GraphResponse {
  repo_id: string
  nodes: GraphApiNode[]
  edges: GraphApiEdge[]
}

export interface AnalyzeRepoResponse {
  repo_id: string
  repo_url: string
  status: string
  message: string
}

export interface QueryContextItem {
  atom_id: string
  file_path: string
  symbol?: string | null
  concept_name?: string | null
  score: number
}

export interface QueryResponse {
  answer: string
  context: QueryContextItem[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  context?: QueryContextItem[]
  isPending?: boolean
}
