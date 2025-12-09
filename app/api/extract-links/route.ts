import { NextRequest, NextResponse } from 'next/server';
import { WebScraper } from '@/lib/services/scraper';

interface ExtractedLink {
  url: string;
  text: string;
  category: 'navigation' | 'content' | 'footer' | 'other';
  isInternal: boolean;
}

/**
 * Extract links from a given URL
 * Returns internal links categorized by their likely purpose
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

    console.log('🔗 Extracting links from:', url);

    const scraper = new WebScraper();
    const { $ } = await scraper.scrapeUrl(url);

    // Parse base URL
    const baseUrl = new URL(url);
    const baseDomain = baseUrl.hostname;

    const links: ExtractedLink[] = [];
    const seenUrls = new Set<string>();

    // Extract all links
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      const text = $(element).text().trim().replace(/\s+/g, ' ').slice(0, 100);
      
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }

      // Resolve relative URLs
      let fullUrl: string;
      try {
        fullUrl = new URL(href, url).href;
      } catch {
        return;
      }

      // Remove hash and query params for deduplication
      const urlObj = new URL(fullUrl);
      urlObj.hash = '';
      const normalizedUrl = urlObj.href;

      // Skip if already seen
      if (seenUrls.has(normalizedUrl)) {
        return;
      }
      seenUrls.add(normalizedUrl);

      // Check if internal link
      const isInternal = urlObj.hostname === baseDomain || urlObj.hostname.endsWith('.' + baseDomain);
      
      if (!isInternal) {
        return; // Only return internal links
      }

      // Categorize link based on parent element and URL pattern
      let category: ExtractedLink['category'] = 'other';
      
      const parent = $(element).parents('nav, header, .nav, .navigation, .header, .menu').first();
      const footer = $(element).parents('footer, .footer').first();
      const main = $(element).parents('main, article, .content, .main').first();
      
      if (parent.length > 0) {
        category = 'navigation';
      } else if (footer.length > 0) {
        category = 'footer';
      } else if (main.length > 0) {
        category = 'content';
      }

      // Also check URL patterns
      const path = urlObj.pathname.toLowerCase();
      if (path.includes('/about') || path.includes('/company') || path.includes('/service') || 
          path.includes('/product') || path.includes('/feature') || path.includes('/price') ||
          path.includes('/contact') || path.includes('/faq') || path.includes('/case') ||
          path.includes('/voice') || path.includes('/news') || path.includes('/blog')) {
        if (category === 'other') {
          category = 'content';
        }
      }

      links.push({
        url: normalizedUrl,
        text: text || path,
        category,
        isInternal,
      });
    });

    // Sort by category priority and then by URL length (shorter = more important)
    const categoryPriority: Record<string, number> = {
      'navigation': 1,
      'content': 2,
      'footer': 3,
      'other': 4,
    };

    links.sort((a, b) => {
      const catDiff = categoryPriority[a.category] - categoryPriority[b.category];
      if (catDiff !== 0) return catDiff;
      return a.url.length - b.url.length;
    });

    // Limit to top 30 most relevant links
    const topLinks = links.slice(0, 30);

    const totalTime = Date.now() - startTime;
    console.log(`✅ Extracted ${topLinks.length} links in ${totalTime}ms`);

    return NextResponse.json({
      success: true,
      data: {
        baseUrl: url,
        links: topLinks,
        totalFound: links.length,
      },
      timing: {
        total: totalTime,
      }
    });

  } catch (error: any) {
    console.error('❌ Link extraction error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to extract links' },
      { status: 500 }
    );
  }
}
