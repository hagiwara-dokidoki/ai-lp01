'use client';

import { useState } from 'react';
import { 
  ScrapedImage, 
  StructuredContext, 
  CopyCandidates, 
  SelectedCopies,
  ColorPalette,
  SelectedColors,
  LPScenario,
  LPPagePrompt
} from '@/lib/types';
import URLInput from './URLInput';
import ImageSelector from './ImageSelector';
import CopyEditor from './CopyEditor';
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
  const [url, setUrl] = useState('');
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
  const [copyCandidates, setCopyCandidates] = useState<CopyCandidates | null>(null);
  const [selectedCopies, setSelectedCopies] = useState<SelectedCopies>({
    h1: '',
    h2: '',
    h3: '',
    h4: '',
  });
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

  const handleScrape = async (inputUrl: string) => {
    setLoading(true);
    setError('');
    setUrl(inputUrl);
    
    // Initialize progress indicator
    setProgressState({
      show: true,
      title: 'サイト解析中',
      progress: 0,
      currentStep: '接続中...',
      estimatedTime: '約45秒',
      steps: [
        { label: 'URLに接続', status: 'active' },
        { label: 'HTML取得・解析', status: 'pending' },
        { label: '画像・CSS抽出', status: 'pending' },
        { label: 'AI分析開始', status: 'pending' },
        { label: 'コピー候補生成', status: 'pending' },
        { label: 'カラーパレット生成', status: 'pending' },
      ],
    });
    
    // Reset all cached data
    setContext(null);
    setImages([]);
    setSelectedImages([]);
    setCopyCandidates(null);
    setSelectedCopies({ h1: '', h2: '', h3: '', h4: '' });
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
        progress: 5,
        currentStep: 'URLに接続中...',
        countdownSeconds: 2,
        steps: prev.steps.map((s, i) => ({
          ...s,
          status: i === 0 ? 'active' : 'pending',
        })),
      }));
      
      // Step 2: HTML取得・解析
      setProgressState(prev => ({
        ...prev,
        progress: 10,
        currentStep: 'HTMLを取得・解析中...',
        countdownSeconds: 5,
        steps: prev.steps.map((s, i) => ({
          ...s,
          status: i === 0 ? 'completed' : i === 1 ? 'active' : 'pending',
        })),
      }));

      const scrapeResponse = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: inputUrl }),
      });

      const scrapeResult = await scrapeResponse.json();

      if (!scrapeResponse.ok) {
        throw new Error(scrapeResult.error || 'Failed to scrape URL');
      }

      // Step 3: 画像・CSS抽出完了
      setProgressState(prev => ({
        ...prev,
        progress: 25,
        currentStep: '画像・CSS抽出完了',
        countdownSeconds: 0,
        steps: prev.steps.map((s, i) => ({
          ...s,
          status: i <= 2 ? 'completed' : 'pending',
        })),
      }));

      // Store images immediately
      const scrapedImages = scrapeResult.data.images || [];
      setImages(scrapedImages);
      
      // Auto-select images
      const logoImages = scrapedImages.filter((img: any) => img.isLogo);
      const regularImages = scrapedImages
        .filter((img: any) => !img.isLogo)
        .sort((a: any, b: any) => b.score - a.score);
      const selectedLogoIds = logoImages.slice(0, 1).map((img: any) => img.id);
      const selectedRegularIds = regularImages.slice(0, 6 - selectedLogoIds.length).map((img: any) => img.id);
      setSelectedImages([...selectedLogoIds, ...selectedRegularIds]);

      // Set CSS colors
      const cssColors = scrapeResult.data.cssColors || [];
      if (cssColors.length > 0) {
        setPalette(cssColors.map((c: any) => ({ ...c, source: 'css' })));
      }

      // AI Analysis
      setProgressState(prev => ({
        ...prev,
        progress: 30,
        currentStep: '📊 Step 1/3: サイト分析中...',
        countdownSeconds: 8,
        steps: prev.steps.map((s, i) => ({
          ...s,
          status: i <= 2 ? 'completed' : i === 3 ? 'active' : 'pending',
        })),
      }));
      
      const analyzeStartTime = Date.now();
      const analyzePromise = fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          analysisInput: scrapeResult.data.analysisInput 
        }),
      });

      // Progress updates while waiting
      await new Promise(resolve => setTimeout(resolve, 3000));
      setProgressState(prev => ({
        ...prev,
        progress: 40,
        currentStep: '📊 Step 1/3: サイト分析中...',
        countdownSeconds: 5,
      }));
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      setProgressState(prev => ({
        ...prev,
        progress: 55,
        currentStep: '✍️ Step 2/3: コピー候補生成中...',
        countdownSeconds: 8,
        steps: prev.steps.map((s, i) => ({
          ...s,
          status: i <= 3 ? 'completed' : i === 4 ? 'active' : 'pending',
        })),
      }));

      await new Promise(resolve => setTimeout(resolve, 4000));
      setProgressState(prev => ({
        ...prev,
        progress: 75,
        currentStep: '🎨 Step 3/3: カラーパレット生成中...',
        countdownSeconds: 5,
        steps: prev.steps.map((s, i) => ({
          ...s,
          status: i <= 4 ? 'completed' : i === 5 ? 'active' : 'pending',
        })),
      }));

      const analyzeResponse = await analyzePromise;
      const analyzeResult = await analyzeResponse.json();

      if (!analyzeResponse.ok) {
        setContext(scrapeResult.data.basicContext);
        setCopyCandidates({
          h1: ['新しい体験をあなたに', 'より良い明日のために', '選ばれる理由がここに'],
          h2: ['プロフェッショナルな品質', '簡単・安心・便利', 'お客様満足度No.1'],
          h3: ['無料体験実施中', '今なら特典付き', '簡単3ステップ'],
          h4: ['詳しくはこちら', '今すぐ申込', '無料相談'],
        });
      } else {
        setProgressState(prev => ({
          ...prev,
          progress: 85,
          currentStep: 'カラーパレットを生成中...',
          countdownSeconds: 3,
          steps: prev.steps.map((s, i) => ({
            ...s,
            status: i <= 4 ? 'completed' : i === 5 ? 'active' : 'pending',
          })),
        }));

        const freshContext = analyzeResult.data.context;
        const freshColors = analyzeResult.data.colorPalette || [];
        const freshCopyCandidates = analyzeResult.data.copyCandidates;
        const recommendedColors = analyzeResult.data.recommendedColors;

        setContext(freshContext);
        setPalette(freshColors);
        
        if (freshCopyCandidates) {
          setCopyCandidates(freshCopyCandidates);
          setSelectedCopies({
            h1: freshCopyCandidates.h1?.[0] || '',
            h2: freshCopyCandidates.h2?.[0] || '',
            h3: freshCopyCandidates.h3?.[0] || '',
            h4: freshCopyCandidates.h4?.[0] || '',
          });
        }
        
        if (recommendedColors) {
          setSelectedColors({
            base: recommendedColors.base || freshColors[0]?.hex || '#FFFFFF',
            h1: recommendedColors.h1 || freshColors[1]?.hex || '#1A1A1A',
            h2: recommendedColors.h2 || freshColors[2]?.hex || '#333333',
            h3: recommendedColors.h3 || freshColors[3]?.hex || '#666666',
            h4: recommendedColors.h4 || freshColors[4]?.hex || '#3B82F6',
          });
        } else if (freshColors.length >= 5) {
          setSelectedColors({
            base: freshColors[0].hex,
            h1: freshColors[1].hex,
            h2: freshColors[2].hex,
            h3: freshColors[3].hex,
            h4: freshColors[4].hex,
          });
        }
      }

      // Complete
      setProgressState(prev => ({
        ...prev,
        progress: 100,
        currentStep: '完了！',
        countdownSeconds: 0,
        steps: prev.steps.map(s => ({ ...s, status: 'completed' as const })),
      }));

      await new Promise(resolve => setTimeout(resolve, 500));
      
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
      const selectedImageObjects = images.filter(img => selectedImages.includes(img.id));
      
      setProgressState(prev => ({
        ...prev,
        progress: 20,
        currentStep: 'シナリオを解析中...',
        countdownSeconds: 25,
        steps: prev.steps.map((s, i) => ({
          ...s,
          status: i === 0 ? 'active' : 'pending',
        })),
      }));

      await new Promise(resolve => setTimeout(resolve, 2000));
      
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
          scenario,
          context,
          selectedCopies,
          selectedColors,
          selectedImages: selectedImageObjects,
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
      
      setStep(6);
    } catch (err: any) {
      console.error('❌ Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setProgressState(prev => ({ ...prev, show: false }));
    }
  };

  const stepLabels = [
    { num: 1, label: 'URL入力' },
    { num: 2, label: '画像選択' },
    { num: 3, label: 'コピー編集' },
    { num: 4, label: '色選択' },
    { num: 5, label: 'シナリオ' },
    { num: 6, label: 'LP生成' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
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
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🚀 AI LP Generator
          </h1>
          <p className="text-lg text-gray-600">
            サイト情報からLPを自動生成 | Powered by Gemini
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-center items-center space-x-2 md:space-x-4">
            {stepLabels.map((s) => (
              <div key={s.num} className="flex items-center">
                <div
                  className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    step >= s.num
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {s.num}
                </div>
                <span className="ml-1 md:ml-2 text-xs md:text-sm text-gray-600 hidden sm:inline">{s.label}</span>
                {s.num < 6 && (
                  <div
                    className={`w-6 md:w-12 h-1 mx-1 md:mx-2 ${
                      step > s.num ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-xl shadow-xl p-8">
          {step === 1 && (
            <URLInput onSubmit={handleScrape} loading={loading} />
          )}

          {step === 2 && (
            <ImageSelector
              images={images}
              selectedImages={selectedImages}
              onSelectImages={setSelectedImages}
              onAddImages={handleAddImages}
              onNext={() => setStep(3)}
              onGenerateCopies={() => setStep(3)}
              loading={loading}
              copiesAlreadyLoaded={!!copyCandidates}
            />
          )}

          {step === 3 && copyCandidates && (
            <CopyEditor
              candidates={copyCandidates}
              selected={selectedCopies}
              onSelect={setSelectedCopies}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}

          {step === 4 && (
            <ColorPicker
              palette={palette}
              selected={selectedColors}
              onSelect={setSelectedColors}
              onNext={() => setStep(5)}
              onBack={() => setStep(3)}
              loading={loading}
            />
          )}

          {step === 5 && (
            <LPScenarioEditor
              onSubmit={handleGenerateLPPrompts}
              onBack={() => setStep(4)}
              loading={loading}
            />
          )}

          {step === 6 && lpPagePrompts.length > 0 && (
            <LPPageViewer
              pages={lpPagePrompts}
              selectedColors={selectedColors}
              selectedImages={images.filter(img => selectedImages.includes(img.id))}
              onBack={() => setStep(5)}
            />
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© 2024 AI LP Generator | Built with Next.js & Gemini API</p>
        </div>
      </div>
    </div>
  );
}
