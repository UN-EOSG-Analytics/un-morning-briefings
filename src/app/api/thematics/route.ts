import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { checkAuth } from "@/lib/auth-helper";

// GET /api/thematics - Fetch all distinct non-empty thematic values from the database
export async function GET() {
  const auth = await checkAuth();
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const result = await query(
      `SELECT thematic
       FROM morning_briefings.entries
       WHERE thematic IS NOT NULL AND thematic != ''`,
    );

    const thematics = new Set<string>();
    result.rows.forEach((row: { thematic: string }) => {
      const val = row.thematic;
      if (val.startsWith("[")) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            parsed.forEach((t: string) => t && thematics.add(t));
            return;
          }
        } catch {}
      }
      thematics.add(val);
    });

    return NextResponse.json({ thematics: Array.from(thematics).sort() });
  } catch (error) {
    console.error("Error fetching thematics:", error);
    return NextResponse.json(
      { error: "Failed to fetch thematics" },
      { status: 500 },
    );
  }
}
