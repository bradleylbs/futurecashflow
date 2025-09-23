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
  <div className="relative min-h-screen flex items-center justify-center bg-black text-white">
      {/* Subtle background blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="text-center">
        <div className="flex flex-col items-center space-y-6">
          <div className="p-6 rounded-full border border-white/20 bg-white/10">
            <LogoIcon className="w-12 h-12 text-blue-600" />
          </div>
          
          {/* Brand Name */}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Future</h1>
            <div className="w-px h-5 bg-primary" />
            <span className="text-2xl font-bold whitespace-nowrap"></span>
          </div>
          
          {/* Loading indicator */}
          <div className="flex space-x-2 mt-6">
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-primary/90 rounded-full animate-bounce delay-100"></div>
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce delay-200"></div>
          </div>
          
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    </div>
  )
}