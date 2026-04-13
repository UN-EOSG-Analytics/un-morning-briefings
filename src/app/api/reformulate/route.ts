import { NextRequest, NextResponse } from "next/server";
import { reformulateHtml } from "@/lib/ai-service";
import { checkAuth } from "@/lib/auth-helper";

export async function POST(req: NextRequest) {
  // Check authentication
  const auth = await checkAuth();
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const body = await req.json();
    const { content } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 },
      );
    }

    const reformulatedContent = await reformulateHtml(content);

    return NextResponse.json({ content: reformulatedContent });
  } catch (error) {
    console.error("[REFORMULATE API] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to reformulate content";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
