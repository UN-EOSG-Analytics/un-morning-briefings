import { NextRequest, NextResponse } from 'next/server';
import { reformulateBriefing } from '@/lib/gemini-service';

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const reformulatedContent = await reformulateBriefing(content);

    return NextResponse.json({ content: reformulatedContent });
  } catch (error) {
    console.error('[REFORMULATE API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to reformulate content';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
