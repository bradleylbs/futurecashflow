import React from 'react'

// Logo Component matching presentation
const LogoIcon = ({ className = "w-8 h-8" }) => (
  <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 80 80">
    <path d="M40 8L16 32H26L40 18L54 32H64L40 8Z" />
    <path d="M40 28L16 52H26L40 38L54 52H64L40 28Z" />
  </svg>
)

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <div className="flex flex-col items-center space-y-6">
          {/* Logo with professional styling */}
          <div className="p-6 rounded-full border border-border bg-muted">
            <LogoIcon className="w-12 h-12 text-blue-600" />
          </div>
          
          {/* Brand Name matching presentation */}
          <div className="flex items-baseline space-x-4">
            <h1 className="text-4xl font-black">
              Future
            </h1>
            <div className="w-1 h-10 bg-primary/70 rounded-full"></div>
            <span className="text-3xl font-light text-muted-foreground">
              Cashflow
            </span>
          </div>
          
          {/* Professional loading indicator */}
          <div className="flex space-x-2 mt-8">
            <div className="w-3 h-3 bg-primary/80 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-primary/60 rounded-full animate-bounce delay-100"></div>
            <div className="w-3 h-3 bg-primary/80 rounded-full animate-bounce delay-200"></div>
          </div>
          
          {/* Loading Text */}
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    </div>
  )
}