'use client';

import { useState, useRef } from 'react';
import { ScrapedImage } from '@/lib/types';

interface ImagePreviewProps {
  images: ScrapedImage[];
  onAddImages: (newImages: ScrapedImage[]) => void;
  onNext: () => void;
  onBack: () => void;
  loading: boolean;
}

export default function ImagePreview({
  images,
  onAddImages,
  onNext,
  onBack,
  loading,
}: ImagePreviewProps) {
  const [urlInput, setUrlInput] = useState('');
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadError('');
    const newImages: ScrapedImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setUploadError('画像ファイルのみアップロードできます');
        continue;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setUploadError('ファイルサイズは5MB以下にしてください');
        continue;
      }

      try {
        // Convert to base64 data URL
        const dataUrl = await readFileAsDataURL(file);
        
        // Get image dimensions
        const dimensions = await getImageDimensions(dataUrl);
        
        const newImage: ScrapedImage = {
          id: `manual-${Date.now()}-${i}`,
          url: dataUrl,
          alt: file.name.replace(/\.[^/.]+$/, ''),
          width: dimensions.width,
          height: dimensions.height,
          score: 100, // Manual uploads get high score
          source: 'manual',
        };
        
        newImages.push(newImage);
      } catch (err) {
        console.error('Error processing file:', err);
        setUploadError('ファイルの処理中にエラーが発生しました');
      }
    }

    if (newImages.length > 0) {
      onAddImages(newImages);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle URL input
  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;

    setUploadError('');

    try {
      // Validate URL format
      new URL(urlInput);

      // Check if image loads
      const dimensions = await getImageDimensions(urlInput);

      const newImage: ScrapedImage = {
        id: `manual-url-${Date.now()}`,
        url: urlInput,
        alt: 'Manually added image',
        width: dimensions.width,
        height: dimensions.height,
        score: 100,
        source: 'manual',
      };

      onAddImages([newImage]);
      setUrlInput('');
    } catch (err: any) {
      setUploadError('無効なURLまたは画像を読み込めませんでした');
    }
  };

  // Helper function to read file as data URL
  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Helper function to get image dimensions
  const getImageDimensions = (url: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = reject;
      img.src = url;
    });
  };

  // Group images by source URL
  const imagesBySource = images.reduce((acc, img) => {
    const source = img.sourceUrl || (img.source === 'manual' ? '手動追加' : 'その他');
    if (!acc[source]) acc[source] = [];
    acc[source].push(img);
    return acc;
  }, {} as Record<string, ScrapedImage[]>);

  // Count totals
  const autoImages = images.filter(img => img.source !== 'manual' && !img.isLogo);
  const logoImages = images.filter(img => img.isLogo);
  const manualImages = images.filter(img => img.source === 'manual');

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        📸 取得した画像の確認
      </h2>
      <p className="text-gray-600 mb-6">
        スクレイピングで取得した画像を確認できます。必要に応じて画像を追加してください。
        <br />
        <span className="text-sm text-blue-600">※ 各LPページで使用する画像は、シナリオ設定画面で選択します</span>
      </p>

      {/* Stats */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm font-semibold text-blue-900">
          📊 取得した画像: {images.length}枚
        </p>
        <p className="text-xs text-gray-600 mt-1">
          サイトから取得: {autoImages.length}枚 | ロゴ: {logoImages.length}枚 | 手動追加: {manualImages.length}枚
        </p>
      </div>

      {/* Manual Image Upload Section */}
      <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <h3 className="font-semibold text-purple-900 mb-3">📤 画像を手動で追加</h3>
        
        {/* File Upload */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ファイルからアップロード
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-purple-100 file:text-purple-700
              hover:file:bg-purple-200
              cursor-pointer"
          />
        </div>

        {/* URL Input */}
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            または画像URLを入力
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm text-black"
              onKeyPress={(e) => e.key === 'Enter' && handleAddUrl()}
            />
            <button
              onClick={handleAddUrl}
              disabled={!urlInput.trim()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
            >
              追加
            </button>
          </div>
        </div>

        {/* Error Display */}
        {uploadError && (
          <p className="text-red-600 text-sm mt-2">{uploadError}</p>
        )}
      </div>

      {/* Image Gallery - Grouped by Source */}
      <div className="mb-8 space-y-6">
        {Object.entries(imagesBySource).map(([source, sourceImages]) => (
          <div key={source} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <h4 className="font-medium text-gray-700 text-sm truncate">
                {source === '手動追加' ? '📤 手動追加した画像' : `📍 ${source.length > 60 ? source.slice(0, 60) + '...' : source}`}
                <span className="ml-2 text-gray-400 font-normal">({sourceImages.length}枚)</span>
              </h4>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {sourceImages.map((image) => (
                  <div
                    key={image.id}
                    className="relative rounded overflow-hidden border border-gray-200 group"
                  >
                    <div className="aspect-square relative bg-gray-100">
                      <img
                        src={image.url}
                        alt={image.alt || 'Image'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f5f5f5" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="10"%3ENo Image%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    </div>
                    
                    {/* Labels */}
                    {image.isLogo && (
                      <div className="absolute top-0 left-0 bg-amber-500 text-white text-[8px] px-1 py-0.5">
                        LOGO
                      </div>
                    )}
                    {image.source === 'manual' && (
                      <div className="absolute top-0 left-0 bg-purple-500 text-white text-[8px] px-1 py-0.5">
                        手動
                      </div>
                    )}

                    {/* Hover overlay with dimensions */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span className="text-white text-xs text-center">
                        {image.width && image.height 
                          ? `${image.width}×${image.height}` 
                          : image.alt?.slice(0, 20) || ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {images.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">画像が見つかりませんでした</p>
            <p className="text-gray-400 text-sm mt-2">上のフォームから手動で画像を追加してください</p>
          </div>
        )}
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
          onClick={onNext}
          disabled={loading}
          className="bg-blue-600 text-white py-3 px-8 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              処理中...
            </span>
          ) : (
            '色選択へ進む →'
          )}
        </button>
      </div>
    </div>
  );
}
