// Test image fetching from scrape API
const url = 'https://www.starbucks.co.jp/';

console.log('Testing scrape API...');
console.log('Target URL:', url);

fetch('http://localhost:3000/api/scrape', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ url }),
})
  .then(res => res.json())
  .then(data => {
    console.log('\n✅ API Response received');
    console.log('Success:', data.success);
    console.log('Images count:', data.data?.images?.length || 0);
    
    if (data.data?.images) {
      console.log('\n📸 Image URLs (first 5):');
      data.data.images.slice(0, 5).forEach((img, i) => {
        console.log(`${i + 1}. ${img.url}`);
        console.log(`   Alt: ${img.alt || 'No alt'}`);
        console.log(`   Size: ${img.width}x${img.height}`);
        console.log(`   Score: ${img.score}`);
      });
    }
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
  });
