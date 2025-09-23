// hooks/useAuth.ts - Client-side authentication hook
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  role: string
  accountStatus: string
}

interface CompletionStatus {
  kycCompleted: boolean
  bankingSubmitted: boolean
  agreementsSigned: boolean
}

interface OnboardingProgress {
  percentage: number
  completedSteps: number
  totalSteps: number
  currentStep?: string
}

interface AuthState {
  user: User | null
  canAccess: boolean
  requiredStep?: string
  currentLevel?: string
  redirectTo?: string
  completionStatus?: CompletionStatus
  onboardingProgress?: OnboardingProgress
  loading: boolean
  error?: string
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    canAccess: false,
    loading: true
  })
  const router = useRouter()

  const checkAccess = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: undefined }))
      
      const response = await fetch('/api/auth/check-access', {
        method: 'GET',
        credentials: 'include'
      })
      
      const data = await response.json()

      if (response.ok) {
        setAuthState({
          user: data.user,
          canAccess: data.canAccess,
          requiredStep: data.requiredStep,
          currentLevel: data.currentLevel,
          redirectTo: data.redirectTo,
          completionStatus: data.completionStatus,
          onboardingProgress: data.onboardingProgress,
          loading: false
        })
      } else {
        setAuthState({
          user: null,
          canAccess: false,
          loading: false,
          error: data.error
        })
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setAuthState({
        user: null,
        canAccess: false,
        loading: false,
        error: 'Failed to check authentication'
      })
    }
  }, [])

  const refreshAccess = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/check-access', {
        method: 'POST',
        credentials: 'include'
      })
      
      const data = await response.json()

      if (response.ok) {
        setAuthState(prev => ({
          ...prev,
          canAccess: data.canAccess,
          requiredStep: data.requiredStep,
          redirectTo: data.redirectTo,
          completionStatus: data.completionStatus
        }))
        
        // If user now has access, redirect to their dashboard
        if (data.canAccess && data.redirectTo) {
          router.push(data.redirectTo)
        }
      }
    } catch (error) {
      console.error('Access refresh failed:', error)
    }
  }, [router])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
      
      setAuthState({
        user: null,
        canAccess: false,
        loading: false
      })
      
      router.push('/auth/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }, [router])

  const redirectToDashboard = useCallback(() => {
    if (authState.canAccess && authState.redirectTo) {
      router.push(authState.redirectTo)
    } else if (authState.user) {
      // Do not force-redirect partially onboarded users; let onboarding flow control navigation.
      return
    }
  }, [authState.canAccess, authState.redirectTo, authState.user, router])

  useEffect(() => {
    checkAccess()
  }, [checkAccess])

  return { 
    ...authState, 
    refresh: checkAccess,
    refreshAccess,
    logout,
    redirectToDashboard,
    // Helper functions
    isAdmin: authState.user?.role === 'fm_admin' || authState.user?.role === 'fa_admin' || authState.user?.role === 'admin',
    isBuyer: authState.user?.role === 'buyer',
    isSupplier: authState.user?.role === 'supplier',
    needsOnboarding: !authState.canAccess && authState.user && !['fm_admin', 'fa_admin', 'admin'].includes(authState.user.role)
  }
}

// Hook for checking if user can access specific features
export function useFeatureAccess() {
  const { user, currentLevel, canAccess } = useAuth()

  const canAccessFeature = useCallback((feature: string): boolean => {
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
  }, [user, currentLevel, canAccess])

  return { canAccessFeature }
}

// Hook for protected routes
export function useProtectedRoute(requiredRole?: string | string[]) {
  const { user, canAccess, loading, redirectToDashboard } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push('/auth/login')
      return
    }

    if (requiredRole) {
      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
      if (!allowedRoles.includes(user.role)) {
        router.push('/unauthorized')
        return
      }
    }

    if (!canAccess && user.role !== 'fm_admin' && user.role !== 'fa_admin' && user.role !== 'admin') {
      // Don't force navigation; allow onboarding page to handle next steps.
      return
    }
  }, [user, canAccess, loading, requiredRole, router])

  return { user, canAccess, loading }
}