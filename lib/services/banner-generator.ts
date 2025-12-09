import { GoogleGenerativeAI } from '@google/generative-ai';
import { PromptVariantKey } from '@/lib/types';

export interface BannerGenerationRequest {
  prompt: string;
  variant: PromptVariantKey;
  selectedImages: Array<{
    url: string;
    alt?: string;
    width?: number;
    height?: number;
  }>;
}

export interface BannerGenerationResult {
  success: boolean;
  imageUrl?: string;
  imageData?: string; // base64
  variant: PromptVariantKey;
  error?: string;
}

export class BannerGeneratorService {
  private genAI: GoogleGenerativeAI;
  private readonly IMAGE_MODEL = 'gemini-3-pro-image-preview';

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Generate a 1080x1080px banner using Gemini 3 Pro Image (nano-banana-pro)
   * Reference images are passed as inlineData for collage/composition
   */
  async generateBanner(request: BannerGenerationRequest): Promise<BannerGenerationResult> {
    try {
      console.log('🎨 Starting banner generation:', {
        variant: request.variant,
        promptLength: request.prompt.length,
        imageCount: request.selectedImages.length,
      });

      const model = this.genAI.getGenerativeModel({
        model: this.IMAGE_MODEL,
      });

      // Prepare enhanced prompt with strict no-modification instruction
      const enhancedPrompt = `${request.prompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 CRITICAL INSTRUCTION - MANDATORY REQUIREMENT 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are receiving ${request.selectedImages.length} reference images below.

⚠️ ABSOLUTE REQUIREMENT:
YOU MUST USE THESE IMAGES **EXACTLY AS THEY ARE** IN YOUR OUTPUT.

✅ WHAT YOU MUST DO:
1. Take the provided images and place them in the banner layout
2. You can resize, crop, or reposition them to fit the composition
3. Arrange them creatively to create an attractive banner
4. Add the specified text elements on top or around the images

❌ WHAT YOU MUST NOT DO:
1. DO NOT redraw or regenerate the images
2. DO NOT change the visual content of the images
3. DO NOT recreate the products/subjects shown in the images
4. DO NOT apply artistic filters or style transformations
5. DO NOT generate new versions of what you see in the images

💡 THINK OF THIS TASK AS:
- Photo collage design (like in magazines)
- Layout composition using existing photos
- Placing actual photographs in a banner design
- NOT: creating new illustrations or artwork

The images are provided below. Use them DIRECTLY without modification.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

      const parts: any[] = [
        { text: enhancedPrompt }
      ];

      // Download and add reference images as inlineData
      // These images MUST be used as-is without modification
      console.log('📥 Downloading reference images to pass to Gemini...');
      console.log(`📸 Total images to process: ${request.selectedImages.length}`);
      
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < request.selectedImages.length; i++) {
        const image = request.selectedImages[i];
        console.log(`  📷 Processing image ${i + 1}/${request.selectedImages.length}: ${image.url.substring(0, 80)}...`);
        try {
          const { base64Data, mimeType } = await this.downloadImageAsBase64(image.url);
          
          parts.push({
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            }
          });
          
          successCount++;
          console.log(`  ✅ [${i + 1}/${request.selectedImages.length}] Added reference image: ${image.alt?.substring(0, 50) || 'No alt'} (${mimeType}, ${Math.round(base64Data.length / 1024)}KB)`);
        } catch (error: any) {
          failCount++;
          console.warn(`  ⚠️ [${i + 1}/${request.selectedImages.length}] Failed to download image ${image.url}:`, error.message);
          // Continue with other images even if one fails
        }
      }
      
      console.log(`📊 Image download summary: ${successCount} success, ${failCount} failed out of ${request.selectedImages.length} total`);

      console.log(`📤 Sending request to Gemini 3 Pro Image API with ${parts.length} parts (1 prompt + ${parts.length - 1} images)`);
      console.log(`🎯 Final image count being sent to AI: ${parts.length - 1} images`);

      const result = await model.generateContent({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          // @ts-ignore - imageConfig is available in Gemini 3 Pro Image
          imageConfig: {
            aspectRatio: '1:1', // Square format for banner
          },
        },
      });

      const response = result.response;
      
      // Extract image data from response
      // The response contains inline_data with base64 encoded image
      const candidates = response.candidates;
      if (!candidates || candidates.length === 0) {
        throw new Error('No candidates returned from API');
      }

      const parts_result = candidates[0].content.parts;
      let imageData: string | undefined;

      for (const part of parts_result) {
        // @ts-ignore - inlineData exists in image generation responses
        if (part.inlineData && part.inlineData.data) {
          // @ts-ignore
          imageData = part.inlineData.data;
          break;
        }
      }

      if (!imageData) {
        throw new Error('No image data in API response');
      }

      console.log('✅ Banner generated successfully');
      console.log('   Image data length:', imageData.length);

      return {
        success: true,
        imageData,
        variant: request.variant,
      };

    } catch (error: any) {
      console.error('❌ Banner generation failed:', error);
      
      return {
        success: false,
        variant: request.variant,
        error: error.message || 'Failed to generate banner',
      };
    }
  }

  /**
   * Download an image from URL and convert to base64
   * Returns both base64 data and MIME type
   */
  private async downloadImageAsBase64(url: string): Promise<{ base64Data: string; mimeType: string }> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      // Get MIME type from Content-Type header
      const contentType = response.headers.get('content-type');
      let mimeType = 'image/jpeg'; // Default to JPEG
      
      if (contentType) {
        mimeType = contentType.split(';')[0].trim();
      } else {
        // Try to infer from URL extension
        const urlLower = url.toLowerCase();
        if (urlLower.endsWith('.png')) mimeType = 'image/png';
        else if (urlLower.endsWith('.webp')) mimeType = 'image/webp';
        else if (urlLower.endsWith('.gif')) mimeType = 'image/gif';
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Data = buffer.toString('base64');
      
      return { base64Data, mimeType };
    } catch (error: any) {
      console.error(`Failed to download image from ${url}:`, error.message);
      throw error;
    }
  }
}
