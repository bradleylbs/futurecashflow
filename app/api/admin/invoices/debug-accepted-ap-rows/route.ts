import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/database";

export async function GET() {
  const query = `
    SELECT * FROM ap_batch_rows WHERE status = 'accepted' LIMIT 100;
  `;
  const result = await executeQuery(query);
  if (!result.success) {
    return NextResponse.json({ error: result.error || "Failed to fetch accepted AP rows" }, { status: 500 });
  }
  return NextResponse.json({ rows: result.data });
}
