import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScrapedImage, StructuredContext } from '../types';

export class WebScraper {
  private readonly MAX_IMAGES = 30;
  private readonly MIN_IMAGE_SIZE = 64;
  private readonly TIMEOUT_MS = 5000; // Reduced from 10000ms to 5000ms
  private readonly MAX_HTML_SIZE = 500000; // 500KB limit for faster parsing
  
  // Logo detection patterns
  private readonly LOGO_PATTERNS = [
    /logo/i,
    /brand/i,
    /symbol/i,
    /emblem/i,
    /mark/i,
    /icon/i,
  ];
  
  private readonly LOGO_SELECTORS = [
    'header img',
    '.logo img',
    '#logo img',
    '[class*="logo"] img',
    '[id*="logo"] img',
    'a[href="/"] img',
    '.navbar-brand img',
    '.site-logo img',
    'img[class*="logo"]',
    'img[alt*="logo" i]',
    'img[alt*="ロゴ"]',
  ];

  /**
   * Fast scrape with streaming - fetches only essential HTML parts
   */
  async scrapeUrl(url: string): Promise<{
    html: string;
    $ : cheerio.CheerioAPI;
  }> {
    const startTime = Date.now();
    
    try {
      // Validate URL
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol. Only HTTP and HTTPS are allowed.');
      }

      // SSRF protection
      const hostname = parsedUrl.hostname;
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.')
      ) {
        throw new Error('Access to internal IPs is not allowed.');
      }

