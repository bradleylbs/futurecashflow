"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type Thread = {
  id: string
  buyer_id: string
  supplier_id: string
  subject: string | null
  last_message_at: string | null
  created_at: string
  buyer_email: string
  supplier_email: string
}

type Message = {
  id: string
  sender_id: string
  recipient_id: string
  body: string
  read_at: string | null
  created_at: string
}

export default function CommunicationPage() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    let cancelled = false
    setLoadingThreads(true)
    fetch("/api/communication/threads")
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        if (d?.threads) setThreads(d.threads)
        setError(d?.error || null)
      })
      .catch(e => setError(String(e?.message || e)))
      .finally(() => setLoadingThreads(false))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedThreadId) return
    let cancelled = false
    setLoadingMessages(true)
    fetch(`/api/communication/threads/${selectedThreadId}/messages`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        if (Array.isArray(d?.messages)) setMessages(d.messages)
        setError(d?.error || null)
      })
      .catch(e => setError(String(e?.message || e)))
      .finally(() => setLoadingMessages(false))
    return () => {
      cancelled = true
    }
  }, [selectedThreadId])

  const selectedThread = useMemo(() => threads.find(t => t.id === selectedThreadId) || null, [threads, selectedThreadId])

  async function sendMessage() {
    const val = inputRef.current?.value?.trim() || ""
    if (!val || !selectedThreadId) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/communication/threads/${selectedThreadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: val }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || "Failed to send")
      }
      // refresh messages
      const r = await fetch(`/api/communication/threads/${selectedThreadId}/messages`)
      const d = await r.json()
      if (Array.isArray(d?.messages)) setMessages(d.messages)
      if (inputRef.current) inputRef.current.value = ""
    } catch (e: any) {
      setError(e?.message || "Failed to send")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-card focus:text-foreground focus:border focus:border-border focus:px-3 focus:py-2 focus:rounded-md shadow-sm"
      >
        Skip to main content
      </a>

      <main id="main-content" className="container mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Buyer Communication</h1>
          <p className="text-muted-foreground">Communicate with your buyer</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-0 shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
            {/* Threads list */}
            <aside className="md:col-span-1 max-h-[70vh] overflow-auto">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold">Threads</h2>
              </div>
              {loadingThreads ? (
                <div className="p-4 text-sm text-muted-foreground">Loading threads…</div>
              ) : threads.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No threads yet.</div>
              ) : (
                <ul className="divide-y divide-border">
                  {threads.map(t => (
                    <li key={t.id}>
                      <button
                        onClick={() => setSelectedThreadId(t.id)}
                        className={`w-full text-left p-4 hover:bg-muted/30 ${selectedThreadId === t.id ? "bg-muted/40" : ""}`}
                        aria-current={selectedThreadId === t.id ? "true" : undefined}
                      >
                        <div className="text-sm font-medium">{t.subject || "Conversation"}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {t.buyer_email} ↔ {t.supplier_email}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          {t.last_message_at ? new Date(t.last_message_at).toLocaleString() : new Date(t.created_at).toLocaleString()}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </aside>

            {/* Messages */}
            <section className="md:col-span-2 flex flex-col max-h-[70vh]">
              {!selectedThread ? (
                <div className="p-6 text-sm text-muted-foreground">Select a thread to view messages.</div>
              ) : (
                <>
                  <div className="p-4 border-b border-border">
                    <h3 className="font-semibold">{selectedThread.subject || "Conversation"}</h3>
                    <p className="text-xs text-muted-foreground">{selectedThread.buyer_email} ↔ {selectedThread.supplier_email}</p>
                  </div>
                  <div className="flex-1 overflow-auto p-4 space-y-3">
                    {loadingMessages ? (
                      <div className="text-sm text-muted-foreground">Loading messages…</div>
                    ) : messages.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No messages yet.</div>
                    ) : (
                      messages.map(m => (
                        <div key={m.id} className="text-sm">
                          <div className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</div>
                          <div className="p-3 rounded-md border border-border bg-background/60 whitespace-pre-wrap">{m.body}</div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="border-t border-border p-3">
                    {error && <div className="text-sm text-red-500 mb-2" role="alert">{error}</div>}
                    <div className="flex items-end gap-2">
                      <textarea
                        ref={inputRef}
                        rows={2}
                        placeholder="Type your message…"
                        className="flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault()
                            sendMessage()
                          }
                        }}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={sending || !selectedThreadId}
                        className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                      >
                        {sending ? "Sending…" : "Send"}
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">Press Ctrl/Cmd + Enter to send</p>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>

        <div className="flex gap-2">
          <a href="/dashboard/supplier" className="inline-flex items-center rounded-md border px-3 py-2 text-sm">Back to Dashboard</a>
        </div>
      </main>
    </div>
  )
}
