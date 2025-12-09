// Test prompt generation with actual image objects
const testData = {
  context: {
    summary: 'Starbucks Coffee - Premium coffee experience',
    benefits: ['High quality', 'Comfortable atmosphere', 'Seasonal drinks'],
    target: 'coffee lovers',
    headlines_raw: {
      h1: ['Starbucks Coffee'],
      h2: ['Premium Experience'],
      h3: ['Seasonal Menu'],
      h4: ['Visit Now']
    },
    keywords_top: ['coffee', 'starbucks', 'premium'],
    entities: ['Starbucks']
  },
  selectedCopies: {
    h1: '新しい体験をあなたに',
    h2: 'プロフェッショナルな品質',
    h3: '簡単3ステップで始められます',
    h4: '詳しくはこちら'
  },
  selectedImages: [
    {
      id: 'auto_1',
      url: 'https://d3vgbguy0yofad.cloudfront.net/images/og/logo.png',
      alt: 'Starbucks Logo',
      width: 1200,
      height: 630,
      score: 1.0,
      source: 'auto'
    },
    {
      id: 'auto_2',
      url: 'https://example.com/seasonal-drink.jpg',
      alt: 'Seasonal Holiday Drink - Frappuccino',
      width: 800,
      height: 600,
      score: 0.9,
      source: 'auto'
    },
    {
      id: 'auto_3',
      url: 'https://example.com/store-interior.jpg',
      alt: 'Cozy Starbucks store interior with comfortable seating',
      width: 1024,
      height: 768,
      score: 0.8,
      source: 'auto'
    },
    {
      id: 'auto_4',
      url: 'https://example.com/barista.jpg',
      alt: 'Professional barista preparing coffee',
      width: 800,
      height: 800,
      score: 0.7,
      source: 'auto'
    }
  ],
  palette: [
    { hex: '#00704A', score: 1.0 }, // Starbucks Green
    { hex: '#FFFFFF', score: 0.9 },
    { hex: '#000000', score: 0.8 },
    { hex: '#D4AF37', score: 0.7 },
    { hex: '#8B4513', score: 0.6 },
    { hex: '#F5F5DC', score: 0.5 },
    { hex: '#CD853F', score: 0.4 },
    { hex: '#A0522D', score: 0.3 }
  ],
  selectedColors: {
    base: '#FFFFFF',
    h1: '#00704A',
    h2: '#000000',
    h3: '#8B4513',
    h4: '#D4AF37'
  }
};

console.log('🧪 Testing prompt generation with image details...');
console.log('📸 Selected images:');
testData.selectedImages.forEach((img, i) => {
  console.log(`  ${i + 1}. "${img.alt}" (${img.width}x${img.height})`);
});

fetch('http://localhost:3000/api/generate-prompts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testData),
})
  .then(res => res.json())
  .then(data => {
    console.log('\n✅ Response received');
    
    if (data.data?.prompts) {
      const promptA = data.data.prompts.A;
      
      console.log('\n📄 Prompt A (first 500 chars):');
      console.log(promptA.substring(0, 500));
      
      console.log('\n🔍 Checking if Prompt A contains image references:');
      console.log('Contains "Starbucks Logo":', promptA.includes('Starbucks Logo') || promptA.includes('logo'));
      console.log('Contains "Seasonal":', promptA.includes('Seasonal') || promptA.includes('seasonal'));
      console.log('Contains "Frappuccino":', promptA.includes('Frappuccino') || promptA.includes('drink'));
      console.log('Contains "store" or "interior":', promptA.includes('store') || promptA.includes('interior'));
      console.log('Contains "barista" or "coffee":', promptA.includes('barista') || promptA.includes('coffee'));
      
      console.log('\n✅ Verification complete');
    } else {
      console.log('\n❌ No prompts in response');
    }
  })
  .catch(err => {
    console.error('\n❌ Error:', err.message);
  });
