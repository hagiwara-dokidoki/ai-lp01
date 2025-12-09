import { NextRequest, NextResponse } from 'next/server';
import { GeminiService, PromptVariantWithTiming } from '@/lib/services/gemini';
import { StructuredContext, SelectedCopies, ColorPalette, SelectedColors } from '@/lib/types';

/**
 * Prompt Generation API
 * Now uses 3-batch parallel generation with timing breakdown:
 * - Batch 1: Prompts A-D (parallel)
 * - Batch 2: Prompts E-H (parallel)
 * - Batch 3: Prompts I-L (parallel)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { context, selectedCopies, selectedImages, palette, selectedColors } = await request.json();

    if (!context || !selectedCopies || !selectedColors) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Log received image data
    console.log('📸 Received selectedImages:', {
      count: selectedImages?.length || 0,
      sample: selectedImages?.[0],
    });

    console.log('🚀 Starting 3-batch parallel prompt generation...');

    // Generate prompts with timing
    const geminiService = new GeminiService(apiKey);
    const result = await geminiService.generatePrompts(
      context as StructuredContext,
      selectedCopies as SelectedCopies,
      selectedImages as any[],
      palette as ColorPalette[],
      selectedColors as SelectedColors
    ) as PromptVariantWithTiming;

    const totalTime = Date.now() - startTime;

    // Log timing breakdown
    console.log('🏁 Prompt generation complete:', {
      batch1_ABCD: `${result.timing.batch1_ABCD}ms`,
      batch2_EFGH: `${result.timing.batch2_EFGH}ms`,
      batch3_IJKL: `${result.timing.batch3_IJKL}ms`,
      geminiTotal: `${result.timing.total}ms`,
      apiTotal: `${totalTime}ms`,
    });

    // Extract prompts without timing for response
    const { timing, ...prompts } = result;

    return NextResponse.json({
      success: true,
      data: {
        prompts,
      },
      timing: {
        batch1_ABCD: timing.batch1_ABCD,
        batch2_EFGH: timing.batch2_EFGH,
        batch3_IJKL: timing.batch3_IJKL,
        total: totalTime,
      },
    });
  } catch (error: any) {
    console.error('Prompt generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate prompts' },
      { status: 500 }
    );
  }
}

// Increase timeout for prompt generation
export const maxDuration = 60;
