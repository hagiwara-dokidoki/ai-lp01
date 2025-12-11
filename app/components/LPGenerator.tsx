'use client';

import { useState } from 'react';
import { 
  ScrapedImage, 
  StructuredContext, 
  ColorPalette,
  SelectedColors,
  LPScenario,
  LPPagePrompt
} from '@/lib/types';
import MultiURLInput from './MultiURLInput';
import ImagePreview from './ImagePreview';
import ColorPicker from './ColorPicker';
import LPScenarioEditor from './LPScenarioEditor';
import LPPageViewer from './LPPageViewer';
import ProgressIndicator from './ProgressIndicator';

// Progress state type
interface ProgressState {
  show: boolean;
  title: string;
  progress: number;
  currentStep: string;
  steps: Array<{ label: string; status: 'pending' | 'active' | 'completed' }>;
  estimatedTime?: string;
  countdownSeconds?: number;
}

export default function LPGenerator() {
  const [step, setStep] = useState(1);
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Progress indicator state
  const [progressState, setProgressState] = useState<ProgressState>({
    show: false,
    title: '',
    progress: 0,
    currentStep: '',
    steps: [],
  });
  
  // Data states
  const [context, setContext] = useState<StructuredContext | null>(null);
  const [images, setImages] = useState<ScrapedImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [palette, setPalette] = useState<ColorPalette[]>([]);
  const [selectedColors, setSelectedColors] = useState<SelectedColors>({
    base: '#FFFFFF',
    h1: '#000000',
    h2: '#333333',
    h3: '#666666',
    h4: '#3B82F6',
  });
  
  // LP specific states
  const [lpScenario, setLpScenario] = useState<LPScenario | null>(null);
  const [lpPagePrompts, setLpPagePrompts] = useState<LPPagePrompt[]>([]);

  // Handler to add manually uploaded images
  const handleAddImages = (newImages: ScrapedImage[]) => {
    setImages(prevImages => [...prevImages, ...newImages]);
  };

  // 複数URLのスクレイピング
  const handleScrape = async (inputUrls: string[]) => {
    setLoading(true);
    setError('');
    setUrls(inputUrls);
    
    const urlCount = inputUrls.length;
    
    // Initialize progress indicator
    setProgressState({
      show: true,
      title: `${urlCount}ページを解析中`,
      progress: 0,
      currentStep: '接続中...',
      estimatedTime: `約${urlCount * 10}秒`,
      steps: [
        { label: 'URLに接続', status: 'active' },
        { label: 'HTML取得・解析', status: 'pending' },
        { label: '画像・CSS抽出', status: 'pending' },
        { label: 'カラーパレット生成', status: 'pending' },
      ],
    });
    
    // Reset all cached data
    setContext(null);
    setImages([]);
    setSelectedImages([]);
    setPalette([]);
    setSelectedColors({
      base: '#FFFFFF',
      h1: '#000000',
      h2: '#333333',
      h3: '#666666',
      h4: '#3B82F6',
    });
    setLpScenario(null);
    setLpPagePrompts([]);

    try {
      // Step 1: Connect
      setProgressState(prev => ({
        ...prev,
        progress: 10,
        currentStep: `${urlCount}ページに接続中...`,
        steps: prev.steps.map((s, i) => ({
          ...s,
          status: i === 0 ? 'active' : 'pending',
        })),
      }));

      // Call scrape API with multiple URLs
      const scrapeResponse = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: inputUrls }),
      });

      setProgressState(prev => ({
        ...prev,
        progress: 40,
        currentStep: 'HTML取得・解析中...',
        steps: prev.steps.map((s, i) => ({
          ...s,
          status: i <= 1 ? 'completed' : i === 2 ? 'active' : 'pending',
        })),
      }));

      const scrapeResult = await scrapeResponse.json();

      if (!scrapeResponse.ok) {
        throw new Error(scrapeResult.error || 'Failed to scrape URLs');
      }

      // Step 3: 画像・CSS抽出完了
      setProgressState(prev => ({
        ...prev,
        progress: 60,
        currentStep: '画像・CSS抽出完了',
        steps: prev.steps.map((s, i) => ({
          ...s,
          status: i <= 2 ? 'completed' : 'pending',
        })),
      }));

      // Store images
      const scrapedImages = scrapeResult.data.images || [];
      setImages(scrapedImages);
      
      // Auto-select images (logos first, then by score)
      const logoImages = scrapedImages.filter((img: ScrapedImage) => img.isLogo);
      const regularImages = scrapedImages
        .filter((img: ScrapedImage) => !img.isLogo)
        .sort((a: ScrapedImage, b: ScrapedImage) => b.score - a.score);
      const selectedLogoIds = logoImages.slice(0, 1).map((img: ScrapedImage) => img.id);
      const selectedRegularIds = regularImages.slice(0, 7).map((img: ScrapedImage) => img.id);
      setSelectedImages([...selectedLogoIds, ...selectedRegularIds]);

      // Set CSS colors
      const cssColors = scrapeResult.data.cssColors || [];
      if (cssColors.length > 0) {
        setPalette(cssColors);
        // Auto-select first 5 colors
        if (cssColors.length >= 5) {
          setSelectedColors({
            base: cssColors[0]?.hex || '#FFFFFF',
            h1: cssColors[1]?.hex || '#000000',
            h2: cssColors[2]?.hex || '#333333',
            h3: cssColors[3]?.hex || '#666666',
            h4: cssColors[4]?.hex || '#3B82F6',
          });
        }
      }

      // Store basic context
      if (scrapeResult.data.basicContext) {
        setContext(scrapeResult.data.basicContext);
      }

      // Complete
      setProgressState(prev => ({
        ...prev,
        progress: 100,
        currentStep: '完了！',
        steps: prev.steps.map(s => ({ ...s, status: 'completed' as const })),
      }));

      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Jump to image preview
      setStep(2);
      
    } catch (err: any) {
      console.error('❌ Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setProgressState(prev => ({ ...prev, show: false }));
    }
  };

  // LP シナリオからプロンプト生成
  const handleGenerateLPPrompts = async (scenario: LPScenario) => {
    setLoading(true);
    setError('');
    setLpScenario(scenario);
    
    setProgressState({
      show: true,
      title: 'LPプロンプト生成中',
      progress: 0,
      currentStep: '準備中...',
      estimatedTime: '約30秒',
      countdownSeconds: 30,
      steps: [
        { label: 'シナリオ解析', status: 'active' },
        { label: 'ページ構成分析', status: 'pending' },
        { label: 'プロンプト生成', status: 'pending' },
      ],
    });

    try {
      // 各ページの選択画像を取得
      const pagesWithImages = scenario.pages.map(page => ({
        ...page,
        selectedImages: (page.selectedImageIds || [])
          .map(id => images.find(img => img.id === id))
          .filter(Boolean),
      }));
      
      setProgressState(prev => ({
        ...prev,
        progress: 20,
        currentStep: 'シナリオを解析中...',
        countdownSeconds: 25,
      }));

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setProgressState(prev => ({
        ...prev,
        progress: 40,
        currentStep: 'ページ構成を分析中...',
        countdownSeconds: 20,
        steps: prev.steps.map((s, i) => ({
          ...s,
          status: i <= 0 ? 'completed' : i === 1 ? 'active' : 'pending',
        })),
      }));

      const response = await fetch('/api/generate-lp-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: {
            ...scenario,
            pages: pagesWithImages,
          },
          context,
          selectedColors,
          selectedImages: images.filter(img => selectedImages.includes(img.id)),
        }),
      });

      setProgressState(prev => ({
        ...prev,
        progress: 70,
        currentStep: 'プロンプトを生成中...',
        countdownSeconds: 10,
        steps: prev.steps.map((s, i) => ({
          ...s,
          status: i <= 1 ? 'completed' : i === 2 ? 'active' : 'pending',
        })),
      }));

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate LP prompts');
      }

      setLpPagePrompts(result.data.pages);

      setProgressState(prev => ({
        ...prev,
        progress: 100,
        currentStep: '完了！',
        countdownSeconds: 0,
        steps: prev.steps.map(s => ({ ...s, status: 'completed' as const })),
      }));

      await new Promise(resolve => setTimeout(resolve, 500));
      
      setStep(5);
    } catch (err: any) {
      console.error('❌ Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setProgressState(prev => ({ ...prev, show: false }));
    }
  };

  // 新しいフロー: URL入力 → 画像確認 → 色選択 → シナリオ（画像選択込み） → LP生成
  // 画像はプレビューのみ + 手動アップロード可能
  // 実際の画像選択はシナリオステップ内で各ページごとに行う
  const stepLabels = [
    { num: 1, label: 'URL入力' },
    { num: 2, label: '画像確認' },
    { num: 3, label: '色選択' },
    { num: 4, label: 'シナリオ' },
    { num: 5, label: 'LP生成' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Progress Indicator Modal */}
      {progressState.show && (
        <ProgressIndicator
          title={progressState.title}
          progress={progressState.progress}
          steps={progressState.steps}
          currentStep={progressState.currentStep}
          estimatedTime={progressState.estimatedTime}
          countdownSeconds={progressState.countdownSeconds}
        />
      )}
      
      {/* Black Header */}
      <header className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <img 
                src="/logo.png" 
                alt="株式会社ドキドキ" 
                className="h-10 md:h-12"
              />
            </div>
            
            {/* Progress Steps in Header */}
            <div className="hidden md:flex items-center space-x-2">
              {stepLabels.map((s) => (
                <div key={s.num} className="flex items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                      step >= s.num
                        ? 'bg-yellow-500 text-black'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {s.num}
                  </div>
                  <span className={`ml-1 text-xs ${step >= s.num ? 'text-yellow-500' : 'text-gray-500'}`}>
                    {s.label}
                  </span>
                  {s.num < 5 && (
                    <div
                      className={`w-8 h-0.5 mx-1 ${
                        step > s.num ? 'bg-yellow-500' : 'bg-gray-700'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Mobile Progress Steps */}
        <div className="md:hidden border-t border-gray-800">
          <div className="flex justify-center items-center space-x-1 py-3 px-4">
            {stepLabels.map((s) => (
              <div key={s.num} className="flex items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                    step >= s.num
                      ? 'bg-yellow-500 text-black'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {s.num}
                </div>
                {s.num < 5 && (
                  <div
                    className={`w-4 h-0.5 mx-0.5 ${
                      step > s.num ? 'bg-yellow-500' : 'bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content - White Background */}
      <main className="bg-white min-h-[calc(100vh-180px)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
              <button 
                onClick={() => setError('')}
                className="mt-2 text-sm text-red-600 underline"
              >
                閉じる
              </button>
            </div>
          )}

          {/* Step Content */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 md:p-8">
            {step === 1 && (
              <MultiURLInput onSubmit={handleScrape} loading={loading} />
            )}

            {step === 2 && (
              <ImagePreview
                images={images}
                onAddImages={handleAddImages}
                onNext={() => setStep(3)}
                onBack={() => setStep(1)}
                loading={loading}
              />
            )}

            {step === 3 && (
              <ColorPicker
                palette={palette}
                selected={selectedColors}
                onSelect={setSelectedColors}
                onNext={() => setStep(4)}
                onBack={() => setStep(2)}
                loading={loading}
              />
            )}

            {step === 4 && (
              <LPScenarioEditor
                onSubmit={handleGenerateLPPrompts}
                onBack={() => setStep(3)}
                loading={loading}
                availableImages={images}
              />
            )}

            {step === 5 && lpPagePrompts.length > 0 && (
              <LPPageViewer
                pages={lpPagePrompts}
                selectedColors={selectedColors}
                selectedImages={images}
                onBack={() => setStep(4)}
              />
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black text-gray-400 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>© 2024 株式会社ドキドキ | AI LP Generator</p>
        </div>
      </footer>
    </div>
  );
}
