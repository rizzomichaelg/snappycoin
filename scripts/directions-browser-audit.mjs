// Run with PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node scripts/directions-browser-audit.mjs
// All measurement and customer API traffic is intercepted; no real conversions/orders are submitted.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const { chromium, devices } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(new URL('../', import.meta.url).pathname);
const output = resolve(process.env.DIRECTIONS_AUDIT_OUTPUT || '/tmp/snappy-directions-audit');
await mkdir(output, { recursive: true });
const server = createServer(async (req, res) => {
  try {
    let path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (path !== root && !path.startsWith(root + '/')) throw Error('Invalid path');
    if (!extname(path)) path += '/index.html';
    const content = await readFile(path);
    res.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png' }[extname(path)] || 'application/octet-stream' });
    res.end(content);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = process.env.DIRECTIONS_AUDIT_ORIGIN || `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const report = { origin, checkedAt: new Date().toISOString(), measurementIntercepted: true, physicalDevicesTested: false, tagAssistantTested: false, checks: [], passed: false };
const conversion = { send_to: 'AW-18256973572/dUlhCJ68nK4dEISezYFE' };
const google = 'https://www.google.com/maps/dir/?api=1&destination=2303%20McKelvey%20Rd%20Maryland%20Heights%20MO%2063043';
const profiles = [
  ['desktop', { viewport: { width: 1440, height: 900 } }, ['google', 'apple']],
  ['iphone', devices['iPhone 13'], ['apple', 'google', 'waze']],
  ['ipad-desktop-ua', { viewport: { width: 1024, height: 768 }, hasTouch: true, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15' }, ['apple', 'google', 'waze']],
  ['android', devices['Pixel 7'], ['google', 'waze']],
  ['narrow-phone', { ...devices['iPhone SE'], viewport: { width: 320, height: 568 } }, ['apple', 'google', 'waze']],
  ['zoom-equivalent', { viewport: { width: 720, height: 450 } }, ['google', 'apple']],
];

async function contextFor(settings = {}, blockTag = false) {
  const context = await browser.newContext({ reducedMotion: 'reduce', ...settings });
  context.setDefaultTimeout(15000);
  await context.addInitScript(() => {
    window.__directionsViolations = [];
    document.addEventListener('securitypolicyviolation', e => window.__directionsViolations.push({ source: e.blockedURI, directive: e.effectiveDirective }));
  });
  await context.route('**/*', route => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin === origin) return route.continue();
    if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
    if (blockTag && url.hostname === 'www.googletagmanager.com') return route.abort('blockedbyclient');
    if (req.isNavigationRequest()) return route.fulfill({ contentType: 'text/html', body: '<title>Intercepted external maps destination</title>' });
    if (url.hostname === 'dexterlive-status.snappycoinlaundry.workers.dev') return route.fulfill({ json: { fetchedAtMs: Date.now(), washers: { available: 17, total: 22, inUse: 5 }, dryers: { available: 25, total: 28, inUse: 3 } } });
    if (url.pathname.endsWith('/public')) return route.fulfill({ json: { active: false } });
    if (url.hostname === 'challenges.cloudflare.com') return route.fulfill({ contentType: 'application/javascript', body: 'window.turnstile={render:()=>"fixture",getResponse:()=>"",reset:()=>{}};' });
    if (req.resourceType() === 'script') return route.fulfill({ contentType: 'application/javascript', body: '' });
    return route.fulfill({ status: 204, body: '' });
  });
  return context;
}
const commands = page => page.evaluate(() => (window.dataLayer || []).filter(c => c[0] === 'event' && c[1] === 'conversion').map(c => Array.from(c)));
const visibleApps = page => page.locator('[data-directions-app]:visible').evaluateAll(links => links.map(link => link.dataset.directionsApp));
async function open(page, index = 0) {
  await page.locator('[data-directions-opener]').nth(index).click();
  await assert.equal(await page.locator('#directions-dialog').evaluate(d => d.open), true);
}

try {
  for (const [name, settings, expected] of profiles) {
    const context = await contextFor(settings);
    if (name === 'ipad-desktop-ua') await context.addInitScript(() => {
      Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' });
      Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 });
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(origin, { waitUntil: 'load' });
    await page.waitForFunction(() => window.dataLayer?.some(c => c[0] === 'config' && c[1] === 'AW-18256973572'));
    const config = await page.evaluate(() => Array.from(window.dataLayer.find(c => c[0] === 'config' && c[1] === 'AW-18256973572')));
    assert.equal(config[2].allow_ad_personalization_signals, false);
    assert.deepEqual(await commands(page), []);
    let picks = 0;
    for (let entry = 0; entry < 3; entry++) {
      await open(page, entry);
      assert.deepEqual(await visibleApps(page), expected);
      assert.deepEqual(await commands(page), Array.from({ length: picks }, () => ['event', 'conversion', conversion]));
      assert.equal(await page.evaluate(() => document.activeElement.dataset.directionsApp), expected[0]);
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      assert.equal(await page.locator('[data-directions-opener]').nth(entry).evaluate(el => el === document.activeElement), true);
      for (const app of expected) {
        await open(page, entry);
        const option = page.locator(`[data-directions-app="${app}"]`);
        const expectedUrl = await option.getAttribute('href');
        const popupPromise = page.waitForEvent('popup');
        await option.click();
        const popup = await popupPromise;
        await popup.waitForLoadState('domcontentloaded');
        assert.equal(popup.url(), expectedUrl);
        assert.equal(await popup.evaluate(() => window.opener), null);
        await popup.close();
        picks++;
        assert.deepEqual(await commands(page), Array.from({ length: picks }, () => ['event', 'conversion', conversion]));
        assert.equal(await page.locator('#directions-dialog').evaluate(d => d.open), false);
        assert.equal(await page.locator('[data-directions-opener]').nth(entry).evaluate(el => el === document.activeElement), true);
      }
    }
    // Reach the opener with keyboard, then verify forward/backward containment and Escape.
    await page.locator('.hero-ctas [data-directions-opener]').focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.hasAttribute('data-directions-opener')), true);
    await page.keyboard.press('Enter');
    for (let n = 0; n < (expected.length + 1) * 2; n++) {
      assert.equal(await page.evaluate(() => !!document.activeElement.closest('#directions-dialog')), true);
      await page.keyboard.press('Tab');
    }
    for (let n = 0; n < expected.length + 2; n++) {
      assert.equal(await page.evaluate(() => !!document.activeElement.closest('#directions-dialog')), true);
      await page.keyboard.press('Shift+Tab');
    }
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#directions-dialog').evaluate(d => d.open), false);
    assert.equal(await page.evaluate(() => document.activeElement.hasAttribute('data-directions-opener')), true);
    await open(page);
    const bounds = await page.locator('#directions-dialog').boundingBox();
    assert.ok(bounds.x >= -1 && bounds.y >= -1);
    assert.ok(bounds.x + bounds.width <= settings.viewport.width + 1);
    assert.ok(bounds.y + bounds.height <= settings.viewport.height + 1);
    const heights = await page.locator('[data-directions-app]:visible, .directions-cancel').evaluateAll(els => els.map(el => el.getBoundingClientRect().height));
    assert.ok(heights.every(h => h >= 44));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: resolve(output, `${name}.png`) });
    await page.mouse.click(2, 2);
    assert.equal(await page.locator('#directions-dialog').evaluate(d => d.open), false);
    assert.equal((await commands(page)).length, picks);
    assert.deepEqual(errors, []);
    assert.deepEqual(await page.evaluate(() => window.__directionsViolations), []);
    report.checks.push({ name, apps: expected, picks, allThreeEntries: true, cancelNoConversion: true, keyboard: true, backdrop: true, minTargetHeight: Math.min(...heights), cspViolations: 0 });
    await context.close();
  }
  for (const mode of ['blocked-library', 'no-gtag', 'throwing-gtag', 'unsupported-dialog', 'javascript-disabled']) {
    const context = await contextFor({ javaScriptEnabled: mode !== 'javascript-disabled' }, mode === 'blocked-library');
    if (mode === 'unsupported-dialog') await context.addInitScript(() => { HTMLDialogElement.prototype.showModal = undefined; });
    const page = await context.newPage();
    await page.goto(origin, { waitUntil: 'load' });
    if (mode === 'no-gtag') await page.evaluate(() => { window.gtag = undefined; });
    if (mode === 'throwing-gtag') await page.evaluate(() => { window.gtag = () => { throw Error('Simulated failed measurement'); }; });
    for (let entry = 0; entry < 3; entry++) {
      const fallback = mode === 'javascript-disabled' || mode === 'unsupported-dialog';
      if (!fallback) await open(page, entry);
      const popupPromise = page.waitForEvent('popup');
      if (fallback) await page.locator('[data-directions-opener]').nth(entry).click();
      else await page.locator('[data-directions-app="google"]').click();
      const popup = await popupPromise;
      await popup.waitForLoadState('domcontentloaded');
      assert.equal(popup.url(), google);
      await popup.close();
    }
    report.checks.push({ name: mode, allThreeEntriesNavigate: true });
    await context.close();
  }
  report.passed = true;
  console.log(JSON.stringify(report, null, 2));
} finally {
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  await new Promise(r => server.close(r));
}
