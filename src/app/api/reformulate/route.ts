import { NextRequest, NextResponse } from "next/server";
import { reformulateBriefing, reformulateSelection } from "@/lib/ai-service";
import { checkAuth } from "@/lib/auth-helper";

export async function POST(req: NextRequest) {
  // Check authentication
  const auth = await checkAuth();
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const body = await req.json();
    const { mode, content, fullSentence, selectionStart, selectionEnd } = body;

    if (mode === "selection") {
      // Regenerate only selected text with full sentence context
      if (!fullSentence || typeof fullSentence !== "string") {
        return NextResponse.json(
          { error: "Full sentence context is required" },
          { status: 400 },
        );
      }

      if (selectionStart === undefined || selectionEnd === undefined) {
        return NextResponse.json(
          { error: "Selection boundaries are required" },
          { status: 400 },
        );
      }

      const reformulatedText = await reformulateSelection(
        fullSentence,
        selectionStart,
        selectionEnd,
      );

      return NextResponse.json({ content: reformulatedText });
    } else {
      // Regenerate full content
      if (!content || typeof content !== "string") {
        return NextResponse.json(
          { error: "Content is required" },
          { status: 400 },
        );
      }

      const reformulatedContent = await reformulateBriefing(content);

      return NextResponse.json({ content: reformulatedContent });
    }
  } catch (error) {
    console.error("[REFORMULATE API] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to reformulate content";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
