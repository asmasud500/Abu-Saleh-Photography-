(() => {
  'use strict';

  const panels = Array.from(document.querySelectorAll('.v3-panel[data-panel]'));
  const controls = Array.from(document.querySelectorAll('[data-page]'));
  const form = document.getElementById('contactForm');
  const status = document.getElementById('formStatus');
  const year = document.getElementById('year');

  if (year) year.textContent = String(new Date().getFullYear());
  if (!panels.length) return;

  const pages = panels.map(panel => panel.dataset.panel);
  let current = Math.max(0, panels.findIndex(panel => panel.classList.contains('active')));
  let locked = false;
  let touchStartY = 0;
  let touchStartX = 0;
  let wheelAccumulator = 0;
  let wheelResetTimer = 0;

  const isMobile = () => window.matchMedia('(max-width: 900px)').matches;

  const updateControls = page => {
    controls.forEach(control => {
      const active = control.dataset.page === page;
      if (control.matches('button,[role="button"]')) control.classList.toggle('active', active);
      if (control.classList.contains('v3-dot')) control.setAttribute('aria-current', active ? 'page' : 'false');
    });
  };

  const goTo = (page, options = {}) => {
    const next = pages.indexOf(page);
    if (next < 0) return;

    current = next;
    panels.forEach((panel, index) => {
      const active = index === current;
      panel.classList.toggle('active', active);
      panel.setAttribute('aria-hidden', active ? 'false' : 'true');
      if (active && isMobile()) panel.scrollTop = 0;
    });

    updateControls(page);
    document.title = `${page.charAt(0).toUpperCase()}${page.slice(1)} · Abu Saleh`;

    if (options.updateHash !== false && window.location.hash !== `#${page}`) {
      history.replaceState(null, '', `#${page}`);
    }
  };

  const move = direction => {
    if (locked) return;
    locked = true;
    const next = (current + direction + panels.length) % panels.length;
    goTo(pages[next]);
    window.setTimeout(() => { locked = false; }, 560);
  };

  controls.forEach(control => {
    control.addEventListener('click', event => {
      const page = control.dataset.page;
      if (!page) return;
      event.preventDefault();
      goTo(page);
    });
  });

  const initial = window.location.hash.replace('#', '').trim();
  goTo(pages.includes(initial) ? initial : pages[current], { updateHash: false });

  // Desktop: one wheel gesture changes exactly one panel.
  window.addEventListener('wheel', event => {
    if (isMobile()) return;

    const target = event.target;
    if (target instanceof Element && target.closest('input, textarea, select, button')) return;

    event.preventDefault();
    wheelAccumulator += event.deltaY;
    window.clearTimeout(wheelResetTimer);
    wheelResetTimer = window.setTimeout(() => { wheelAccumulator = 0; }, 180);

    if (Math.abs(wheelAccumulator) >= 45) {
      move(wheelAccumulator > 0 ? 1 : -1);
      wheelAccumulator = 0;
    }
  }, { passive: false });

  // Mobile: allow the active panel to scroll normally. A new panel is opened
  // only when the user reaches the bottom/top and then swipes past that edge.
  window.addEventListener('touchstart', event => {
    if (!isMobile() || event.touches.length !== 1) return;
    touchStartY = event.touches[0].clientY;
    touchStartX = event.touches[0].clientX;
  }, { passive: true });

  window.addEventListener('touchend', event => {
    if (!isMobile() || !touchStartY || !event.changedTouches.length) return;

    const touch = event.changedTouches[0];
    const deltaY = touchStartY - touch.clientY;
    const deltaX = touchStartX - touch.clientX;
    touchStartY = 0;
    touchStartX = 0;

    // Ignore taps and horizontal gestures.
    if (Math.abs(deltaY) < 70 || Math.abs(deltaY) <= Math.abs(deltaX)) return;

    const panel = panels[current];
    const maxScroll = Math.max(0, panel.scrollHeight - panel.clientHeight);
    const scrollTop = panel.scrollTop;
    const tolerance = 8;
    const atTop = scrollTop <= tolerance;
    const atBottom = scrollTop >= maxScroll - tolerance;

    // Swipe up => next panel, but only after the current panel is fully read.
    if (deltaY > 0 && atBottom) {
      move(1);
      return;
    }

    // Swipe down => previous panel, but only when already at the top.
    if (deltaY < 0 && atTop) move(-1);
  }, { passive: true });

  window.addEventListener('keydown', event => {
    if (event.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(event.key)) {
      event.preventDefault();
      move(1);
    } else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(event.key)) {
      event.preventDefault();
      move(-1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      goTo('home');
    } else if (event.key === 'End') {
      event.preventDefault();
      goTo('contact');
    }
  });

  // Contact form remains compatible with the Cloudflare Worker + Turnstile setup.
  if (form) {
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (status) status.textContent = 'Sending…';

      const data = new FormData(form);
      const name = String(data.get('name') || '').trim();
      const email = String(data.get('email') || '').trim();
      const message = String(data.get('message') || '').trim();
      const token = String(data.get('cf-turnstile-response') || '').trim();
      const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

      if (name.length < 2 || name.length > 80 || !emailOk || email.length > 254 || message.length < 10 || message.length > 2000) {
        if (status) status.textContent = 'Please complete all fields correctly.';
        return;
      }
      if (!token) {
        if (status) status.textContent = 'Please complete the security check.';
        return;
      }

      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ name, email, message, turnstileToken: token })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Unable to send inquiry');
        form.reset();
        if (window.turnstile) window.turnstile.reset();
        if (status) status.textContent = 'Thanks — your inquiry has been sent.';
      } catch (error) {
        if (status) status.textContent = error instanceof Error ? error.message : 'Something went wrong. Please try again later.';
      }
    });
  }
})();
