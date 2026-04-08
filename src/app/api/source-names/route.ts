import { NextResponse } from "next/server";
import { query } from "@/lib/db";
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
    const result = await query(
      `SELECT e.source_name
       FROM morning_briefings.entries e
       INNER JOIN morning_briefings.users u ON e.author_id = u.id
       WHERE u.email = $1
         AND e.source_name IS NOT NULL
         AND e.source_name != ''`,
      [userEmail],
    );

    const sourceNames = new Set<string>();
    result.rows.forEach((row: { source_name: string }) => {
      const val = row.source_name;
      if (val.startsWith("[")) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            parsed.forEach((s: string) => s && sourceNames.add(s));
            return;
          }
        } catch {}
      }
      sourceNames.add(val);
    });

    return NextResponse.json({ sourceNames: Array.from(sourceNames).sort() });
  } catch (error) {
    console.error("Error fetching source names:", error);
    return NextResponse.json(
      { error: "Failed to fetch source names" },
      { status: 500 },
    );
  }
}
