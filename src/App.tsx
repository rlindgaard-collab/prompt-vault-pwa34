import React, { useEffect, useMemo, useState } from 'react'
import { useVault } from './store'
import type { PromptsJson } from './types'
import { flatten } from './lib/search'
import { PromptCard } from './components/PromptCard'
import { Toast } from './components/Toast'
import { Header } from './components/Header'

const DATA_URL = '/prompts.json'

function titleCase(str: string) {
  if (!str) return ''
  return str
    .toLowerCase()
    .split(/\s+/)
    .map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : w)
    .join(' ')
}

function slugify(str: string) {
  return (str || 'x')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function App() {
  const { dark, setDark, data, setData } = useVault()
  const [activeTab, setActiveTab] = useState<string>('')
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(DATA_URL)
        if (!res.ok) return
        const json: PromptsJson = await res.json()
        setData(json)
        if (!activeTab) setActiveTab(json[0]?.tab ?? '')
      } catch {}
    })()
  }, [])

  const allPrompts = useMemo(() => data ? flatten(data) : [], [data])
  const tabs = useMemo(() => data?.map(t => t.tab) ?? [], [data])
  const current = useMemo(() => data?.find(t => t.tab === activeTab), [data, activeTab])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allPrompts
    return allPrompts.filter(p =>
      p.text.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.tab.toLowerCase().includes(q) ||
      p.section.toLowerCase().includes(q))
  }, [query, allPrompts])

  const handleCopy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1200) }
    catch { alert('Kunne ikke kopiere') }
  }

  const isSearching = query.trim().length > 0

  // helper to compute anchor ids
  const tabSlug = slugify(activeTab || 'tab')

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <Header dark={dark} setDark={setDark} />
      <div className="flex">
        {/* Sidebar */}
        <div className="md:fixed md:inset-y-16 md:left-0 hidden md:block">
          <aside className="w-72 shrink-0 border-r border-slate-200 dark:border-slate-800 p-3 overflow-y-auto h-[calc(100dvh-4rem)]">
            <div className="mb-3">
              <label className="block text-sm font-medium text-ink dark:text-white mb-1">Faner</label>
              <select value={activeTab} onChange={(e) => setActiveTab(e.target.value)}
                className="w-full rounded-2xl border px-3 py-2 shadow-soft bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-ink dark:text-white">
                {tabs.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <nav className="space-y-4">
              <h3 className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Sektioner & kategorier</h3>
              <div className="space-y-2">
                {current?.sections.map(sec => {
                  const secSlug = slugify(sec.section)
                  return (
                    <div key={titleCase(sec.section)}>
                      <button className="text-sm font-semibold text-ink dark:text-white hover:underline" onClick={() => { const secId = `sec-${tabSlug}-${slugify(sec.section)}`; const el = document.getElementById(secId); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>{titleCase(sec.section)}</button>
                      {sec.categories.map(cat => {
                        const catSlug = slugify(cat.category)
                        const targetId = `cat-${tabSlug}-${secSlug}-${catSlug}`
                        return (
                          <button
                            key={cat.category}
                            className="text-left text-sm text-slate-600 dark:text-slate-300 hover:underline block"
                            onClick={() => {
                              const el = document.getElementById(targetId)
                              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }}
                          >
                            • {titleCase(cat.category)}
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </nav>
          </aside>
        </div>

        <main className="flex-1 md:ml-72 p-4 space-y-6">
          <div className="flex gap-2">
            <input placeholder="Søg på tværs af alt…" value={query} onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-2xl border px-4 py-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-ink dark:text-white" />
            <select value={activeTab} onChange={(e) => setActiveTab(e.target.value)}
              className="md:hidden rounded-2xl border px-3 py-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-ink dark:text-white">
              {tabs.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* When searching: show ONLY results at the top */}
          {isSearching ? (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-ink dark:text-white">Søgeresultater</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((p) => (
                  <PromptCard key={p.id} text={p.text} onCopy={() => handleCopy(p.text)} />
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Normal content when not searching */}
              {current?.sections.map((s) => {
                const secSlug = slugify(s.section)
                return (
                  <section key={s.section} id={`sec-${tabSlug}-${slugify(s.section)}`} className="space-y-4">
                    <h2 className="text-xl font-semibold text-ink dark:text-white">{titleCase(s.section)}</h2>
                    {s.categories.map((c) => {
                      const catSlug = slugify(c.category)
                      const anchorId = `cat-${tabSlug}-${secSlug}-${catSlug}`
                      return (
                        <div key={c.category} id={anchorId} className="space-y-3">
                          <h3 className="text-sm text-slate-500 dark:text-slate-400">{titleCase(c.category)}</h3>
                          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {c.prompts.map((p, i) => (
                              <PromptCard key={i + p.slice(0,8)} text={p} onCopy={() => handleCopy(p)} />
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </section>
                )
              })}
            </>
          )}
        </main>
      </div>
      <Toast message="Kopieret!" show={copied} />
    </div>
  )
}
