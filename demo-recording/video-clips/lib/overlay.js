/*
 * Recording-only overlay, injected with addInitScript (never shipped with the
 * app). Desktop clips get a visible mouse cursor that follows mousemove events
 * and a soft ripple on mousedown; phone clips get a soft ~44 px circle on each
 * tap. Scrollbars are hidden so they never appear in a frame.
 */
(() => {
  if (window.__clipOverlay) return;
  window.__clipOverlay = true;
  const phone = navigator.maxTouchPoints > 0;

  const css = `
    html { scrollbar-width: none !important; }
    ::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
    #__clip-cursor {
      position: fixed; left: 0; top: 0; width: 26px; height: 26px;
      z-index: 2147483647; pointer-events: none;
      transform: translate(-200px, -200px); will-change: transform;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35));
    }
    .__clip-ripple {
      position: fixed; z-index: 2147483646; pointer-events: none;
      width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%;
      background: rgba(14, 124, 123, 0.28); border: 2px solid rgba(14, 124, 123, 0.55);
      animation: __clip-ripple 520ms ease-out forwards;
    }
    .__clip-tap {
      position: fixed; z-index: 2147483646; pointer-events: none;
      width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%;
      background: rgba(255, 255, 255, 0.35); border: 2px solid rgba(20, 40, 45, 0.45);
      box-shadow: 0 0 0 4px rgba(14, 124, 123, 0.18);
      animation: __clip-tap 560ms ease-out forwards;
    }
    @keyframes __clip-ripple { from { transform: scale(0.35); opacity: 1; } to { transform: scale(1.35); opacity: 0; } }
    @keyframes __clip-tap { 0% { transform: scale(0.6); opacity: 0.95; } 60% { opacity: 0.8; } 100% { transform: scale(1.15); opacity: 0; } }
  `;
  const arrow =
    '<svg viewBox="0 0 26 26" width="26" height="26" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M3 2 L3 21 L8.2 16.4 L11.6 24 L15 22.5 L11.7 15 L19 15 Z" fill="#fff" stroke="#16282b" stroke-width="1.6" stroke-linejoin="round"/></svg>';

  function mount() {
    const style = document.createElement('style');
    style.id = '__clip-style';
    style.textContent = css;
    document.documentElement.appendChild(style);
    if (phone) return;
    const cursor = document.createElement('div');
    cursor.id = '__clip-cursor';
    cursor.innerHTML = arrow;
    document.documentElement.appendChild(cursor);
  }
  const mark = (cls, x, y) => {
    const el = document.createElement('div');
    el.className = cls;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.documentElement.appendChild(el);
    setTimeout(() => el.remove(), 650);
  };

  // Lets the script show a click ripple where no real mousedown happens (native <select>).
  window.__clipRipple = (x, y) => mark('__clip-ripple', x, y);

  if (document.documentElement) mount();
  else document.addEventListener('DOMContentLoaded', mount);

  window.addEventListener(
    'mousemove',
    (e) => {
      const c = document.getElementById('__clip-cursor');
      // The arrow tip sits at (3, 2) inside the SVG.
      if (c) c.style.transform = `translate(${e.clientX - 3}px, ${e.clientY - 2}px)`;
    },
    true,
  );
  window.addEventListener(
    'mousedown',
    (e) => !phone && mark('__clip-ripple', e.clientX, e.clientY),
    true,
  );
  window.addEventListener(
    'touchstart',
    (e) => {
      for (const t of e.touches) mark('__clip-tap', t.clientX, t.clientY);
    },
    { capture: true, passive: true },
  );
})();
