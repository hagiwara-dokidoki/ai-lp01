import { NextRequest, NextResponse } from 'next/server';
import { BannerGeneratorService } from '@/lib/services/banner-generator';
import { ImageCollageService } from '@/lib/services/image-collage';
import { PromptVariantKey } from '@/lib/types';

// Valid variant keys (A through L)
const VALID_VARIANTS: PromptVariantKey[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

interface GenerateBannerRequest {
  prompt: string;
  variant: PromptVariantKey;
  selectedImages: Array<{
    url: string;
    alt?: string;
    width?: number;
    height?: number;
  }>;
  selectedCopies?: {
    h1: string;
    h2: string;
    h3: string;
    h4: string;
  };
  selectedColors?: {
    base: string;
    h1: string;
    h2: string;
    h3: string;
    h4: string;
  };
  useCollage?: boolean; // Flag to use direct image collage instead of AI generation
}

export async function POST(request: NextRequest) {
  try {
    const { 
      prompt, 
      variant, 
      selectedImages,
      selectedCopies,
      selectedColors,
      useCollage = false, // Default to using Gemini 3 Pro Image API
    } = await request.json() as GenerateBannerRequest;

    if (!variant || !VALID_VARIANTS.includes(variant)) {
      return NextResponse.json(
        { error: `Valid variant (${VALID_VARIANTS.join(', ')}) is required` },
        { status: 400 }
      );
    }

    if (!selectedImages || selectedImages.length === 0) {
      return NextResponse.json(
        { error: 'At least one image is required' },
        { status: 400 }
      );
    }

    console.log('🎨 Starting banner generation:', {
      variant,
      method: useCollage ? 'Direct Image Collage' : 'AI Generation',
      imageCount: selectedImages?.length || 0,
      imageUrls: selectedImages?.map((img, i) => `${i+1}. ${img.url?.substring(0, 60)}...`) || [],
    });

    let result;

    if (useCollage) {
      // Use direct image collage (no AI generation)
      console.log('📸 Using direct image collage method');
      const collageService = new ImageCollageService();
      
      result = await collageService.createCollage({
        variant,
        images: selectedImages,
        texts: selectedCopies || {
          h1: '',
          h2: '',
          h3: '',
          h4: '',
        },
        colors: selectedColors || {
          base: '#FFFFFF',
          h1: '#000000',
          h2: '#333333',
          h3: '#666666',
          h4: '#999999',
        },
      });
    } else {
      // Use AI generation with Gemini 3 Pro Image
      console.log('🤖 Using Gemini AI generation method');
      
      if (!prompt) {
        return NextResponse.json(
          { error: 'Prompt is required for AI generation' },
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

      const bannerGenerator = new BannerGeneratorService(apiKey);
      result = await bannerGenerator.generateBanner({
        prompt,
        variant,
        selectedImages: selectedImages || [],
      });
    }

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false,
          error: result.error || 'Failed to generate banner' 
        },
        { status: 500 }
      );
    }

    // Return the generated image as base64
    return NextResponse.json({
      success: true,
      data: {
        variant,
        imageData: result.imageData, // base64 encoded image
        mimeType: 'image/png',
        method: useCollage ? 'collage' : 'ai-generated',
      }
    });

  } catch (error: any) {
    console.error('❌ Banner generation error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to generate banner' 
      },
      { status: 500 }
    );
  }
}

export const maxDuration = 60; // 60 seconds timeout for image generation
