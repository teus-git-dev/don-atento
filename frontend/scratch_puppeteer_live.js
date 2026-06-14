const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('LIVE BROWSER LOG:', msg.text()));
  page.on('pageerror', error => console.log('LIVE BROWSER ERROR:', error.message));
  
  try {
    console.log('Navigating to live site...');
    await page.goto('https://don-atento.vercel.app/providers', { waitUntil: 'networkidle0' });
    console.log('Page loaded');
    
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes('Application error')) {
      console.log('FOUND APPLICATION ERROR ON LIVE SITE!');
    } else {
      console.log('Live site body:', bodyText.substring(0, 200).replace(/\n/g, ' '));
    }
  } catch (e) {
    console.log('FAILED TO LOAD LIVE SITE:', e.message);
  }
  
  await browser.close();
})();
