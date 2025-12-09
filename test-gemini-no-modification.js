const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-key';

async function testGeminiNoModification() {
  console.log('=== Testing Gemini 3 Pro Image with No-Modification Instructions ===\n');
  
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
  
  // Step 2: Select top 4 images
  const selectedImages = images
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 4);
  
  console.log('🎯 Selected 4 images:');
  selectedImages.forEach((img, i) => {
    console.log(`  ${i+1}. "${img.alt}" (${img.width}x${img.height})`);
  });
  console.log();
  
  // Step 3: Generate prompts
  console.log('🎨 Step 2: Generating prompts...');
  const promptResponse = await fetch('http://localhost:3000/api/generate-prompts', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-api-key': GEMINI_API_KEY
    },
    body: JSON.stringify({
      context,
      selectedCopies: {
        h1: 'スモア チョコレート フラペチーノ®',
        h2: 'とろける香ばしさ',
        h3: 'ホリデー限定',
        h4: '詳しくはこちら'
      },
      selectedImages: selectedImages,
      palette: colors,
      selectedColors: {
        base: colors[0]?.hex || '#3B82F6',
        h1: colors[1]?.hex || '#1E40AF',
        h2: colors[2]?.hex || '#DBEAFE',
        h3: colors[3]?.hex || '#10B981',
        h4: colors[4]?.hex || '#F59E0B'
      }
    })
  });
  
  const promptResult = await promptResponse.json();
  
  if (!promptResult.success || !promptResult.data) {
    console.error('❌ Prompt generation failed:', promptResult.error);
    return;
  }
  
  console.log('✅ Prompt generation successful\n');
  const prompts = promptResult.data.prompts;
  
  // Step 4: Generate banner using Gemini 3 Pro Image (Variant A)
  console.log('🎨 Step 3: Generating banner using Gemini 3 Pro Image API...');
  console.log('   With STRICT instructions to NOT modify images\n');
  
  const bannerResponse = await fetch('http://localhost:3000/api/generate-banner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: prompts.A,
      variant: 'A',
      selectedImages: selectedImages.map(img => ({
        url: img.url,
        alt: img.alt,
        width: img.width,
        height: img.height
      })),
      selectedCopies: {
        h1: 'スモア チョコレート フラペチーノ®',
        h2: 'とろける香ばしさ',
        h3: 'ホリデー限定',
        h4: '詳しくはこちら'
      },
      selectedColors: {
        base: colors[0]?.hex || '#3B82F6',
        h1: colors[1]?.hex || '#1E40AF',
        h2: colors[2]?.hex || '#DBEAFE',
        h3: colors[3]?.hex || '#10B981',
        h4: colors[4]?.hex || '#F59E0B'
      },
      useCollage: false // Use Gemini 3 Pro Image API
    })
  });
  
  const bannerResult = await bannerResponse.json();
  
  if (!bannerResponse.ok || !bannerResult.success) {
    console.error('❌ Banner generation failed:', bannerResult.error);
    console.log('\n⚠️  This might be expected if:');
    console.log('   1. GEMINI_API_KEY is not set correctly');
    console.log('   2. API quota is exceeded');
    console.log('   3. Image download failed');
    console.log('   4. Gemini API encountered an error');
    return;
  }
  
  console.log('✅ Banner generated successfully using Gemini 3 Pro Image!');
  console.log('   Method:', bannerResult.data.method);
  console.log('   Image data length:', bannerResult.data.imageData?.length || 0, 'chars');
  console.log('   MIME type:', bannerResult.data.mimeType);
  console.log('\n📝 Instructions sent to Gemini:');
  console.log('   - DO NOT modify reference images');
  console.log('   - Use images EXACTLY as provided');
  console.log('   - Think of it as photo collage design');
  console.log('   - Resize/crop/reposition OK, but no redrawing');
  console.log('\n✅ Full test completed - Gemini API used with strict no-modification instructions');
}

testGeminiNoModification().catch(console.error);
