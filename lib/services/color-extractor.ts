import * as cheerio from 'cheerio';
import { ColorPalette } from '../types';

export class ColorExtractor {
  private readonly TARGET_COLORS = 16;

  extractColors($: cheerio.CheerioAPI): ColorPalette[] {
    const colors: ColorPalette[] = [];
    const seenHex = new Set<string>();

    // Helper to add color if not duplicate and not too light/dark
    const addColor = (hex: string, source: 'css' | 'img' | 'fill' | 'logo' | 'ai', role_hint: string) => {
      const normalized = hex.toUpperCase();
      if (!seenHex.has(normalized) && this.isValidColor(normalized)) {
        seenHex.add(normalized);
        colors.push({ hex: normalized, source, role_hint });
      }
    };

    // 1. Extract from inline styles (color, background-color, border-color)
    $('[style]').each((_, elem) => {
      const style = $(elem).attr('style') || '';
      const colorMatches = style.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|rgb\([^)]+\)|rgba\([^)]+\)/g);
      
      if (colorMatches) {
        colorMatches.forEach(color => {
          const hex = this.normalizeColor(color);
          if (hex) addColor(hex, 'css', 'inline');
        });
      }
    });

    // 2. Extract from key structural elements
    const structuralSelectors = [
      'header', 'nav', 'footer', '.hero', '.banner', 
      '.btn', '.button', 'button', 'a.btn',
      '.cta', '.primary', '.secondary', '.accent',
      '.card', '.container', 'main', 'section'
    ];
    
    structuralSelectors.forEach(selector => {
      $(selector).each((_, elem) => {
        const bgColor = $(elem).css('background-color') || $(elem).attr('bgcolor');
        const textColor = $(elem).css('color');
        const borderColor = $(elem).css('border-color');
        
        if (bgColor) {
          const hex = this.normalizeColor(bgColor);
          if (hex) addColor(hex, 'css', 'background');
        }
        if (textColor) {
          const hex = this.normalizeColor(textColor);
          if (hex) addColor(hex, 'css', 'text');
        }
        if (borderColor) {
          const hex = this.normalizeColor(borderColor);
          if (hex) addColor(hex, 'css', 'border');
        }
      });
    });

    // 3. Extract from style tags (embedded CSS)
    $('style').each((_, elem) => {
      const cssText = $(elem).text() || '';
      const colorMatches = cssText.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g);
      
      if (colorMatches) {
        colorMatches.forEach(color => {
          const hex = this.normalizeColor(color);
          if (hex) addColor(hex, 'css', 'stylesheet');
        });
      }
    });

    // 4. Extract from link tags (external CSS might have color info in URL params)
    $('link[rel="stylesheet"]').each((_, elem) => {
      const href = $(elem).attr('href') || '';
      const colorMatches = href.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g);
      
      if (colorMatches) {
        colorMatches.forEach(color => {
          const hex = this.normalizeColor(color);
          if (hex) addColor(hex, 'css', 'external');
        });
      }
    });

    // 5. Extract from meta theme-color
    const themeColor = $('meta[name="theme-color"]').attr('content');
    if (themeColor) {
      const hex = this.normalizeColor(themeColor);
      if (hex) addColor(hex, 'css', 'theme');
    }

    // 6. Extract from SVG elements
    $('svg [fill], svg [stroke]').each((_, elem) => {
      const fill = $(elem).attr('fill');
      const stroke = $(elem).attr('stroke');
      
      if (fill && fill !== 'none' && fill !== 'currentColor') {
        const hex = this.normalizeColor(fill);
        if (hex) addColor(hex, 'css', 'svg');
      }
      if (stroke && stroke !== 'none' && stroke !== 'currentColor') {
        const hex = this.normalizeColor(stroke);
        if (hex) addColor(hex, 'css', 'svg');
      }
    });

    // If we still have less than TARGET_COLORS, don't add defaults yet
    // Let Gemini AI suggest the remaining colors based on brand analysis
    
    console.log(`🎨 Extracted ${colors.length} colors from site CSS`);
    
    return colors.slice(0, this.TARGET_COLORS);
  }

  // Check if color is valid (not pure white/black, has some saturation)
  private isValidColor(hex: string): boolean {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return false;
    
    // Skip pure white and near-white
    if (rgb.r > 250 && rgb.g > 250 && rgb.b > 250) return false;
    
    // Skip pure black and near-black  
    if (rgb.r < 5 && rgb.g < 5 && rgb.b < 5) return false;
    
    // Skip very low saturation grays (unless intentional)
    const max = Math.max(rgb.r, rgb.g, rgb.b);
    const min = Math.min(rgb.r, rgb.g, rgb.b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    
    // Allow grays with some variation but skip very neutral grays
    if (saturation < 0.05 && max > 50 && max < 200) return false;
    
    return true;
  }

  complementTo16Colors(extractedColors: ColorPalette[]): ColorPalette[] {
    const colors = [...extractedColors];
    
    // If we already have 16, return as is
    if (colors.length >= this.TARGET_COLORS) {
      return colors.slice(0, this.TARGET_COLORS);
    }

    // Generate complementary colors from existing ones
    const baseColors = colors.slice(0, Math.min(colors.length, 4));
    const needed = this.TARGET_COLORS - colors.length;
    
    if (baseColors.length > 0) {
      // Generate variations of existing colors
      baseColors.forEach(baseColor => {
        if (colors.length >= this.TARGET_COLORS) return;
        
        const variations = this.generateColorVariations(baseColor.hex, Math.ceil(needed / baseColors.length));
        variations.forEach(hex => {
          if (colors.length < this.TARGET_COLORS && !colors.some(c => c.hex === hex)) {
            colors.push({
              hex,
              source: 'fill',
              role_hint: 'variation',
            });
          }
        });
      });
    }

    // Fill remaining with default palette
    const defaultColors = this.getDefaultPalette();
    let colorIndex = 0;
    
    while (colors.length < this.TARGET_COLORS && colorIndex < defaultColors.length) {
      const color = defaultColors[colorIndex];
      if (!colors.some(c => c.hex === color.hex)) {
        colors.push(color);
      }
      colorIndex++;
    }

    return colors.slice(0, this.TARGET_COLORS);
  }

  // Legacy method for backwards compatibility
  complementTo8Colors(extractedColors: ColorPalette[]): ColorPalette[] {
    return this.complementTo16Colors(extractedColors).slice(0, 8);
  }

  private normalizeColor(color: string): string | null {
    // Convert to hex
    if (color.startsWith('#')) {
      if (color.length === 4) {
        // #RGB to #RRGGBB
        return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
      }
      return color.toUpperCase();
    }

    if (color.startsWith('rgb')) {
      const matches = color.match(/\d+/g);
      if (matches && matches.length >= 3) {
        const r = parseInt(matches[0]);
        const g = parseInt(matches[1]);
        const b = parseInt(matches[2]);
        return this.rgbToHex(r, g, b);
      }
    }

    return null;
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b]
      .map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
      .toUpperCase();
  }

  private generateColorVariations(baseHex: string, count: number): string[] {
    const colors: string[] = [];
    const baseRgb = this.hexToRgb(baseHex);
    
    if (!baseRgb) {
      return [];
    }

    const hsl = this.rgbToHsl(baseRgb.r, baseRgb.g, baseRgb.b);
    
    for (let i = 0; i < count; i++) {
      // Create variations by adjusting lightness and saturation
      const lightnessShift = ((i % 3) - 1) * 0.15; // -0.15, 0, +0.15
      const saturationShift = ((i % 2) === 0 ? 0.1 : -0.1);
      const hueShift = (i % 4) * 15; // 0, 15, 30, 45 degrees
      
      const newH = (hsl.h + hueShift) % 360;
      const newS = Math.min(1, Math.max(0, hsl.s + saturationShift));
      const newL = Math.min(0.9, Math.max(0.1, hsl.l + lightnessShift));
      
      const rgb = this.hslToRgb(newH, newS, newL);
      colors.push(this.rgbToHex(rgb.r, rgb.g, rgb.b));
    }

    return colors;
  }

  private rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return { h: h * 360, s, l };
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    h /= 360;
    
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private getDefaultPalette(): ColorPalette[] {
    return [
      { hex: '#3B82F6', source: 'fill', role_hint: 'primary' },
      { hex: '#1E40AF', source: 'fill', role_hint: 'accent' },
      { hex: '#DBEAFE', source: 'fill', role_hint: 'light' },
      { hex: '#10B981', source: 'fill', role_hint: 'success' },
      { hex: '#F59E0B', source: 'fill', role_hint: 'warning' },
      { hex: '#EF4444', source: 'fill', role_hint: 'danger' },
      { hex: '#8B5CF6', source: 'fill', role_hint: 'secondary' },
      { hex: '#6B7280', source: 'fill', role_hint: 'neutral' },
      { hex: '#EC4899', source: 'fill', role_hint: 'pink' },
      { hex: '#14B8A6', source: 'fill', role_hint: 'teal' },
      { hex: '#F97316', source: 'fill', role_hint: 'orange' },
      { hex: '#84CC16', source: 'fill', role_hint: 'lime' },
      { hex: '#06B6D4', source: 'fill', role_hint: 'cyan' },
      { hex: '#A855F7', source: 'fill', role_hint: 'purple' },
      { hex: '#F43F5E', source: 'fill', role_hint: 'rose' },
      { hex: '#0EA5E9', source: 'fill', role_hint: 'sky' },
    ];
  }
}
