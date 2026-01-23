import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAuth } from "@/lib/auth-helper";

export async function GET() {
  try {
    const auth = await checkAuth();
    
    if (!auth.authenticated || !auth.session) {
      return auth.response;
    }

    const user = auth.session.user;
    // Determine author value (same logic as MorningMeetingForm)
    const fullName = user?.firstName && user?.lastName 
      ? `${user.firstName} ${user.lastName}`.trim()
      : "";
    const authorValue = fullName || user?.email || "Current User";

    // Get unique source names used by this user
    const result = await db.query(
      `SELECT DISTINCT source_name
       FROM pu_morning_briefings.entries
       WHERE author = $1
         AND source_name IS NOT NULL
         AND source_name != ''
       ORDER BY source_name ASC
       LIMIT 50`,
      [authorValue]
    );

    const sourceNames = result.rows.map((row: any) => row.source_name);

    return NextResponse.json({ sourceNames });
  } catch (error) {
    console.error("Error fetching source names:", error);
    return NextResponse.json(
      { error: "Failed to fetch source names" },
      { status: 500 }
    );
  }
}
