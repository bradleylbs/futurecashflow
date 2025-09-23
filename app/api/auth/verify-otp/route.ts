import { type NextRequest, NextResponse } from "next/server"
import {
  getValidOTP,
  incrementOTPAttempts,
  markOTPVerified,
  updateUserEmailVerified,
  getUserById,
  getLatestUnverifiedOTP,
  executeQuery,
} from "@/lib/database"
import { verifyOTP, generateToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { email, otp, purpose } = await request.json()

    if (!email || !otp || !purpose) {
      return NextResponse.json({ error: "Email, OTP, and purpose are required" }, { status: 400 })
    }

    // Get valid OTP record
    const otpRecord = await getValidOTP(email, purpose)

    if (!otpRecord) {
      // If no OTP for this purpose, check if there's an unverified OTP for a different purpose to guide the client
      const latest = await getLatestUnverifiedOTP(email)
      if (latest?.purpose && latest.purpose !== purpose) {
        return NextResponse.json(
          { error: "Invalid or expired verification code", purposeHint: latest.purpose },
          { status: 400 },
        )
      }
      return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 400 })
    }

    // Check if max attempts exceeded
    if (otpRecord.attempts_count >= otpRecord.max_attempts) {
      return NextResponse.json({ error: "Maximum verification attempts exceeded" }, { status: 429 })
    }

    // Verify OTP
    const isValidOTP = await verifyOTP(otp, otpRecord.otp_code_hash)

    if (!isValidOTP) {
      // Increment attempts
      await incrementOTPAttempts(otpRecord.id)

      const remainingAttempts = otpRecord.max_attempts - (otpRecord.attempts_count + 1)
      return NextResponse.json(
        {
          error: "Invalid verification code",
          remainingAttempts: Math.max(0, remainingAttempts),
        },
        { status: 400 },
      )
    }

    // Mark OTP as verified
    await markOTPVerified(otpRecord.id)

    // Update user email verification status AND account status
    if (purpose === "registration" && otpRecord.user_id) {
      await updateUserEmailVerified(otpRecord.user_id)
      
      // CRITICAL FIX: Also update account status to active
      await executeQuery(
        `UPDATE users SET account_status = 'active', updated_at = NOW() WHERE id = ?`,
        [otpRecord.user_id]
      )
      
      console.log('✅ User account activated:', otpRecord.user_id)
    }

    // Get updated user data
    const user = otpRecord.user_id ? await getUserById(otpRecord.user_id) : null

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    const response = NextResponse.json({
      message: "Email verified successfully",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: true,
      },
    })

    // Set cookie; respect HTTPS when behind dev tunnels/reverse proxies
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

    console.log('✅ OTP verified, cookie set, user activated:', user.email)

    return response
  } catch (error) {
    console.error("OTP verification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}