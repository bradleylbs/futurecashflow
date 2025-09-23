import { type NextRequest, NextResponse } from "next/server"
import { createUser, createOTP, getInvitationByToken, updateInvitationStatus } from "@/lib/database"
import { hashPassword, generateOTP, hashOTP, validateEmail, validatePassword, generateToken } from "@/lib/auth"
import { sendOTPEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const { email, password, invitationToken } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: "Password validation failed", details: passwordValidation.errors },
        { status: 400 },
      )
    }

    // Determine user role based on invitation
    let role = "buyer" // Default role
    let invitation = null

    if (invitationToken) {
      invitation = await getInvitationByToken(invitationToken)
      if (!invitation) {
        return NextResponse.json({ error: "Invalid or expired invitation token" }, { status: 400 })
      }

      if (invitation.invited_email.toLowerCase() !== email.toLowerCase()) {
        return NextResponse.json({ error: "Email does not match invitation" }, { status: 400 })
      }

      role = "supplier"
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password)
    const userResult = await createUser(email, passwordHash, role)

    if (!userResult.success) {
      const errMsg = (userResult as any).error as string | undefined
      if (errMsg && /duplicate/i.test(errMsg)) {
        return NextResponse.json({ error: "Email already registered" }, { status: 409 })
      }
      return NextResponse.json({ error: "Failed to create user account" }, { status: 500 })
    }

    const user = (userResult as any).data?.[0]
    if (!user) {
      return NextResponse.json({ error: "Failed to load created user" }, { status: 500 })
    }

    // Update invitation status if applicable
    if (invitation) {
      await updateInvitationStatus(invitation.id, "registered", user.id)
    }

  // Generate and send OTP
    const otp = generateOTP()
    const otpHash = await hashOTP(otp)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    const otpResult = await createOTP(user.id, email, otpHash, "registration", expiresAt)

    if (!otpResult.success) {
      return NextResponse.json({ error: "Failed to generate verification code" }, { status: 500 })
    }

    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp, "registration")

    if (!emailSent) {
      return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 })
    }

    // Create a provisional session so the user can proceed to facility application without a separate login
    const token = generateToken({ userId: user.id, email: user.email, role: user.role })
    const response = NextResponse.json({
      message: "Registration successful. Please check your email for verification code.",
      userId: user.id,
      email: user.email,
      role: user.role,
      requiresVerification: true,
    })

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
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
