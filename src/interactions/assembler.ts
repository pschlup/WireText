// HTML artifact assembler (task-073) — self-contained output
// Assembles all rendered components, layout CSS, theme CSS, and interaction JS
// into a single complete HTML file ready for display in the Claude Workspace artifact viewer.
import type { WireTextBlock, ParsedBody, ParseError } from "../types.js"
import { createResolver } from "../macro/index.js"
import { composeMacros } from "../macro/index.js"
import { resolveTheme, emitThemeCSS } from "../theme/index.js"
import { parseBody } from "../body/index.js"
import { renderLayout } from "../layout/index.js"
import { WIRETEXT_CSS } from "../layout/zone-layout.js"

// ── CDN URLs ──────────────────────────────────────────────────────────────────

const CDN_WEBAWESOME_CSS = "https://cdn.jsdelivr.net/npm/@awesome.me/webawesome@3.3.1/dist-cdn/styles/themes/default.css"
const CDN_WEBAWESOME_JS  = "https://cdn.jsdelivr.net/npm/@awesome.me/webawesome@3.3.1/dist-cdn/webawesome.loader.js"
const CDN_PHOSPHOR_JS    = "https://unpkg.com/@phosphor-icons/webcomponents@2.1.0"
const CDN_GOOGLE_FONTS   = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"

// ── Public types ──────────────────────────────────────────────────────────────

export interface ArtifactResult {
  html:   string
  errors: ParseError[]
}

// ── Interaction JS ────────────────────────────────────────────────────────────

/**
 * Self-contained vanilla JS runtime for screen transitions, overlays, and
 * journey navigation. Embedded as a <script> block in the artifact HTML.
 *
 * All state is kept in closures — no globals, no framework.
 * Elements use data-wt-* attributes to declare their behaviour:
 *   data-wt-screen-id   — identifies a screen container
 *   data-wt-overlay-id  — identifies an overlay container (modal/drawer)
 *   data-wt-transition  — JSON {type, target} on clickable elements
 */
