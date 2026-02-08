import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";

/**
 * Check if the user is authenticated
 * Returns the session if authenticated, or an error response if not
 */
export async function checkAuth() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return {
        authenticated: false,
        response: NextResponse.json(
          { error: "Unauthorized", details: "You must be logged in to access this resource" },
          { status: 401 },
        ),
      };
    }

    return { authenticated: true, session };
  } catch (error) {
    console.error("Authentication error:", error);
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: "Authentication error" },
        { status: 500 },
      ),
    };
  }
}
