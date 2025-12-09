import { NextRequest, NextResponse } from 'next/server';
import { WebScraper } from '@/lib/services/scraper';
import { ColorExtractor } from '@/lib/services/color-extractor';
import { ScrapedImage, ColorPalette } from '@/lib/types';

/**
 * Step 1: Fast HTML scraping - extracts HTML, images, and CSS colors
 * Supports single URL (string) or multiple URLs (string[])
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    
    // Support both single URL and multiple URLs
    const urls: string[] = Array.isArray(body.urls) 
      ? body.urls 
      : body.url 
        ? [body.url] 
        : [];

    if (urls.length === 0) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Initialize services
    const scraper = new WebScraper();
    const colorExtractor = new ColorExtractor();

    // Collect results from all URLs
    const allImages: ScrapedImage[] = [];
    const allCssColors: ColorPalette[] = [];
    const allAnalysisInputs: any[] = [];
    let primaryContext: any = null;
    const urlResults: Record<string, { images: number; colors: number }> = {};

    // Process each URL
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const isFirst = i === 0;
      
      try {
        console.log(`🔍 [${i + 1}/${urls.length}] Scraping URL: ${url}`);
        const scrapeStart = Date.now();
        
        const { $, html } = await scraper.scrapeUrl(url);
        console.log(`✅ HTML fetched in ${Date.now() - scrapeStart}ms`);

        // Extract context from first URL (primary)
        const basicContext = scraper.extractContext($, url);
        if (isFirst) {
          primaryContext = basicContext;
        }

        // Extract images with source URL tag
        const images = scraper.extractImages($, url);
        const taggedImages = images.map(img => ({
          ...img,
          sourceUrl: url,
          id: `${url.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20)}_${img.id}`, // Ensure unique IDs
        }));
        allImages.push(...taggedImages);

        // Extract CSS colors
        const extractedCssColors = colorExtractor.extractColors($);
        allCssColors.push(...extractedCssColors);

        // Prepare analysis input
        const title = $('title').first().text() || $('meta[property="og:title"]').attr('content') || '';
        const description = $('meta[name="description"]').attr('content') || 
                           $('meta[property="og:description"]').attr('content') || '';
        const mainContent = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 3000);

        allAnalysisInputs.push({
          url,
          title,
          description,
          mainContent,
          headlines: basicContext.headlines_raw,
          extractedColors: extractedCssColors.map(c => c.hex),
        });

        urlResults[url] = {
          images: taggedImages.length,
          colors: extractedCssColors.length,
        };

        console.log(`✅ URL ${i + 1} complete: ${taggedImages.length} images, ${extractedCssColors.length} colors`);

      } catch (urlError: any) {
        console.error(`❌ Failed to scrape ${url}:`, urlError.message);
        urlResults[url] = { images: 0, colors: 0 };
        // Continue with other URLs
      }
    }

    // Deduplicate colors
    const uniqueColors = deduplicateColors(allCssColors);

    const totalTime = Date.now() - startTime;
    console.log(`🏁 Total scrape time for ${urls.length} URLs: ${totalTime}ms`);
    console.log(`📊 Total: ${allImages.length} images, ${uniqueColors.length} unique colors`);

    // Combine analysis inputs for AI
    const combinedAnalysisInput = {
      urls,
      primaryUrl: urls[0],
      title: allAnalysisInputs[0]?.title || '',
      description: allAnalysisInputs[0]?.description || '',
      mainContent: allAnalysisInputs.map(a => a.mainContent).join('\n\n').slice(0, 8000),
      headlines: primaryContext?.headlines_raw || { h1: [], h2: [], h3: [], h4: [] },
      extractedColors: uniqueColors.map(c => c.hex),
      pageCount: urls.length,
    };

    return NextResponse.json({
      success: true,
      data: {
        // For display
        images: allImages,
        cssColors: uniqueColors,
        
        // For AI analysis
        analysisInput: combinedAnalysisInput,
        
        // Basic context
        basicContext: primaryContext,
        
        // Per-URL results
        urlResults,
      },
      timing: {
        total: totalTime,
        urlCount: urls.length,
      }
    });
  } catch (error: any) {
    console.error('❌ Scraping error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scrape URL' },
      { status: 500 }
    );
  }
}

// Helper function to deduplicate colors
function deduplicateColors(colors: ColorPalette[]): ColorPalette[] {
  const seen = new Set<string>();
  const unique: ColorPalette[] = [];
  
  for (const color of colors) {
    const normalized = color.hex.toUpperCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push({ ...color, hex: normalized });
    }
  }
  
  return unique;
}
