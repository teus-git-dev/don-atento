const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('LIVE BROWSER LOG:', msg.text()));
  page.on('pageerror', error => console.log('LIVE BROWSER ERROR:', error.message));
  
  try {
    console.log('Navigating to live login...');
    await page.goto('https://don-atento.vercel.app/login', { waitUntil: 'networkidle0' });
    
    await page.type('input[type="email"]', 'gerenciacomercial@incasainmobiliaria.com');
    await page.type('input[type="password"]', 'IncasaAdmin2026!');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
    console.log('Logged in. Navigating to providers...');
    
    await page.goto('https://don-atento.vercel.app/providers', { waitUntil: 'networkidle0', timeout: 15000 });
    console.log('Providers page loaded');
    
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes('Application error')) {
      console.log('FOUND APPLICATION ERROR ON LIVE SITE AFTER LOGIN!');
    } else {
      console.log('Live site body:', bodyText.substring(0, 300).replace(/\n/g, ' '));
    }
  } catch (e) {
    console.log('FAILED TO LOAD LIVE SITE:', e.message);
  }
  
  await browser.close();
})();
