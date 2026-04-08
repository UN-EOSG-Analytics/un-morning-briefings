import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { checkAuth } from "@/lib/auth-helper";

/**
 * GET /api/whitelist
 * Fetch all whitelisted email addresses
 */
export async function GET() {
  // Check authentication
  const auth = await checkAuth();
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const result = await query(
      `SELECT
        w.id,
        w.email,
        COALESCE(w.user_id, u.id) as "userId",
        w.created_at as "createdAt",
        COALESCE(CONCAT(u.first_name, ' ', u.last_name), NULL) as "userName",
        COALESCE(CONCAT(adder.first_name, ' ', adder.last_name), 'System') as "addedBy"
      FROM morning_briefings.user_whitelist w
      LEFT JOIN morning_briefings.users u ON u.email = w.email
      LEFT JOIN morning_briefings.users adder ON w.added_by = adder.id
      ORDER BY w.created_at DESC`,
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching whitelist:", error);
    return NextResponse.json(
      { error: "Failed to fetch whitelist" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/whitelist
 * Add an email to the whitelist
 */
export async function POST(request: NextRequest) {
  // Check authentication
  const auth = await checkAuth();
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate email format
    if (!email.endsWith("@un.org")) {
      return NextResponse.json(
        { error: "Only @un.org email addresses are allowed" },
        { status: 400 },
      );
    }

    // Get the current user's ID
    const userEmail = auth.session?.user?.email;
    let addedBy: number | null = null;
    if (userEmail) {
      const userResult = await query(
        `SELECT id FROM morning_briefings.users WHERE email = $1`,
        [userEmail],
      );
      if (userResult.rows.length > 0) {
        addedBy = userResult.rows[0].id;
      }
    }

    // Check if user already exists with this email
    const existingUser = await query(
      `SELECT id FROM morning_briefings.users WHERE email = $1`,
      [email.toLowerCase()],
    );
    const userId =
      existingUser.rows.length > 0 ? existingUser.rows[0].id : null;

    // Insert into whitelist
    const result = await query(
      `INSERT INTO morning_briefings.user_whitelist (email, user_id, added_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email, user_id as "userId", created_at as "createdAt"`,
      [email.toLowerCase(), userId, addedBy],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Email already exists in whitelist" },
        { status: 409 },
      );
    }

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Error adding to whitelist:", error);
    return NextResponse.json(
      { error: "Failed to add to whitelist" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/whitelist
 * Remove an email from the whitelist
 */
export async function DELETE(request: NextRequest) {
  // Check authentication
  const auth = await checkAuth();
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Delete from whitelist
    const result = await query(
      `DELETE FROM morning_briefings.user_whitelist
       WHERE email = $1
       RETURNING email`,
      [email.toLowerCase()],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Email not found in whitelist" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, email: result.rows[0].email });
  } catch (error) {
    console.error("Error removing from whitelist:", error);
    return NextResponse.json(
      { error: "Failed to remove from whitelist" },
      { status: 500 },
    );
  }
}
