import { NextResponse, type NextRequest } from "next/server"
import { verifyJWT } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    // Prefer middleware headers; fallback to cookie verification
    let userId = request.headers.get("x-user-id")
    let userEmail = request.headers.get("x-user-email") || undefined
    let userRole = request.headers.get("x-user-role") || undefined

    if (!userId || !userRole) {
      const verified = await verifyJWT(request as unknown as Request)
      if (verified) {
        userId = verified.id
        userEmail = verified.email
        userRole = verified.role
      }
    }

    if (!userId || !userRole) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }
    return NextResponse.json({ authenticated: true, user: { id: userId, email: userEmail, role: userRole } })
  } catch (e) {
    return NextResponse.json({ authenticated: false }, { status: 500 })
  }
}
