"use client"

import { useEffect, useState } from "react"

export default function DebugPage() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/debug/session", { credentials: "include", cache: "no-store" })
        const json = await res.json()
        setData(json)
      } catch (e: any) {
        setError(e?.message || "Failed to load debug info")
      }
    })()
  }, [])

  return (
    <div style={{ padding: 20, fontFamily: 'ui-sans-serif, system-ui' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Debug: Session & Headers</h1>
      {error && <pre style={{ color: 'tomato' }}>{error}</pre>}
      <pre style={{ background: '#111827', color: '#e5e7eb', padding: 16, borderRadius: 8, overflow: 'auto' }}>
        {JSON.stringify(data, null, 2)}
      </pre>
      <p style={{ marginTop: 12, color: '#6b7280' }}>
        Tip: Open this page on localhost and on your dev tunnel host after logging in to compare cookie and protocol.
      </p>
    </div>
  )
}
