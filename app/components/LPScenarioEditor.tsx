'use client';

import { useState } from 'react';
import { LPPageScenario, LPScenario, ScrapedImage } from '@/lib/types';

interface LPScenarioEditorProps {
  onSubmit: (scenario: LPScenario) => void;
  onBack: () => void;
  loading: boolean;
  initialPages?: number;
  availableImages: ScrapedImage[]; // 利用可能な全画像
}

// デフォルトのページテンプレート
const DEFAULT_PAGE_TEMPLATES: Partial<LPPageScenario>[] = [
  { title: 'ファーストビュー', scenario: 'キャッチコピーとメインビジュアルで第一印象を決める' },
  { title: '問題提起', scenario: 'ターゲットが抱える悩みや課題を提示' },
  { title: '共感・あるある', scenario: '「こんなことありませんか？」で共感を得る' },
  { title: '解決策の提示', scenario: '商品・サービスがどう解決するか' },
  { title: '特徴・メリット①', scenario: '主要な特徴やメリットを紹介' },
  { title: '特徴・メリット②', scenario: '2つ目の特徴やメリット' },
  { title: '特徴・メリット③', scenario: '3つ目の特徴やメリット' },
  { title: '実績・数字', scenario: '導入実績、満足度、数値データ' },
  { title: 'お客様の声', scenario: 'レビュー、体験談、ビフォーアフター' },
  { title: '比較・差別化', scenario: '競合との違い、選ばれる理由' },
  { title: '利用の流れ', scenario: 'ステップ形式で簡単さをアピール' },
  { title: '料金・プラン', scenario: '価格表、プラン比較' },
  { title: 'よくある質問', scenario: 'FAQ形式で不安を解消' },
  { title: '限定特典・キャンペーン', scenario: '今だけのオファー、特典内容' },
  { title: 'CTA・クロージング', scenario: '最終的なアクション促進、申込ボタン' },
];

