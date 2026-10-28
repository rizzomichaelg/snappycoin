import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import test from 'node:test';
const root = resolve(new URL('../', import.meta.url).pathname);
const book = 'https://book.snappycoinlaundry.com';
async function files(dir = root) {
  const result = [];
  for (const e of await readdir(dir, {withFileTypes:true})) {
    if (e.name.startsWith('.') || (dir === root && e.name === 'legacy')) continue;
    const path=resolve(dir,e.name);
    if(e.isDirectory())result.push(...await files(path)); else result.push(path);
  }
  return result;
}
const paths=await files();
const pages=await Promise.all(paths.filter(p=>p.endsWith('.html')).map(async path=>({path,html:await readFile(path,'utf8')})));
const redirects=pages.filter(p=>/http-equiv="refresh"/.test(p.html));
test('every retired entry and step is a crawlable, inert static redirect', async()=>{
 assert.equal(redirects.length,2);
 for(const {html} of redirects){
   assert.ok(html.includes(`content="0; url=${book}"`));
   assert.ok(html.includes('<meta name="robots" content="noindex" />'));
   assert.ok(html.includes(`href="${book}">Booking has moved — book at book.snappycoinlaundry.com`));
   assert.doesNotMatch(html,/<script|<form|<input|<iframe/i);
 }
 const alias=await readFile(resolve(root,'promos/free-weekday-wash/index.html'),'utf8');
 assert.doesNotMatch(alias,/site-analytics.js/);
 assert.doesNotMatch(await readFile(resolve(root,'robots.txt'),'utf8'),/Disallow:/);
 assert.doesNotMatch(await readFile(resolve(root,'sitemap.xml'),'utf8'),/book\.snappy/);
});
test('all booking and order links use the new root; pickup price is per bag',async()=>{
 const html=await readFile(resolve(root,'index.html'),'utf8');
 const bookingLinks=[...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].filter(m=>/Book a pickup|Book pickup|Schedule a pickup|Check an order|Pickup &amp; delivery/.test(m[2]));
 assert.ok(bookingLinks.length>=9);
 for(const m of bookingLinks)assert.equal(m[1],book);
 assert.ok(html.includes('$30 per bag'));
 for(const {html} of pages)assert.doesNotMatch(html,/\$1\.50|\$15 minimum/);
});
test('no retired application route references or superseded analytics identifiers remain',async()=>{
 const retiredDirectory=relative(root,redirects[0].path).split('/')[0];
 for(const path of paths.filter(p=>/\.(html|js|mjs|json|xml|txt|md|yml|css)$/.test(p))){
   const source=await readFile(path,'utf8');
   // Private legacy compatibility routes are deliberately retained.
   if(path.endsWith('site-analytics.js')){
     assert.doesNotMatch(source,/firebase/i);
     const ids=[...source.matchAll(/G-[A-Z0-9]{10}\b/g)].map(m=>m[0]);
     assert.deepEqual(ids,['G-7RE3YVW1DR']);
     assert.doesNotMatch(source,/gtag\("consent"|send_page_view|trackEvent\("page_view"/);
   }
 }
});
test('retired offer remains hidden independently of API; retained forms keep their hooks',async()=>{
 const html=await readFile(resolve(root,'index.html'),'utf8');
 assert.match(html,/<section id="free-weekday-wash"[^>]+data-retired-promotion hidden inert>/);
 assert.match(html,/<li id="promo-nav-item" data-retired-promotion hidden inert>/);
 assert.match(html,/<section class="content-section newsletter-section"/);
 assert.ok(html.includes('id="promo-signup-form"'));
 assert.ok(html.includes('id="newsletter-signup-form"'));
 assert.ok(html.includes('https://challenges.cloudflare.com/turnstile/v0/api.js'));
 const css=await readFile(resolve(root,'styles.css'),'utf8');
 assert.match(css,/\[data-retired-promotion\] \{ display: none !important; \}/);
});
test('dated privacy/cookie pages ship with notice-based analytics and local footer links',async()=>{
 const privacy=await readFile(resolve(root,'privacy.html'),'utf8');
 const cookies=await readFile(resolve(root,'cookies.html'),'utf8');
 for(const html of [privacy,cookies]){
   assert.ok(html.includes('Effective date: October 27, 2026'));
   assert.ok(html.includes('Neither site has a cookie banner: the tools load for every visitor.'));
   assert.ok(html.includes("We don't send Google Analytics, Google Ads, or Meta your name, phone number, email address, or street address."));
   assert.ok(html.includes('https://book.snappycoinlaundry.com/legal/privacy'));
 }
 const html=await readFile(resolve(root,'index.html'),'utf8');
 for(const name of ['privacy','cookies','terms'])assert.ok(html.includes(`href="${name}.html"`));
});
