import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import type { ChatMessage } from '../types/graph'

interface ChatPanelProps {
  repoId: string | null
  messages: ChatMessage[]
  isLoading: boolean
  onAsk: (question: string) => Promise<void>
}

const ChatPanel = ({ repoId, messages, isLoading, onAsk }: ChatPanelProps) => {
  const [question, setQuestion] = useState('')

  const disabled = useMemo(() => !repoId || isLoading, [repoId, isLoading])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!question.trim() || disabled) return
    const next = question.trim()
    setQuestion('')
    await onAsk(next)
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-panel">
      <div className="border-b border-border px-4 py-2.5">
        <p className="text-xs text-content-secondary">{repoId ? `Connected to ${repoId}` : 'Analyze a repository to start querying'}</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-content-muted">Ask questions like “How does authentication work?”</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-lg border p-3 text-sm ${
                message.role === 'user'
                  ? 'ml-4 sm:ml-6 border-accent/50 bg-accent-soft text-content-primary'
                  : 'mr-4 sm:mr-6 border-border bg-raised text-content-primary'
              }`}
            >
              {message.role === 'assistant' ? (
                <div className={message.isPending ? 'animate-pulse italic text-slate-400' : ''}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <p className="mb-2 whitespace-pre-wrap last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
                      ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
                      li: ({ children }) => <li>{children}</li>,
                      code: ({ children }) => (
                        <code className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-xs text-blue-200">{children}</code>
                      ),
                      pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded bg-slate-950 p-2 text-xs">{children}</pre>,
                      h1: ({ children }) => <h1 className="mb-2 text-base font-semibold">{children}</h1>,
                      h2: ({ children }) => <h2 className="mb-2 text-sm font-semibold">{children}</h2>,
                      h3: ({ children }) => <h3 className="mb-1 text-sm font-semibold">{children}</h3>,
                      a: ({ href, children }) => (
                        <a className="text-blue-300 underline hover:text-blue-200" href={href} target="_blank" rel="noreferrer">
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {message.text}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{message.text}</p>
              )}
              {message.context?.length ? (
                <p className="mt-2 text-xs text-content-secondary">
                  Context: {message.context.slice(0, 3).map((item) => item.file_path).join(', ')}
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>

      <form className="border-t border-border p-3 sm:p-4" onSubmit={handleSubmit}>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          className="h-20 w-full resize-none rounded-lg border border-border bg-raised p-2.5 text-sm text-content-primary placeholder:text-content-muted focus:border-accent focus:outline-none"
          placeholder="Where is the database connection implemented?"
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={disabled}
          className="mt-2 w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? 'Asking...' : 'Ask AI'}
        </button>
      </form>
    </section>
  )
}

export default ChatPanel
