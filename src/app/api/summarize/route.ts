import { NextRequest, NextResponse } from "next/server";
import { generateSummary } from "@/lib/ai-service";
import { checkAuth } from "@/lib/auth-helper";

export async function POST(request: NextRequest) {
  // Check authentication
  const auth = await checkAuth();
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 },
      );
    }

    const summary = await generateSummary(content);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Summary API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate summary",
      },
      { status: 500 },
    );
  }
}
