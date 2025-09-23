"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// Modern Logo Component
const LogoIcon = ({ className = "w-8 h-8" }) => (
  <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 80 80">
    <path d="M40 8L16 32H26L40 18L54 32H64L40 8Z" />
    <path d="M40 28L16 52H26L40 38L54 52H64L40 28Z" />
  </svg>
)

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    const doLogout = async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
      } catch {}
      if (!cancelled) {
        router.replace("/auth/login")
        setTimeout(() => {
          if (typeof window !== "undefined" && window.location.pathname !== "/auth/login") {
            window.location.replace("/auth/login")
          }
        }, 50)
      }
    }
    doLogout()
    return () => { cancelled = true }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <div className="flex flex-col items-center space-y-6">
          <div className="p-6 rounded-full border border-border bg-muted">
            <LogoIcon className="w-12 h-12 text-blue-600" />
          </div>
          
          <div className="flex items-baseline space-x-3">
            <h1 className="text-3xl font-bold">Future</h1>
            <div className="w-1 h-8 bg-primary/70 rounded-full"></div>
            <span className="text-2xl font-light text-muted-foreground">Cashflow</span>
          </div>
          
          <div className="flex space-x-2 mt-8">
            <div className="w-3 h-3 bg-primary/80 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-primary/60 rounded-full animate-bounce delay-100"></div>
            <div className="w-3 h-3 bg-primary/80 rounded-full animate-bounce delay-200"></div>
          </div>
          
          <div className="space-y-2">
            <p className="text-lg font-medium">Signing you out...</p>
            <p className="text-sm text-muted-foreground">You'll be redirected to the login page shortly</p>
          </div>
          
          <div className="mt-6 p-4 rounded-xl border border-border bg-muted max-w-sm">
            <p className="text-xs text-muted-foreground leading-relaxed">
              For your security, all sessions have been cleared. Thank you for using <span className="font-semibold text-foreground">Future Cashflow</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}