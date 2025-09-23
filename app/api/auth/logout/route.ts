import { NextRequest, NextResponse } from "next/server"

export const runtime = "edge"

// POST /api/auth/logout - clears the auth cookie and returns 200
export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ message: "Logged out successfully" })
    const xfProto = request.headers.get("x-forwarded-proto")
    const isHttps = xfProto ? xfProto.includes("https") : request.nextUrl.protocol === "https:"
    response.cookies.set("auth-token", "", {
      path: "/",
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: 0,
    })
    return response
  } catch (e) {
    // Fallback: still attempt to return a JSON response
    return NextResponse.json({ message: "Logged out" })
  }
}