      // Use streaming response for faster processing
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Encoding': 'gzip, deflate',
          'Accept-Language': 'ja,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
        timeout: this.TIMEOUT_MS,
        maxRedirects: 3, // Reduced from 5 to 3
        maxContentLength: this.MAX_HTML_SIZE,
        decompress: true,
      });

      let html = response.data;
      
      // Truncate if too large for faster parsing
      if (typeof html === 'string' && html.length > this.MAX_HTML_SIZE) {
        console.log(`⚠️ HTML truncated from ${html.length} to ${this.MAX_HTML_SIZE} bytes`);
        html = html.substring(0, this.MAX_HTML_SIZE);
      }

      // Use cheerio to parse HTML
      const $ = cheerio.load(html);

      const elapsed = Date.now() - startTime;
      console.log(`✅ Scrape completed in ${elapsed}ms`);

      return { html, $ };
    } catch (error: any) {
      const elapsed = Date.now() - startTime;
      console.error(`❌ Scrape failed after ${elapsed}ms:`, error.message);
      throw new Error(`Failed to scrape URL: ${error.message}`);
    }
  }

  /**
   * Fast context extraction - parallelized and optimized
   */
  extractContext($: cheerio.CheerioAPI, url: string): StructuredContext {
    const startTime = Date.now();
    
    // Extract meta information first (fastest)
    const title = $('title').first().text() || $('meta[property="og:title"]').attr('content') || '';
    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || '';

    // Extract headlines in parallel (using a single pass)
    const headlines_raw = this.extractAllHeadingsFast($);

    // Extract main content (optimized)
    const mainContent = this.extractMainContentFast($);

    // Extract keywords (simplified for speed)
    const keywords = this.extractKeywordsFast(mainContent);

    // Extract entities (simplified)
    const entities = this.extractEntitiesFast($);

    // Generate summary
    const summary = this.generateSummary(title, description, mainContent);

    // Extract benefits (limited)
    const benefits = this.extractBenefitsFast($);

    // Infer target audience
    const target = this.inferTarget(mainContent, keywords);

    const elapsed = Date.now() - startTime;
    console.log(`✅ Context extraction completed in ${elapsed}ms`);

    return {
      summary,
      benefits,
      target,
      headlines_raw,
      keywords_top: keywords.slice(0, 15), // Reduced from 20
      entities,
    };
  }

  /**
   * Fast heading extraction - single DOM pass
   */
  private extractAllHeadingsFast($: cheerio.CheerioAPI): {
    h1: string[];
    h2: string[];
    h3: string[];
    h4: string[];
  } {
    const result = { h1: [] as string[], h2: [] as string[], h3: [] as string[], h4: [] as string[] };
    const limits = { h1: 5, h2: 8, h3: 8, h4: 5 }; // Limit per heading type
    
    // Single query for all headings
    $('h1, h2, h3, h4').each((_, elem) => {
      const tagName = (elem as any).tagName?.toLowerCase() as 'h1' | 'h2' | 'h3' | 'h4';
      if (tagName && result[tagName] && result[tagName].length < limits[tagName]) {
        const text = $(elem).text().trim();
        if (text.length >= 2 && text.length <= 80) {
          result[tagName].push(text);
        }
      }
    });
    
    return result;
  }

  /**
   * Fast main content extraction
   */
  private extractMainContentFast($: cheerio.CheerioAPI): string {
    // Try priority selectors first
    const prioritySelectors = ['main', 'article', '[role="main"]', '.main-content'];
    
    for (const selector of prioritySelectors) {
      const elem = $(selector).first();
      if (elem.length) {
        const content = elem.text().replace(/\s+/g, ' ').trim();
        if (content.length > 100) {
          return content.slice(0, 3000); // Limit content size
        }
      }
    }

    // Fallback: get body text without script/style (but don't modify DOM)
    const bodyClone = $('body').clone();
    bodyClone.find('script, style, nav, footer, aside, noscript').remove();
    const content = bodyClone.text().replace(/\s+/g, ' ').trim();
    
    return content.slice(0, 3000);
  }

  /**
   * Fast keyword extraction
   */
  private extractKeywordsFast(content: string): string[] {
    const text = content.toLowerCase().slice(0, 2000); // Limit text size
    const words = text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\w]{2,}/g) || [];
    
    // Count frequency with Map (faster than object)
    const frequency = new Map<string, number>();
    for (const word of words) {
      if (word.length >= 2 && word.length <= 20) {
        frequency.set(word, (frequency.get(word) || 0) + 1);
      }
    }

    // Sort by frequency and return top results
    return [...frequency.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word]) => word);
  }

  /**
   * Fast entity extraction
   */
  private extractEntitiesFast($: cheerio.CheerioAPI): string[] {
    const entities: string[] = [];
    
    // Get og:title
    const productName = $('meta[property="og:title"]').attr('content');
    if (productName) {
      entities.push(productName);
    }

    // Extract prices from body text (limited scan)
    const bodyText = $('body').text().slice(0, 5000);
    const priceMatches = bodyText.match(/[¥$€][\d,]+/g);
    if (priceMatches) {
      entities.push(...priceMatches.slice(0, 5));
    }

    return [...new Set(entities)].slice(0, 8);
  }

  /**
   * Fast benefits extraction
   */
  private extractBenefitsFast($: cheerio.CheerioAPI): string[] {
    const benefits: string[] = [];
    
    // Limit scan to first 20 list items
    $('ul li, ol li').slice(0, 20).each((_, elem) => {
      if (benefits.length >= 5) return false; // Early exit
      const text = $(elem).text().trim();
      if (text.length >= 10 && text.length <= 100) {
        benefits.push(text);
      }
    });

    return benefits;
  }

  private generateSummary(title: string, description: string, content: string): string {
    if (description && description.length > 20) {
      return description.slice(0, 200);
    }
    if (title) {
      return title;
    }
    return content.slice(0, 200);
  }

  private inferTarget(content: string, keywords: string[]): string {
    const targetKeywords: Record<string, string> = {
      '学生': 'students',
      'ビジネス': 'business professionals',
      '主婦': 'homemakers',
      '経営者': 'business owners',
      '若者': 'young people',
      'シニア': 'seniors',
    };

    const contentSample = content.slice(0, 1000);
    for (const [keyword, target] of Object.entries(targetKeywords)) {
      if (contentSample.includes(keyword)) {
        return target;
      }
    }

    return 'general audience';
  }

  /**
   * Check if an element indicates it's a logo
   */
  private isLogoElement($: cheerio.CheerioAPI, elem: any, src: string, alt: string): boolean {
    const srcLower = src.toLowerCase();
    const altLower = alt.toLowerCase();
    
    // Quick pattern check
    for (const pattern of this.LOGO_PATTERNS) {
      if (pattern.test(srcLower) || pattern.test(altLower)) {
        return true;
      }
    }
    
    // Check class and id
    const className = $(elem).attr('class') || '';
    const id = $(elem).attr('id') || '';
    
    for (const pattern of this.LOGO_PATTERNS) {
      if (pattern.test(className) || pattern.test(id)) {
        return true;
      }
    }
    
    // Check if in header (limited parent check)
    const isInHeader = $(elem).closest('header, nav, .header, .navbar').length > 0;
    const width = parseInt($(elem).attr('width') || '0');
    const height = parseInt($(elem).attr('height') || '0');
    
    if (isInHeader && ((width > 0 && width <= 300) || (height > 0 && height <= 150))) {
      return true;
    }
    
    return false;
  }

  /**
   * Fast logo extraction
   */
  extractLogos($: cheerio.CheerioAPI, baseUrl: string): ScrapedImage[] {
    const logos: ScrapedImage[] = [];
    const seen = new Set<string>();
    let idCounter = 0;

    // Use combined selector for single DOM query
    const combinedSelector = this.LOGO_SELECTORS.join(', ');
    
    try {
      $(combinedSelector).slice(0, 10).each((_, elem) => {
        if (logos.length >= 3) return false; // Early exit after 3 logos
        
        const src = $(elem).attr('src') || $(elem).attr('data-src') || $(elem).attr('href');
        const alt = $(elem).attr('alt') || 'Logo';
        
        if (src && !seen.has(src)) {
          const absoluteUrl = this.makeAbsoluteUrl(src, baseUrl);
          if (absoluteUrl && this.isValidImageUrl(absoluteUrl)) {
            seen.add(src);
            logos.push({
              url: absoluteUrl,
              score: 1.0,
              width: parseInt($(elem).attr('width') || '0'),
              height: parseInt($(elem).attr('height') || '0'),
              alt,
              source: 'auto',
              id: `logo_${idCounter++}`,
              isLogo: true,
            });
          }
        }
      });
    } catch (e) {
      // Skip selector errors
    }

    return logos;
  }

  /**
   * Fast image extraction with parallel processing
   */
  extractImages($: cheerio.CheerioAPI, baseUrl: string): ScrapedImage[] {
    const startTime = Date.now();
    const images: ScrapedImage[] = [];
    const seen = new Set<string>();
    let idCounter = 0;

    // Extract logos first
    const logos = this.extractLogos($, baseUrl);
    const logoUrls = new Set(logos.map(l => l.url));

    // Get og:image first (highest priority)
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage && !seen.has(ogImage)) {
      const absoluteUrl = this.makeAbsoluteUrl(ogImage, baseUrl);
      if (absoluteUrl && !this.isPlaceholderImage(absoluteUrl)) {
        seen.add(ogImage);
        images.push({
          url: absoluteUrl,
          score: 1.0,
          width: 1200,
          height: 630,
          alt: 'OG Image',
          source: 'auto',
          id: `auto_${idCounter++}`,
          isLogo: false,
        });
      }
    }

    // Extract from img tags (limited to first 50 for speed)
    $('img').slice(0, 50).each((_, elem) => {
      if (images.length >= this.MAX_IMAGES) return false; // Early exit
      
      const src = $(elem).attr('src');
      const dataSrc = $(elem).attr('data-src') || $(elem).attr('data-lazy-src');
      const alt = $(elem).attr('alt') || '';
      const className = $(elem).attr('class') || '';
      
      // Use data-src if src is a placeholder
      const imageSrc = (src && !this.isPlaceholderImage(src)) ? src : dataSrc;
      
      if (imageSrc && !seen.has(imageSrc)) {
        const absoluteUrl = this.makeAbsoluteUrl(imageSrc, baseUrl);
        if (absoluteUrl && this.isValidImageUrl(absoluteUrl)) {
          // Skip placeholders
          if (this.isPlaceholderAlt(alt) || this.isPlaceholderClass(className)) {
            return;
          }
          
          seen.add(imageSrc);
          const isLogo = logoUrls.has(absoluteUrl) || this.isLogoElement($, elem, imageSrc, alt);
          
          images.push({
            url: absoluteUrl,
            score: this.calculateImageScoreFast($, elem, alt),
            width: parseInt($(elem).attr('width') || '0'),
            height: parseInt($(elem).attr('height') || '0'),
            alt,
            source: 'auto',
            id: `auto_${idCounter++}`,
            isLogo,
          });
        }
      }
    });

    // Add logos not already found
    for (const logo of logos) {
      if (!seen.has(logo.url) && images.length < this.MAX_IMAGES) {
        images.push(logo);
      }
    }

    // Sort: logos first, then by score
    const result = images
      .sort((a, b) => {
        if (a.isLogo && !b.isLogo) return -1;
        if (!a.isLogo && b.isLogo) return 1;
        return b.score - a.score;
      })
      .slice(0, this.MAX_IMAGES);

    const elapsed = Date.now() - startTime;
    console.log(`✅ Image extraction completed in ${elapsed}ms (${result.length} images)`);

    return result;
  }

  /**
   * Fast image score calculation
   */
  private calculateImageScoreFast($: cheerio.CheerioAPI, elem: any, alt: string): number {
    let score = 0.5;

    // Check parent class for hero/banner (fast check)
    const parentClass = $(elem).parent().attr('class') || '';
    if (/hero|banner|main|feature/i.test(parentClass)) {
      score += 0.3;
    }

    // Check size attributes
    const width = parseInt($(elem).attr('width') || '0');
    const height = parseInt($(elem).attr('height') || '0');
    if (width > 400 || height > 400) {
      score += 0.2;
    }

    // Check alt text
    if (alt && alt.length > 5) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  private makeAbsoluteUrl(url: string, baseUrl: string): string | null {
    try {
      if (url.startsWith('data:')) {
        return null;
      }
      return new URL(url, baseUrl).href;
    } catch {
      return null;
    }
  }

  private isValidImageUrl(url: string): boolean {
    const lowerUrl = url.toLowerCase();
    
    // Quick extension check
    const hasValidExtension = /\.(jpg|jpeg|png|webp|gif|svg)/i.test(lowerUrl) || 
                              lowerUrl.includes('image');
    
    if (!hasValidExtension) {
      return false;
    }
    
    // Filter out placeholders
    return !this.isPlaceholderImage(lowerUrl);
  }

  private isPlaceholderAlt(alt: string): boolean {
    if (!alt) return false;
    const lowerAlt = alt.toLowerCase();
    return /placeholder|no.?image|no.?photo|coming.?soon|image.?not|default|dummy|loading|読み込み|画像なし/.test(lowerAlt);
  }

  private isPlaceholderClass(className: string): boolean {
    if (!className) return false;
    return /placeholder|skeleton|shimmer|blur-up|lazyload-placeholder/.test(className.toLowerCase());
  }

  private isPlaceholderImage(url: string): boolean {
    // Combined regex for faster checking
    return /placeholder|dummyimage|fakeimg|lorempixel|picsum|noimage|no-image|no_image|nophoto|blank\.|empty\.|default\.|dummy\.|spacer\.|pixel\.|transparent\.|1x1\.|loading\.|spinner\.|lazy[-_]?load|woocommerce-placeholder|coming[-_]?soon|image[-_]?not[-_]?found/i.test(url);
  }
}
