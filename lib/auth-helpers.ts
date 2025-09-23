// lib/auth-helpers.ts - Enhanced authentication helpers
import { 
  getUserById, 
  getDashboardAccess, 
  hasSignedRequiredAgreements, 
  getKYCStatus, 
  getBankingStatus 
} from './database'

export interface DashboardAccess {
  access_level: 'pre_kyc' | 'kyc_approved' | 'banking_submitted' | 'agreement_signed' | 'banking_verified'
  dashboard_features: string[]
  last_level_change?: string
  banking_submission_date?: string
  agreement_signing_date?: string
  banking_verification_date?: string
  agreement_id?: string
}

export interface UserWithAccess {
  id: string
  email: string
  role: string
  account_status: string
  email_verified: boolean
  dashboardAccess?: DashboardAccess
  canAccessDashboard: boolean
  requiredStep?: string
  redirectTo: string
  completionStatus?: {
    kycCompleted: boolean
    bankingSubmitted: boolean
    agreementsSigned: boolean
  }
}

export async function getUserWithDashboardAccess(userId: string): Promise<UserWithAccess | null> {
  const user = await getUserById(userId)
  if (!user) return null

  const role = (user.role || '').toLowerCase().trim()

  // Admin roles get immediate access
  if (role === 'fm_admin' || role === 'fa_admin' || role === 'admin') {
    return {
      ...user,
      canAccessDashboard: true,
      redirectTo: '/dashboard/admin'
    }
  }

  // For suppliers and buyers, check completion status
  const dashboardAccess = await getDashboardAccess(userId)
  const accessResult = await checkDashboardAccess(userId, role, dashboardAccess)

  return {
    ...user,
    dashboardAccess,
    canAccessDashboard: accessResult.canAccess,
    requiredStep: accessResult.requiredStep,
    completionStatus: accessResult.completionStatus,
    redirectTo: accessResult.canAccess 
      ? (role === 'buyer' ? '/dashboard/buyer' : '/dashboard/supplier')
  : (role === 'buyer' ? '/dashboard/buyer' : '/dashboard/supplier')
  }
}

export async function checkDashboardAccess(
  userId: string, 
  userRole: string, 
  dashboardAccess?: DashboardAccess
): Promise<{
  canAccess: boolean
  reason?: string
  requiredStep?: string
  completionStatus?: {
    kycCompleted: boolean
    bankingSubmitted: boolean
    agreementsSigned: boolean
  }
}> {
  const role = (userRole || '').toLowerCase().trim()
  // Admin roles always have access
  if (role === 'fm_admin' || role === 'fa_admin' || role === 'admin') {
    return { canAccess: true }
  }

  // For suppliers and buyers, check completion requirements
  if (role === 'supplier' || role === 'buyer') {
    // Get completion statuses
    const kycStatus = await getKYCStatus(userId)
    const bankingStatus = await getBankingStatus(userId)
    const agreementsSigned = await hasSignedRequiredAgreements(userId, role)

    const completionStatus = {
      kycCompleted: kycStatus?.status === 'approved',
      bankingSubmitted: bankingStatus?.status === 'verified' || bankingStatus?.status === 'pending',
      agreementsSigned
    }

    // Check KYC completion first
    if (!completionStatus.kycCompleted) {
      return {
        canAccess: false,
        reason: 'KYC process not completed or approved',
        requiredStep: 'complete_kyc',
        completionStatus
      }
    }

    // Check banking submission
    if (!completionStatus.bankingSubmitted) {
      return {
        canAccess: false,
        reason: 'Banking details not submitted',
        requiredStep: 'submit_banking',
        completionStatus
      }
    }

    // Check agreement signing - THIS IS THE KEY REQUIREMENT
    if (!completionStatus.agreementsSigned) {
      return {
        canAccess: false,
        reason: 'Required agreements not signed',
        requiredStep: 'sign_agreements',
        completionStatus
      }
    }

    // All requirements met - grant access
    return { 
      canAccess: true,
      completionStatus
    }
  }

  return {
    canAccess: false,
    reason: 'Invalid user role',
    requiredStep: 'contact_support'
  }
}

// Helper function to determine the next required step for onboarding
export async function getNextOnboardingStep(userId: string, userRole: string): Promise<{
  step: string
  title: string
  description: string
  completed: boolean
}[]> {
  const kycStatus = await getKYCStatus(userId)
  const bankingStatus = await getBankingStatus(userId)
  const agreementsSigned = await hasSignedRequiredAgreements(userId, userRole)

  const steps = [
    {
      step: 'complete_kyc',
      title: 'Complete KYC Verification',
      description: 'Submit required documents for identity and business verification',
      completed: kycStatus?.status === 'approved'
    },
    {
      step: 'submit_banking',
      title: 'Submit Banking Details',
      description: 'Provide bank account information for payment processing',
      completed: bankingStatus?.status === 'verified' || bankingStatus?.status === 'pending'
    },
    {
      step: 'sign_agreements',
      title: 'Sign Legal Agreements',
      description: `Sign the required ${userRole} terms and conditions`,
      completed: agreementsSigned
    }
  ]

  return steps
}

// Helper to check if user can access a specific feature
export function canAccessFeature(
  userRole: string, 
  feature: string, 
  dashboardAccess?: DashboardAccess
): boolean {
  // Admin roles can access all features
  if (userRole === 'fm_admin' || userRole === 'fa_admin' || userRole === 'admin') {
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
  if (!requiredLevels || !dashboardAccess) {
    return false
  }

  return requiredLevels.includes(dashboardAccess.access_level)
}

// Helper to get user's current onboarding progress percentage
export async function getOnboardingProgress(userId: string, userRole: string): Promise<{
  percentage: number
  completedSteps: number
  totalSteps: number
  currentStep?: string
}> {
  const steps = await getNextOnboardingStep(userId, userRole)
  const completedSteps = steps.filter(step => step.completed).length
  const totalSteps = steps.length
  const percentage = Math.round((completedSteps / totalSteps) * 100)
  
  const currentStep = steps.find(step => !step.completed)?.step

  return {
    percentage,
    completedSteps,
    totalSteps,
    currentStep
  }
}