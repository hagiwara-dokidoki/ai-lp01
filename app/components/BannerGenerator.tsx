'use client';

import { useState } from 'react';
import { 
  ScrapedImage, 
  StructuredContext, 
  CopyCandidates, 
  SelectedCopies,
  ColorPalette,
  SelectedColors,
  PromptVariant 
} from '@/lib/types';
import URLInput from './URLInput';
import ImageSelector from './ImageSelector';
import CopyEditor from './CopyEditor';
import ColorPicker from './ColorPicker';
import PromptViewer from './PromptViewer';
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

export default function BannerGenerator() {
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
  const [prompts, setPrompts] = useState<PromptVariant | null>(null);

  // Handler to add manually uploaded images
  const handleAddImages = (newImages: ScrapedImage[]) => {
    setImages(prevImages => [...prevImages, ...newImages]);
  };

  const handleScrape = async (inputUrl: string) => {
    setLoading(true);
    setError('');
    setUrl(inputUrl);
    
    // Initialize progress indicator - 2 phase approach
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
    
    // Reset all cached data when scraping a new URL
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
    setPrompts(null);

    try {
      // ========== PHASE 1: Fast scraping (5-8 seconds) ==========
      
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
      
      // Step 2: HTML取得・解析 (fast API call)
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

      console.log('🚀 Phase 1: Starting fast scrape...');
      const scrapeResponse = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: inputUrl }),
      });

      const scrapeResult = await scrapeResponse.json();
      console.log('📦 Scrape result:', scrapeResult);

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

      // Store images immediately (user can see them while AI processes)
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

      // Set CSS colors as temporary palette
      const cssColors = scrapeResult.data.cssColors || [];
      if (cssColors.length > 0) {
        setPalette(cssColors.map((c: any) => ({ ...c, source: 'css' })));
      }

      console.log('✅ Phase 1 complete:', {
        images: scrapedImages.length,
        cssColors: cssColors.length,
        timing: scrapeResult.timing?.total,
      });

      // ========== PHASE 2: AI Analysis (3-step with timing) ==========
      
      // Step 4: AI分析開始
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

      console.log('🤖 Phase 2: Starting 3-step AI analysis...');
      
      // Start analysis request
      const analyzeStartTime = Date.now();
      const analyzePromise = fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          analysisInput: scrapeResult.data.analysisInput 
        }),
      });

      // Simulate progress updates while waiting for analysis
      // Step 1: Site Analysis (~8s)
      await new Promise(resolve => setTimeout(resolve, 3000));
      setProgressState(prev => ({
        ...prev,
        progress: 40,
        currentStep: '📊 Step 1/3: サイト分析中...',
        countdownSeconds: 5,
      }));
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      // Step 2: Copy Generation (~8s)
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
      // Step 3: Color Proposal (~5s)
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

      // Wait for the actual response
      const analyzeResponse = await analyzePromise;
      const analyzeResult = await analyzeResponse.json();
      const analyzeElapsed = Date.now() - analyzeStartTime;
      
      // Log detailed timing breakdown
      console.log('📦 Analysis result with timing:', {
        ...analyzeResult,
        clientElapsed: `${analyzeElapsed}ms`,
        serverTiming: analyzeResult.timing ? {
          siteAnalysis: `${analyzeResult.timing.siteAnalysis}ms`,
          copyGeneration: `${analyzeResult.timing.copyGeneration}ms`,
          colorProposal: `${analyzeResult.timing.colorProposal}ms`,
          total: `${analyzeResult.timing.total}ms`,
        } : 'not available',
      });

      if (!analyzeResponse.ok) {
        // Use basic context as fallback
        console.warn('⚠️ AI analysis failed, using basic context');
        setContext(scrapeResult.data.basicContext);
        setCopyCandidates({
          h1: ['新しい体験をあなたに', 'より良い明日のために', '選ばれる理由がここに'],
          h2: ['プロフェッショナルな品質', '簡単・安心・便利', 'お客様満足度No.1'],
          h3: ['無料体験実施中', '今なら特典付き', '簡単3ステップ'],
          h4: ['詳しくはこちら', '今すぐ申込', '無料相談'],
        });
      } else {
        // Step 6: カラーパレット生成
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

        // Store AI analysis results
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

        // Log detailed timing breakdown
        if (analyzeResult.timing) {
          console.log('⏱️ AI Analysis Timing Breakdown:');
          console.log(`   📊 Step 1 - Site Analysis: ${analyzeResult.timing.siteAnalysis}ms`);
          console.log(`   ✍️ Step 2 - Copy Generation: ${analyzeResult.timing.copyGeneration}ms`);
          console.log(`   🎨 Step 3 - Color Proposal: ${analyzeResult.timing.colorProposal}ms`);
          console.log(`   🏁 Total API Time: ${analyzeResult.timing.total}ms`);
        }
        
        console.log('✅ Phase 2 complete:', {
          context: !!freshContext,
          colors: freshColors.length,
          copies: !!freshCopyCandidates,
          timing: analyzeResult.timing,
        });
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

  const handleGenerateCopies = async () => {
    if (!context) {
      console.error('❌ No context available for copy generation');
      return;
    }
    
    console.log('🔄 Generating copies with context:', {
      summary: context.summary?.substring(0, 100),
      benefits: context.benefits?.slice(0, 3),
      target: context.target,
      keywords: context.keywords_top?.slice(0, 5),
    });
    
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/generate-copies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate copies');
      }

      setCopyCandidates(result.data.candidates);
      
      // Set default selections (first of each)
      setSelectedCopies({
        h1: result.data.candidates.h1[0] || '',
        h2: result.data.candidates.h2[0] || '',
        h3: result.data.candidates.h3[0] || '',
        h4: result.data.candidates.h4[0] || '',
      });

      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePrompts = async () => {
    if (!context || !selectedCopies) return;
    
    // Get full image objects from selectedImages IDs
    const selectedImageObjects = images.filter(img => selectedImages.includes(img.id));
    
    console.log('🚀 Generating prompts with data:', {
      selectedCopies,
      selectedColors,
      selectedImages: selectedImages.length,
      selectedImageObjects: selectedImageObjects.length,
      imageDetails: selectedImageObjects.map(img => ({
        alt: img.alt,
        url: img.url.substring(0, 50),
      })),
      paletteSize: palette.length,
    });
    
    setLoading(true);
    setError('');
    
    // Initialize progress indicator - 3 batch parallel generation
    setProgressState({
      show: true,
      title: 'プロンプト生成中',
      progress: 0,
      currentStep: '準備中...',
      estimatedTime: '約10秒',
      countdownSeconds: 10,
      steps: [
        { label: 'データ準備', status: 'active' },
        { label: 'Batch 1: A-D生成', status: 'pending' },
        { label: 'Batch 2: E-H生成', status: 'pending' },
        { label: 'Batch 3: I-L生成', status: 'pending' },
      ],
    });

    try {
      // Step 1: Prepare data
      setProgressState(prev => ({
        ...prev,
        progress: 10,
        currentStep: 'データを準備中...',
        countdownSeconds: 9,
      }));
      
      const requestData = {
        context,
        selectedCopies,
        selectedImages: selectedImageObjects,
        palette,
        selectedColors,
      };
      
      console.log('📤 Sending request to /api/generate-prompts (3-batch parallel)');

      // Start API call and show batch progress
      const promptStartTime = Date.now();
      
      // Step 2: Show batch generation progress
      setProgressState(prev => ({
        ...prev,
        progress: 20,
        currentStep: '🚀 3バッチ並列生成中 (A-D, E-H, I-L)...',
        countdownSeconds: 8,
        steps: prev.steps.map((s, i) => ({
          ...s,
          status: i === 0 ? 'completed' : i <= 3 ? 'active' : 'pending',
        })),
      }));

      // Start the request
      const responsePromise = fetch('/api/generate-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      // Simulate progress updates while batches run in parallel
      await new Promise(resolve => setTimeout(resolve, 2000));
      setProgressState(prev => ({
        ...prev,
        progress: 40,
        currentStep: '📝 Batch 1 (A-D) 処理中...',
        countdownSeconds: 6,
      }));

      await new Promise(resolve => setTimeout(resolve, 2000));
      setProgressState(prev => ({
        ...prev,
        progress: 60,
        currentStep: '📝 Batch 2 (E-H) 処理中...',
        countdownSeconds: 4,
      }));

      await new Promise(resolve => setTimeout(resolve, 2000));
      setProgressState(prev => ({
        ...prev,
        progress: 80,
        currentStep: '📝 Batch 3 (I-L) 処理中...',
        countdownSeconds: 2,
      }));

      // Wait for actual response
      const response = await responsePromise;
      const result = await response.json();
      const promptElapsed = Date.now() - promptStartTime;
      
      // Log timing breakdown
      console.log('📥 Received response with timing:', {
        success: result.success,
        hasPrompts: !!result.data?.prompts,
        clientElapsed: `${promptElapsed}ms`,
        serverTiming: result.timing ? {
          batch1_ABCD: `${result.timing.batch1_ABCD}ms`,
          batch2_EFGH: `${result.timing.batch2_EFGH}ms`,
          batch3_IJKL: `${result.timing.batch3_IJKL}ms`,
          total: `${result.timing.total}ms`,
        } : 'not available',
      });

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate prompts');
      }

      // Log detailed timing
      if (result.timing) {
        console.log('⏱️ Prompt Generation Timing Breakdown:');
        console.log(`   📝 Batch 1 (A-D): ${result.timing.batch1_ABCD}ms`);
        console.log(`   📝 Batch 2 (E-H): ${result.timing.batch2_EFGH}ms`);
        console.log(`   📝 Batch 3 (I-L): ${result.timing.batch3_IJKL}ms`);
        console.log(`   🏁 Total API Time: ${result.timing.total}ms`);
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

      setPrompts(result.data.prompts);
      setStep(5);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setProgressState(prev => ({ ...prev, show: false }));
    }
  };

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
            🎨 AI Banner Generator
          </h1>
          <p className="text-lg text-gray-600">
            URLからバナーを自動生成 | Powered by Gemini
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-center items-center space-x-4">
            {[
              { num: 1, label: 'URL入力' },
              { num: 2, label: '画像選択' },
              { num: 3, label: 'コピー編集' },
              { num: 4, label: '色選択' },
              { num: 5, label: 'バナー生成' },
            ].map((s) => (
              <div key={s.num} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    step >= s.num
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {s.num}
                </div>
                <span className="ml-2 text-sm text-gray-600">{s.label}</span>
                {s.num < 5 && (
                  <div
                    className={`w-12 h-1 mx-2 ${
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
              onGenerateCopies={() => setStep(3)} // Copy candidates already loaded from scrape
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
              onNext={handleGeneratePrompts}
              onBack={() => setStep(3)}
              loading={loading}
            />
          )}

          {step === 5 && prompts && (
            <PromptViewer
              prompts={prompts}
              selectedCopies={selectedCopies}
              selectedColors={selectedColors}
              selectedImages={images.filter(img => selectedImages.includes(img.id))}
              onBack={() => setStep(4)}
            />
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© 2024 AI Banner Generator | Built with Next.js & Gemini API</p>
        </div>
      </div>
    </div>
  );
}
