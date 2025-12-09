/**
 * 完全なフローテスト：画像詳細が確定内容に表示されるかを確認
 */

const BASE_URL = 'http://localhost:3000';
const TEST_URL = 'https://www.starbucks.co.jp/';

async function testFullFlow() {
  console.log('🧪 完全フローテスト開始\n');
  
  // Step 1: URLスクレイピング
  console.log('Step 1: URLスクレイピング...');
  const scrapeResponse = await fetch(`${BASE_URL}/api/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: TEST_URL }),
  });
  
  if (!scrapeResponse.ok) {
    throw new Error(`スクレイピング失敗: ${scrapeResponse.status}`);
  }
  
  const scrapeData = await scrapeResponse.json();
  console.log('✅ スクレイピング成功');
  console.log('📦 レスポンス構造:', Object.keys(scrapeData));
  console.log(`   - 画像数: ${scrapeData.data?.images?.length || scrapeData.images?.length || 0}`);
  console.log(`   - カラー数: ${scrapeData.data?.colors?.length || scrapeData.palette?.length || 0}`);
  
  // Handle both nested and flat response structures
  const images = scrapeData.data?.images || scrapeData.images || [];
  const palette = scrapeData.data?.colors || scrapeData.palette || [];
  const context = scrapeData.data?.context || scrapeData.context;
  
  if (!images || images.length === 0) {
    throw new Error('画像が取得できませんでした');
  }
  
  // 上位4枚の画像を選択（自動選択をシミュレート）
  const selectedImages = images
    .slice(0, 4)
    .map(img => img.id);
  
  console.log('\n選択された画像:');
  images.slice(0, 4).forEach((img, i) => {
    console.log(`   ${i + 1}. ${img.alt || 'No alt'} (${img.width}x${img.height})`);
  });
  
  // Step 2: コピー生成
  console.log('\nStep 2: コピー生成...');
  const copyResponse = await fetch(`${BASE_URL}/api/generate-copies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context }),
  });
  
  if (!copyResponse.ok) {
    throw new Error(`コピー生成失敗: ${copyResponse.status}`);
  }
  
  const copyData = await copyResponse.json();
  console.log('✅ コピー生成成功');
  
  const selectedCopies = {
    h1: copyData.h1?.[0] || 'デフォルトH1',
    h2: copyData.h2?.[0] || 'デフォルトH2',
    h3: copyData.h3?.[0] || 'デフォルトH3',
    h4: copyData.h4?.[0] || 'デフォルトH4',
  };
  
  console.log('   選択されたコピー:');
  console.log(`   - H1: ${selectedCopies.h1}`);
  console.log(`   - H2: ${selectedCopies.h2}`);
  
  // Step 3: カラー選択
  const selectedColors = {
    base: palette?.[0]?.hex || '#FFFFFF',
    h1: palette?.[1]?.hex || '#1E40AF',
    h2: palette?.[2]?.hex || '#F59E0B',
    h3: palette?.[3]?.hex || '#10B981',
    h4: palette?.[4]?.hex || '#EF4444',
  };
  
  console.log('\n選択されたカラー:');
  console.log(`   - ベース: ${selectedColors.base}`);
  console.log(`   - H1: ${selectedColors.h1}`);
  
  // Step 4: プロンプト生成（完全な画像オブジェクトを送信）
  console.log('\nStep 4: プロンプト生成...');
  const selectedImageObjects = images
    .filter(img => selectedImages.includes(img.id));
  
  console.log(`\n📤 API送信データ:`);
  console.log(`   - selectedImageObjects数: ${selectedImageObjects.length}`);
  console.log(`   - 画像詳細:`);
  selectedImageObjects.forEach((img, i) => {
    console.log(`     ${i + 1}. ${img.alt || 'No alt'} (${img.width}x${img.height})`);
    console.log(`        URL: ${img.url.substring(0, 60)}...`);
  });
  
  const promptResponse = await fetch(`${BASE_URL}/api/generate-prompts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context,
      selectedCopies,
      selectedImages: selectedImageObjects, // 完全な画像オブジェクト
      palette,
      selectedColors,
    }),
  });
  
  if (!promptResponse.ok) {
    const errorText = await promptResponse.text();
    throw new Error(`プロンプト生成失敗: ${promptResponse.status}\n${errorText}`);
  }
  
  const promptData = await promptResponse.json();
  console.log('\n✅ プロンプト生成成功');
  
  // Handle both nested and flat response structures
  const prompts = promptData.data?.prompts || promptData.prompts || {};
  console.log('📦 プロンプトレスポンス構造:', Object.keys(promptData));
  
  // プロンプトに画像情報が含まれているか確認
  console.log('\n🔍 プロンプト内容チェック:');
  const promptA = prompts?.A || '';
  const promptB = prompts?.B || '';
  const promptC = prompts?.C || '';
  
  console.log(`   - Prompt A長さ: ${promptA.length} 文字`);
  console.log(`   - Prompt B長さ: ${promptB.length} 文字`);
  console.log(`   - Prompt C長さ: ${promptC.length} 文字`);
  
  // 画像情報が含まれているかチェック
  console.log('\n📸 画像情報の反映チェック:');
  selectedImageObjects.forEach((img, i) => {
    const altWords = (img.alt || '').split(' ').filter(w => w.length > 3);
    const foundInPrompt = altWords.some(word => 
      promptA.toLowerCase().includes(word.toLowerCase()) ||
      promptB.toLowerCase().includes(word.toLowerCase()) ||
      promptC.toLowerCase().includes(word.toLowerCase())
    );
    
    console.log(`   ${i + 1}. "${img.alt || 'No alt'}": ${foundInPrompt ? '✅ 含まれている' : '❌ 含まれていない'}`);
  });
  
  // H1-H4テキストが含まれているかチェック
  console.log('\n📝 選択テキストの反映チェック:');
  const checks = {
    'H1テキスト': selectedCopies.h1,
    'H2テキスト': selectedCopies.h2,
    'H3テキスト': selectedCopies.h3,
    'H4テキスト': selectedCopies.h4,
  };
  
  Object.entries(checks).forEach(([label, text]) => {
    const found = promptA.includes(text) || promptB.includes(text) || promptC.includes(text);
    console.log(`   - ${label}: ${found ? '✅' : '❌'}`);
  });
  
  // カラーコードが含まれているかチェック
  console.log('\n🎨 選択カラーの反映チェック:');
  Object.entries(selectedColors).forEach(([label, color]) => {
    const found = promptA.includes(color) || promptB.includes(color) || promptC.includes(color);
    console.log(`   - ${label} (${color}): ${found ? '✅' : '❌'}`);
  });
  
  console.log('\n✅ 完全フローテスト完了');
  
  return {
    images,
    palette,
    context,
    selectedImageObjects,
    selectedCopies,
    selectedColors,
    prompts,
  };
}

// 実行
testFullFlow()
  .then(result => {
    console.log('\n🎉 テスト成功！');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ テスト失敗:', error.message);
    process.exit(1);
  });
