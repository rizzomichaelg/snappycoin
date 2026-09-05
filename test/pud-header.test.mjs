import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../assets/js/pud-header.js', import.meta.url), 'utf8');
function fixture(initialY = 0) {
  const changes = []; let scroll; const frames = [];
  const window = { scrollY: initialY, addEventListener: (_event, handler) => { scroll = handler; }, requestAnimationFrame: (callback) => frames.push(callback) };
  vm.runInNewContext(source, { window, document: { querySelectorAll: () => [{ classList: { toggle: (_name, value) => changes.push(value) } }] } });
  return { changes, scrollTo(y) { window.scrollY = y; scroll(); while (frames.length) frames.shift()(); } };
}
test('header ignores scroll shifts caused by shrinking near the boundary', () => {
  const f = fixture();
  for (const y of [95, 97, 61, 73, 96, 60, 50, 17]) f.scrollTo(y);
  assert.deepEqual(f.changes, [true]);
  f.scrollTo(16);
  assert.deepEqual(f.changes, [true, false]);
  for (const y of [52, 72, 95]) f.scrollTo(y);
  assert.deepEqual(f.changes, [true, false]);
});
test('header handles deep links and returning to the top', () => {
  const f = fixture(300);
  assert.deepEqual(f.changes, [true]);
  f.scrollTo(0);
  assert.deepEqual(f.changes, [true, false]);
});
