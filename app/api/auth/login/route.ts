// api/auth/login/route.ts - Enhanced login route with dashboard access control
import { type NextRequest, NextResponse } from "next/server"
import { 
  getUserByEmail, 
  updateUserLoginAttempts, 
  updateUserLastLogin, 
  createOTP 
} from "@/lib/database"
import {
  verifyPassword,
  generateToken,
  generateOTP,
  hashOTP,
  isAccountLocked,
  calculateLockoutDuration,
} from "@/lib/auth"
import { sendOTPEmail } from "@/lib/email"
import { getUserWithDashboardAccess } from "@/lib/auth-helpers"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Get user by email
    const user = await getUserByEmail(email)

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // Check if account is locked
    if (isAccountLocked(user.lockout_until)) {
      const lockoutEnd = new Date(user.lockout_until)
      const remainingTime = Math.ceil((lockoutEnd.getTime() - Date.now()) / 1000 / 60)

      return NextResponse.json(
        {
          error: "Account temporarily locked due to multiple failed attempts",
          lockoutMinutes: remainingTime,
        },
        { status: 423 },
      )
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash)

    if (!isValidPassword) {
      const newAttempts = user.failed_login_attempts + 1
      const lockoutDuration = calculateLockoutDuration(newAttempts)
      const lockoutUntil = lockoutDuration > 0 ? new Date(Date.now() + lockoutDuration) : null

  await updateUserLoginAttempts(email, newAttempts, lockoutUntil ?? null)
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // Check if email is verified
    if (!user.email_verified) {
      const otp = generateOTP()
      const otpHash = await hashOTP(otp)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

      await createOTP(user.id, email, otpHash, "login", expiresAt)
      await sendOTPEmail(email, otp, "login")

      return NextResponse.json(
        {
          error: "Email not verified",
          requiresVerification: true,
          message: "Please check your email for verification code",
        },
        { status: 403 },
      )
    }

    // Check account status
    if (user.account_status !== 'active') {
      return NextResponse.json(
        { error: "Account is not active. Please contact support." },
        { status: 403 }
      )
    }

    // Get enhanced user info with dashboard access
    const userWithAccess = await getUserWithDashboardAccess(user.id)
    if (!userWithAccess) {
      return NextResponse.json({ error: "Unable to determine user access" }, { status: 500 })
    }

    // Successful login - reset failed attempts and update last login
    await updateUserLastLogin(user.id)

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    // Prepare response data with detailed access information
    const responseData = {
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.email_verified,
      },
      redirectTo: userWithAccess.redirectTo,
      dashboardAccess: {
        canAccess: userWithAccess.canAccessDashboard,
        requiredStep: userWithAccess.requiredStep,
        currentLevel: userWithAccess.dashboardAccess?.access_level,
        completionStatus: userWithAccess.completionStatus
      },
      // Add helpful messages based on user status
      onboardingRequired: !userWithAccess.canAccessDashboard,
      nextStepMessage: getNextStepMessage(userWithAccess.requiredStep, user.role)
    }

    const response = NextResponse.json(responseData)

    // Set HTTP-only cookie (respect x-forwarded-proto for reverse proxies/dev tunnels)
    const xfProto = request.headers.get("x-forwarded-proto")
    const host = request.headers.get("host") || ""
    const isHttps = (
      (xfProto ? xfProto.includes("https") : request.nextUrl.protocol === "https:")
      || host.includes("devtunnels.ms")
    )
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to provide user-friendly next step messages
function getNextStepMessage(requiredStep?: string, userRole?: string): string | undefined {
  if (!requiredStep) return undefined

  const messages: Record<string, string> = {
    complete_kyc: "Please complete your KYC verification by submitting required documents.",
    submit_banking: "Please submit your banking details to continue with the onboarding process.",
    sign_agreements: `Please review and sign the required ${userRole} agreements to access your dashboard.`,
    contact_support: "Please contact our support team for assistance with your account."
  }

  return messages[requiredStep]
}