export default function LPScenarioEditor({
  onSubmit,
  onBack,
  loading,
  initialPages = 8,
  availableImages,
}: LPScenarioEditorProps) {
  const [pageCount, setPageCount] = useState(initialPages);
  const [pages, setPages] = useState<LPPageScenario[]>(() =>
    DEFAULT_PAGE_TEMPLATES.slice(0, initialPages).map((template, index) => ({
      pageNumber: index + 1,
      title: template.title || `ページ ${index + 1}`,
      scenario: template.scenario || '',
      layoutType: '',
      emphasis: '',
      selectedImageIds: [],
    }))
  );
  const [targetAudience, setTargetAudience] = useState('');
  const [lpGoal, setLpGoal] = useState('');
  const [tone, setTone] = useState('プロフェッショナル');
  
  // 画像選択モーダル用
  const [imageModalOpen, setImageModalOpen] = useState<number | null>(null);

  // ページ数変更時の処理
  const handlePageCountChange = (newCount: number) => {
    if (newCount < 1) newCount = 1;
    if (newCount > 15) newCount = 15;
    
    setPageCount(newCount);
    
    if (newCount > pages.length) {
      const newPages = [...pages];
      for (let i = pages.length; i < newCount; i++) {
        const template = DEFAULT_PAGE_TEMPLATES[i] || {};
        newPages.push({
          pageNumber: i + 1,
          title: template.title || `ページ ${i + 1}`,
          scenario: template.scenario || '',
          layoutType: '',
          emphasis: '',
          selectedImageIds: [],
        });
      }
      setPages(newPages);
    } else if (newCount < pages.length) {
      setPages(pages.slice(0, newCount));
    }
  };

  // ページの内容更新
  const updatePage = (index: number, field: keyof LPPageScenario, value: string | number | string[]) => {
    const newPages = [...pages];
    newPages[index] = { ...newPages[index], [field]: value };
    setPages(newPages);
  };

  // 画像選択の切り替え
  const toggleImageSelection = (pageIndex: number, imageId: string) => {
    const page = pages[pageIndex];
    const currentIds = page.selectedImageIds || [];
    
    let newIds: string[];
    if (currentIds.includes(imageId)) {
      newIds = currentIds.filter(id => id !== imageId);
    } else {
      // 最大5枚まで
      if (currentIds.length >= 5) {
        newIds = [...currentIds.slice(1), imageId];
      } else {
        newIds = [...currentIds, imageId];
      }
    }
    
    updatePage(pageIndex, 'selectedImageIds', newIds);
  };

  // 送信処理
  const handleSubmit = () => {
    const scenario: LPScenario = {
      pages,
      targetAudience,
      lpGoal,
      tone,
    };
    onSubmit(scenario);
  };

  // テンプレートから一括設定
  const applyTemplate = (templateType: 'standard' | 'simple' | 'detailed') => {
    let count: number;
    switch (templateType) {
      case 'simple':
        count = 5;
        break;
      case 'detailed':
        count = 15;
        break;
      default:
        count = 8;
    }
    handlePageCountChange(count);
  };

  // ソースURLでグループ化された画像
  const imagesBySource = availableImages.reduce((acc, img) => {
    const source = img.sourceUrl || 'その他';
    if (!acc[source]) acc[source] = [];
    acc[source].push(img);
    return acc;
  }, {} as Record<string, ScrapedImage[]>);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        📄 LPシナリオ設定
      </h2>
      <p className="text-gray-600 mb-6">
        各ページで伝えたい内容と使用する画像を設定してください。
      </p>

      {/* 全体設定 */}
      <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-4">🎯 LP全体設定</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ターゲット層
            </label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="例：30代女性、経営者"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              LPの目標
            </label>
            <select
              value={lpGoal}
              onChange={(e) => setLpGoal(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
            >
              <option value="">選択してください</option>
              <option value="資料請求">資料請求</option>
              <option value="問い合わせ">問い合わせ</option>
              <option value="購入">購入・申込</option>
              <option value="会員登録">会員登録</option>
              <option value="無料体験">無料体験・トライアル</option>
              <option value="予約">予約・来店</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              トーン・雰囲気
            </label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
            >
              <option value="プロフェッショナル">プロフェッショナル</option>
              <option value="親しみやすい">親しみやすい・カジュアル</option>
              <option value="高級感">高級感・ラグジュアリー</option>
              <option value="シンプル">シンプル・ミニマル</option>
              <option value="エネルギッシュ">エネルギッシュ・ポップ</option>
              <option value="信頼感">信頼感・安心感</option>
            </select>
          </div>
        </div>

        {/* テンプレート選択 */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">テンプレート:</span>
          <button
            onClick={() => applyTemplate('simple')}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
          >
            シンプル (5P)
          </button>
          <button
            onClick={() => applyTemplate('standard')}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
          >
            標準 (8P)
          </button>
          <button
            onClick={() => applyTemplate('detailed')}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
          >
            詳細 (15P)
          </button>
        </div>
      </div>

      {/* ページ数設定 */}
      <div className="mb-6 flex items-center gap-4">
        <label className="font-medium text-gray-700">ページ数:</label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageCountChange(pageCount - 1)}
            disabled={pageCount <= 1}
            className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 disabled:opacity-50 rounded text-gray-700"
          >
            -
          </button>
          <span className="w-12 text-center font-bold text-lg text-gray-900">{pageCount}</span>
          <button
            onClick={() => handlePageCountChange(pageCount + 1)}
            disabled={pageCount >= 15}
            className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 disabled:opacity-50 rounded text-gray-700"
          >
            +
          </button>
        </div>
        <span className="text-sm text-gray-500">(最大15ページ)</span>
        
        {/* 利用可能画像数 */}
        <span className="ml-auto text-sm text-gray-600">
          📸 利用可能な画像: {availableImages.length}枚
        </span>
      </div>

      {/* ページ一覧 */}
      <div className="space-y-4 mb-8">
        {pages.map((page, index) => (
          <div
            key={page.pageNumber}
            className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              {/* ページ番号 */}
              <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-lg">
                {page.pageNumber}P
              </div>
              
              <div className="flex-grow space-y-3">
                {/* タイトル */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      ページタイトル
                    </label>
                    <input
                      type="text"
                      value={page.title}
                      onChange={(e) => updatePage(index, 'title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-black"
                      placeholder="例：ファーストビュー"
                    />
                  </div>
                  <div className="w-48">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      レイアウト（任意）
                    </label>
                    <select
                      value={page.layoutType || ''}
                      onChange={(e) => updatePage(index, 'layoutType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-black"
                    >
                      <option value="">自動</option>
                      <option value="hero">ヒーロー（全面画像）</option>
                      <option value="split">左右分割</option>
                      <option value="cards">カード型</option>
                      <option value="timeline">タイムライン</option>
                      <option value="grid">グリッド</option>
                      <option value="text-center">テキスト中央</option>
                    </select>
                  </div>
                </div>
                
                {/* シナリオ */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    シナリオ / 伝えたい内容
                  </label>
                  <textarea
                    value={page.scenario}
                    onChange={(e) => updatePage(index, 'scenario', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-black"
                    placeholder="このページで伝えたいことを具体的に記載してください..."
                  />
                </div>
                
                {/* 画像選択セクション */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-500">
                      使用する画像（最大5枚）
                    </label>
                    <button
                      type="button"
                      onClick={() => setImageModalOpen(index)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      + 画像を選択
                    </button>
                  </div>
                  
                  {/* 選択済み画像のサムネイル */}
                  <div className="flex gap-2 flex-wrap">
                    {(page.selectedImageIds || []).map(imageId => {
                      const img = availableImages.find(i => i.id === imageId);
                      if (!img) return null;
                      return (
                        <div key={imageId} className="relative group">
                          <img
                            src={img.url}
                            alt={img.alt || 'Selected image'}
                            className="w-16 h-16 object-cover rounded border"
                          />
                          <button
                            type="button"
                            onClick={() => toggleImageSelection(index, imageId)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                    {(page.selectedImageIds?.length || 0) === 0 && (
                      <div 
                        onClick={() => setImageModalOpen(index)}
                        className="w-16 h-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 cursor-pointer hover:border-blue-400 hover:text-blue-400"
                      >
                        <span className="text-2xl">+</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 画像選択モーダル */}
      {imageModalOpen !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-900">
                {pages[imageModalOpen].pageNumber}P「{pages[imageModalOpen].title}」の画像を選択
              </h3>
              <button
                onClick={() => setImageModalOpen(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-grow">
              {/* ソースURL別に表示 */}
              {Object.entries(imagesBySource).map(([source, images]) => (
                <div key={source} className="mb-6">
                  <h4 className="text-sm font-medium text-gray-600 mb-2 truncate">
                    📍 {source.length > 50 ? source.slice(0, 50) + '...' : source}
                    <span className="ml-2 text-gray-400">({images.length}枚)</span>
                  </h4>
                  <div className="grid grid-cols-6 gap-2">
                    {images.map(img => {
                      const isSelected = pages[imageModalOpen].selectedImageIds?.includes(img.id);
                      return (
                        <div
                          key={img.id}
                          onClick={() => toggleImageSelection(imageModalOpen, img.id)}
                          className={`relative cursor-pointer rounded overflow-hidden border-2 transition-all ${
                            isSelected 
                              ? 'border-blue-500 ring-2 ring-blue-200' 
                              : 'border-transparent hover:border-gray-300'
                          }`}
                        >
                          <img
                            src={img.url}
                            alt={img.alt || 'Image'}
                            className="w-full aspect-square object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 text-white rounded-full text-xs flex items-center justify-center">
                              ✓
                            </div>
                          )}
                          {img.isLogo && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-[10px] text-center py-0.5">
                              LOGO
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              {availableImages.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  利用可能な画像がありません
                </div>
              )}
            </div>
            
            <div className="p-4 border-t flex justify-between items-center bg-gray-50">
              <span className="text-sm text-gray-600">
                選択中: {pages[imageModalOpen].selectedImageIds?.length || 0}/5枚
              </span>
              <button
                onClick={() => setImageModalOpen(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                完了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ナビゲーション */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          戻る
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || pages.some(p => !p.scenario.trim())}
          className="bg-blue-600 text-white py-3 px-8 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              プロンプト生成中...
            </span>
          ) : (
            '✨ プロンプト生成'
          )}
        </button>
      </div>
    </div>
  );
}
