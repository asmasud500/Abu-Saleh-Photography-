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
  let wheelAccumulator = 0;
  let wheelResetTimer = 0;

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

  // Desktop mouse-wheel navigation: one wheel gesture moves exactly one panel.
  window.addEventListener('wheel', event => {
    const target = event.target;
    if (target instanceof Element && target.closest('input, textarea, select, button')) {
      return;
    }

    event.preventDefault();
    wheelAccumulator += event.deltaY;
    window.clearTimeout(wheelResetTimer);
    wheelResetTimer = window.setTimeout(() => { wheelAccumulator = 0; }, 180);

    if (Math.abs(wheelAccumulator) >= 45) {
      move(wheelAccumulator > 0 ? 1 : -1);
      wheelAccumulator = 0;
    }
  }, { passive: false });

  // Touch/swipe navigation for phones and tablets.
  window.addEventListener('touchstart', event => {
    if (event.touches.length === 1) touchStartY = event.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchmove', event => {
    if (event.touches.length === 1) event.preventDefault();
  }, { passive: false });

  window.addEventListener('touchend', event => {
    if (!touchStartY || !event.changedTouches.length) return;
    const delta = touchStartY - event.changedTouches[0].clientY;
    touchStartY = 0;
    if (Math.abs(delta) >= 45) move(delta > 0 ? 1 : -1);
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
