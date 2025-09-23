// lib/onboarding-utils.ts - Utilities for managing onboarding progress
import { 
  updateDashboardAccessLevel, 
  createDashboardAccess, 
  getDashboardAccess,
  getKYCStatus,
  getBankingStatus,
  getUserAgreements 
} from './database'

// Update user's dashboard access level when they complete a step
export async function updateUserProgressLevel(
  userId: string, 
  completedStep: 'kyc_approved' | 'banking_submitted' | 'agreement_signed' | 'banking_verified'
) {
  try {
    const currentAccess = await getDashboardAccess(userId)
    
    if (!currentAccess) {
      // Create initial dashboard access if it doesn't exist
      const kycStatus = await getKYCStatus(userId)
      if (kycStatus) {
        await createDashboardAccess(userId, kycStatus.id, completedStep)
      }
      return { success: true }
    }

    // Update the access level with additional data based on step
    const additionalData: any = {}
    
    switch (completedStep) {
      case 'banking_submitted':
        additionalData.bankingSubmissionDate = new Date()
        break
      case 'agreement_signed':
        additionalData.agreementSigningDate = new Date()
        break
      case 'banking_verified':
        additionalData.bankingVerificationDate = new Date()
        break
    }

    const result = await updateDashboardAccessLevel(userId, completedStep, additionalData)
    return result
  } catch (error) {
    console.error('Failed to update user progress level:', error)
    return { success: false, error: 'Failed to update progress' }
  }
}

// Check if user has completed all required onboarding steps
export async function checkOnboardingCompletion(userId: string, userRole: string): Promise<{
  isComplete: boolean
  missingSteps: string[]
  nextStep?: string
}> {
  try {
    const kycStatus = await getKYCStatus(userId)
    const bankingStatus = await getBankingStatus(userId)
    const agreements = (await getUserAgreements(userId)) ?? []

    const missingSteps: string[] = []

    // Check KYC completion
    if (!kycStatus || kycStatus.status !== 'approved') {
      missingSteps.push('complete_kyc')
    }

    // Check banking submission
    if (!bankingStatus || (bankingStatus.status !== 'verified' && bankingStatus.status !== 'pending')) {
      missingSteps.push('submit_banking')
    }

    // Check agreement signing
    const requiredAgreementType = userRole === 'supplier' ? 'supplier_terms' : 'buyer_terms'
    const signedAgreement = agreements.find(
      agreement => agreement.agreement_type === requiredAgreementType && agreement.status === 'signed'
    )
    
    if (!signedAgreement) {
      missingSteps.push('sign_agreements')
    }

    return {
      isComplete: missingSteps.length === 0,
      missingSteps,
      nextStep: missingSteps[0]
    }
  } catch (error) {
    console.error('Failed to check onboarding completion:', error)
    return {
      isComplete: false,
      missingSteps: ['complete_kyc', 'submit_banking', 'sign_agreements'],
      nextStep: 'complete_kyc'
    }
  }
}

// Get onboarding step configuration
export function getOnboardingStepConfig(step: string, userRole: string) {
  const stepConfigs: Record<string, any> = {
    complete_kyc: {
      title: 'Complete KYC Verification',
      description: 'Submit required documents for identity and business verification',
      icon: '📋',
      estimatedTime: '15-20 minutes',
      requirements: [
        'Business registration certificate',
        'Proof of address',
        'Identity document',
        'Tax clearance certificate'
      ],
      nextStep: 'submit_banking'
    },
    submit_banking: {
      title: 'Submit Banking Details',
      description: 'Provide bank account information for payment processing',
      icon: '🏦',
      estimatedTime: '5-10 minutes',
      requirements: [
        'Bank account number',
        'Routing/sort code',
        'Account holder name',
        'Bank confirmation letter'
      ],
      nextStep: 'sign_agreements'
    },
    sign_agreements: {
      title: `Sign ${userRole === 'supplier' ? 'Supplier' : 'Buyer'} Agreement`,
      description: `Review and sign the required ${userRole} terms and conditions`,
      icon: '✍️',
      estimatedTime: '10-15 minutes',
      requirements: [
        `${userRole === 'supplier' ? 'Supplier' : 'Buyer'} terms and conditions`,
        'Digital signature',
        'Authorized signatory details'
      ],
      nextStep: null
    }
  }

  return stepConfigs[step] || null
}

// Generate onboarding checklist for user
export async function generateOnboardingChecklist(userId: string, userRole: string) {
  const completion = await checkOnboardingCompletion(userId, userRole)
  const steps = ['complete_kyc', 'submit_banking', 'sign_agreements']
  
  return steps.map(step => {
    const config = getOnboardingStepConfig(step, userRole)
    const isCompleted = !completion.missingSteps.includes(step)
    const isCurrent = completion.nextStep === step
    
    return {
      step,
      ...config,
      completed: isCompleted,
      current: isCurrent,
      locked: !isCompleted && !isCurrent && completion.missingSteps.includes(step)
    }
  })
}

// API helper to trigger automatic progress updates
export async function triggerProgressUpdate(userId: string, completedAction: string) {
  try {
    let newLevel: string | null = null

    switch (completedAction) {
      case 'kyc_submitted':
        // When KYC is submitted, user moves to 'under_review' but dashboard access might still be limited
        break
      case 'kyc_approved':
        newLevel = 'kyc_approved'
        break
      case 'banking_submitted':
        newLevel = 'banking_submitted'
        break
      case 'agreement_signed':
        newLevel = 'agreement_signed'
        break
      case 'banking_verified':
        newLevel = 'banking_verified'
        break
    }

    if (newLevel) {
      return await updateUserProgressLevel(userId, newLevel as any)
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to trigger progress update:', error)
    return { success: false, error: 'Failed to update progress' }
  }
}

// Helper to send progress update notifications
export async function sendProgressNotification(
  userId: string, 
  completedStep: string, 
  userEmail: string,
  userRole: string
) {
  // This would integrate with your email service
  const stepConfig = getOnboardingStepConfig(completedStep, userRole)
  
  if (!stepConfig) return

  const subject = `✅ ${stepConfig.title} - Completed!`
  const nextStepConfig = stepConfig.nextStep ? getOnboardingStepConfig(stepConfig.nextStep, userRole) : null
  
  // You can implement email sending here using your existing email service
  console.log(`Sending progress notification to ${userEmail}:`, {
    subject,
    completedStep: stepConfig.title,
    nextStep: nextStepConfig?.title || 'Access your dashboard!'
  })
}