const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  
  try {
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    await page.type('input[type="email"]', 'gerenciacomercial@incasainmobiliaria.com');
    await page.type('input[type="password"]', 'IncasaAdmin2026!');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    console.log('Logged in. Navigating to providers...');
    await page.goto('http://localhost:3000/providers', { waitUntil: 'networkidle0' });
    console.log('Providers page loaded');
    
    // Check if error is on screen
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes('Application error')) {
      console.log('FOUND APPLICATION ERROR IN BODY');
    }
  } catch (e) {
    console.log('FAILED TO LOAD:', e.message);
  }
  
  await browser.close();
})();
