import { NextRequest, NextResponse } from 'next/server';
import { WebScraper } from '@/lib/services/scraper';
import { ColorExtractor } from '@/lib/services/color-extractor';

/**
 * Step 1: Fast HTML scraping - extracts HTML, images, and CSS colors
 * This is separated from AI analysis for better progress tracking
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Initialize services
    const scraper = new WebScraper();
    const colorExtractor = new ColorExtractor();

    // Step 1: Scrape URL (fast - 2-5 seconds)
    console.log('🔍 [Step 1] Scraping URL:', url);
    const scrapeStart = Date.now();
    const { $, html } = await scraper.scrapeUrl(url);
    console.log(`✅ HTML fetched in ${Date.now() - scrapeStart}ms`);

    // Step 2: Extract basic context from HTML
    console.log('📄 [Step 2] Extracting context...');
    const contextStart = Date.now();
    const basicContext = scraper.extractContext($, url);
    console.log(`✅ Context extracted in ${Date.now() - contextStart}ms`);

    // Step 3: Extract images
    console.log('🖼️ [Step 3] Extracting images...');
    const imageStart = Date.now();
    const images = scraper.extractImages($, url);
    console.log(`✅ ${images.length} images extracted in ${Date.now() - imageStart}ms`);
    
    // Step 4: Extract colors from CSS
    console.log('🎨 [Step 4] Extracting CSS colors...');
    const colorStart = Date.now();
    const extractedCssColors = colorExtractor.extractColors($);
    const cssColorHexes = extractedCssColors.map(c => c.hex);
    console.log(`✅ ${cssColorHexes.length} colors extracted in ${Date.now() - colorStart}ms`);

    // Extract metadata for AI analysis
    const title = $('title').first().text() || $('meta[property="og:title"]').attr('content') || '';
    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || '';
    
    // Get main content text (limited for AI)
    const mainContent = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 5000);

    const totalTime = Date.now() - startTime;
    console.log(`🏁 Total scrape time: ${totalTime}ms`);

    // Return scraped data (AI analysis will be done in separate request)
    return NextResponse.json({
      success: true,
      data: {
        // For display
        images,
        cssColors: extractedCssColors,
        
        // For AI analysis (pass to /api/analyze)
        analysisInput: {
          url,
          title,
          description,
          mainContent,
          headlines: basicContext.headlines_raw,
          extractedColors: cssColorHexes,
        },
        
        // Basic context (fallback if AI fails)
        basicContext,
      },
      timing: {
        total: totalTime,
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
