// Opens the live design maker, uploads a photo and taps Remove background; prints what happened.
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  page.on('console', (m) => console.log('console', m.type(), m.text().slice(0, 1500)));
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  page.on('requestfailed', (r) => console.log('requestfailed', r.url().slice(0, 200), r.failure()?.errorText));
  page.on('response', (r) => { if (r.status() >= 400) console.log('http', r.status(), r.url().slice(0, 200)); });
  await page.goto(process.argv[2] || 'https://davinova.com/custom/design', { waitUntil: 'networkidle' });
  await page.setInputFiles('input[type=file]', 'public/images/hero-model.webp');
  await page.click('button:has-text("Remove background")');
  const t0 = Date.now();
  for (let i = 0; i < 420; i++) {
    await page.waitForTimeout(1000);
    const state = await page.evaluate(() => ({
      back: !!document.querySelector('button')?.closest('section') && [...document.querySelectorAll('button')].some((b) => b.textContent.includes('Bring the background back')),
      error: document.querySelector('.dm__error')?.textContent || '',
    }));
    if (state.back || state.error) { console.log('RESULT after', Math.round((Date.now() - t0) / 1000), 's', JSON.stringify(state)); break; }
    if (i === 419) console.log('RESULT timeout');
  }
  await page.locator('.dm__stage').screenshot({ path: 'bg-result.png' });
  await browser.close();
})();
