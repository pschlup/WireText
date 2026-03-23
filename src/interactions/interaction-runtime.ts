// Interaction runtime — self-contained vanilla JS embedded in artifact HTML.
// Extracted from assembler.ts for maintainability. This remains a string constant
// because it gets injected as an inline <script> block in the generated HTML.
//
// All state is kept in closures — no globals, no framework.
// Elements use data-wt-* attributes to declare their behaviour:
//   data-wt-screen-id   — identifies a screen container
//   data-wt-overlay-id  — identifies an overlay container (modal/drawer)
//   data-wt-transition  — JSON {type, target} on clickable elements

export const INTERACTION_JS: string = /* javascript */ `
(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════════
  // §1  State
  // ═══════════════════════════════════════════════════════════════════════════

  // Screen history stack — stores screen IDs in navigation order so !back
  // can pop to the previous screen.
  var screenHistory = [];

  // At most one overlay is open at a time.
  var currentOverlay = null;

  // ═══════════════════════════════════════════════════════════════════════════
  // §2  Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  function findScreen(id) {
    return document.querySelector('[data-wt-screen-id="' + id + '"]');
  }

  function findOverlay(id) {
    // Strip leading # if present — data-wt-overlay-id stores the bare ID.
    var bareId = id.startsWith('#') ? id.slice(1) : id;
    return document.querySelector('[data-wt-overlay-id="' + bareId + '"]');
  }

  function activeScreen() {
    return document.querySelector('[data-wt-screen-id].wt-active');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §3  Screen Navigation
  // ═══════════════════════════════════════════════════════════════════════════

  function navigateToScreen(targetId) {
    var target = findScreen(targetId);
    if (!target) {
      console.warn('[wiretext] Unknown screen id "' + targetId + '" — navigation skipped.');
      return;
    }

    var current = activeScreen();

    // Push current screen to history before leaving it.
    if (current) {
      var currentId = current.getAttribute('data-wt-screen-id');
      if (currentId) screenHistory.push(currentId);

      current.classList.remove('wt-active');
      current.setAttribute('aria-hidden', 'true');
    }

    target.classList.add('wt-active');
    target.removeAttribute('aria-hidden');

    // Journey nav: update active tab state if this screen is inside a journey.
    updateJourneyNav(target);

    // Sidebar nav: move aria-current="page" to the nav item whose transition
    // target matches the new screen, so the sidebar highlights the current page.
    updateSidebarNav(targetId);

    // Re-evaluate !back button disabled state after every navigation.
    updateBackButtons();
  }

  function navigateBack() {
    if (screenHistory.length === 0) return;
    var prevId = screenHistory.pop();

    var current = activeScreen();
    if (current) {
      current.classList.remove('wt-active');
      current.setAttribute('aria-hidden', 'true');
    }

    var prev = findScreen(prevId);
    if (prev) {
      prev.classList.add('wt-active');
      prev.removeAttribute('aria-hidden');
      updateJourneyNav(prev);
    }

    // Re-evaluate !back button disabled state after going back.
    updateBackButtons();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §4  Sidebar Nav Active State
  // ═══════════════════════════════════════════════════════════════════════════

  // Update sidebar navigation so that exactly one .wt-nav-item has
  // aria-current="page" — the one whose data-wt-transition target matches
  // the given screen ID.
  function updateSidebarNav(screenId) {
    // Clear existing active state from all nav items.
    document.querySelectorAll('.wt-nav-item[aria-current]').forEach(function (el) {
      el.removeAttribute('aria-current');
    });

    // Find the nav item whose transition targets the new screen.
    document.querySelectorAll('.wt-nav-item').forEach(function (el) {
      var raw = el.getAttribute('data-wt-transition');
      if (!raw) return;
      try {
        var data = JSON.parse(raw);
        if (data.type === 'screen' && data.target === screenId) {
          el.setAttribute('aria-current', 'page');
        }
      } catch (_) { /* ignore malformed */ }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §5  Overlay Management
  // ═══════════════════════════════════════════════════════════════════════════

  function openOverlay(overlayId) {
    // Close the current overlay before opening a new one (never stack).
    if (currentOverlay) closeCurrentOverlay();

    var el = findOverlay(overlayId);
    if (!el) {
      console.warn('[wiretext] Unknown overlay id "' + overlayId + '" — open skipped.');
      return;
    }

    currentOverlay = el;

    // wa-dialog and wa-drawer use the open property/attribute.
    if ('open' in el) {
      el.open = true;
    } else {
      el.setAttribute('open', '');
    }
  }

  function closeCurrentOverlay() {
    if (!currentOverlay) return;
    var el = currentOverlay;
    currentOverlay = null;

    if ('open' in el) {
      el.open = false;
    } else {
      el.removeAttribute('open');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §6  Transition Handler
  // ═══════════════════════════════════════════════════════════════════════════

  function handleTransition(data) {
    var type   = data.type;
    var target = data.target;

    // If we're inside an overlay and navigating away, close it first.
    if (currentOverlay && (type === 'screen' || type === 'overlay')) {
      closeCurrentOverlay();
    }

    if (type === 'external') {
      // External URL — open in new tab. Elements with href already handle this
      // natively; this fallback covers wa-button and other non-anchor elements.
      window.open(target, '_blank', 'noopener,noreferrer');
    } else if (type === 'screen') {
      navigateToScreen(target);
    } else if (type === 'overlay') {
      openOverlay(target);
    } else if (type === 'action') {
      if (target === '!close') {
        closeCurrentOverlay();
      } else if (target === '!back') {
        navigateBack();
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §7  Event Delegation
  // ═══════════════════════════════════════════════════════════════════════════

  // Single click listener on the document root for all transitions.
  document.addEventListener('click', function (e) {
    var node = e.target;

    // Walk up the DOM looking for the nearest interactive attribute.
    while (node && node !== document) {
      // Drawer toggle: hamburger buttons for left drawers (toggle open/close).
      var toggleId = node.getAttribute && node.getAttribute('data-wt-drawer-toggle');
      if (toggleId) {
        e.preventDefault();
        var drawerEl = findOverlay(toggleId);
        if (drawerEl) {
          if (currentOverlay === drawerEl) {
            closeCurrentOverlay();
          } else {
            openOverlay(toggleId);
          }
        }
        return;
      }

      var raw = node.getAttribute && node.getAttribute('data-wt-transition');
      if (raw) {
        try {
          var data = JSON.parse(raw);
          e.preventDefault();
          handleTransition(data);
        } catch (err) {
          console.error('[wiretext] Failed to parse transition data:', raw, err);
        }
        return;
      }
      node = node.parentElement;
    }
  });

  // Escape key closes overlay.
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && currentOverlay) {
      closeCurrentOverlay();
    }
  });

  // wa-dialog emits wa-request-close when the backdrop is clicked.
  document.addEventListener('wa-request-close', function (e) {
    if (currentOverlay && currentOverlay === e.target) {
      closeCurrentOverlay();
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // §8  Journey Navigation
  // ═══════════════════════════════════════════════════════════════════════════

  // Update the journey navigation bar's active tab to match the currently
  // shown screen. Called after every screen navigation.
  function updateJourneyNav(screenEl) {
    // Find the containing journey (if any).
    var journey = screenEl.closest('.wt-journey');
    if (!journey) return;

    var screenId = screenEl.getAttribute('data-wt-screen-id');
    var navItems = journey.querySelectorAll('[data-wt-journey-tab]');

    navItems.forEach(function (item) {
      var tabId = item.getAttribute('data-wt-journey-tab');
      if (tabId === screenId) {
        item.classList.add('wt-active');
        item.setAttribute('aria-selected', 'true');
      } else {
        item.classList.remove('wt-active');
        item.setAttribute('aria-selected', 'false');
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §9  Initialisation
  // ═══════════════════════════════════════════════════════════════════════════

  // Mark the first screen active (it gets the class in the HTML, but
  // replicate it here so late-rendered screens also work) and hide overlays.
  document.addEventListener('DOMContentLoaded', function () {
    // Ensure exactly one screen is active — the first one.
    var screens = document.querySelectorAll('[data-wt-screen-id]');
    var activated = false;
    screens.forEach(function (s) {
      // Skip journey inline screens — they are managed by the journey container.
      if (s.closest('.wt-journey') && !s.classList.contains('wt-journey')) return;

      if (!activated && !s.closest('.wt-journey')) {
        s.classList.add('wt-active');
        s.removeAttribute('aria-hidden');
        activated = true;
      } else if (!s.closest('.wt-journey')) {
        s.classList.remove('wt-active');
        s.setAttribute('aria-hidden', 'true');
      }
    });

    // Disable !back buttons when there is no history.
    updateBackButtons();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // §10  Back Button State
  // ═══════════════════════════════════════════════════════════════════════════

  // Disable or enable all elements with a !back transition based on whether
  // there is history to go back to.
  function updateBackButtons() {
    var backStr = JSON.stringify({ type: 'action', target: '!back' });
    var btns = document.querySelectorAll('[data-wt-transition]');
    btns.forEach(function (btn) {
      var raw = btn.getAttribute('data-wt-transition');
      if (!raw) return;
      try {
        var data = JSON.parse(raw);
        if (data.type === 'action' && data.target === '!back') {
          if (screenHistory.length === 0) {
            btn.setAttribute('disabled', '');
            btn.setAttribute('aria-disabled', 'true');
          } else {
            btn.removeAttribute('disabled');
            btn.removeAttribute('aria-disabled');
          }
        }
      } catch (_) { /* ignore malformed */ }
    });
    // Keep lint happy — backStr is used conceptually above via the parsed data.
    void backStr;
  }

})();
`
