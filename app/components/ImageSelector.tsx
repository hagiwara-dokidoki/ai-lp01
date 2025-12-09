'use client';

import { useState, useRef } from 'react';
import { ScrapedImage } from '@/lib/types';

interface ImageSelectorProps {
  images: ScrapedImage[];
  selectedImages: string[];
  onSelectImages: (images: string[]) => void;
  onAddImages: (newImages: ScrapedImage[]) => void;
  onNext: () => void;
  onGenerateCopies: () => void;
  loading: boolean;
  copiesAlreadyLoaded?: boolean;
}

export default function ImageSelector({
  images,
  selectedImages,
  onSelectImages,
  onAddImages,
  onNext,
  onGenerateCopies,
  loading,
  copiesAlreadyLoaded = false,
}: ImageSelectorProps) {
  const [urlInput, setUrlInput] = useState('');
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToggleImage = (imageId: string) => {
    if (selectedImages.includes(imageId)) {
      onSelectImages(selectedImages.filter(id => id !== imageId));
    } else {
      if (selectedImages.length < 6) {
        onSelectImages([...selectedImages, imageId]);
      } else {
        alert('最大6枚まで選択できます');
      }
    }
  };

  const handleContinue = () => {
    onGenerateCopies();
  };

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
      // Auto-select newly uploaded images if under limit
      const remainingSlots = 6 - selectedImages.length;
      const toSelect = newImages.slice(0, remainingSlots).map(img => img.id);
      if (toSelect.length > 0) {
        onSelectImages([...selectedImages, ...toSelect]);
      }
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
      
      // Auto-select if under limit
      if (selectedImages.length < 6) {
        onSelectImages([...selectedImages, newImage.id]);
      }

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

  // Separate auto, manual, and logo images
  const autoImages = images.filter(img => img.source !== 'manual' && !img.isLogo);
  const logoImages = images.filter(img => img.isLogo);
  const manualImages = images.filter(img => img.source === 'manual');

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        画像を選択（最大6枚）
      </h2>

      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-sm font-semibold text-green-900">
          ✅ 選択した画像: {selectedImages.length} / 6
        </p>
        <p className="text-xs text-gray-600 mt-1">
          取得した画像数: {autoImages.length}枚 | ロゴ: {logoImages.length}枚 | 手動追加: {manualImages.length}枚 | スコアの高い画像を自動選択済み
        </p>
        <p className="text-xs text-gray-500 mt-1">
          ※クリックで選択/解除できます
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
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
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

      {/* Logo Images Section */}
      {logoImages.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">🏷️ 検出されたロゴ画像</h3>
          <p className="text-xs text-gray-500 mb-3">ロゴ画像を選択すると、バナーにブランドロゴが配置されます</p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {logoImages.map((image) => (
              <div
                key={image.id}
                onClick={() => handleToggleImage(image.id)}
                className={`relative cursor-pointer rounded-lg overflow-hidden border-4 transition-all ${
                  selectedImages.includes(image.id)
                    ? 'border-amber-500 shadow-lg scale-105'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <div className="aspect-square relative bg-white flex items-center justify-center p-2">
                  <img
                    src={image.url}
                    alt={image.alt || 'Logo'}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f5f5f5" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="12"%3ELogo%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
                
                {selectedImages.includes(image.id) && (
                  <div className="absolute top-1 right-1 bg-amber-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs">
                    {selectedImages.indexOf(image.id) + 1}
                  </div>
                )}

                <div className="absolute top-1 left-1 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded text-[10px]">
                  ロゴ
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Images Section */}
      {manualImages.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">📤 手動追加した画像</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {manualImages.map((image) => (
              <div
                key={image.id}
                onClick={() => handleToggleImage(image.id)}
                className={`relative cursor-pointer rounded-lg overflow-hidden border-4 transition-all ${
                  selectedImages.includes(image.id)
                    ? 'border-purple-500 shadow-lg scale-105'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <div className="aspect-square relative bg-gray-100">
                  <img
                    src={image.url}
                    alt={image.alt || 'Manual Image'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
                
                {selectedImages.includes(image.id) && (
                  <div className="absolute top-2 right-2 bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                    {selectedImages.indexOf(image.id) + 1}
                  </div>
                )}

                <div className="absolute top-2 left-2 bg-purple-500 text-white text-xs px-2 py-1 rounded">
                  手動
                </div>

                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-2">
                  <p className="truncate">{image.alt || 'No description'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auto-scraped Images Section */}
      {autoImages.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">🔍 サイトから取得した画像</h3>
        </div>
      )}

      {images.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">画像が見つかりませんでした</p>
          <p className="text-gray-400 text-sm mt-2">上のフォームから手動で画像を追加してください</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {autoImages.map((image) => (
            <div
              key={image.id}
              onClick={() => handleToggleImage(image.id)}
              className={`relative cursor-pointer rounded-lg overflow-hidden border-4 transition-all ${
                selectedImages.includes(image.id)
                  ? 'border-blue-500 shadow-lg scale-105'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <div className="aspect-square relative bg-gray-100">
                <img
                  src={image.url}
                  alt={image.alt || 'Image'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Image load error:', image.url);
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
              
              {selectedImages.includes(image.id) && (
                <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                  {selectedImages.indexOf(image.id) + 1}
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-2">
                <p className="truncate">{image.alt || 'No description'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          disabled
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-400 cursor-not-allowed"
        >
          戻る
        </button>
        
        <button
          onClick={handleContinue}
          disabled={loading || selectedImages.length === 0}
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
          ) : copiesAlreadyLoaded ? (
            'コピー選択へ進む'
          ) : (
            'コピー生成へ進む'
          )}
        </button>
      </div>
    </div>
  );
}
