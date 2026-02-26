import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAuth } from "@/lib/auth-helper";

// GET /api/thematics - Fetch all distinct non-empty thematic values from the database
export async function GET() {
  const auth = await checkAuth();
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const result = await db.query(
      `SELECT DISTINCT thematic
       FROM pu_morning_briefings.entries
       WHERE thematic IS NOT NULL AND thematic != ''
       ORDER BY thematic ASC
       LIMIT 100`,
    );

    const thematics = result.rows.map((row: { thematic: string }) => row.thematic);
    return NextResponse.json({ thematics });
  } catch (error) {
    console.error("Error fetching thematics:", error);
    return NextResponse.json(
      { error: "Failed to fetch thematics" },
      { status: 500 },
    );
  }
}
