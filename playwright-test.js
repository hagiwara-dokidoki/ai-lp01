const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  console.log('Opening application...');
  await page.goto('https://3000-iz2ehwbtoobg3b7v36884-c07dda5e.sandbox.novita.ai');
  await page.waitForTimeout(3000);
  
  console.log('Entering URL...');
  await page.fill('input[type="url"]', 'https://www.starbucks.co.jp/');
  
  console.log('Clicking scrape button...');
  await page.click('button:has-text("解析開始")');
  
  console.log('Waiting for images...');
  await page.waitForTimeout(15000);
  
  // Check if images are loaded
  const imageCount = await page.locator('img').count();
  console.log(`Total img tags found: ${imageCount}`);
  
  // Check for debug info
  const debugInfo = await page.locator('text=取得した画像数').textContent().catch(() => 'Not found');
  console.log('Debug info:', debugInfo);
  
  // Take screenshot
  await page.screenshot({ path: '/home/user/webapp/screenshot.png', fullPage: true });
  console.log('Screenshot saved to /home/user/webapp/screenshot.png');
  
  await browser.close();
})();
