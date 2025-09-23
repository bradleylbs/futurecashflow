'use client'

import React from 'react'

// Reusable LogoIcon component
export const LogoIcon = ({ className = "w-6 h-6 text-blue-600" }) => (
  <div className="relative">
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 80 80">
      <path d="M40 8L16 32H26L40 18L54 32H64L40 8Z" />
      <path d="M40 28L16 52H26L40 38L54 52H64L40 28Z" />
    </svg>
  </div>
)

// Brand text components with consistent blue styling
export const CashflowBrand = ({ className = "", showIcon = true, iconSize = "w-6 h-6" }) => (
  <span className={`inline-flex items-center gap-2 ${className}`}>
    {showIcon && <LogoIcon className={`${iconSize} text-blue-600`} />}
    <span className="font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
      Cashflow
    </span>
  </span>
)

export const FutureCashflowBrand = ({ className = "", showIcon = true, iconSize = "w-6 h-6" }) => (
  <span className={`inline-flex items-center gap-2 ${className}`}>
    {showIcon && <LogoIcon className={`${iconSize} text-blue-600`} />}
    <span className="font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
      Future Cashflow
    </span>
  </span>
)

// Link version for navigation
export const FutureCashflowLink = ({ 
  href = "/", 
  className = "", 
  showIcon = true, 
  iconSize = "w-8 h-8",
  onClick,
  children 
}: {
  href?: string
  className?: string
  showIcon?: boolean
  iconSize?: string
  onClick?: () => void
  children?: React.ReactNode
}) => (
  <a 
    href={href} 
    onClick={onClick}
    className={`inline-flex items-center gap-3 group hover:scale-105 transition-all duration-300 ${className}`}
  >
    {showIcon && (
      <LogoIcon className={`${iconSize} text-blue-600 group-hover:text-blue-700 transition-colors duration-300`} />
    )}
    <span className="font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent group-hover:from-blue-700 group-hover:to-blue-900 transition-all duration-300">
      {children || "Future Cashflow"}
    </span>
  </a>
)
