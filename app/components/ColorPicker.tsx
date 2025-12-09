'use client';

import { useState, useMemo } from 'react';
import { ColorPalette, SelectedColors } from '@/lib/types';

interface ColorPickerProps {
  palette: ColorPalette[];
  selected: SelectedColors;
  onSelect: (colors: SelectedColors) => void;
  onNext: () => void;
  onBack: () => void;
  loading: boolean;
}

// おしゃれなプリセットパレット
const PRESET_PALETTES = [
  {
    name: 'モダンブルー',
    description: '信頼感・クリーン',
    colors: { base: '#F8FAFC', h1: '#0F172A', h2: '#334155', h3: '#64748B', h4: '#3B82F6' },
    tags: ['ビジネス', 'テクノロジー', 'SaaS'],
  },
  {
    name: 'ナチュラルグリーン',
    description: '自然・健康',
    colors: { base: '#F0FDF4', h1: '#14532D', h2: '#166534', h3: '#4D7C0F', h4: '#22C55E' },
    tags: ['健康', 'オーガニック', 'エコ'],
  },
  {
    name: 'エレガントパープル',
    description: '高級感・創造性',
    colors: { base: '#FAF5FF', h1: '#3B0764', h2: '#581C87', h3: '#7E22CE', h4: '#A855F7' },
    tags: ['美容', 'ラグジュアリー', 'クリエイティブ'],
  },
  {
    name: 'ウォームオレンジ',
    description: '活力・親しみ',
    colors: { base: '#FFFBEB', h1: '#78350F', h2: '#92400E', h3: '#B45309', h4: '#F59E0B' },
    tags: ['飲食', 'エンタメ', 'EC'],
  },
  {
    name: 'クールグレー',
    description: 'ミニマル・洗練',
    colors: { base: '#FAFAFA', h1: '#18181B', h2: '#3F3F46', h3: '#71717A', h4: '#18181B' },
    tags: ['アート', 'ファッション', 'モノクロ'],
  },
  {
    name: 'コーラルピンク',
    description: '柔らかさ・女性向け',
    colors: { base: '#FFF1F2', h1: '#881337', h2: '#BE123C', h3: '#E11D48', h4: '#FB7185' },
    tags: ['美容', 'ライフスタイル', '女性向け'],
  },
  {
    name: 'オーシャンティール',
    description: '落ち着き・信頼',
    colors: { base: '#F0FDFA', h1: '#134E4A', h2: '#115E59', h3: '#0F766E', h4: '#14B8A6' },
    tags: ['医療', 'ウェルネス', '金融'],
  },
  {
    name: 'サンセットグラデーション',
    description: '情熱・エネルギー',
    colors: { base: '#FEF2F2', h1: '#7F1D1D', h2: '#B91C1C', h3: '#DC2626', h4: '#EF4444' },
    tags: ['スポーツ', 'イベント', 'セール'],
  },
  {
    name: 'ダークモード',
    description: 'モダン・プロ',
    colors: { base: '#1F2937', h1: '#F9FAFB', h2: '#E5E7EB', h3: '#9CA3AF', h4: '#60A5FA' },
    tags: ['テック', 'ゲーム', 'プロダクト'],
  },
  {
    name: 'ゴールドプレミアム',
    description: '高級・特別感',
    colors: { base: '#FFFBEB', h1: '#451A03', h2: '#78350F', h3: '#92400E', h4: '#D97706' },
    tags: ['高級品', '金融', 'VIP'],
  },
];

// 1色から連想するパレット生成
function generatePaletteFromColor(baseHex: string): { base: string; h1: string; h2: string; h3: string; h4: string } {
  const hsl = hexToHSL(baseHex);
  
  // ベース色の明度に応じて調整
  const isLight = hsl.l > 50;
  
  if (isLight) {
    // 明るいベース色の場合
    return {
      base: baseHex,
      h1: hslToHex({ h: hsl.h, s: Math.min(hsl.s + 10, 100), l: 15 }),
      h2: hslToHex({ h: hsl.h, s: hsl.s, l: 25 }),
      h3: hslToHex({ h: hsl.h, s: Math.max(hsl.s - 10, 0), l: 40 }),
      h4: hslToHex({ h: (hsl.h + 180) % 360, s: 70, l: 50 }), // 補色でCTA
    };
  } else {
    // 暗いベース色の場合
    return {
      base: baseHex,
      h1: hslToHex({ h: hsl.h, s: Math.max(hsl.s - 20, 0), l: 95 }),
      h2: hslToHex({ h: hsl.h, s: Math.max(hsl.s - 10, 0), l: 85 }),
      h3: hslToHex({ h: hsl.h, s: Math.max(hsl.s - 5, 0), l: 70 }),
      h4: hslToHex({ h: (hsl.h + 30) % 360, s: 80, l: 60 }), // 類似色でCTA
    };
  }
}

