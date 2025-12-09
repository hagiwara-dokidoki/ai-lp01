'use client';

import { useState } from 'react';
import { CopyCandidates, SelectedCopies } from '@/lib/types';

interface CopyEditorProps {
  candidates: CopyCandidates;
  selected: SelectedCopies;
  onSelect: (copies: SelectedCopies) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function CopyEditor({
  candidates,
  selected,
  onSelect,
  onNext,
  onBack,
}: CopyEditorProps) {
  const [activeTab, setActiveTab] = useState<'h1' | 'h2' | 'h3' | 'h4'>('h1');
  const [editMode, setEditMode] = useState(false);

  const handleSelectCandidate = (level: 'h1' | 'h2' | 'h3' | 'h4', text: string) => {
    onSelect({ ...selected, [level]: text });
  };

  const handleManualEdit = (level: 'h1' | 'h2' | 'h3' | 'h4', text: string) => {
    onSelect({ ...selected, [level]: text });
  };

  const tabs: Array<{ key: 'h1' | 'h2' | 'h3' | 'h4'; label: string; chars: string }> = [
    { key: 'h1', label: 'H1 メイン', chars: '18-28字' },
    { key: 'h2', label: 'H2 サブ', chars: '14-24字' },
    { key: 'h3', label: 'H3 特徴', chars: '10-18字' },
    { key: 'h4', label: 'H4 CTA', chars: '6-14字' },
  ];

  const allSelected = selected.h1 && selected.h2 && selected.h3 && selected.h4;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        バナーコピーを選択・編集
      </h2>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 px-4 font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              <span className="ml-2 text-xs">({tab.chars})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Current Selection */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">✓ 現在の選択</h3>
        <div className="space-y-2">
          <div>
            <span className="font-medium">H1:</span>{' '}
            <span className={selected.h1 ? 'text-gray-900' : 'text-gray-400'}>
              {selected.h1 || '（未選択）'}
            </span>
          </div>
          <div>
            <span className="font-medium">H2:</span>{' '}
            <span className={selected.h2 ? 'text-gray-900' : 'text-gray-400'}>
              {selected.h2 || '（未選択）'}
            </span>
          </div>
          <div>
            <span className="font-medium">H3:</span>{' '}
            <span className={selected.h3 ? 'text-gray-900' : 'text-gray-400'}>
              {selected.h3 || '（未選択）'}
            </span>
          </div>
          <div>
            <span className="font-medium">H4:</span>{' '}
            <span className={selected.h4 ? 'text-gray-900' : 'text-gray-400'}>
              {selected.h4 || '（未選択）'}
            </span>
          </div>
        </div>
      </div>

      {/* Candidates */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-900">候補を選択</h3>
          <button
            onClick={() => setEditMode(!editMode)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {editMode ? '候補選択に戻る' : '手動編集'}
          </button>
        </div>

        {editMode ? (
          <div>
            <textarea
              value={selected[activeTab]}
              onChange={(e) => handleManualEdit(activeTab, e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder={`${activeTab.toUpperCase()}のテキストを入力...`}
            />
          </div>
        ) : (
          <div className="space-y-2">
            {candidates[activeTab].map((text, index) => (
              <button
                key={index}
                onClick={() => handleSelectCandidate(activeTab, text)}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                  selected[activeTab] === text
                    ? 'border-blue-500 bg-blue-50 font-medium'
                    : 'border-gray-200 hover:border-gray-400 bg-white'
                }`}
              >
                <span className="text-gray-500 text-sm mr-2">案{index + 1}:</span>
                {text}
              </button>
            ))}
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
          disabled={!allSelected}
          className="bg-blue-600 text-white py-3 px-8 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          色選択へ進む
        </button>
      </div>
    </div>
  );
}
