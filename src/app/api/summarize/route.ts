import { NextRequest, NextResponse } from 'next/server';
import { generateSummary } from '@/lib/gemini-service';

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const summary = await generateSummary(content);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Summary API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
