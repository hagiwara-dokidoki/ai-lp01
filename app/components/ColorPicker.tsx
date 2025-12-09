'use client';

import { useState } from 'react';
import { ColorPalette, SelectedColors } from '@/lib/types';

interface ColorPickerProps {
  palette: ColorPalette[];
  selected: SelectedColors;
  onSelect: (colors: SelectedColors) => void;
  onNext: () => void;
  onBack: () => void;
  loading: boolean;
}

export default function ColorPicker({
  palette,
  selected,
  onSelect,
  onNext,
  onBack,
  loading,
}: ColorPickerProps) {
  const [activeColorPicker, setActiveColorPicker] = useState<keyof SelectedColors | null>(null);

  const handleSelectColor = (role: keyof SelectedColors, hex: string) => {
    onSelect({ ...selected, [role]: hex.toUpperCase() });
  };

  const handleColorInputChange = (role: keyof SelectedColors, value: string) => {
    // Allow partial input for typing
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

  // Count CSS vs AI colors
  const cssColorCount = palette.filter(c => c.source === 'css').length;
  const aiColorCount = palette.filter(c => c.source === 'ai').length;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        カラーパレットから5色を選択
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        AIがバナーに最適な色を提案しました。クリックまたはカラーピッカーで調整できます。
      </p>

      {/* Palette Display - 20 colors in 2 rows */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">提案パレット（{palette.length}色）</h3>
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
        <div className="grid grid-cols-10 gap-2">
          {palette.slice(0, 20).map((color, index) => (
            <div key={index} className="text-center group">
              <div
                className="w-full aspect-square rounded-lg border-2 border-gray-200 cursor-pointer hover:scale-110 transition-transform relative shadow-sm"
                style={{ backgroundColor: color.hex }}
                title={`${color.hex} (${color.source}: ${color.role_hint})`}
                onClick={() => {
                  // Copy to clipboard on click
                  navigator.clipboard.writeText(color.hex);
                }}
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
      </div>

      {/* Color Assignment */}
      <div className="space-y-4 mb-8">
        {roles.map((role) => (
          <div key={role.key} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{role.icon}</span>
                <div>
                  <h4 className="font-medium text-gray-900">{role.label}</h4>
                  <p className="text-xs text-gray-500">{role.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Current color preview */}
                <div
                  className="w-12 h-12 rounded-lg border-2 border-gray-300 shadow-inner cursor-pointer relative overflow-hidden"
                  style={{ backgroundColor: selected[role.key] }}
                  onClick={() => setActiveColorPicker(activeColorPicker === role.key ? null : role.key)}
                  title="クリックしてカラーピッカーを開く"
                >
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black bg-opacity-30 transition-opacity">
                    <span className="text-white text-xs">編集</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Palette Quick Select */}
            <div className="flex flex-wrap gap-1 mb-3">
              {palette.slice(0, 16).map((color, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectColor(role.key, color.hex)}
                  className={`w-7 h-7 rounded border-2 transition-all flex-shrink-0 ${
                    selected[role.key].toUpperCase() === color.hex.toUpperCase()
                      ? 'border-blue-500 scale-110 ring-2 ring-blue-300 z-10'
                      : 'border-transparent hover:border-gray-300 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={`${color.hex} (${color.source})`}
                />
              ))}
            </div>

            {/* Color Input Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Native Color Picker */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">カラーピッカー:</label>
                <input
                  type="color"
                  value={selected[role.key] || '#000000'}
                  onChange={(e) => handleNativeColorChange(role.key, e.target.value)}
                  className="w-10 h-8 rounded cursor-pointer border border-gray-300"
                  title="カラーピッカーで色を選択"
                />
              </div>

              {/* HEX Input */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">HEX:</label>
                <input
                  type="text"
                  value={selected[role.key]}
                  onChange={(e) => handleColorInputChange(role.key, e.target.value)}
                  className="w-24 px-2 py-1 border border-gray-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="#000000"
                  maxLength={7}
                />
              </div>

              {/* Quick Adjust Buttons */}
              <div className="flex items-center gap-1 ml-auto">
                <button
                  onClick={() => {
                    const hex = selected[role.key];
                    const adjusted = adjustBrightness(hex, -20);
                    handleSelectColor(role.key, adjusted);
                  }}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  title="暗くする"
                >
                  🌙 暗く
                </button>
                <button
                  onClick={() => {
                    const hex = selected[role.key];
                    const adjusted = adjustBrightness(hex, 20);
                    handleSelectColor(role.key, adjusted);
                  }}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  title="明るくする"
                >
                  ☀️ 明るく
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Color Preview */}
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
              プロンプト生成中...
            </span>
          ) : (
            'バナー生成へ進む'
          )}
        </button>
      </div>
    </div>
  );
}

// Helper function to adjust brightness
function adjustBrightness(hex: string, amount: number): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  
  // Parse RGB
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  // Adjust
  const newR = Math.min(255, Math.max(0, r + amount));
  const newG = Math.min(255, Math.max(0, g + amount));
  const newB = Math.min(255, Math.max(0, b + amount));
  
  // Convert back to hex
  return '#' + [newR, newG, newB]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

// Helper function to get contrasting text color
function getContrastColor(hex: string): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}
