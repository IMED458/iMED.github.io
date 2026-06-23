/* GBMN Theme — main.js */
(function () {
  'use strict';

  /* ── Mobile nav toggle ── */
  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('gbmn-mobile-toggle');
    var drawer = document.getElementById('gbmn-mobile-drawer');
    if (btn && drawer) {
      btn.addEventListener('click', function () {
        var open = drawer.getAttribute('aria-hidden') === 'false';
        drawer.setAttribute('aria-hidden', open ? 'true' : 'false');
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        document.body.style.overflow = open ? '' : 'hidden';
      });
    }

    /* ── Sticky header shadow ── */
    var header = document.getElementById('gbmn-header');
    if (header) {
      window.addEventListener('scroll', function () {
        if (window.scrollY > 4) {
          header.style.boxShadow = '0 4px 12px rgba(0,0,0,.12)';
        } else {
          header.style.boxShadow = '';
        }
      }, { passive: true });
    }

    /* ── Search overlay ── */
    var searchBtn = document.getElementById('gbmn-search-open');
    var searchOverlay = document.getElementById('gbmn-search-overlay');
    var searchClose = document.getElementById('gbmn-search-close');
    var searchInput = searchOverlay && searchOverlay.querySelector('input[type="search"]');
    if (searchBtn && searchOverlay) {
      searchBtn.addEventListener('click', function () {
        searchOverlay.removeAttribute('hidden');
        if (searchInput) searchInput.focus();
      });
      if (searchClose) {
        searchClose.addEventListener('click', function () {
          searchOverlay.setAttribute('hidden', '');
        });
      }
      searchOverlay.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') searchOverlay.setAttribute('hidden', '');
      });
    }

    /* ── Smooth article image load ── */
    document.querySelectorAll('.gbmn-article-thumb').forEach(function (img) {
      img.addEventListener('load', function () {
        img.style.opacity = '1';
      });
      img.style.opacity = img.complete ? '1' : '0';
      img.style.transition = 'opacity .3s';
    });
  });
})();
