import { useState } from 'react'
import type { FormEvent } from 'react'

interface RepoInputProps {
  onAnalyze: (repoUrl: string) => Promise<void>
  isLoading: boolean
  repoId: string | null
  statusMessage: string | null
  errorMessage: string | null
  debugSteps: string[]
}

const RepoInput = ({ onAnalyze, isLoading, repoId, statusMessage, errorMessage, debugSteps }: RepoInputProps) => {
  const [repoUrl, setRepoUrl] = useState('https://github.com/fastapi/fastapi')

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!repoUrl.trim()) return
    await onAnalyze(repoUrl.trim())
  }

  return (
    <section className="rounded-xl border border-border bg-panel p-4 shadow-panel">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-content-primary sm:text-base">Repository Analysis</h2>
        <span className="rounded-full border border-border bg-raised px-2 py-0.5 text-[11px] text-content-muted">GitHub URL</span>
      </div>
      <form className="flex flex-col gap-3 lg:flex-row lg:items-center" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="repo-url">
          Repository URL
        </label>
        <input
          id="repo-url"
          className="w-full rounded-lg border border-border bg-raised px-4 py-2.5 text-sm text-content-primary placeholder:text-content-muted focus:border-accent focus:outline-none"
          value={repoUrl}
          onChange={(event) => setRepoUrl(event.target.value)}
          placeholder="https://github.com/org/repo"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? 'Analyzing...' : 'Analyze Repository'}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        {repoId && <span className="rounded-md border border-border bg-raised px-2 py-1 text-content-secondary">Repo ID: {repoId}</span>}
        {statusMessage && <span className="rounded-md border border-accent/50 bg-accent-soft px-2 py-1 text-content-primary">{statusMessage}</span>}
        {errorMessage && <span className="rounded-md border border-rose-700/70 bg-rose-900/20 px-2 py-1 text-rose-200">{errorMessage}</span>}
      </div>

      {debugSteps.length > 0 ? (
        <div className="mt-3 rounded-lg border border-border bg-canvas p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-content-muted">Debug Steps</p>
          <ul className="mt-2 space-y-1 text-xs text-content-secondary">
            {debugSteps.map((step, index) => (
              <li key={`${index}-${step}`} className="font-mono">
                {step}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

export default RepoInput
