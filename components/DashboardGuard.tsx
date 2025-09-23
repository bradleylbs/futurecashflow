// components/DashboardGuard.tsx - Protected dashboard wrapper component
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth_hook'

interface DashboardGuardProps {
  children: React.ReactNode
  requiredRole?: 'supplier' | 'buyer' | 'admin' | 'fm_admin' | 'fa_admin'
  fallback?: React.ReactNode
}

export function DashboardGuard({ children, requiredRole, fallback }: DashboardGuardProps) {
  const { user, canAccess, loading, requiredStep } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    // Not authenticated
    if (!user) {
      router.push('/auth/login')
      return
    }

    // Wrong role
    if (requiredRole && user.role !== requiredRole) {
      if (user.role === 'fm_admin' || user.role === 'fa_admin' || user.role === 'admin') {
        router.push('/dashboard/admin')
      } else {
        router.push('/unauthorized')
      }
      return
    }

    // User hasn't completed onboarding requirements
    if (!canAccess && user.role !== 'fm_admin' && user.role !== 'fa_admin' && user.role !== 'admin') {
      // Do NOT force-redirect to dashboard; allow onboarding flows to handle navigation.
      return
    }
  }, [user, canAccess, loading, requiredRole, requiredStep, router])

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full mb-6">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          </div>
          <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent mb-2">
            Loading Dashboard
          </h3>
          <p className="text-gray-600">Authenticating and preparing your workspace...</p>
        </div>
      </div>
    )
  }

  // Show fallback or nothing while redirecting
  if (!user || (requiredRole && user.role !== requiredRole) || (!canAccess && user.role !== 'fm_admin' && user.role !== 'fa_admin' && user.role !== 'admin')) {
    return fallback || (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-2xl max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full mb-6">
            <div className="w-8 h-8 border-4 border-blue-500 border-dashed rounded-full animate-pulse"></div>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent mb-3">
            Redirecting...
          </h2>
          <p className="text-gray-700 leading-relaxed">
            Please complete onboarding steps shown on the current page.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Specialized guards for each dashboard type
export function AdminDashboardGuard({ children }: { children: React.ReactNode }) {
  return (
    <DashboardGuard requiredRole="admin">
      {children}
    </DashboardGuard>
  )
}

export function BuyerDashboardGuard({ children }: { children: React.ReactNode }) {
  return (
    <DashboardGuard requiredRole="buyer">
      {children}
    </DashboardGuard>
  )
}

export function SupplierDashboardGuard({ children }: { children: React.ReactNode }) {
  return (
    <DashboardGuard requiredRole="supplier">
      {children}
    </DashboardGuard>
  )
}

// Feature access guard component
interface FeatureGuardProps {
  feature: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function FeatureGuard({ feature, children, fallback }: FeatureGuardProps) {
  const { user, currentLevel, canAccess } = useAuth()

  const canAccessFeature = () => {
    if (!user || !canAccess) return false

    // Admin roles can access all features
    if (user.role === 'fm_admin' || user.role === 'fa_admin' || user.role === 'admin') {
      return true
    }

    // Define feature access levels
    const featureRequirements: Record<string, string[]> = {
      'view_dashboard': ['pre_kyc', 'kyc_approved', 'banking_submitted', 'agreement_signed', 'banking_verified'],
      'invite_suppliers': ['agreement_signed', 'banking_verified'],
      'manage_suppliers': ['agreement_signed', 'banking_verified'],
      'view_transactions': ['agreement_signed', 'banking_verified'],
      'submit_kyc': ['pre_kyc'],
      'view_kyc_status': ['pre_kyc', 'kyc_approved', 'banking_submitted', 'agreement_signed', 'banking_verified'],
      'submit_banking': ['kyc_approved', 'banking_submitted', 'agreement_signed', 'banking_verified'],
      'sign_agreements': ['kyc_approved', 'banking_submitted'],
      'view_agreements': ['kyc_approved', 'banking_submitted', 'agreement_signed', 'banking_verified']
    }

    const requiredLevels = featureRequirements[feature]
    if (!requiredLevels || !currentLevel) {
      return false
    }

    return requiredLevels.includes(currentLevel)
  }

  if (!canAccessFeature()) {
    return fallback || (
  <div className="p-6 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-sm border-0 rounded-xl shadow-lg">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-amber-800 mb-2">Feature Access Restricted</h4>
            <p className="text-amber-700 leading-relaxed">
              This feature is not available at your current onboarding level. 
              Please complete all required steps to access this feature.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}