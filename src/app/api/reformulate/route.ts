import { NextRequest, NextResponse } from 'next/server';
import { reformulateBriefing, reformulateSelection } from '@/lib/gemini-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, content, selectedText, beforeContext, afterContext } = body;

    if (mode === 'selection') {
      // Regenerate only selected text with context
      if (!selectedText || typeof selectedText !== 'string') {
        return NextResponse.json(
          { error: 'Selected text is required' },
          { status: 400 }
        );
      }

      const reformulatedText = await reformulateSelection(
        selectedText,
        beforeContext || '',
        afterContext || ''
      );

      return NextResponse.json({ content: reformulatedText });
    } else {
      // Regenerate full content
      if (!content || typeof content !== 'string') {
        return NextResponse.json(
          { error: 'Content is required' },
          { status: 400 }
        );
      }

      const reformulatedContent = await reformulateBriefing(content);

      return NextResponse.json({ content: reformulatedContent });
    }
  } catch (error) {
    console.error('[REFORMULATE API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to reformulate content';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