export const INTERACTION_JS: string = /* javascript */ `
(function () {
  'use strict';

  // ── Screen history stack ─────────────────────────────────────────────────
  // Stores screen IDs in navigation order so !back can pop to the previous.
  var screenHistory = [];

  // ── Current overlay tracking ─────────────────────────────────────────────
  // At most one overlay is open at a time.
  var currentOverlay = null;

  // ── Helpers ──────────────────────────────────────────────────────────────

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

  // ── Screen navigation ─────────────────────────────────────────────────────

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

  // ── Sidebar nav active state ──────────────────────────────────────────────

  /**
   * Update sidebar navigation so that exactly one .wt-nav-item has
   * aria-current="page" — the one whose data-wt-transition target matches
   * the given screen ID.
   */
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

  // ── Overlay management ────────────────────────────────────────────────────

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

  // ── Transition handler ────────────────────────────────────────────────────

  function handleTransition(data) {
    var type   = data.type;
    var target = data.target;

    // If we're inside an overlay and navigating away, close it first.
    if (currentOverlay && (type === 'screen' || type === 'overlay')) {
      closeCurrentOverlay();
    }

    if (type === 'external') {
      // External URL — open in new tab. Elements with href already handle this natively;
      // this fallback covers wa-button and other non-anchor elements.
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

  // ── Event delegation ──────────────────────────────────────────────────────
  // Single click listener on the document root for all transitions.

  document.addEventListener('click', function (e) {
    var node = e.target;

    // Walk up the DOM looking for the nearest element with data-wt-transition.
    while (node && node !== document) {
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

  // ── Escape key closes overlay ─────────────────────────────────────────────

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && currentOverlay) {
      closeCurrentOverlay();
    }
  });

  // ── Backdrop click on modal closes overlay ────────────────────────────────
  // wa-dialog emits a wa-request-close event when the backdrop is clicked.

  document.addEventListener('wa-request-close', function (e) {
    if (currentOverlay && currentOverlay === e.target) {
      closeCurrentOverlay();
    }
  });

  // ── Journey navigation ────────────────────────────────────────────────────

  /**
   * Update the journey navigation bar's active tab to match the currently
   * shown screen. Called after every screen navigation.
   */
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

  // ── Initialise ────────────────────────────────────────────────────────────
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

  /**
   * Disable or enable all elements with data-wt-transition='{"type":"action","target":"!back"}'
   * based on whether there is history to go back to.
   */
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

// ── Base reset CSS ────────────────────────────────────────────────────────────

const BASE_RESET_CSS = `
*, *::before, *::after { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
  font-family: var(--wiretext-font-family, Inter, sans-serif);
  font-size: var(--wiretext-font-size, 14px);
  color: var(--wiretext-color-text, #111827);
  background: var(--wiretext-color-surface, #fff);
}

/* Screens: all hidden by default; only .wt-active is shown. */
.wt-screen { display: none; }
.wt-screen.wt-active { display: block; }

/* Journey containers: visible as a whole; internal screens managed by JS. */
.wt-journey { display: block; }
.wt-journey .wt-screen { display: none; }
.wt-journey .wt-screen.wt-active { display: block; }

/* Journey nav bar */
.wt-journey-nav {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--wiretext-color-border, #E5E7EB);
  margin-bottom: 1rem;
  overflow-x: auto;
}
.wt-journey-tab {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--wiretext-color-muted, #6B7280);
  cursor: pointer;
  border: none;
  background: none;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  font-family: inherit;
}
.wt-journey-tab:hover {
  color: var(--wiretext-color-text, #111827);
}
.wt-journey-tab.wt-active {
  color: var(--wiretext-color-primary, #2563EB);
  border-bottom-color: var(--wiretext-color-primary, #2563EB);
}

/* Inline error boxes shown when the renderer encounters parse errors. */
.wt-error {
  background: #fee2e2;
  border: 1px solid #dc2626;
  border-radius: 6px;
  padding: 0.75rem;
  margin: 0.5rem 0;
  font-size: 0.875rem;
  color: #991b1b;
}
`.trim()

// ── assembleArtifact ──────────────────────────────────────────────────────────

/**
 * Wrap rendered screen HTML, theme CSS, layout CSS, and interaction JS into a
 * complete self-contained `<!DOCTYPE html>` document string.
 *
 * All four CDN resources (WebAwesome CSS + JS, Phosphor Icons JS, Google Fonts)
 * are injected in `<head>`. The interaction JS is appended as an inline
 * `<script>` at the end of `<body>` so the DOM is fully parsed before it runs.
 */
export function assembleArtifact(
  screensHtml:   string,
  themeCSS:      string,
  layoutCSS:     string,
  interactionJS: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WireText Preview</title>
  <!-- Google Fonts (Inter) -->
  <link rel="stylesheet" href="${CDN_GOOGLE_FONTS}">
  <!-- WebAwesome component library -->
  <link rel="stylesheet" href="${CDN_WEBAWESOME_CSS}">
  <script type="module" src="${CDN_WEBAWESOME_JS}"></script>
  <!-- Phosphor icon web components -->
  <script type="module" src="${CDN_PHOSPHOR_JS}"></script>
  <!-- Theme CSS custom properties -->
  <style>
${themeCSS}
  </style>
  <!-- Wiretext layout CSS -->
  <style>
${layoutCSS}
  </style>
  <!-- Base reset styles -->
  <style>
${BASE_RESET_CSS}
  </style>
</head>
<body>
${screensHtml}
  <script>
${interactionJS}
  </script>
</body>
</html>`
}

// ── Error box renderer ─────────────────────────────────────────────────────────

function renderErrorBox(error: ParseError): string {
  const sev = error.severity === "error" ? "WireText Error" : "WireText Warning"
  return `<div class="wt-error"><strong>${sev}:</strong> ${escapeHtml(error.message)} (line ${error.line})</div>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/** Escape a string for safe use inside an HTML attribute value. */
function escapeAttr(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

// ── renderDocument ────────────────────────────────────────────────────────────

/**
 * Top-level pipeline orchestrator. Accepts all parsed WireText blocks from a
 * document and produces a single self-contained HTML artifact string.
 *
 * Processing order:
 *   1. Build a Resolver over all blocks (nearest-previous resolution).
 *   2. For each block in document order:
 *      - `macro` / `theme` — no visual output; registered implicitly via the Resolver.
 *      - `screen`          — resolve theme → emit CSS → parse body → compose macros
 *                            → render layout → wrap in screen div.
 *      - `journey`         — render as a tabbed container of screens.
 *   3. Assemble the final HTML document.
 *
 * This function is intentionally defensive: if any pipeline stage (parseBody,
 * renderLayout, etc.) is still a stub returning empty content, renderDocument
 * continues without crashing.
 */
export function renderDocument(blocks: WireTextBlock[]): ArtifactResult {
  const allErrors: ParseError[] = []
  const screenDivs: string[]    = []
  let isFirst = true

  // Resolver provides nearest-previous lookup across all blocks.
  const resolver = createResolver(blocks)

  // Accumulate theme CSS for the first screen/journey that has a valid theme.
  // (All screens share a single resolved theme in the artifact; the last one wins
  // for the final CSS block, though typically a single theme is used per document.)
  let themeCSS = ""

  for (const block of blocks) {
    // ── Non-visual blocks ──────────────────────────────────────────────────
    if (block.type === "macro" || block.type === "theme") {
      // Registered implicitly via the Resolver — no HTML output.
      continue
    }

    // ── Screen ────────────────────────────────────────────────────────────
    if (block.type === "screen") {
      const errors: ParseError[] = []

      // Resolve theme tokens for this screen's CSS custom properties.
      const tokens  = resolveTheme(block, resolver)
      const { styleBlock } = emitThemeCSS(tokens)
      themeCSS = styleBlock  // last screen's theme wins for the artifact

      // Parse the block body into a component tree.
      const { body: parsedBody, errors: bodyErrors } = parseBody(block.body, "screen")
      errors.push(...bodyErrors)

      // Apply macro composition (use: header).
      const { body: composedBody, errors: macroErrors } = composeMacros(block, parsedBody, resolver)
      errors.push(
        ...macroErrors.map(e => ({
          severity:      "error" as const,
          message:       e.message,
          line:          0,
          blockPosition: e.blockPosition,
        })),
      )

      // Render into an HTML element via the layout engine.
      const { element, errors: layoutErrors } = renderLayout(composedBody, block.position)
      errors.push(...layoutErrors)
      allErrors.push(...errors)

      // Serialise the HTMLElement to a string. The layout renderer returns a
      // real DOM element (happy-dom / browser); outerHTML gives us the markup.
      const innerHtml = element.outerHTML

      // Render inline error boxes before the screen content.
      const errorHtml = errors.map(renderErrorBox).join("\n")

      // First screen is active by default.
      const activeClass = isFirst ? " wt-active" : ""
      const ariaHidden  = isFirst ? "" : ` aria-hidden="true"`
      isFirst = false

      screenDivs.push(
        `${errorHtml}<div class="wt-screen${activeClass}" data-wt-screen-id="${escapeAttr(block.id)}"${ariaHidden}>\n${innerHtml}\n</div>`,
      )

      continue
    }

    // ── Journey ───────────────────────────────────────────────────────────
    if (block.type === "journey") {
      const errors: ParseError[] = []

      // Resolve theme for CSS (same as screen).
      const tokens  = resolveTheme(block, resolver)
      const { styleBlock } = emitThemeCSS(tokens)
      themeCSS = styleBlock

      // Parse journey body — ParsedBody.screens holds inline screen definitions.
      const { body: journeyBody, errors: bodyErrors } = parseBody(block.body, "journey")
      errors.push(...bodyErrors)

      // Determine the ordered list of screens to render.
      const screensHeader = block.header["screens"]
      let screenOrder: string[]

      if (screensHeader !== undefined) {
        // screens: header can be a comma-separated string or an array.
        const raw = Array.isArray(screensHeader) ? screensHeader : [screensHeader]
        screenOrder = raw.flatMap(s => s.split(",").map(id => id.trim())).filter(id => id.length > 0)
      } else {
        // Use inline screen insertion order.
        screenOrder = [...journeyBody.screens.keys()]
      }

      // Build nav bar + screen panels.
      const navItems:    string[] = []
      const screenPanels: string[] = []
      let isFirstJourneyScreen = true

      for (const screenId of screenOrder) {
        // Inline screens live in journeyBody.screens; standalone blocks via Resolver.
        const inlineNodes = journeyBody.screens.get(screenId)

        // Build a minimal ParsedBody for the journey screen.
        let screenParsedBody: ParsedBody | null = inlineNodes !== undefined
          ? { zones: new Map([["main", inlineNodes]]), overlays: new Map(), screens: new Map(), tokens: null }
          : null

        if (screenParsedBody === null) {
          // Try resolving as a standalone screen block.
          const standaloneBlock = resolver.resolve("screen", screenId, block.position)
          if (standaloneBlock === null) {
            allErrors.push({
              severity:      "warn",
              message:       `Journey "${block.id}": unresolved screen reference "${screenId}" — skipped`,
              line:          0,
              blockPosition: block.position,
            })
            continue
          }
          const { body: sb, errors: sbe } = parseBody(standaloneBlock.body, "screen")
          errors.push(...sbe)
          screenParsedBody = sb
        }

        // After the null-check and optional standalone resolution, screenParsedBody is guaranteed non-null.
        const resolvedBody = screenParsedBody

        // Apply macro composition using journey-level use: for inline screens.
        const journeyUseBlock: WireTextBlock = {
          type:     "screen",
          id:       screenId,
          position: block.position,
          header:   block.header,
          body:     "",
        }
        const { body: composed, errors: composeErrors } = composeMacros(
          journeyUseBlock,
          resolvedBody,
          resolver,
        )
        errors.push(
          ...composeErrors.map(e => ({
            severity:      "error" as const,
            message:       e.message,
            line:          0,
            blockPosition: e.blockPosition,
          })),
        )

        // Render this journey screen.
        const { element, errors: layoutErrors } = renderLayout(composed, block.position)
        errors.push(...layoutErrors)

        const innerHtml   = element.outerHTML
        const activeClass = isFirstJourneyScreen ? " wt-active" : ""
        const ariaHidden  = isFirstJourneyScreen ? "" : ` aria-hidden="true"`
        isFirstJourneyScreen = false

        // Nav tab button.
        navItems.push(
          `<button class="wt-journey-tab${activeClass}" data-wt-journey-tab="${escapeAttr(screenId)}" aria-selected="${activeClass ? "true" : "false"}">${escapeHtml(screenId)}</button>`,
        )

        screenPanels.push(
          `<div class="wt-screen${activeClass}" data-wt-screen-id="${escapeAttr(screenId)}"${ariaHidden}>\n${innerHtml}\n</div>`,
        )
      }

      allErrors.push(...errors)

      const errorHtml = errors.map(renderErrorBox).join("\n")

      const journeyActiveClass = isFirst ? " wt-active" : ""
      const journeyAriaHidden  = isFirst ? "" : ` aria-hidden="true"`
      isFirst = false

      const navHtml     = `<nav class="wt-journey-nav">${navItems.join("\n")}</nav>`
      const contentHtml = screenPanels.join("\n")

      screenDivs.push(
        `${errorHtml}<div class="wt-journey wt-screen${journeyActiveClass}" data-wt-screen-id="${escapeAttr(block.id)}"${journeyAriaHidden}>\n${navHtml}\n${contentHtml}\n</div>`,
      )
    }
  }

  // Use an empty :root block if no theme was emitted (e.g. empty document).
  if (themeCSS.length === 0) {
    themeCSS = ":root {}"
  }

  const screensHtml = screenDivs.join("\n")
  const html = assembleArtifact(screensHtml, themeCSS, WIRETEXT_CSS, INTERACTION_JS)

  return { html, errors: allErrors }
}
