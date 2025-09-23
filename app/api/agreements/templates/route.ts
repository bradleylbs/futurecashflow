import { type NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth"
import { executeQuery } from "@/lib/database"

// Get agreement templates
export async function GET(request: NextRequest) {
  try {
    const user = await verifyJWT(request)
    if (!user || !["admin", "fm_admin", "fa_admin"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

  const templates = await executeQuery(`
      SELECT 
        id, template_name, template_type, version, 
        is_active, effective_date, created_at
      FROM agreement_templates 
      WHERE is_active = true
      ORDER BY template_type, version DESC
    `)

  return NextResponse.json({ templates: templates.success ? templates.data : [] })
  } catch (error) {
    console.error("Error fetching agreement templates:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Create agreement template
export async function POST(request: NextRequest) {
  try {
    const user = await verifyJWT(request)
    if (!user || !["admin", "fm_admin", "fa_admin"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { template_name, template_type, version, content_template, variables } = await request.json()

    if (!template_name || !template_type || !version || !content_template) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = await executeQuery(
      `
      INSERT INTO agreement_templates (
        template_name, template_type, version, content_template, 
        variables, created_by, approved_by, approval_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `,
      [template_name, template_type, version, content_template, variables || {}, user.id, user.id],
    )

    return NextResponse.json({
      message: "Agreement template created successfully",
      template: { template_name, template_type, version },
    })
  } catch (error) {
    console.error("Error creating agreement template:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
