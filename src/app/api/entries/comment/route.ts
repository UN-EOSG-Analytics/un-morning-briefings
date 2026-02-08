import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { checkAuth } from "@/lib/auth-helper";

export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const auth = await checkAuth();
    if (!auth.authenticated) {
      return auth.response;
    }

    const { entryId, comment } = await request.json();

    if (!entryId) {
      return NextResponse.json(
        { error: "Entry ID is required" },
        { status: 400 }
      );
    }

    // Update the comment in the database
    const result = await query(
      "UPDATE pu_morning_briefings.entries SET comment = $1 WHERE id = $2 RETURNING id, comment",
      [comment || null, entryId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating comment:", error);
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 }
    );
  }
}