// 類似色パレット
function generateAnalogousPalette(baseHex: string): { base: string; h1: string; h2: string; h3: string; h4: string } {
  const hsl = hexToHSL(baseHex);
  return {
    base: '#FAFAFA',
    h1: hslToHex({ h: hsl.h, s: hsl.s, l: 20 }),
    h2: hslToHex({ h: (hsl.h + 30) % 360, s: hsl.s, l: 35 }),
    h3: hslToHex({ h: (hsl.h - 30 + 360) % 360, s: hsl.s, l: 45 }),
    h4: baseHex,
  };
}

// 補色パレット
function generateComplementaryPalette(baseHex: string): { base: string; h1: string; h2: string; h3: string; h4: string } {
  const hsl = hexToHSL(baseHex);
  const complementary = (hsl.h + 180) % 360;
  return {
    base: '#FAFAFA',
    h1: hslToHex({ h: hsl.h, s: hsl.s, l: 20 }),
    h2: hslToHex({ h: hsl.h, s: hsl.s, l: 35 }),
    h3: hslToHex({ h: hsl.h, s: Math.max(hsl.s - 20, 0), l: 50 }),
    h4: hslToHex({ h: complementary, s: 70, l: 50 }),
  };
}

// トライアドパレット
function generateTriadicPalette(baseHex: string): { base: string; h1: string; h2: string; h3: string; h4: string } {
  const hsl = hexToHSL(baseHex);
  return {
    base: '#FAFAFA',
    h1: hslToHex({ h: hsl.h, s: hsl.s, l: 25 }),
    h2: hslToHex({ h: (hsl.h + 120) % 360, s: hsl.s, l: 40 }),
    h3: hslToHex({ h: (hsl.h + 240) % 360, s: hsl.s, l: 45 }),
    h4: baseHex,
  };
}

