import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
const google = 'https://www.google.com/maps/dir/?api=1&destination=2303%20McKelvey%20Rd%20Maryland%20Heights%20MO%2063043';
const attribute = (source, name) => source.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1]?.replaceAll('&amp;', '&');

test('all three directions entries have the same working script-free fallback', () => {
  const entries = [...html.matchAll(/<a\b[^>]*data-directions-opener[^>]*>/g)];
  assert.equal(entries.length, 3);
  for (const [entry] of entries) {
    assert.equal(attribute(entry, 'href'), google);
    assert.equal(attribute(entry, 'aria-haspopup'), 'dialog');
  }
});

test('one labelled native dialog holds exact native links, not callback navigation', () => {
  const dialogs = [...html.matchAll(/<dialog\b[^>]*>([\s\S]*?)<\/dialog>/g)];
  assert.equal(dialogs.length, 1);
  assert.equal(attribute(dialogs[0][0], 'aria-labelledby'), 'directions-heading');
  const links = [...dialogs[0][1].matchAll(/<a\b[^>]*data-directions-app="([^"]+)"[^>]*>/g)];
  const expected = {
    google,
    apple: 'https://maps.apple.com/?daddr=2303+McKelvey+Rd,+Maryland+Heights,+MO+63043&dirflg=d',
    waze: 'https://waze.com/ul?ll=38.7221281,-90.4488371&navigate=yes',
  };
  assert.equal(links.length, 3);
  for (const [link, app] of links) {
    assert.equal(attribute(link, 'href'), expected[app]);
    assert.equal(attribute(link, 'target'), '_blank');
    assert.equal(attribute(link, 'rel'), 'noopener');
  }
});

test('every active marketing page loads the unchanged shared Google tag', async () => {
  for (const path of ['index.html', 'privacy.html', 'cookies.html', 'terms.html']) {
    const page = await readFile(new URL(path, root), 'utf8');
    assert.match(page, /<script type="module" src="assets\/js\/site-analytics\.js\?/);
  }
  const source = await readFile(new URL('assets/js/site-analytics.js', root), 'utf8');
  assert.match(source, /const GOOGLE_ADS_ID = "AW-18256973572"/);
  assert.match(source, /allow_ad_personalization_signals: false/);
  assert.match(source, /window\.gtag\("config", GOOGLE_ADS_ID, measurementOptions\)/);
});
