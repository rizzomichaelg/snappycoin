/* Prepare before first paint; reveal visible components once, in their reading order. */
(() => {
  const root = document.documentElement;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (preference.matches || !('IntersectionObserver' in window)) return;
  const selector = '[data-reveal], [data-entrance]';
  const finishes = new WeakMap();
  let observer;
  let targets = [];
  let resizeFrame;
  let previousScroll = window.scrollY;
  let topInset = 0;

  function finish(target) {
    const listener = finishes.get(target);
    if (listener) target.removeEventListener('transitionend', listener);
    finishes.delete(target);
    target.classList.remove('is-revealing', 'is-initial-entrance');
    target.style.removeProperty('--reveal-delay');
    target.style.removeProperty('--reveal-offset');
  }
  function showEverything() {
    observer?.disconnect();
    root.classList.remove('motion-ready', 'motion-preparing');
    targets.forEach(finish);
  }
  // Failed scripts, observers, or stalled fonts must never leave the page unreadable.
  const failSafe = window.setTimeout(showEverything, 4000);
  root.classList.add('motion-ready', 'motion-preparing');

  function reveal(target, { initial = false, delay = 0, immediate = false } = {}) {
    if (target.classList.contains('has-entered')) {
      if (immediate) finish(target);
      return;
    }
    observer?.unobserve(target);
    if (immediate) {
      target.classList.add('has-entered');
      finish(target);
      return;
    }
    target.style.setProperty('--reveal-delay', `${delay}ms`);
    if (initial) target.classList.add('is-initial-entrance');
    target.classList.add('is-revealing', 'has-entered');
    const listener = (event) => {
      if (event.target === target && event.propertyName === 'opacity') finish(target);
    };
    finishes.set(target, listener);
    target.addEventListener('transitionend', listener);
  }
  function revealBatch(visible, initial = false, direction = 'down') {
    const groups = new Map();
    visible.forEach((target) => {
      const group = target.closest('[data-reveal-group]');
      if (!group) { reveal(target, { initial }); return; }
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push({ target, rect: target.getBoundingClientRect() });
    });
    groups.forEach((items) => {
      items.sort((a, b) => {
        const overlap = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top);
        // Horizontal siblings retain left-to-right order. Stacked siblings follow scroll direction.
        if (overlap > Math.min(a.rect.height, b.rect.height) / 2) return a.rect.left - b.rect.left;
        return direction === 'up' ? b.rect.top - a.rect.top : a.rect.top - b.rect.top;
      });
      items.forEach(({ target }, index) => reveal(target, { initial, delay: Math.min(index * 160, 480) }));
    });
  }
  function prepareOrigin(target, rect) {
    if (!target.classList.contains('has-entered')) {
      target.style.setProperty('--reveal-offset', rect.bottom <= topInset ? '-12px' : '12px');
    }
  }
  function observeRemaining() {
    observer?.disconnect();
    const height = window.innerHeight;
    const header = parseFloat(getComputedStyle(root).getPropertyValue('--header-height')) || 76;
    topInset = Math.min(height * 0.4, Math.max(header + 24, height * 0.2));
    const bottomInset = Math.round(height * 0.22);
    const remaining = targets.filter((target) => !target.classList.contains('has-entered'));
    remaining.forEach((target) => prepareOrigin(target, target.getBoundingClientRect()));
    observer = new IntersectionObserver((entries) => {
      try {
        const direction = window.scrollY < previousScroll ? 'up' : 'down';
        previousScroll = window.scrollY;
        entries.filter((entry) => !entry.isIntersecting).forEach(({ target, boundingClientRect }) => prepareOrigin(target, boundingClientRect));
        revealBatch(entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target), false, direction);
      } catch (_error) { showEverything(); }
    }, { threshold: 0, rootMargin: `-${Math.round(topInset)}px 0px -${bottomInset}px 0px` });
    remaining.forEach((target) => observer.observe(target));
  }
  function revealFocusedContent() {
    const focused = document.activeElement;
    // A focused control is readable immediately, including during a pending stagger.
    targets.filter((target) => target.contains(focused)).forEach((target) => reveal(target, { immediate: true }));
  }
  async function initialize() {
    try {
      targets = Array.from(document.querySelectorAll(selector));
      await Promise.all([
        document.fonts?.ready,
        document.readyState === 'complete' ? Promise.resolve() : new Promise((resolve) => window.addEventListener('load', resolve, { once: true })),
      ]);
      if (!root.classList.contains('motion-ready')) return;
      // Capture the actual viewport, including direct links and restored scroll positions.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        try {
          if (preference.matches) { showEverything(); return; }
          const header = parseFloat(getComputedStyle(root).getPropertyValue('--header-height')) || 76;
          const visible = targets.filter((target) => {
            const rect = target.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && rect.top < innerHeight && rect.bottom > header && rect.left < innerWidth && rect.right > 0;
          });
          revealBatch(visible, true);
          root.classList.remove('motion-preparing');
          previousScroll = window.scrollY;
          observeRemaining();
          revealFocusedContent();
          clearTimeout(failSafe);
        } catch (_error) { showEverything(); }
      }));
    } catch (_error) { showEverything(); }
  }
  document.addEventListener('focusin', revealFocusedContent);
  preference.addEventListener('change', ({ matches }) => { if (matches) showEverything(); });
  window.addEventListener('resize', () => {
    if (!root.classList.contains('motion-ready')) return;
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      try { observeRemaining(); } catch (_error) { showEverything(); }
    });
  }, { passive: true });
  window.addEventListener('pageshow', (event) => { if (event.persisted) showEverything(); });
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
})();
