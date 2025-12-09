'use client';

import { useState } from 'react';

interface ExtractedLink {
  url: string;
  text: string;
  category: 'navigation' | 'content' | 'footer' | 'other';
  isInternal: boolean;
}

interface MultiURLInputProps {
  onSubmit: (urls: string[]) => void;
  loading: boolean;
}

export default function MultiURLInput({ onSubmit, loading }: MultiURLInputProps) {
  const [step, setStep] = useState<'input' | 'select'>('input');
  const [topUrl, setTopUrl] = useState('');
  const [extractedLinks, setExtractedLinks] = useState<ExtractedLink[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [manualUrls, setManualUrls] = useState<string[]>(['']);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');

  // TOPページURLからリンクを抽出
  const handleExtractLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!topUrl.trim()) {
      setError('URLを入力してください');
      return;
    }

    // Validate URL
    try {
      new URL(topUrl);
    } catch {
      setError('有効なURLを入力してください');
      return;
    }

    setExtracting(true);

    try {
      const response = await fetch('/api/extract-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: topUrl }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'リンクの抽出に失敗しました');
      }

      setExtractedLinks(result.data.links);
      // TOPページは自動選択
      setSelectedUrls(new Set([topUrl]));
      setStep('select');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setExtracting(false);
    }
  };

  // リンクの選択切り替え
  const toggleLink = (url: string) => {
    const newSelected = new Set(selectedUrls);
    if (newSelected.has(url)) {
      // TOPページは解除不可
      if (url === topUrl) return;
      newSelected.delete(url);
    } else {
      if (newSelected.size >= 10) {
        setError('最大10ページまで選択できます');
        return;
      }
      newSelected.add(url);
    }
    setSelectedUrls(newSelected);
    setError('');
  };

  // 手動URLの追加
  const addManualUrl = () => {
    if (manualUrls.length < 5) {
      setManualUrls([...manualUrls, '']);
    }
  };

  const updateManualUrl = (index: number, value: string) => {
    const newUrls = [...manualUrls];
    newUrls[index] = value;
    setManualUrls(newUrls);
  };

  const removeManualUrl = (index: number) => {
    setManualUrls(manualUrls.filter((_, i) => i !== index));
  };

  // 最終送信
  const handleSubmit = () => {
    setError('');
    
    // 選択されたURL + 手動入力URL
    const allUrls = [
      ...Array.from(selectedUrls),
      ...manualUrls.filter(url => url.trim() !== ''),
    ];

    // 重複を削除
    const uniqueUrls = [...new Set(allUrls)];

    if (uniqueUrls.length === 0) {
      setError('少なくとも1つのURLを選択してください');
      return;
    }

    // Validate manual URLs
    for (const url of manualUrls.filter(u => u.trim())) {
      try {
        new URL(url);
      } catch {
        setError(`無効なURL: ${url}`);
        return;
      }
    }

    onSubmit(uniqueUrls);
  };

  // カテゴリーごとにリンクをグループ化
  const linksByCategory = extractedLinks.reduce((acc, link) => {
    if (!acc[link.category]) acc[link.category] = [];
    acc[link.category].push(link);
    return acc;
  }, {} as Record<string, ExtractedLink[]>);

  const categoryLabels: Record<string, string> = {
    navigation: '📍 ナビゲーション',
    content: '📄 コンテンツページ',
    footer: '🔗 フッター',
    other: '📎 その他',
  };

  // Step 1: TOP URL入力
  if (step === 'input') {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🔍 サイトURL入力
        </h2>
        <p className="text-gray-600 mb-6">
          まずTOPページのURLを入力してください。サイト内のページを自動検出します。
        </p>

        <form onSubmit={handleExtractLinks}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              TOPページURL
            </label>
            <input
              type="text"
              value={topUrl}
              onChange={(e) => setTopUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black text-lg"
              disabled={extracting}
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={extracting}
            className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {extracting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                ページを検索中...
              </span>
            ) : (
              '🔍 サイト内ページを検索'
            )}
          </button>
        </form>

        {/* Skip to manual input */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              if (topUrl.trim()) {
                setSelectedUrls(new Set([topUrl]));
              }
              setStep('select');
            }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            スキップして手動でURLを入力 →
          </button>
        </div>
      </div>
    );
  }

  // Step 2: ページ選択
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        📋 スクレイピングするページを選択
      </h2>
      <p className="text-gray-600 mb-4">
        LP素材を取得するページを選択してください（最大10ページ）
      </p>

      {/* 選択状況 */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center">
        <span className="text-blue-800 font-medium">
          ✓ {selectedUrls.size}ページ選択中
        </span>
        <button
          onClick={() => setStep('input')}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          ← TOPページを変更
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* 検出されたリンク */}
      {extractedLinks.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">🔗 検出されたページ</h3>
          
          {Object.entries(linksByCategory).map(([category, links]) => (
            <div key={category} className="mb-4">
              <h4 className="text-sm font-medium text-gray-600 mb-2">
                {categoryLabels[category] || category} ({links.length})
              </h4>
              <div className="space-y-1">
                {links.map((link) => (
                  <label
                    key={link.url}
                    className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedUrls.has(link.url)
                        ? 'bg-blue-50 border border-blue-300'
                        : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUrls.has(link.url)}
                      onChange={() => toggleLink(link.url)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="ml-3 flex-grow min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {link.text || '(タイトルなし)'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {link.url}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 手動URL入力 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-900">✏️ 手動でURLを追加</h3>
          <button
            onClick={addManualUrl}
            disabled={manualUrls.length >= 5}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
          >
            + 追加
          </button>
        </div>
        
        <div className="space-y-2">
          {manualUrls.map((url, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => updateManualUrl(index, e.target.value)}
                placeholder="https://example.com/page"
                className="flex-grow px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-black"
              />
              {manualUrls.length > 1 && (
                <button
                  onClick={() => removeManualUrl(index)}
                  className="p-2 text-gray-400 hover:text-red-500"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 送信ボタン */}
      <button
        onClick={handleSubmit}
        disabled={loading || selectedUrls.size === 0}
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
          `🚀 ${selectedUrls.size + manualUrls.filter(u => u.trim()).length}ページを解析`
        )}
      </button>
    </div>
  );
}