export default function ColorPicker({
  palette,
  selected,
  onSelect,
  onNext,
  onBack,
  loading,
}: ColorPickerProps) {
  const [activeTab, setActiveTab] = useState<'extracted' | 'preset' | 'generate'>('preset');
  const [seedColor, setSeedColor] = useState('#3B82F6');
  const [generatedPalettes, setGeneratedPalettes] = useState<Array<{ name: string; colors: SelectedColors }>>([]);

  // 1色からパレット生成
  const handleGenerateFromSeed = () => {
    const palettes = [
      { name: '自動配色', colors: generatePaletteFromColor(seedColor) },
      { name: '類似色', colors: generateAnalogousPalette(seedColor) },
      { name: '補色', colors: generateComplementaryPalette(seedColor) },
      { name: 'トライアド', colors: generateTriadicPalette(seedColor) },
    ];
    setGeneratedPalettes(palettes);
  };

  // パレット全体を適用
  const applyPresetPalette = (colors: SelectedColors) => {
    onSelect(colors);
  };

  const handleSelectColor = (role: keyof SelectedColors, hex: string) => {
    onSelect({ ...selected, [role]: hex.toUpperCase() });
  };

  const handleColorInputChange = (role: keyof SelectedColors, value: string) => {
    const upperValue = value.toUpperCase();
    if (upperValue === '' || upperValue === '#' || /^#[0-9A-F]{0,6}$/.test(upperValue)) {
      onSelect({ ...selected, [role]: upperValue });
    }
  };

  const handleNativeColorChange = (role: keyof SelectedColors, value: string) => {
    onSelect({ ...selected, [role]: value.toUpperCase() });
  };

  const roles = [
    { key: 'base' as const, label: 'ベース色（背景）', description: '背景や大面積', icon: '🎨' },
    { key: 'h1' as const, label: 'H1用', description: 'メイン見出し', icon: '📝' },
    { key: 'h2' as const, label: 'H2用', description: 'サブ見出し', icon: '📋' },
    { key: 'h3' as const, label: 'H3用', description: '特徴テキスト', icon: '💬' },
    { key: 'h4' as const, label: 'H4用 / CTA', description: 'アクション要素', icon: '🔘' },
  ];

  // CSS抽出色とAI提案色のカウント
  const cssColorCount = palette.filter(c => c.source === 'css').length;
  const aiColorCount = palette.filter(c => c.source === 'ai').length;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        🎨 カラーパレットを選択
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        プリセットから選ぶか、1色から連想してパレットを生成できます。個別の色も調整可能です。
      </p>

      {/* タブ切り替え */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('preset')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'preset'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          ✨ おしゃれパレット
        </button>
        <button
          onClick={() => setActiveTab('generate')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'generate'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🔮 1色から生成
        </button>
        <button
          onClick={() => setActiveTab('extracted')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'extracted'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🔍 サイトから抽出 ({palette.length}色)
        </button>
      </div>

      {/* おしゃれパレットタブ */}
      {activeTab === 'preset' && (
        <div className="mb-8">
          <p className="text-sm text-gray-500 mb-4">
            クリックでパレット全体を適用します。業種やイメージに合わせて選んでください。
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {PRESET_PALETTES.map((preset, index) => (
              <div
                key={index}
                onClick={() => applyPresetPalette(preset.colors)}
                className="cursor-pointer border-2 border-gray-200 rounded-lg p-3 hover:border-blue-400 hover:shadow-md transition-all group"
              >
                {/* カラープレビュー */}
                <div className="flex gap-1 mb-2">
                  {Object.values(preset.colors).map((color, i) => (
                    <div
                      key={i}
                      className="flex-1 h-8 first:rounded-l last:rounded-r"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <h4 className="font-medium text-sm text-gray-900 group-hover:text-blue-600">
                  {preset.name}
                </h4>
                <p className="text-xs text-gray-500">{preset.description}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {preset.tags.slice(0, 2).map((tag, i) => (
                    <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1色から生成タブ */}
      {activeTab === 'generate' && (
        <div className="mb-8">
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg mb-4">
            <h3 className="font-semibold text-gray-900 mb-3">1色を選んでパレットを生成</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">ベースカラー:</label>
                <input
                  type="color"
                  value={seedColor}
                  onChange={(e) => setSeedColor(e.target.value)}
                  className="w-12 h-10 rounded cursor-pointer border border-gray-300"
                />
                <input
                  type="text"
                  value={seedColor.toUpperCase()}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    if (/^#[0-9A-F]{0,6}$/.test(val) || val === '#') {
                      setSeedColor(val);
                    }
                  }}
                  className="w-24 px-2 py-1 border border-gray-300 rounded font-mono text-sm text-black"
                />
              </div>
              <button
                onClick={handleGenerateFromSeed}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                🔮 パレット生成
              </button>
            </div>
          </div>

          {generatedPalettes.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {generatedPalettes.map((pal, index) => (
                <div
                  key={index}
                  onClick={() => applyPresetPalette(pal.colors)}
                  className="cursor-pointer border-2 border-gray-200 rounded-lg p-3 hover:border-purple-400 hover:shadow-md transition-all"
                >
                  <div className="flex gap-1 mb-2">
                    {Object.values(pal.colors).map((color, i) => (
                      <div
                        key={i}
                        className="flex-1 h-8 first:rounded-l last:rounded-r"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <h4 className="font-medium text-sm text-gray-900">{pal.name}</h4>
                </div>
              ))}
            </div>
          )}

          {generatedPalettes.length === 0 && (
            <p className="text-center text-gray-400 py-8">
              色を選んで「パレット生成」をクリックしてください
            </p>
          )}
        </div>
      )}

      {/* サイトから抽出タブ */}
      {activeTab === 'extracted' && (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">抽出されたカラー（{palette.length}色）</h3>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 bg-green-500 rounded"></span>
                CSS抽出: {cssColorCount}色
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 bg-purple-500 rounded"></span>
                AI提案: {aiColorCount}色
              </span>
            </div>
          </div>
          
          {palette.length > 0 ? (
            <>
              <div className="grid grid-cols-10 gap-2">
                {palette.slice(0, 20).map((color, index) => (
                  <div key={index} className="text-center group">
                    <div
                      className="w-full aspect-square rounded-lg border-2 border-gray-200 cursor-pointer hover:scale-110 transition-transform relative shadow-sm"
                      style={{ backgroundColor: color.hex }}
                      title={`${color.hex} (${color.source}: ${color.role_hint})`}
                      onClick={() => navigator.clipboard.writeText(color.hex)}
                    >
                      {color.source === 'ai' && (
                        <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-[8px] px-1 rounded shadow">AI</span>
                      )}
                      {color.source === 'css' && (
                        <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[8px] px-1 rounded shadow">CSS</span>
                      )}
                    </div>
                    <p className="text-[9px] text-gray-500 mt-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                      {color.hex}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">
                💡 色をクリックするとHEXコードがコピーされます
              </p>
            </>
          ) : (
            <p className="text-center text-gray-400 py-8">
              サイトから色が抽出されていません。URLをスクレイピングしてください。
            </p>
          )}
        </div>
      )}

      {/* 現在の選択状態 */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-3">📍 現在の選択</h3>
        <div className="flex gap-2 items-center">
          {roles.map((role) => (
            <div key={role.key} className="text-center">
              <div
                className="w-10 h-10 rounded-lg border-2 border-blue-300 shadow"
                style={{ backgroundColor: selected[role.key] }}
                title={`${role.label}: ${selected[role.key]}`}
              />
              <p className="text-[10px] text-gray-600 mt-1">{role.label.split('（')[0]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 個別色調整 */}
      <div className="mb-8">
        <h3 className="font-semibold text-gray-900 mb-4">🔧 個別調整</h3>
        <div className="space-y-3">
          {roles.map((role) => (
            <div key={role.key} className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors">
              <div className="flex items-center gap-4">
                {/* ラベル */}
                <div className="flex items-center gap-2 w-40">
                  <span className="text-lg">{role.icon}</span>
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">{role.label}</h4>
                    <p className="text-xs text-gray-500">{role.description}</p>
                  </div>
                </div>

                {/* 現在の色 */}
                <div
                  className="w-10 h-10 rounded-lg border-2 border-gray-300 shadow-inner cursor-pointer"
                  style={{ backgroundColor: selected[role.key] }}
                />

                {/* カラーピッカー */}
                <input
                  type="color"
                  value={selected[role.key] || '#000000'}
                  onChange={(e) => handleNativeColorChange(role.key, e.target.value)}
                  className="w-10 h-8 rounded cursor-pointer border border-gray-300"
                />

                {/* HEX入力 */}
                <input
                  type="text"
                  value={selected[role.key]}
                  onChange={(e) => handleColorInputChange(role.key, e.target.value)}
                  className="w-24 px-2 py-1 border border-gray-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  placeholder="#000000"
                  maxLength={7}
                />

                {/* パレットから選択（抽出色がある場合） */}
                {palette.length > 0 && (
                  <div className="flex gap-1 flex-wrap flex-1">
                    {palette.slice(0, 10).map((color, index) => (
                      <button
                        key={index}
                        onClick={() => handleSelectColor(role.key, color.hex)}
                        className={`w-6 h-6 rounded border transition-all flex-shrink-0 ${
                          selected[role.key].toUpperCase() === color.hex.toUpperCase()
                            ? 'border-blue-500 scale-110 ring-2 ring-blue-300'
                            : 'border-gray-200 hover:border-gray-400 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.hex}
                      />
                    ))}
                  </div>
                )}

                {/* 明るさ調整 */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const adjusted = adjustBrightness(selected[role.key], -20);
                      handleSelectColor(role.key, adjusted);
                    }}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    title="暗くする"
                  >
                    🌙
                  </button>
                  <button
                    onClick={() => {
                      const adjusted = adjustBrightness(selected[role.key], 20);
                      handleSelectColor(role.key, adjusted);
                    }}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    title="明るくする"
                  >
                    ☀️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* プレビュー */}
      <div className="mb-8 p-6 bg-gray-100 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-4">📱 プレビュー</h3>
        <div
          className="p-6 rounded-lg shadow-lg"
          style={{ backgroundColor: selected.base }}
        >
          <h1
            className="text-3xl font-bold mb-2"
            style={{ color: selected.h1 }}
          >
            H1 見出しサンプル
          </h1>
          <h2
            className="text-2xl font-semibold mb-2"
            style={{ color: selected.h2 }}
          >
            H2 見出しサンプル
          </h2>
          <p
            className="text-lg mb-4"
            style={{ color: selected.h3 }}
          >
            H3 テキストサンプル - ここに特徴やメリットを記載
          </p>
          <button
            className="px-6 py-3 rounded-lg font-semibold shadow-md hover:opacity-90 transition-opacity"
            style={{
              backgroundColor: selected.h4,
              color: getContrastColor(selected.h4),
            }}
          >
            H4 CTAボタン
          </button>
        </div>
      </div>

      {/* ナビゲーション */}
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
            'LPシナリオ設定へ →'
          )}
        </button>
      </div>
    </div>
  );
}

// === ヘルパー関数 ===

function adjustBrightness(hex: string, amount: number): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  const newR = Math.min(255, Math.max(0, r + amount));
  const newG = Math.min(255, Math.max(0, g + amount));
  const newB = Math.min(255, Math.max(0, b + amount));
  
  return '#' + [newR, newG, newB]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

function getContrastColor(hex: string): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(hsl: { h: number; s: number; l: number }): string {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}
