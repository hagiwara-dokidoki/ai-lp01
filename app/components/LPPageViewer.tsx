'use client';

import { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { LPPagePrompt, LPPageImage, SelectedColors, ScrapedImage } from '@/lib/types';

interface LPPageViewerProps {
  pages: LPPagePrompt[];
  selectedColors: SelectedColors;
  selectedImages: ScrapedImage[];
  onBack: () => void;
}

export default function LPPageViewer({
  pages,
  selectedColors,
  selectedImages,
  onBack,
}: LPPageViewerProps) {
  const [activePage, setActivePage] = useState(0);
  const [copied, setCopied] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<Record<number, LPPageImage>>({});
  const [generatingPage, setGeneratingPage] = useState<number | null>(null);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Countdown timer
  const [countdown, setCountdown] = useState<number>(0);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const ESTIMATED_GENERATION_TIME = 25;

  useEffect(() => {
    if (generatingPage !== null) {
      setCountdown(ESTIMATED_GENERATION_TIME);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    } else {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      setCountdown(0);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [generatingPage]);

  const generatedCount = Object.values(generatedImages).filter(
    img => img.status === 'completed'
  ).length;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGeneratePage = async (pageIndex: number) => {
    const page = pages[pageIndex];
    setGeneratingPage(pageIndex);
    
    setGeneratedImages(prev => ({
      ...prev,
      [pageIndex]: { pageNumber: page.pageNumber, imageData: '', status: 'generating' }
    }));

    try {
      console.log(`🎨 Generating LP page ${page.pageNumber}: ${page.title}`);

      // ページ番号をA-Lのバリアントに変換（最大12ページ）
      const variantLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
      const variant = variantLetters[page.pageNumber - 1] || 'A';
      
      const response = await fetch('/api/generate-banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: page.prompt,
          variant: variant,
          selectedImages: selectedImages.map(img => ({
            url: img.url,
            alt: img.alt,
            width: img.width,
            height: img.height,
          })),
          selectedCopies: {
            h1: page.copyText?.headline || page.title,
            h2: page.copyText?.subheadline || '',
            h3: page.copyText?.body || '',
            h4: page.copyText?.cta || '',
          },
          selectedColors,
          useCollage: false,
          aspectRatio: '9:16', // LP用縦長
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to generate page');
      }

      setGeneratedImages(prev => ({
        ...prev,
        [pageIndex]: {
          pageNumber: page.pageNumber,
          imageData: result.data.imageData,
          status: 'completed'
        }
      }));

      console.log(`✅ LP page ${page.pageNumber} generated`);

    } catch (error: any) {
      console.error(`❌ Failed to generate page ${page.pageNumber}:`, error);
      setGeneratedImages(prev => ({
        ...prev,
        [pageIndex]: {
          pageNumber: page.pageNumber,
          imageData: '',
          status: 'error',
          error: error.message
        }
      }));
    } finally {
      setGeneratingPage(null);
    }
  };

  const handleBatchGenerate = async () => {
    const ungeneratedIndices = pages
      .map((_, i) => i)
      .filter(i => !generatedImages[i] || generatedImages[i].status !== 'completed');
    
    if (ungeneratedIndices.length === 0) return;

    setIsBatchGenerating(true);
    setBatchProgress({ current: 0, total: ungeneratedIndices.length });

    for (let i = 0; i < ungeneratedIndices.length; i++) {
      setBatchProgress({ current: i + 1, total: ungeneratedIndices.length });
      await handleGeneratePage(ungeneratedIndices[i]);
    }

    setIsBatchGenerating(false);
  };

  const handleBulkDownload = async () => {
    const completedImages = Object.entries(generatedImages)
      .filter(([_, img]) => img.status === 'completed');
    
    if (completedImages.length === 0) {
      alert('ダウンロードする画像がありません。');
      return;
    }

    setIsDownloading(true);

    try {
      const zip = new JSZip();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

      for (const [indexStr, img] of completedImages) {
        const index = parseInt(indexStr);
        const page = pages[index];
        const fileName = `LP_${String(page.pageNumber).padStart(2, '0')}_${page.title.replace(/[\/\\?%*:|"<>]/g, '_')}.png`;
        
        const binaryData = atob(img.imageData);
        const uint8Array = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
          uint8Array[i] = binaryData.charCodeAt(i);
        }
        
        zip.file(fileName, uint8Array);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `LP_pages_${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(downloadUrl);
      console.log(`✅ Downloaded ${completedImages.length} pages as ZIP`);
    } catch (error) {
      console.error('Failed to create ZIP:', error);
      alert('ZIPファイルの作成に失敗しました。');
    } finally {
      setIsDownloading(false);
    }
  };

  const currentPage = pages[activePage];
  const currentImage = generatedImages[activePage];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        🖼️ LP画像生成 - {pages.length}ページ
      </h2>
      <p className="text-gray-600 mb-6">
        各ページのプロンプトを確認し、画像を生成してください。
      </p>

      {/* 一括操作ボタン */}
      <div className="mb-6 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {generatedCount > 0 && (
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
              ✅ {generatedCount}/{pages.length}ページ生成済み
            </span>
          )}
        </div>
        <div className="flex gap-3">
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
                <span>一括DL ({generatedCount}件)</span>
              </>
            )}
          </button>
          <button
            onClick={handleBatchGenerate}
            disabled={generatingPage !== null || isBatchGenerating}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg text-sm font-semibold transition-all shadow-md"
          >
            ✨ 全ページ一括生成
          </button>
        </div>
      </div>

      {/* バッチ生成プログレス */}
      {isBatchGenerating && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">
              一括生成中: {pages[batchProgress.current - 1]?.title || ''}
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
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* ページ一覧 (左サイドバー) */}
        <div className="col-span-3 bg-gray-50 rounded-lg p-4 max-h-[600px] overflow-y-auto">
          <h3 className="font-semibold text-gray-900 mb-3">ページ一覧</h3>
          <div className="space-y-2">
            {pages.map((page, index) => {
              const img = generatedImages[index];
              const isActive = activePage === index;
              const status = img?.status;
              
              return (
                <button
                  key={page.pageNumber}
                  onClick={() => setActivePage(index)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${isActive ? 'text-white' : 'text-blue-600'}`}>
                        {page.pageNumber}P
                      </span>
                      <span className="text-sm truncate">{page.title}</span>
                    </div>
                    {status === 'completed' && <span className="text-green-500">✓</span>}
                    {status === 'generating' && <span className="animate-spin">⏳</span>}
                    {status === 'error' && <span className="text-red-500">✗</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="col-span-9">
          {/* ページ詳細 */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {currentPage.pageNumber}P: {currentPage.title}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {currentPage.layoutDescription}
                </p>
              </div>
              <button
                onClick={() => handleCopy(currentPage.prompt)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
              >
                <span>{copied ? '✓' : '📋'}</span>
                <span>{copied ? 'コピー完了' : 'プロンプトコピー'}</span>
              </button>
            </div>

            {/* コピーテキスト */}
            {currentPage.copyText && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-2">📝 コピーテキスト</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {currentPage.copyText.headline && (
                    <div>
                      <span className="text-gray-500">見出し:</span>
                      <p className="font-medium text-gray-900">{currentPage.copyText.headline}</p>
                    </div>
                  )}
                  {currentPage.copyText.subheadline && (
                    <div>
                      <span className="text-gray-500">サブ見出し:</span>
                      <p className="text-gray-900">{currentPage.copyText.subheadline}</p>
                    </div>
                  )}
                  {currentPage.copyText.body && (
                    <div className="col-span-2">
                      <span className="text-gray-500">本文:</span>
                      <p className="text-gray-900">{currentPage.copyText.body}</p>
                    </div>
                  )}
                  {currentPage.copyText.cta && (
                    <div>
                      <span className="text-gray-500">CTA:</span>
                      <p className="font-medium text-blue-600">{currentPage.copyText.cta}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* プロンプト */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">🎨 画像生成プロンプト</h4>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm max-h-48 overflow-auto">
                <pre className="whitespace-pre-wrap">{currentPage.prompt}</pre>
              </div>
            </div>
          </div>

          {/* 画像プレビュー/生成 */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium text-gray-700 mb-4">🖼️ 生成画像プレビュー</h4>
            
            <div className="flex gap-6">
              {/* 画像表示エリア */}
              <div className="w-64 flex-shrink-0">
                <div className="aspect-[9/16] bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                  {currentImage?.status === 'completed' && currentImage.imageData ? (
                    <img
                      src={`data:image/png;base64,${currentImage.imageData}`}
                      alt={`LP Page ${currentPage.pageNumber}`}
                      className="w-full h-full object-cover"
                    />
                  ) : currentImage?.status === 'generating' ? (
                    <div className="text-center space-y-3 p-4">
                      <div className="relative w-16 h-16 mx-auto">
                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                          <circle cx="32" cy="32" r="28" fill="none" stroke="#E5E7EB" strokeWidth="4" />
                          <circle
                            cx="32" cy="32" r="28"
                            fill="none"
                            stroke="#3B82F6"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 28}`}
                            strokeDashoffset={`${2 * Math.PI * 28 * (countdown / ESTIMATED_GENERATION_TIME)}`}
                            className="transition-all duration-1000"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-blue-600 font-bold text-xl">
                            {countdown > 0 ? countdown : '...'}
                          </span>
                        </div>
                      </div>
                      <p className="text-blue-600 font-medium">生成中...</p>
                      <p className="text-gray-500 text-xs">
                        {countdown > 0 ? `残り約${countdown}秒` : '完了間近...'}
                      </p>
                    </div>
                  ) : currentImage?.status === 'error' ? (
                    <div className="text-center p-4">
                      <p className="text-red-500 text-4xl mb-2">⚠️</p>
                      <p className="text-red-600 text-sm">{currentImage.error || 'エラーが発生しました'}</p>
                    </div>
                  ) : (
                    <div className="text-center p-4">
                      <p className="text-gray-400 text-4xl mb-2">🎨</p>
                      <p className="text-gray-500 text-sm">未生成</p>
                    </div>
                  )}
                </div>
                
                {/* 生成/ダウンロードボタン */}
                <div className="mt-4 space-y-2">
                  {currentImage?.status === 'completed' ? (
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = `data:image/png;base64,${currentImage.imageData}`;
                        link.download = `LP_${currentPage.pageNumber}_${currentPage.title}.png`;
                        link.click();
                      }}
                      className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                    >
                      💾 ダウンロード
                    </button>
                  ) : (
                    <button
                      onClick={() => handleGeneratePage(activePage)}
                      disabled={generatingPage !== null}
                      className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
                    >
                      {currentImage?.status === 'generating' ? '生成中...' : '🎨 このページを生成'}
                    </button>
                  )}
                  
                  {currentImage?.status === 'completed' && (
                    <button
                      onClick={() => handleGeneratePage(activePage)}
                      disabled={generatingPage !== null}
                      className="w-full py-2 px-4 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors text-sm"
                    >
                      🔄 再生成
                    </button>
                  )}
                </div>
              </div>

              {/* サムネイル一覧 */}
              <div className="flex-grow">
                <h5 className="text-sm font-medium text-gray-600 mb-3">全ページサムネイル</h5>
                <div className="grid grid-cols-5 gap-2">
                  {pages.map((page, index) => {
                    const img = generatedImages[index];
                    return (
                      <button
                        key={page.pageNumber}
                        onClick={() => setActivePage(index)}
                        className={`aspect-[9/16] rounded border-2 overflow-hidden transition-all ${
                          activePage === index 
                            ? 'border-blue-600 ring-2 ring-blue-200' 
                            : 'border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        {img?.status === 'completed' && img.imageData ? (
                          <img
                            src={`data:image/png;base64,${img.imageData}`}
                            alt={`Page ${page.pageNumber}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <span className="text-xs font-bold text-gray-400">{page.pageNumber}P</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ナビゲーション */}
      <div className="mt-8 flex justify-between">
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
