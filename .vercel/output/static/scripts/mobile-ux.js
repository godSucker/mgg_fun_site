
// public/scripts/mobile-ux.js
// Улучшения UX на телефонах: аккордеоны для вторичных панелей и горизонтальные ленты.

(function(){
  const isMobile = () => window.matchMedia('(max-width: 840px)').matches;

  function ensureLazyImages(){
    document.querySelectorAll('img:not([loading])').forEach(img => {
      img.loading = 'lazy';
      img.decoding = 'async';
    });
  }

  // Сворачиваем вторичные панели (вероятности/исследования/статы) в <details.m-accordion>
  function wrapSecondaryPanels(){
    if (!isMobile()) return;
    const candidates = document.querySelectorAll(
      '.probabilities, [class*="prob"], .research, [class*="research"], aside[aria-label*="prob"], aside[aria-label*="исслед"]'
    );
    candidates.forEach(panel => {
      if (!panel || panel.closest('details.m-accordion')) return;
      const wrapper = document.createElement('details');
      wrapper.className = 'm-accordion';
      const sum = document.createElement('summary');
      sum.textContent = 'Вероятности / Исследования';
      const body = document.createElement('div');
      body.className = 'm-acc-body';
      panel.parentNode.insertBefore(wrapper, panel);
      wrapper.appendChild(sum);
      wrapper.appendChild(body);
      body.appendChild(panel);
    });
  }

  // Делает из больших гридов (много карточек) горизонтальные ленты,
  // чтобы страница не становилась бездонной
  function ribbonsForLargeGrids(){
    if (!isMobile()) return;
    const grids = document.querySelectorAll(
      '.summary-grid, .reactor-covers, .reactor-grid, .odds-table, .cards, [class*="grid"]'
    );
    grids.forEach(g => {
      if (g.classList.contains('h-scroll')) return;
      const items = g.children;
      if (!items || items.length < 12) return; // порог: если слишком много элементов
      g.classList.add('h-scroll');
    });
  }

  function init(){
    ensureLazyImages();
    wrapSecondaryPanels();
    ribbonsForLargeGrids();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
})();
