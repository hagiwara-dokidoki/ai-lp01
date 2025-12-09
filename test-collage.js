async function testCollage() {
  console.log('=== Testing Direct Image Collage ===\n');
  
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
  
  // Step 3: Generate collage banner (Variant A)
  console.log('🎨 Step 2: Generating collage banner (Variant A)...');
  console.log('   Using direct image collage (NO AI generation)\n');
  
  const bannerResponse = await fetch('http://localhost:3000/api/generate-banner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
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
      useCollage: true
    })
  });
  
  const bannerResult = await bannerResponse.json();
  
  if (!bannerResponse.ok || !bannerResult.success) {
    console.error('❌ Collage generation failed:', bannerResult.error);
    return;
  }
  
  console.log('✅ Collage banner generated successfully!');
  console.log('   Method:', bannerResult.data.method);
  console.log('   Image data length:', bannerResult.data.imageData?.length || 0, 'chars');
  console.log('   MIME type:', bannerResult.data.mimeType);
  console.log('\n✅ Full test completed - Original images used without AI generation');
}

testCollage().catch(console.error);
