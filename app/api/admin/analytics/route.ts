import { NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/database"
import { verifyJWT } from "@/lib/auth"

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Prefer middleware-provided identity if present
    let role = (request.headers.get("x-user-role") || "").toLowerCase()
    let hasUser = !!role
    if (!role) {
      const user = await verifyJWT(request)
      role = (user?.role || '').toLowerCase()
      hasUser = !!user
    }
    if (!hasUser || !['admin','fm_admin','fa_admin'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Document processing stats with invitation context
    const docStats = await executeQuery(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN d.status = 'verified' THEN 1 ELSE 0 END) as verified,
         SUM(CASE WHEN d.status = 'rejected' THEN 1 ELSE 0 END) as rejected,
         SUM(CASE WHEN d.status = 'pending' THEN 1 ELSE 0 END) as pending
       FROM documents d`
    )

    // Invitation funnel metrics
    // Note: 'expired' is computed logically to include records past expires_at that weren't completed/cancelled,
    // since we may not persist the 'expired' status in the DB for every row.
    const inviteSuccess = await executeQuery(
      `SELECT 
         COUNT(*) as sent,
         SUM(CASE WHEN status = 'opened' THEN 1 ELSE 0 END) as opened,
         SUM(CASE WHEN status = 'registered' THEN 1 ELSE 0 END) as registered,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN status NOT IN ('completed','cancelled') AND expires_at < NOW() THEN 1 ELSE 0 END) as expired
       FROM supplier_invitations`
    )

    // Application pipeline metrics
    const pipeline = await executeQuery(
      `SELECT 
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
         SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as under_review,
         SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
         SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
       FROM kyc_records`
    )

    // Agreement progress for gates
    const agreements = await executeQuery(
      `SELECT 
         SUM(CASE WHEN status = 'presented' THEN 1 ELSE 0 END) as presented,
         SUM(CASE WHEN status = 'signed' THEN 1 ELSE 0 END) as signed
       FROM agreements`
    )

    // Engagement proxy: number of buyer-supplier pairs (inferred from invitations completed)
    const relationships = await executeQuery(
      `SELECT COUNT(*) as relationships FROM supplier_invitations WHERE status = 'completed'`
    )

    // Banking statuses and dashboard access levels
    const banking = await executeQuery(
      `SELECT 
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
         SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verified,
         SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
         SUM(CASE WHEN status = 'resubmission_required' THEN 1 ELSE 0 END) as resubmission_required
       FROM banking_details`
    )
    const access = await executeQuery(
      `SELECT 
         SUM(CASE WHEN access_level = 'pre_kyc' THEN 1 ELSE 0 END) as pre_kyc,
         SUM(CASE WHEN access_level = 'kyc_approved' THEN 1 ELSE 0 END) as kyc_approved,
         SUM(CASE WHEN access_level = 'banking_submitted' THEN 1 ELSE 0 END) as banking_submitted,
         SUM(CASE WHEN access_level = 'agreement_signed' THEN 1 ELSE 0 END) as agreement_signed,
         SUM(CASE WHEN access_level = 'banking_verified' THEN 1 ELSE 0 END) as banking_verified
       FROM dashboard_access`
    )

    return NextResponse.json({
      documents: (docStats.data ?? [])[0] || { total: 0, verified: 0, rejected: 0, pending: 0 },
      invitations: (inviteSuccess.data ?? [])[0] || { sent: 0, opened: 0, registered: 0, completed: 0, expired: 0 },
      pipeline: (pipeline.data ?? [])[0] || { pending: 0, under_review: 0, approved: 0, rejected: 0 },
      agreements: (agreements.data ?? [])[0] || { presented: 0, signed: 0 },
  relationships: (relationships.data ?? [])[0] || { relationships: 0 },
  banking: (banking.data ?? [])[0] || { pending: 0, verified: 0, rejected: 0, resubmission_required: 0 },
  access: (access.data ?? [])[0] || { pre_kyc: 0, kyc_approved: 0, banking_submitted: 0, agreement_signed: 0, banking_verified: 0 },
    })
  } catch (error) {
    console.error('Admin analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
