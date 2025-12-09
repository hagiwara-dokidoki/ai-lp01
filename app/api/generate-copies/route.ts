import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/lib/services/gemini';
import { StructuredContext } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { context } = await request.json();

    if (!context) {
      return NextResponse.json(
        { error: 'Context is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 500 }
      );
    }

    // Generate copy candidates
    const geminiService = new GeminiService(apiKey);
    const candidates = await geminiService.generateCopyCandidates(context as StructuredContext);

    return NextResponse.json({
      success: true,
      data: {
        candidates,
      },
    });
  } catch (error: any) {
    console.error('Copy generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate copies' },
      { status: 500 }
    );
  }
}
