'use client';

import { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { PromptVariant, PromptVariantKey, SelectedCopies, SelectedColors, ScrapedImage } from '@/lib/types';

interface PromptViewerProps {
  prompts: PromptVariant;
  selectedCopies: SelectedCopies;
  selectedColors: SelectedColors;
  selectedImages: ScrapedImage[];
  onBack: () => void;
}

export default function PromptViewer({
  prompts,
  selectedCopies,
  selectedColors,
  selectedImages,
  onBack,
}: PromptViewerProps) {
  const [activePrompt, setActivePrompt] = useState<PromptVariantKey>('A');
  const [copied, setCopied] = useState(false);
  
  // Banner generation states
  const [generatingBanner, setGeneratingBanner] = useState<PromptVariantKey | null>(null);
  const [generatedBanners, setGeneratedBanners] = useState<Partial<Record<PromptVariantKey, string>>>({});
  const [generationError, setGenerationError] = useState<string>('');
  
  // Bulk download state
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Batch generation state
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, currentVariant: '' });

  // Countdown timer state for individual banner generation
  const [countdown, setCountdown] = useState<number>(0);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const ESTIMATED_GENERATION_TIME = 20; // seconds

  // Countdown timer effect
  useEffect(() => {
    if (generatingBanner !== null) {
      // Start countdown when generation begins
      setCountdown(ESTIMATED_GENERATION_TIME);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            return 0; // Stop at 0, don't go negative
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // Clear countdown when generation ends
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      setCountdown(0);
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [generatingBanner]);

  // Get count of generated banners
  const generatedCount = Object.keys(generatedBanners).length;

  // Bulk download function - download all generated banners as ZIP
  const handleBulkDownload = async () => {
    const generatedKeys = Object.keys(generatedBanners) as PromptVariantKey[];
    
    if (generatedKeys.length === 0) {
      alert('ダウンロードするバナーがありません。先にバナーを生成してください。');
      return;
    }

    setIsDownloading(true);

    try {
      const zip = new JSZip();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      
      // Add each generated banner to the ZIP
      for (const key of generatedKeys) {
        const base64Data = generatedBanners[key];
        if (base64Data) {
          const variant = variants.find(v => v.key === key);
          const fileName = `banner_${key}_${variant?.description.replace(/[・\/]/g, '_') || 'unknown'}.png`;
          
          // Convert base64 to binary
          const binaryData = atob(base64Data);
          const uint8Array = new Uint8Array(binaryData.length);
          for (let i = 0; i < binaryData.length; i++) {
            uint8Array[i] = binaryData.charCodeAt(i);
          }
          
          zip.file(fileName, uint8Array);
        }
      }

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `banners_${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(downloadUrl);
      
      console.log(`✅ Downloaded ${generatedKeys.length} banners as ZIP`);
    } catch (error) {
      console.error('Failed to create ZIP:', error);
      alert('ZIPファイルの作成に失敗しました。');
    } finally {
      setIsDownloading(false);
    }
  };

  const variants: Array<{ 
    key: PromptVariantKey; 
    label: string; 
    description: string;
    characteristics: string;
    category: 'basic' | 'style' | 'mood';
  }> = [
    // Basic layouts
    { 
      key: 'A', 
      label: 'A', 
      description: '王道・高CV構図',
      characteristics: 'プロフェッショナルで信頼感のあるデザイン。コンバージョン重視。',
      category: 'basic'
    },
    { 
      key: 'B', 
      label: 'B', 
      description: 'クリエイティブ・差別化',
      characteristics: 'アーティスティックで目を引くデザイン。ブランディング重視。',
      category: 'basic'
    },
    { 
      key: 'C', 
      label: 'C', 
      description: 'シンプル・ミニマル',
      characteristics: 'すっきりとした現代的なデザイン。読みやすさ重視。',
      category: 'basic'
    },
    { 
      key: 'D', 
      label: 'D', 
      description: 'インパクト重視',
      characteristics: '大胆で注目を集めるデザイン。緊急性や強い印象。',
      category: 'basic'
    },
    // Style-based
    { 
      key: 'E', 
      label: 'E', 
      description: 'ストーリー型',
      characteristics: '物語性のあるビジュアルフロー。感情的なつながり。',
      category: 'style'
    },
    { 
      key: 'F', 
      label: 'F', 
      description: 'テクノロジー・モダン',
      characteristics: '未来的でイノベーティブな印象。先進性をアピール。',
      category: 'style'
    },
    { 
      key: 'G', 
      label: 'G', 
      description: 'ナチュラル・オーガニック',
      characteristics: '自然で温かみのある雰囲気。サステナブルな印象。',
      category: 'style'
    },
    { 
      key: 'H', 
      label: 'H', 
      description: 'ラグジュアリー・高級感',
      characteristics: 'プレミアムで洗練された印象。特別感を演出。',
      category: 'style'
    },
    // Mood-based
    { 
      key: 'I', 
      label: 'I', 
      description: 'ポップ・カジュアル',
      characteristics: '明るく楽しい雰囲気。若年層向けのアピール。',
      category: 'mood'
    },
    { 
      key: 'J', 
      label: 'J', 
      description: '和風・ジャパニーズ',
      characteristics: '日本の美意識を取り入れたデザイン。文化的な要素。',
      category: 'mood'
    },
    { 
      key: 'K', 
      label: 'K', 
      description: 'グリッド・構造的',
      characteristics: '整理された情報配置。EC・複数商品向け。',
      category: 'mood'
    },
    { 
      key: 'L', 
      label: 'L', 
      description: '感情訴求・エモーショナル',
      characteristics: '心に響くイメージ。憧れやライフスタイル訴求。',
      category: 'mood'
    },
  ];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateBanner = async (variant: PromptVariantKey) => {
    setGeneratingBanner(variant);
    setGenerationError('');

    try {
      console.log(`🎨 Generating banner ${variant} using Gemini 3 Pro Image...`);
      console.log(`📸 Sending ${selectedImages.length} images to API:`, selectedImages.map((img, i) => `${i+1}. ${img.alt || 'No alt'} (${img.url.substring(0, 60)}...)`));

      // Create enhanced prompt with strict instructions
      const enhancedPrompt = `${prompts[variant]}

🚨 CRITICAL INSTRUCTION - DO NOT MODIFY REFERENCE IMAGES:
You are provided with ${selectedImages.length} reference images.
YOU MUST use these images EXACTLY AS THEY ARE in the banner composition.

MANDATORY RULES:
1. ✅ DO: Place the provided images as-is in the banner layout
2. ✅ DO: Resize/crop images to fit the composition if needed
3. ✅ DO: Arrange them creatively in the 1080x1080px banner
4. ❌ DO NOT: Redraw, regenerate, or recreate the images
5. ❌ DO NOT: Change the content of the images
6. ❌ DO NOT: Generate new versions of the products/subjects shown
7. ❌ DO NOT: Apply artistic filters or style changes to the images

THINK OF THIS AS: Photo collage or magazine layout design
- Use the ACTUAL photos provided
- Just arrange them in the banner space
- Add text elements as specified

The reference images are attached below. Use them DIRECTLY.`;

      const imagesToSend = selectedImages.map(img => ({
        url: img.url,
        alt: img.alt,
        width: img.width,
        height: img.height,
      }));
      
      console.log(`📤 Request payload - images count: ${imagesToSend.length}`);
      
      const response = await fetch('/api/generate-banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          variant,
          selectedImages: imagesToSend,
          selectedCopies: {
            h1: selectedCopies.h1,
            h2: selectedCopies.h2,
            h3: selectedCopies.h3,
            h4: selectedCopies.h4,
          },
          selectedColors: {
            base: selectedColors.base,
            h1: selectedColors.h1,
            h2: selectedColors.h2,
            h3: selectedColors.h3,
            h4: selectedColors.h4,
          },
          useCollage: false, // Use Gemini 3 Pro Image API
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to generate banner');
      }

      console.log(`✅ Banner ${variant} generated successfully using ${result.data.method}`);

      // Store the generated banner (base64 image data)
      setGeneratedBanners(prev => ({
        ...prev,
        [variant]: result.data.imageData,
      }));

    } catch (error: any) {
      console.error(`❌ Failed to generate banner ${variant}:`, error);
      setGenerationError(error.message || 'バナー生成に失敗しました');
    } finally {
      setGeneratingBanner(null);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        プロンプト12案 & バナープレビュー
      </h2>

      {/* Summary */}
      <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-3">✨ 確定内容</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">テキスト</h4>
            <div className="space-y-1">
              <p><strong>H1:</strong> {selectedCopies.h1}</p>
              <p><strong>H2:</strong> {selectedCopies.h2}</p>
              <p><strong>H3:</strong> {selectedCopies.h3}</p>
              <p><strong>H4:</strong> {selectedCopies.h4}</p>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">カラー</h4>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded border" style={{ backgroundColor: selectedColors.base }} />
                <span>ベース: {selectedColors.base}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded border" style={{ backgroundColor: selectedColors.h1 }} />
                <span>H1: {selectedColors.h1}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded border" style={{ backgroundColor: selectedColors.h2 }} />
                <span>H2: {selectedColors.h2}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded border" style={{ backgroundColor: selectedColors.h3 }} />
                <span>H3: {selectedColors.h3}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded border" style={{ backgroundColor: selectedColors.h4 }} />
                <span>H4: {selectedColors.h4}</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">選択画像 ({selectedImages.length}枚)</h4>
            <div className="space-y-2">
              {selectedImages.map((img, index) => (
                <div key={img.id} className="flex items-start space-x-2">
                  <div className="flex-shrink-0 w-12 h-12 bg-gray-200 rounded overflow-hidden">
                    <img 
                      src={img.url} 
                      alt={img.alt || 'Image'} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 truncate" title={img.alt || 'No description'}>
                      {index + 1}. {img.alt || 'No description'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {img.width}×{img.height}px
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
              <strong>📸 画像の使用：</strong> 上記の画像がプロンプトに反映され、バナーのビジュアル要素として使用されます
            </div>
          </div>
        </div>
      </div>

      {/* Prompt Tabs - Categorized */}
      <div className="border-b border-gray-200 mb-6">
        {/* Category: Basic Layouts */}
        <div className="mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">基本レイアウト</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {variants.filter(v => v.category === 'basic').map((variant) => (
            <button
              key={variant.key}
              onClick={() => setActivePrompt(variant.key)}
              className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                activePrompt === variant.key
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {variant.label}: {variant.description}
            </button>
          ))}
        </div>
        
        {/* Category: Style-based */}
        <div className="mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">スタイル別</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {variants.filter(v => v.category === 'style').map((variant) => (
            <button
              key={variant.key}
              onClick={() => setActivePrompt(variant.key)}
              className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                activePrompt === variant.key
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {variant.label}: {variant.description}
            </button>
          ))}
        </div>
        
        {/* Category: Mood-based */}
        <div className="mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ムード・雰囲気別</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {variants.filter(v => v.category === 'mood').map((variant) => (
            <button
              key={variant.key}
              onClick={() => setActivePrompt(variant.key)}
              className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                activePrompt === variant.key
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {variant.label}: {variant.description}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt Display */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">
              {variants.find(v => v.key === activePrompt)?.label}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {variants.find(v => v.key === activePrompt)?.characteristics}
            </p>
          </div>
          <button
            onClick={() => handleCopy(prompts[activePrompt])}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-md flex items-center space-x-2"
          >
            <span>{copied ? '✓' : '📋'}</span>
            <span>{copied ? 'コピーしました！' : 'プロンプトをコピー'}</span>
          </button>
        </div>

        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <strong>💡 画像の使用について：</strong>
          <p className="mt-1">
            このプロンプトには、選択された{selectedImages.length}枚の画像の視覚的要素が含まれています。
            画像生成AIは、これらの画像のスタイル、雰囲気、商品、構図を参考にバナーを作成します。
          </p>
          {selectedImages.length > 0 && (
            <div className="mt-2 text-xs">
              <strong>参照画像：</strong> {selectedImages.map((img, i) => 
                `${i + 1}. ${img.alt || 'Image'}`
              ).join(' / ')}
            </div>
          )}
        </div>
        
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100 p-6 rounded-lg font-mono text-sm overflow-auto max-h-96 border border-gray-700 shadow-inner">
          <pre className="whitespace-pre-wrap leading-relaxed">{prompts[activePrompt]}</pre>
        </div>
      </div>

      {/* Banner Preview with Generation - 12 patterns in grid */}
      <div className="mb-8">
        <h3 className="font-semibold text-gray-900 mb-4">バナープレビュー（1080×1080px）- 12パターン</h3>
        
        {/* Generate All & Bulk Download Buttons */}
        <div className="mb-4 flex justify-between items-center">
          {/* Generated count indicator */}
          <div className="text-sm text-gray-600">
            {generatedCount > 0 && (
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
                ✅ {generatedCount}パターン生成済み
              </span>
            )}
          </div>
          
          <div className="flex gap-3">
            {/* Bulk Download Button */}
            <button
              onClick={handleBulkDownload}
              disabled={generatedCount === 0 || isDownloading}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md flex items-center gap-2 ${
                generatedCount > 0
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isDownloading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>準備中...</span>
                </>
              ) : (
                <>
                  <span>📦</span>
                  <span>生成済み一括DL ({generatedCount}件)</span>
                </>
              )}
            </button>
            
            {/* Generate All Button */}
            <button
              onClick={async () => {
                const ungenerated = variants.filter(v => !generatedBanners[v.key]);
                if (ungenerated.length === 0) return;
                
                setIsBatchGenerating(true);
                setBatchProgress({ current: 0, total: ungenerated.length, currentVariant: '' });
                
                for (let i = 0; i < ungenerated.length; i++) {
                  const variant = ungenerated[i];
                  setBatchProgress({ 
                    current: i + 1, 
                    total: ungenerated.length, 
                    currentVariant: variant.description 
                  });
                  await handleGenerateBanner(variant.key);
                }
                
                setIsBatchGenerating(false);
              }}
              disabled={generatingBanner !== null || isBatchGenerating}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg text-sm font-semibold transition-all shadow-md"
            >
              ✨ 全パターン一括生成
            </button>
          </div>
        </div>
        
        {/* Batch Generation Progress */}
        {isBatchGenerating && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800">
                一括生成中: {batchProgress.currentVariant}
              </span>
              <span className="text-sm font-bold text-blue-600">
                {batchProgress.current} / {batchProgress.total}
              </span>
            </div>
            <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-blue-600">
                約 {Math.ceil((batchProgress.total - batchProgress.current) * 15)} 秒残り
              </p>
              <p className="text-xs text-blue-700 font-medium">
                📸 使用画像: {selectedImages.length}枚
              </p>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {variants.map((variant) => (
            <div key={variant.key} className="text-center">
              <div className="mb-2">
                <span className={`inline-block px-2 py-1 rounded text-xs font-bold text-white ${
                  variant.category === 'basic' ? 'bg-blue-500' :
                  variant.category === 'style' ? 'bg-green-500' : 'bg-purple-500'
                }`}>
                  {variant.label}
                </span>
                <p className="text-xs text-gray-600 mt-1 font-medium">{variant.description}</p>
              </div>
              <div
                className="w-full aspect-square rounded-lg border-2 border-solid border-gray-300 overflow-hidden bg-white"
              >
                {generatedBanners[variant.key] ? (
                  /* Display generated banner */
                  <img 
                    src={`data:image/png;base64,${generatedBanners[variant.key]}`}
                    alt={`Generated Banner ${variant.key}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  /* Show placeholder or loading state */
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100">
                    {generatingBanner === variant.key ? (
                      /* Loading state with countdown */
                      <div className="text-center space-y-2 px-2">
                        <div className="relative w-14 h-14 mx-auto">
                          {/* Circular progress background */}
                          <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 56 56">
                            <circle 
                              cx="28" cy="28" r="24" 
                              fill="none" 
                              stroke="#E5E7EB" 
                              strokeWidth="4"
                            />
                            <circle 
                              cx="28" cy="28" r="24" 
                              fill="none" 
                              stroke="#3B82F6" 
                              strokeWidth="4"
                              strokeLinecap="round"
                              strokeDasharray={`${2 * Math.PI * 24}`}
                              strokeDashoffset={`${2 * Math.PI * 24 * (countdown / ESTIMATED_GENERATION_TIME)}`}
                              className="transition-all duration-1000"
                            />
                          </svg>
                          {/* Countdown number in center */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-blue-600 font-bold text-lg">
                              {countdown > 0 ? countdown : '...'}
                            </span>
                          </div>
                        </div>
                        <div className="text-blue-600 text-xs font-semibold">
                          AI生成中...
                        </div>
                        <div className="text-gray-500 text-[10px]">
                          📸 {selectedImages.length}枚の画像を使用
                        </div>
                        <div className="text-gray-400 text-[10px]">
                          {countdown > 0 ? `残り約${countdown}秒` : '完了間近...'}
                        </div>
                      </div>
                    ) : (
                      /* Placeholder */
                      <div className="text-center space-y-2">
                        <div className="text-gray-400 text-3xl mb-2">🎨</div>
                        <button
                          onClick={() => handleGenerateBanner(variant.key)}
                          disabled={generatingBanner !== null}
                          className="py-2 px-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          生成
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-2 space-y-1">
                {generatedBanners[variant.key] ? (
                  /* Download button for generated banner */
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = `data:image/png;base64,${generatedBanners[variant.key]}`;
                      link.download = `banner_${variant.key}_${Date.now()}.png`;
                      link.click();
                    }}
                    className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition-colors"
                  >
                    💾 DL
                  </button>
                ) : (
                  <button
                    onClick={() => handleCopy(prompts[variant.key])}
                    className="w-full py-1.5 px-3 bg-gray-500 hover:bg-gray-600 text-white rounded text-xs font-semibold transition-colors"
                  >
                    📋 コピー
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {generationError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-semibold text-red-900 mb-2">❌ エラー</h4>
          <p className="text-sm text-red-800">{generationError}</p>
          <button
            onClick={() => setGenerationError('')}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            閉じる
          </button>
        </div>
      )}

      {/* Enhanced Info Box */}
      <div className="mb-6 space-y-4">
        <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg">
          <h4 className="font-bold text-blue-900 mb-3 flex items-center">
            <span className="text-2xl mr-2">🎨</span>
            バナー生成の手順
          </h4>
          <ol className="text-sm text-blue-900 space-y-2 ml-6 list-decimal">
            <li className="font-medium">
              上記の「プロンプトをコピー」ボタンをクリック
            </li>
            <li className="font-medium">
              お好みの画像生成AIツールを開く
              <div className="ml-4 mt-1 text-blue-700">
                <div>推奨: <a href="https://www.genspark.ai" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">Genspark AI</a> (nano-banana-pro モデル)</div>
                <div>その他: DALL-E 3, Midjourney, Stable Diffusion XL</div>
              </div>
            </li>
            <li className="font-medium">
              コピーしたプロンプトを貼り付けて生成
            </li>
            <li className="font-medium">
              生成サイズを 1080×1080px (1:1) に設定
            </li>
            <li className="font-medium">
              12パターン全て生成して比較、最適なものを選択
            </li>
          </ol>
        </div>

        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-semibold text-yellow-900 mb-2">💡 プロTips</h4>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• プロンプトは自由に編集・カスタマイズ可能です</li>
            <li>• 複数パターン生成して、最も効果的なバナーを選びましょう</li>
            <li>• カラーコードは既に最適化されています</li>
            <li>• 生成後の微調整には画像編集ツールをご利用ください</li>
          </ul>
        </div>

        <div className="p-5 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg">
          <h4 className="font-bold text-green-900 mb-3 flex items-center">
            <span className="text-2xl mr-2">✨</span>
            Gemini 3 Pro Image（nano-banana-pro）による生成
          </h4>
          <p className="text-sm text-green-800 mb-3">
            このシステムでは、<strong>Gemini 3 Pro Image (nano-banana-pro)</strong> モデルを使用してバナー画像を生成できます。
            参照画像を加工せず、コラージュ素材として活用し、プロフェッショナルなバナーを作成します。
          </p>
          <div className="text-sm text-green-800 space-y-2">
            <p className="font-semibold">📸 12種類のバリエーション:</p>
            <div className="ml-4 text-xs text-green-700">
              基本レイアウト（4種）/ スタイル別（4種）/ ムード・雰囲気別（4種）
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          戻る
        </button>
        
        <button
          onClick={() => window.location.reload()}
          className="bg-green-600 text-white py-3 px-8 rounded-lg font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
        >
          🎉 完了 - 最初から
        </button>
      </div>
    </div>
  );
}
