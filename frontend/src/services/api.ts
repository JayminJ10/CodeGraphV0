import axios, { AxiosError } from 'axios'

import type { AnalyzeRepoResponse, GraphResponse, QueryResponse } from '../types/graph'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
  timeout: 120000,
})

const normalizeError = (error: unknown): Error => {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return new Error(detail)
    if (detail && typeof detail === 'object') return new Error(JSON.stringify(detail))
    return new Error(error.message)
  }
  if (error instanceof Error) return error
  return new Error('Unexpected API error')
}

export const analyzeRepo = async (repoUrl: string): Promise<AnalyzeRepoResponse> => {
  try {
    const response = await apiClient.post<AnalyzeRepoResponse>(
      '/repos/analyze',
      {
        repo_url: repoUrl,
      },
      {
        // Repository analysis can take several minutes for medium/large codebases.
        timeout: 0,
      },
    )
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}

export const fetchGraph = async (repoId: string): Promise<GraphResponse> => {
  try {
    const response = await apiClient.get<GraphResponse>(`/repos/${repoId}/graph`)
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}

export const askQuestion = async (repoId: string, question: string): Promise<QueryResponse> => {
  try {
    const response = await apiClient.post<QueryResponse>('/query', {
      repo_id: repoId,
      question,
    })
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}
