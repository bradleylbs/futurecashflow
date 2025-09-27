import { NextRequest, NextResponse } from "next/server"
import { generateOnboardingChecklist } from "@/lib/onboarding-utils"

export async function GET(request: NextRequest) {
  try {
    // Get user info from middleware headers
    const userId = request.headers.get("x-user-id")
    const userRole = request.headers.get("x-user-role")
    if (!userId || userRole !== "supplier") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }
    const checklist = await generateOnboardingChecklist(userId, userRole)
    return NextResponse.json({ checklist })
  } catch (error) {
    console.error("Onboarding checklist error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
