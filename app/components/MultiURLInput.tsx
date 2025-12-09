'use client';

import { useState } from 'react';

interface MultiURLInputProps {
  onSubmit: (urls: string[]) => void;
  loading: boolean;
}

export default function MultiURLInput({ onSubmit, loading }: MultiURLInputProps) {
  const [urls, setUrls] = useState<string[]>(['']);
  const [error, setError] = useState('');

  const addUrl = () => {
    if (urls.length < 10) {
      setUrls([...urls, '']);
    }
  };

  const removeUrl = (index: number) => {
    if (urls.length > 1) {
      setUrls(urls.filter((_, i) => i !== index));
    }
  };

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Filter out empty URLs and validate
    const validUrls = urls.filter(url => url.trim() !== '');
    
    if (validUrls.length === 0) {
      setError('少なくとも1つのURLを入力してください');
      return;
    }

    // Basic URL validation
    const invalidUrls = validUrls.filter(url => {
      try {
        new URL(url);
        return false;
      } catch {
        return true;
      }
    });

    if (invalidUrls.length > 0) {
      setError(`無効なURLがあります: ${invalidUrls.join(', ')}`);
      return;
    }

    onSubmit(validUrls);
  };

  const pasteMultipleUrls = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const pastedUrls = text
        .split(/[\n\r,;]+/)
        .map(url => url.trim())
        .filter(url => url.length > 0);
      
      if (pastedUrls.length > 0) {
        setUrls(pastedUrls.slice(0, 10));
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        🔍 サイトURL入力
      </h2>
      <p className="text-gray-600 mb-6">
        LP素材を取得したいWebサイトのURLを入力してください。複数ページからの取得も可能です。
      </p>

      <form onSubmit={handleSubmit}>
        <div className="space-y-3 mb-4">
          {urls.map((url, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500 w-8">
                {index + 1}.
              </span>
              <input
                type="text"
                value={url}
                onChange={(e) => updateUrl(index, e.target.value)}
                placeholder={index === 0 ? "https://example.com (TOPページ)" : "https://example.com/about (サブページ)"}
                className="flex-grow px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                disabled={loading}
              />
              {urls.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeUrl(index)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  disabled={loading}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add URL / Paste buttons */}
        <div className="flex gap-3 mb-6">
          <button
            type="button"
            onClick={addUrl}
            disabled={loading || urls.length >= 10}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            + URLを追加 ({urls.length}/10)
          </button>
          <button
            type="button"
            onClick={pasteMultipleUrls}
            disabled={loading}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            📋 複数URLを貼り付け
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Info box */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">💡 複数URLの活用方法</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>TOPページ</strong>: メインビジュアル、ロゴ、ブランドカラーの取得</li>
            <li>• <strong>サービス/製品ページ</strong>: 商品画像、特徴の画像</li>
            <li>• <strong>事例/実績ページ</strong>: 導入事例、ビフォーアフター</li>
            <li>• <strong>会社概要ページ</strong>: チーム写真、オフィス画像</li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              サイト解析中...
            </span>
          ) : (
            `🚀 ${urls.filter(u => u.trim()).length || 1}ページを解析`
          )}
        </button>
      </form>
    </div>
  );
}
