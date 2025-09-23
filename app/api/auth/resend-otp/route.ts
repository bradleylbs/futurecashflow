
import { type NextRequest, NextResponse } from "next/server"
import { getUserByEmail, createOTP } from "@/lib/database"
import { generateOTP, hashOTP } from "@/lib/auth"
import { sendOTPEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const { email, purpose } = await request.json()

    if (!email || !purpose) {
      return NextResponse.json({ error: "Email and purpose are required" }, { status: 400 })
    }

    // Get user by email
    const user = await getUserByEmail(email)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Generate new OTP
    const otp = generateOTP()
    const otpHash = await hashOTP(otp)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    const otpResult = await createOTP(user.id, email, otpHash, purpose, expiresAt)

    if (!otpResult.success) {
      return NextResponse.json({ error: "Failed to generate verification code" }, { status: 500 })
    }

    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp, purpose)

    if (!emailSent) {
      return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 })
    }

    return NextResponse.json({
      message: "Verification code sent successfully",
    })
  } catch (error) {
    console.error("Resend OTP error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
