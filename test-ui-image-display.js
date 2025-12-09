/**
 * UIテスト: 画像詳細が確定内容セクションに表示されるかを確認
 */

const puppeteer = require('puppeteer');

(async () => {
  console.log('🧪 UI画像表示テスト開始\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Step 1: ページを開く
    console.log('Step 1: ページを開く...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });
    await page.screenshot({ path: '/home/user/webapp/screenshots/01-initial.png' });
    console.log('   ✅ スクリーンショット保存: 01-initial.png');
    
    // Step 2: URLを入力して解析開始
    console.log('\nStep 2: URL入力と解析開始...');
    await page.type('input[type="text"]', 'https://www.starbucks.co.jp/');
    await page.screenshot({ path: '/home/user/webapp/screenshots/02-url-input.png' });
    
    await page.click('button:has-text("解析開始")');
    console.log('   ⏳ 解析中...');
    
    // Wait for images to load (step 2)
    await page.waitForSelector('img[alt*="OG"]', { timeout: 60000 });
    console.log('   ✅ 画像読み込み完了');
    
    await page.screenshot({ path: '/home/user/webapp/screenshots/03-images-loaded.png', fullPage: true });
    console.log('   ✅ スクリーンショット保存: 03-images-loaded.png');
    
    // Check auto-selected images
    const imageCount = await page.$$eval('img[alt]', imgs => imgs.length);
    console.log(`   📸 表示された画像数: ${imageCount}`);
    
    // Step 3: コピー生成へ進む
    console.log('\nStep 3: コピー生成へ進む...');
    await page.click('button:has-text("コピー生成へ進む")');
    await page.waitForTimeout(2000);
    
    // Wait for copy generation (this may take a while)
    console.log('   ⏳ コピー生成中...');
    await page.waitForSelector('text/H1', { timeout: 60000 });
    await page.screenshot({ path: '/home/user/webapp/screenshots/04-copy-generated.png', fullPage: true });
    console.log('   ✅ スクリーンショット保存: 04-copy-generated.png');
    
    // Step 4: カラー選択へ進む
    console.log('\nStep 4: カラー選択へ進む...');
    await page.click('button:has-text("カラー選択へ進む")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/home/user/webapp/screenshots/05-color-selection.png', fullPage: true });
    console.log('   ✅ スクリーンショット保存: 05-color-selection.png');
    
    // Step 5: プロンプト生成
    console.log('\nStep 5: プロンプト生成...');
    await page.click('button:has-text("プロンプト生成")');
    console.log('   ⏳ プロンプト生成中（最大30秒）...');
    
    // Wait for prompt viewer to appear
    await page.waitForSelector('text/確定内容', { timeout: 60000 });
    console.log('   ✅ プロンプトビューア表示');
    
    await page.waitForTimeout(2000); // Wait for all images to render
    
    // Take screenshot of final confirmation section
    await page.screenshot({ path: '/home/user/webapp/screenshots/06-final-confirmation.png', fullPage: true });
    console.log('   ✅ スクリーンショット保存: 06-final-confirmation.png');
    
    // Check if images are displayed in confirmation
    console.log('\n🔍 確定内容セクションをチェック...');
    
    const confirmationText = await page.evaluate(() => {
      const confirmSection = document.querySelector('h3:has-text("確定内容")');
      if (!confirmSection) return null;
      
      const parent = confirmSection.parentElement;
      return {
        hasImageSection: !!parent.querySelector('h4:has-text("選択画像")'),
        imageCount: parent.querySelectorAll('img').length,
        imageDetails: Array.from(parent.querySelectorAll('img')).map(img => ({
          src: img.src.substring(0, 60),
          alt: img.alt,
        })),
      };
    });
    
    if (confirmationText) {
      console.log(`   - 画像セクション存在: ${confirmationText.hasImageSection ? '✅' : '❌'}`);
      console.log(`   - 表示画像数: ${confirmationText.imageCount}`);
      console.log('   - 画像詳細:');
      confirmationText.imageDetails.forEach((img, i) => {
        console.log(`     ${i + 1}. ${img.alt} (${img.src}...)`);
      });
    } else {
      console.log('   ❌ 確定内容セクションが見つかりませんでした');
    }
    
    // Scroll to confirmation section for better screenshot
    await page.evaluate(() => {
      const section = document.querySelector('h3:has-text("確定内容")');
      if (section) section.scrollIntoView({ behavior: 'smooth' });
    });
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: '/home/user/webapp/screenshots/07-confirmation-focused.png' });
    console.log('   ✅ スクリーンショット保存: 07-confirmation-focused.png');
    
    console.log('\n✅ UIテスト完了！');
    console.log('\n📁 スクリーンショットは以下に保存されました:');
    console.log('   /home/user/webapp/screenshots/');
    
  } catch (error) {
    console.error('\n❌ テスト失敗:', error.message);
    await page.screenshot({ path: '/home/user/webapp/screenshots/error.png', fullPage: true });
    console.log('   エラー時のスクリーンショット保存: error.png');
  } finally {
    await browser.close();
  }
})();
