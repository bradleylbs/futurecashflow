import { NextResponse, type NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const headers = Object.fromEntries(request.headers.entries())
    const cookie = request.cookies.get("auth-token")?.value || null
    const xfProto = headers["x-forwarded-proto"]
    const host = headers["host"]
    const proto = request.nextUrl.protocol
    const payload = cookie ? verifyToken(cookie) : null

    return NextResponse.json({
      ok: true,
      host,
      xfProto,
      protocol: proto,
      hasCookie: !!cookie,
      jwtPayload: payload ? { id: (payload as any).userId, email: (payload as any).email, role: (payload as any).role } : null,
      headersSummary: {
        "x-forwarded-proto": xfProto,
        "x-forwarded-host": headers["x-forwarded-host"] || undefined,
        "x-forwarded-port": headers["x-forwarded-port"] || undefined,
        "user-agent": headers["user-agent"] || undefined,
        "cookie": headers["cookie"] ? "<present>" : undefined,
      }
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
