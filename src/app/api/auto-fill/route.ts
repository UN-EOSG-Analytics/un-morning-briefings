import { NextRequest, NextResponse } from 'next/server';
import { autoFillFromContent } from '@/lib/gemini-service';

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const result = await autoFillFromContent(content);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[AUTO-FILL API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process content';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
