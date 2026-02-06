import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAuth } from "@/lib/auth-helper";

export async function GET() {
  try {
    const auth = await checkAuth();
    
    if (!auth.authenticated || !auth.session) {
      return auth.response;
    }

    const userEmail = auth.session.user?.email;
    
    if (!userEmail) {
      return NextResponse.json({ sourceNames: [] });
    }

    // Get unique source names used by this user via author_id foreign key
    const result = await db.query(
      `SELECT DISTINCT e.source_name
       FROM pu_morning_briefings.entries e
       INNER JOIN pu_morning_briefings.users u ON e.author_id = u.id
       WHERE u.email = $1
         AND e.source_name IS NOT NULL
         AND e.source_name != ''
       ORDER BY e.source_name ASC
       LIMIT 50`,
      [userEmail]
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
