import bcrypt from "bcryptjs"
import jwt, { type Secret, type SignOptions, type JwtPayload } from "jsonwebtoken"
import crypto from "crypto"

const JWT_SECRET: Secret = process.env.JWT_SECRET || "your-secret-key"
const JWT_EXPIRES_IN: NonNullable<SignOptions["expiresIn"]> =
  (process.env.JWT_EXPIRES_IN as unknown as NonNullable<SignOptions["expiresIn"]>) || "7d"

export interface User {
  id: string
  email: string
  role: string
  account_status: string
  email_verified: boolean
}

export interface JWTPayload {
  userId: string
  email: string
  role: string
}

// Password utilities
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// JWT utilities
export function generateToken(payload: JWTPayload): string {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN }
  return jwt.sign(payload, JWT_SECRET, options)
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload | string
    if (typeof decoded === "object" && decoded !== null) {
      const maybe = decoded as Record<string, unknown>
      if (typeof maybe.userId === "string" && typeof maybe.email === "string" && typeof maybe.role === "string") {
        return {
          userId: maybe.userId,
          email: maybe.email,
          role: maybe.role,
        }
      }
    }
    return null
  } catch (error) {
    return null
  }
}

// OTP utilities
export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString()
}

export async function hashOTP(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10)
}

export async function verifyOTP(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash)
}

// Invitation token utilities
export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

// Validation utilities
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long")
  }

  if (!/(?=.*[a-z])/.test(password)) {
    errors.push("Password must contain at least one lowercase letter")
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push("Password must contain at least one uppercase letter")
  }

  if (!/(?=.*\d)/.test(password)) {
    errors.push("Password must contain at least one number")
  }

  if (!/(?=.*[@$!%*?&])/.test(password)) {
    errors.push("Password must contain at least one special character")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// Account lockout utilities
export function calculateLockoutDuration(attempts: number): number {
  // Progressive lockout: 3 min, 15 min, 60 min
  if (attempts >= 5) return 60 * 60 * 1000 // 60 minutes
  if (attempts >= 4) return 15 * 60 * 1000 // 15 minutes
  if (attempts >= 3) return 3 * 60 * 1000 // 3 minutes
  return 0
}

export function isAccountLocked(lockoutUntil: string | null): boolean {
  if (!lockoutUntil) return false
  return new Date(lockoutUntil) > new Date()
}

// Request authentication utilities
export async function verifyJWT(request: Request): Promise<User | null> {
  try {
    const cookieHeader = request.headers.get("cookie") || request.headers.get("Cookie") || ""
    let token: string | undefined
    if (cookieHeader) {
      // Robust cookie parsing: split on ';', trim, split first '=' only
      const parts = cookieHeader.split(";")
      for (const part of parts) {
        const [rawName, ...rest] = part.split("=")
        const name = (rawName || "").trim()
        if (name === "auth-token") {
          token = rest.join("=").trim()
          // Strip surrounding quotes if any
          if (token.startsWith('"') && token.endsWith('"')) token = token.slice(1, -1)
          break
        }
      }
    }

    if (!token) {
      return null
    }

    const payload = verifyToken(token)
    if (!payload) {
      return null
    }

    // In a real implementation, you might want to fetch fresh user data
    // For now, we'll return the payload data
    return {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      account_status: "active",
      email_verified: true,
    }
  } catch (error) {
    console.error("JWT verification error:", error)
    return null
  }
}
