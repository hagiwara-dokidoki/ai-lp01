import sharp from 'sharp';
import { PromptVariantKey } from '@/lib/types';

export interface CollageImage {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface CollageLayout {
  variant: PromptVariantKey;
  images: CollageImage[];
  texts: {
    h1: string;
    h2: string;
    h3: string;
    h4: string;
  };
  colors: {
    base: string;
    h1: string;
    h2: string;
    h3: string;
    h4: string;
  };
}

export interface CollageResult {
  success: boolean;
  imageData?: string; // base64
  error?: string;
}

export class ImageCollageService {
  private readonly BANNER_SIZE = 1080; // 1080x1080px square
  
  /**
   * Create a banner by compositing actual images (no AI generation)
   * Images are used as-is without modification (except resizing to fit)
   */
  async createCollage(layout: CollageLayout): Promise<CollageResult> {
    try {
      console.log('🎨 Creating image collage:', {
        variant: layout.variant,
        imageCount: layout.images.length,
      });

      // Download all images
      const imageBuffers = await this.downloadImages(layout.images);
      
      if (imageBuffers.length === 0) {
        throw new Error('No images could be downloaded');
      }

      // Create composite based on variant
      let composite;
      switch (layout.variant) {
        case 'A':
          composite = await this.createLayoutA(imageBuffers, layout);
          break;
        case 'B':
          composite = await this.createLayoutB(imageBuffers, layout);
          break;
        case 'C':
          composite = await this.createLayoutC(imageBuffers, layout);
          break;
        default:
          composite = await this.createLayoutA(imageBuffers, layout);
      }

      // Convert to base64
      const outputBuffer = await composite.png().toBuffer();
      const base64Data = outputBuffer.toString('base64');

      console.log('✅ Collage created successfully');
      console.log('   Output size:', this.BANNER_SIZE, 'x', this.BANNER_SIZE);
      console.log('   Data length:', base64Data.length);

      return {
        success: true,
        imageData: base64Data,
      };

    } catch (error: any) {
      console.error('❌ Collage creation failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to create collage',
      };
    }
  }

  /**
   * Layout A: Standard high-conversion layout
   * - Main image at center
   * - Smaller images around
   */
  private async createLayoutA(
    imageBuffers: Buffer[],
    layout: CollageLayout
  ): Promise<sharp.Sharp> {
    const size = this.BANNER_SIZE;
    
    // Create background
    const background = sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: this.hexToRgb(layout.colors.base),
      }
    });

    const composites: sharp.OverlayOptions[] = [];

    // Main image (first image, centered, 60% of canvas)
    if (imageBuffers[0]) {
      const mainSize = Math.floor(size * 0.6);
      const mainImage = await sharp(imageBuffers[0])
        .resize(mainSize, mainSize, { fit: 'cover' })
        .toBuffer();
      
      composites.push({
        input: mainImage,
        top: Math.floor((size - mainSize) / 2),
        left: Math.floor((size - mainSize) / 2),
      });
    }

    // Secondary images (smaller, around the main image)
    const secondarySize = Math.floor(size * 0.25);
    const positions = [
      { top: 20, left: 20 },           // Top-left
      { top: 20, left: size - secondarySize - 20 }, // Top-right
      { top: size - secondarySize - 20, left: 20 }, // Bottom-left
    ];

    for (let i = 1; i < imageBuffers.length && i < 4; i++) {
      const pos = positions[i - 1];
      if (pos && imageBuffers[i]) {
        const smallImage = await sharp(imageBuffers[i])
          .resize(secondarySize, secondarySize, { fit: 'cover' })
          .toBuffer();
        
        composites.push({
          input: smallImage,
          top: pos.top,
          left: pos.left,
        });
      }
    }

    return background.composite(composites);
  }

  /**
   * Layout B: Creative bold layout
   * - Dynamic arrangement
   * - Overlapping elements
   */
  private async createLayoutB(
    imageBuffers: Buffer[],
    layout: CollageLayout
  ): Promise<sharp.Sharp> {
    const size = this.BANNER_SIZE;
    
    // Create background
    const background = sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: this.hexToRgb(layout.colors.base),
      }
    });

    const composites: sharp.OverlayOptions[] = [];

    // Diagonal arrangement with varying sizes
    const sizes = [
      Math.floor(size * 0.5),  // 50%
      Math.floor(size * 0.4),  // 40%
      Math.floor(size * 0.35), // 35%
      Math.floor(size * 0.3),  // 30%
    ];

    const positions = [
      { top: 30, left: 250 },
      { top: 150, left: 50 },
      { top: 280, left: 300 },
      { top: 100, left: 350 },
    ];

    for (let i = 0; i < imageBuffers.length && i < 4; i++) {
      const imgSize = sizes[i];
      const pos = positions[i];
      
      const resizedImage = await sharp(imageBuffers[i])
        .resize(imgSize, imgSize, { fit: 'cover' })
        .toBuffer();
      
      composites.push({
        input: resizedImage,
        top: pos.top,
        left: pos.left,
      });
    }

    return background.composite(composites);
  }

  /**
   * Layout C: Minimal modern layout
   * - Single main image with whitespace
   * - Clean and simple
   */
  private async createLayoutC(
    imageBuffers: Buffer[],
    layout: CollageLayout
  ): Promise<sharp.Sharp> {
    const size = this.BANNER_SIZE;
    
    // Create background
    const background = sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: this.hexToRgb(layout.colors.base),
      }
    });

    const composites: sharp.OverlayOptions[] = [];

    // Single large image (70% of canvas, centered)
    if (imageBuffers[0]) {
      const mainSize = Math.floor(size * 0.7);
      const mainImage = await sharp(imageBuffers[0])
        .resize(mainSize, mainSize, { fit: 'cover' })
        .toBuffer();
      
      composites.push({
        input: mainImage,
        top: Math.floor((size - mainSize) / 2),
        left: Math.floor((size - mainSize) / 2),
      });
    }

    // Small accent image in corner (if available)
    if (imageBuffers[1]) {
      const accentSize = Math.floor(size * 0.2);
      const accentImage = await sharp(imageBuffers[1])
        .resize(accentSize, accentSize, { fit: 'cover' })
        .toBuffer();
      
      composites.push({
        input: accentImage,
        top: size - accentSize - 30,
        left: 30,
      });
    }

    return background.composite(composites);
  }

  /**
   * Download images and return buffers
   */
  private async downloadImages(images: CollageImage[]): Promise<Buffer[]> {
    const buffers: Buffer[] = [];
    
    for (const image of images) {
      try {
        console.log(`  📥 Downloading: ${image.alt?.substring(0, 40)}...`);
        const response = await fetch(image.url);
        
        if (!response.ok) {
          console.warn(`  ⚠️ Failed to download: ${response.statusText}`);
          continue;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        buffers.push(buffer);
        
        console.log(`  ✅ Downloaded: ${buffer.length} bytes`);
      } catch (error: any) {
        console.warn(`  ⚠️ Error downloading ${image.url}:`, error.message);
      }
    }

    return buffers;
  }

  /**
   * Convert hex color to RGB object for sharp
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number; alpha: number } {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return { r, g, b, alpha: 1 };
  }
}
