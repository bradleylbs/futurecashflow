// middleware.ts - Edge-safe role-based authentication middleware
import { type NextRequest, NextResponse } from "next/server"

// Edge-safe JWT payload decoder (no signature verification)
function decodeJwtPayload(token: string): { userId?: string; email?: string; role?: string } | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const payload = parts[1]
    // base64url decode without Buffer (Edge-safe)
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
    const pad = base64.length % 4 === 2 ? "==" : base64.length % 4 === 3 ? "=" : ""
    const b64 = base64 + pad
    const binary = (globalThis as any).atob(b64) as string
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const json = new TextDecoder().decode(bytes)
    const obj = JSON.parse(json)
    return obj && typeof obj === 'object' ? obj : null
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  // Public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/auth/login",
    "/register",
    "/register/supplier",
    "/verify-otp",
    "/facility-application",
    "/unauthorized",
    "/site.webmanifest",
    "/sw.js",
    "/debug",
    "/api/debug/session",
    "/api/invitations/validate",
    "/api/auth/register",
    "/api/auth/login",
    "/api/auth/session",
    "/api/auth/resend-otp",
    "/api/auth/verify-otp",
    "/api/auth/logout",
    "/api/auth/check-access",
  ]

  // Protected dashboard routes
  const dashboardRoutes = ['/dashboard']
  const adminRoutes = ['/dashboard/admin']
  const buyerRoutes = ['/dashboard/buyer']
  const supplierRoutes = ['/dashboard/supplier']

  // Check if the route is public
  const isPublic = pathname === "/" || publicRoutes.some((route) => route !== "/" && pathname.startsWith(route))
  
  // Special allowances for KYC endpoints
  const allowKycApplicationOpen = pathname.startsWith("/api/kyc/application") && (method === "GET" || method === "POST")
  const allowKycDocumentsOpen = pathname.startsWith("/api/kyc/documents") && (method === "GET" || method === "POST" || method === "OPTIONS" || method === "HEAD")
  const allowKycSubmitOpen = pathname.startsWith("/api/kyc/submit") && method === "POST"

  // Get token from cookie
  const token = request.cookies.get("auth-token")?.value

  if (token) {
    const parsed = decodeJwtPayload(token)
    if (parsed) {
      const requestHeaders = new Headers(request.headers)
      const normalizedRole = (parsed.role || "").toLowerCase().trim()
      if (parsed.userId) requestHeaders.set("x-user-id", parsed.userId)
      if (parsed.email) requestHeaders.set("x-user-email", parsed.email)
      requestHeaders.set("x-user-role", normalizedRole)

      // Handle login page redirects first (allow ?force=1 to view login anyway)
      if (pathname.startsWith('/auth/login')) {
        const force = request.nextUrl.searchParams.get('force')
        const isAdminRole = normalizedRole === 'fm_admin' || normalizedRole === 'fa_admin' || normalizedRole === 'admin'
        // Only auto-redirect admins from the login page. Buyers/suppliers may still need onboarding.
        if (force !== '1' && isAdminRole) {
          return NextResponse.redirect(new URL('/dashboard/admin', request.url))
        }
        return NextResponse.next({ request: { headers: requestHeaders } })
      }

      // Admin routing rules
      const isAdminRole = normalizedRole === 'fm_admin' || normalizedRole === 'fa_admin' || normalizedRole === 'admin'
      if (isAdminRole) {
        if (pathname === '/dashboard' || pathname === '/dashboard/') {
          return NextResponse.redirect(new URL('/dashboard/admin', request.url))
        }
        if (pathname.startsWith('/dashboard/buyer') || pathname.startsWith('/dashboard/supplier')) {
          return NextResponse.redirect(new URL('/unauthorized', request.url))
        }
        return NextResponse.next({ request: { headers: requestHeaders } })
      }

      // For non-admins, avoid DB checks in Edge: let server pages enforce finer access.
      // Still pass user headers forward and allow through, except normalize generic dashboard later server-side.
      return NextResponse.next({ request: { headers: requestHeaders } })
    }
    // If token can't be parsed, clear it and continue as unauthenticated
    const response = NextResponse.next()
    response.cookies.delete("auth-token")
    return response
  }

  // No token or invalid token
  if (isPublic || allowKycApplicationOpen || allowKycDocumentsOpen || allowKycSubmitOpen) {
    return NextResponse.next()
  }

  // Protected routes require authentication
  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  return NextResponse.redirect(new URL("/auth/login", request.url))
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|site.webmanifest|sw\\.js|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|txt|xml)).*)",
  ],
}