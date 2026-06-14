const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message, error.stack));
  
  console.log("Navigating to localhost...");
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  
  console.log("Waiting 3s for rendering...");
  await page.waitForTimeout(3000);
  
  const title = await page.title();
  console.log("Page title:", title);
  
  const body = await page.innerHTML('body');
  console.log("Body length:", body.length);
  
  await browser.close();
})();
