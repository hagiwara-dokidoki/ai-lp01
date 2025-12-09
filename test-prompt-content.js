/**
 * プロンプトの実際の内容を確認するテスト
 */

const BASE_URL = 'http://localhost:3000';
const TEST_URL = 'https://www.starbucks.co.jp/';

async function testPromptContent() {
  console.log('🧪 プロンプト内容確認テスト\n');
  
  // Step 1: スクレイピング
  console.log('Step 1: URLスクレイピング...');
  const scrapeResponse = await fetch(`${BASE_URL}/api/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: TEST_URL }),
  });
  
  const scrapeData = await scrapeResponse.json();
  const images = scrapeData.data?.images || [];
  const palette = scrapeData.data?.colors || [];
  const context = scrapeData.data?.context;
  
  console.log(`✅ 画像取得: ${images.length}枚\n`);
  
  // 上位4枚を選択
  const selectedImageObjects = images.slice(0, 4);
  
  console.log('選択された画像:');
  selectedImageObjects.forEach((img, i) => {
    console.log(`  ${i + 1}. ${img.alt || 'No alt'}`);
    console.log(`     サイズ: ${img.width}x${img.height}`);
    console.log(`     URL: ${img.url.substring(0, 80)}...`);
  });
  
  // Step 2: プロンプト生成
  console.log('\nStep 2: プロンプト生成...');
  
  const selectedCopies = {
    h1: 'デフォルトH1',
    h2: 'デフォルトH2',
    h3: 'デフォルトH3',
    h4: 'デフォルトH4',
  };
  
  const selectedColors = {
    base: palette[0]?.hex || '#FFFFFF',
    h1: palette[1]?.hex || '#1E40AF',
    h2: palette[2]?.hex || '#F59E0B',
    h3: palette[3]?.hex || '#10B981',
    h4: palette[4]?.hex || '#EF4444',
  };
  
  const promptResponse = await fetch(`${BASE_URL}/api/generate-prompts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context,
      selectedCopies,
      selectedImages: selectedImageObjects,
      palette,
      selectedColors,
    }),
  });
  
  const promptData = await promptResponse.json();
  const prompts = promptData.data?.prompts || {};
  
  console.log('\n✅ プロンプト生成成功\n');
  
  // プロンプトAの内容を詳細表示
  console.log('=' .repeat(80));
  console.log('📝 PROMPT A (詳細)');
  console.log('='.repeat(80));
  console.log(prompts.A || '(empty)');
  console.log('\n');
  
  console.log('='.repeat(80));
  console.log('📝 PROMPT B (詳細)');
  console.log('='.repeat(80));
  console.log(prompts.B || '(empty)');
  console.log('\n');
  
  console.log('='.repeat(80));
  console.log('📝 PROMPT C (詳細)');
  console.log('='.repeat(80));
  console.log(prompts.C || '(empty)');
  console.log('\n');
  
  // 画像参照のチェック
  console.log('='.repeat(80));
  console.log('🔍 画像参照チェック');
  console.log('='.repeat(80));
  
  const allPrompts = [prompts.A, prompts.B, prompts.C].join('\n');
  
  selectedImageObjects.forEach((img, i) => {
    const alt = img.alt || 'No alt';
    console.log(`\n画像 ${i + 1}: "${alt}"`);
    
    // 画像のキーワードを抽出
    const keywords = alt.split(/[\s\/\-・®]/).filter(w => w.length > 2);
    console.log(`  キーワード: ${keywords.join(', ')}`);
    
    // 各キーワードがプロンプトに含まれているかチェック
    const foundKeywords = keywords.filter(keyword => 
      allPrompts.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (foundKeywords.length > 0) {
      console.log(`  ✅ 以下のキーワードがプロンプトに含まれています:`);
      console.log(`     ${foundKeywords.join(', ')}`);
    } else {
      console.log(`  ❌ プロンプトに画像のキーワードが含まれていません`);
    }
    
    // URLがプロンプトに含まれているかチェック
    if (allPrompts.includes(img.url)) {
      console.log(`  ✅ 画像URLがプロンプトに含まれています`);
    }
  });
  
  console.log('\n✅ テスト完了');
}

// 実行
testPromptContent()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ テスト失敗:', error.message);
    process.exit(1);
  });
