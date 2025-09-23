// api/auth/check-access/route.ts - API endpoint to check dashboard access
import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { getUserWithDashboardAccess, getOnboardingProgress } from "@/lib/auth-helpers"

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ 
        error: "Not authenticated",
        canAccess: false 
      }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ 
        error: "Invalid token",
        canAccess: false 
      }, { status: 401 })
    }

    const userWithAccess = await getUserWithDashboardAccess(payload.userId)
    
    if (!userWithAccess) {
      return NextResponse.json({ 
        error: "User not found",
        canAccess: false 
      }, { status: 404 })
    }

    // Get onboarding progress for non-admin users
    let onboardingProgress = undefined
    if (userWithAccess.role !== 'fm_admin' && userWithAccess.role !== 'fa_admin' && userWithAccess.role !== 'admin') {
      onboardingProgress = await getOnboardingProgress(payload.userId, userWithAccess.role)
    }

    return NextResponse.json({
      user: {
        id: userWithAccess.id,
        email: userWithAccess.email,
        role: userWithAccess.role,
        accountStatus: userWithAccess.account_status
      },
      canAccess: userWithAccess.canAccessDashboard,
      requiredStep: userWithAccess.requiredStep,
      currentLevel: userWithAccess.dashboardAccess?.access_level,
      redirectTo: userWithAccess.redirectTo,
      completionStatus: userWithAccess.completionStatus,
      onboardingProgress
    })

  } catch (error) {
    console.error("Access check error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      canAccess: false 
    }, { status: 500 })
  }
}

// POST endpoint to refresh dashboard access (useful after completing steps)
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ 
        error: "Not authenticated" 
      }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ 
        error: "Invalid token" 
      }, { status: 401 })
    }

    // Re-check access (useful after user completes a step)
    const userWithAccess = await getUserWithDashboardAccess(payload.userId)
    
    if (!userWithAccess) {
      return NextResponse.json({ 
        error: "User not found" 
      }, { status: 404 })
    }

    return NextResponse.json({
      message: "Access refreshed successfully",
      canAccess: userWithAccess.canAccessDashboard,
      requiredStep: userWithAccess.requiredStep,
      redirectTo: userWithAccess.redirectTo,
      completionStatus: userWithAccess.completionStatus
    })

  } catch (error) {
    console.error("Access refresh error:", error)
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 })
  }
}