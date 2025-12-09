const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-key';

async function testImageInPrompt() {
  console.log('=== Testing Image Information in Generated Prompts ===\n');
  
  // Step 1: Scrape URL
  console.log('📡 Step 1: Scraping URL...');
  const scrapeResponse = await fetch('http://localhost:3000/api/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://www.starbucks.co.jp/' })
  });
  const scrapeResult = await scrapeResponse.json();
  
  if (!scrapeResult.success || !scrapeResult.data) {
    console.error('❌ Scraping failed');
    return;
  }
  
  const images = scrapeResult.data.images || [];
  const colors = scrapeResult.data.colors || [];
  const context = scrapeResult.data.context;
  
  console.log(`✅ Scraped: ${images.length} images, ${colors.length} colors\n`);
  
  // Step 2: Auto-select top 4 images
  const selectedImages = images
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 4);
  
  console.log('🎯 Auto-selected 4 images:');
  selectedImages.forEach((img, i) => {
    console.log(`  ${i+1}. "${img.alt}" (${img.width}x${img.height})`);
    console.log(`     URL: ${img.url.substring(0, 80)}...`);
  });
  console.log();
  
  // Step 3: Generate prompts
  console.log('🎨 Step 2: Generating prompts with image data...');
  const promptResponse = await fetch('http://localhost:3000/api/generate-prompts', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-api-key': GEMINI_API_KEY
    },
    body: JSON.stringify({
      context,
      selectedCopies: {
        h1: 'デフォルトH1',
        h2: 'デフォルトH2',
        h3: 'デフォルトH3',
        h4: 'デフォルトH4'
      },
      selectedImages: selectedImages,
      palette: colors,
      selectedColors: {
        base: colors[0]?.hex || '#FFFFFF',
        h1: colors[1]?.hex || '#000000',
        h2: colors[2]?.hex || '#333333',
        h3: colors[3]?.hex || '#666666',
        h4: colors[4]?.hex || '#999999'
      }
    })
  });
  
  const promptResult = await promptResponse.json();
  
  if (!promptResult.success || !promptResult.data) {
    console.error('❌ Prompt generation failed:', promptResult.error);
    return;
  }
  
  console.log('✅ Prompt generation successful\n');
  
  // Step 4: Check if image information is in prompts
  console.log('🔍 Checking if image info is in generated prompts...\n');
  
  const prompts = promptResult.data.prompts;
  const imageKeywords = [
    'OG Image',
    'スモア',
    'チョコレート',
    'フラペチーノ',
    'クリスマス',
    'ホリデー',
    'ギフト',
    'd3vgbguy0yofad.cloudfront.net',
    'dqpw8dh9f7d3f.cloudfront.net'
  ];
  
  ['A', 'B', 'C'].forEach(variant => {
    const prompt = prompts[variant];
    console.log(`\n📝 Prompt ${variant} (${prompt.length} chars):`);
    console.log('─'.repeat(60));
    console.log(prompt.substring(0, 500) + '...\n');
    
    console.log(`🔍 Image reference check for Prompt ${variant}:`);
    const foundKeywords = imageKeywords.filter(keyword => 
      prompt.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (foundKeywords.length > 0) {
      console.log(`  ✅ Found ${foundKeywords.length} image-related keywords:`);
      foundKeywords.forEach(kw => console.log(`     - "${kw}"`));
    } else {
      console.log(`  ⚠️ No image keywords found`);
    }
  });
  
  console.log('\n✅ Full flow test completed');
}

testImageInPrompt().catch(console.error);
