'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ThumbsUp, ThumbsDown } from 'lucide-react'

/* ── Markdown renderer ──────────────────────────────────────────────────── */
function ArticleContent({ content }: { content: string }) {
  return (
    <div className="prose prose-gray max-w-none text-gray-800">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-gray-900 mt-8 mb-4">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4 pb-2 border-b border-gray-100">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold text-gray-800 mt-4 mb-2">{children}</h4>
          ),
          p: ({ children }) => (
            <p className="text-gray-700 leading-relaxed mb-4">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-6 mb-4 space-y-1 text-gray-700">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 mb-4 space-y-1 text-gray-700">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-gray-600">{children}</em>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-violet-300 bg-violet-50 pl-4 py-3 my-4 rounded-r-lg text-gray-700 italic">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-gray-100">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-gray-50 transition-colors">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-gray-600">{children}</td>
          ),
          code: ({ children, className }) => {
            const isBlock = className?.includes('language-')
            if (isBlock) {
              return (
                <div className="my-4">
                  <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto text-sm">
                    <code className="font-mono">{children}</code>
                  </pre>
                </div>
              )
            }
            return (
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-violet-700">
                {children}
              </code>
            )
          },
          pre: ({ children }) => <>{children}</>,
          a: ({ href, children }) => (
            <a
              href={href}
              target={href?.startsWith('http') ? '_blank' : undefined}
              rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="text-violet-600 underline decoration-violet-300 hover:text-violet-800 hover:decoration-violet-600 transition-colors"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-8 border-gray-200" />,
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt ?? ''}
              className="rounded-xl border border-gray-200 my-4 max-w-full"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

/* ── Feedback widget ────────────────────────────────────────────────────── */
function FeedbackWidget({ articleSlug }: { articleSlug: string }) {
  const [voted, setVoted] = useState<'yes' | 'no' | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleVote(type: 'yes' | 'no') {
    if (voted || loading) return
    setLoading(true)
    try {
      await fetch(`/api/help/articles/${articleSlug}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      setVoted(type)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-12 pt-8 border-t border-gray-100">
      {voted ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="text-3xl">{voted === 'yes' ? '🎉' : '💙'}</div>
          <p className="font-semibold text-gray-900">
            {voted === 'yes' ? 'Ótimo! Que bom que ajudou.' : 'Obrigado pelo feedback!'}
          </p>
          <p className="text-sm text-gray-500">
            {voted === 'no'
              ? 'Vamos trabalhar para melhorar este artigo.'
              : 'Continue explorando a Central de Ajuda.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <p className="font-semibold text-gray-900 text-lg">Este artigo foi útil?</p>
          <p className="text-sm text-gray-500">Sua opinião nos ajuda a melhorar o conteúdo.</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleVote('yes')}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-50 border border-green-200 text-green-700 font-medium text-sm hover:bg-green-100 hover:border-green-300 transition-all disabled:opacity-50"
            >
              <ThumbsUp className="w-4 h-4" />
              Sim, ajudou!
            </button>
            <button
              onClick={() => handleVote('no')}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-100 hover:border-gray-300 transition-all disabled:opacity-50"
            >
              <ThumbsDown className="w-4 h-4" />
              Não encontrei o que precisava
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Main export ─────────────────────────────────────────────────────────── */
export default function ArticleBody({
  content,
  articleSlug,
}: {
  content: string
  articleSlug: string
}) {
  return (
    <>
      <ArticleContent content={content} />
      <FeedbackWidget articleSlug={articleSlug} />
    </>
  )
}
