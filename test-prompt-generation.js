// Test prompt generation API
const testData = {
  context: {
    summary: 'Professional business service',
    benefits: ['Fast', 'Reliable', 'Affordable'],
    target: 'business professionals',
    headlines_raw: {
      h1: ['Main headline'],
      h2: ['Subheading'],
      h3: ['Feature text'],
      h4: ['CTA text']
    },
    keywords_top: ['business', 'professional', 'service'],
    entities: ['Company Name']
  },
  selectedCopies: {
    h1: '新しい体験をあなたに',
    h2: 'プロフェッショナルな品質',
    h3: '簡単3ステップで始められます',
    h4: '詳しくはこちら'
  },
  selectedImages: ['img1', 'img2', 'img3', 'img4'],
  palette: [
    { hex: '#3B82F6', score: 1.0 },
    { hex: '#1E40AF', score: 0.9 },
    { hex: '#FFFFFF', score: 0.8 },
    { hex: '#F59E0B', score: 0.7 },
    { hex: '#10B981', score: 0.6 },
    { hex: '#EF4444', score: 0.5 },
    { hex: '#8B5CF6', score: 0.4 },
    { hex: '#000000', score: 0.3 }
  ],
  selectedColors: {
    base: '#FFFFFF',
    h1: '#1E40AF',
    h2: '#3B82F6',
    h3: '#6B7280',
    h4: '#F59E0B'
  }
};

console.log('🧪 Testing prompt generation...');
console.log('📝 Test data:', JSON.stringify(testData, null, 2));

fetch('http://localhost:3000/api/generate-prompts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testData),
})
  .then(res => res.json())
  .then(data => {
    console.log('\n✅ Response received:');
    console.log('Success:', data.success);
    
    if (data.data?.prompts) {
      console.log('\n📄 Prompt A (first 200 chars):');
      console.log(data.data.prompts.A.substring(0, 200));
      console.log('\n📄 Prompt B (first 200 chars):');
      console.log(data.data.prompts.B.substring(0, 200));
      console.log('\n📄 Prompt C (first 200 chars):');
      console.log(data.data.prompts.C.substring(0, 200));
      
      // Check if prompts contain the selected copies
      const promptA = data.data.prompts.A;
      console.log('\n🔍 Checking if Prompt A contains selected copies:');
      console.log('Contains H1 "新しい体験をあなたに":', promptA.includes('新しい体験をあなたに'));
      console.log('Contains H2 "プロフェッショナルな品質":', promptA.includes('プロフェッショナルな品質'));
      console.log('Contains H3 "簡単3ステップで始められます":', promptA.includes('簡単3ステップで始められます'));
      console.log('Contains H4 "詳しくはこちら":', promptA.includes('詳しくはこちら'));
      
      console.log('\n🎨 Checking if Prompt A contains colors:');
      console.log('Contains base color #FFFFFF:', promptA.includes('#FFFFFF') || promptA.includes('FFFFFF'));
      console.log('Contains H1 color #1E40AF:', promptA.includes('#1E40AF') || promptA.includes('1E40AF'));
      console.log('Contains H4 color #F59E0B:', promptA.includes('#F59E0B') || promptA.includes('F59E0B'));
    } else {
      console.log('\n❌ No prompts in response');
    }
  })
  .catch(err => {
    console.error('\n❌ Error:', err.message);
  });
