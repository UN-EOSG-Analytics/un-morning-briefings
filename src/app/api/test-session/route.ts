import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";

export async function GET() {
  // Only available in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const session = await getServerSession(authOptions);

    return NextResponse.json({
      hasSession: !!session,
      session: session
        ? {
            user: session.user,
            expires: session.expires,
          }
        : null,
    });
  } catch (error) {
    console.error("Session test error:", error);
    return NextResponse.json(
      { error: "Failed to get session" },
      { status: 500 },
    );
  }
}
