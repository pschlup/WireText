// Tests for the HTML artifact assembler and interaction JS (epic-008, task-073)
import { describe, it, expect } from "vitest"

import { assembleArtifact, INTERACTION_JS, renderDocument } from "../src/interactions/index.js"
import type { WireTextBlock, ParseError } from "../src/types.js"

// ── assembleArtifact ──────────────────────────────────────────────────────────

describe("assembleArtifact", () => {
  const minimal = assembleArtifact("", "", "", "")

  it("output starts with <!DOCTYPE html>", () => {
    expect(minimal.trimStart().startsWith("<!DOCTYPE html>")).toBe(true)
  })

  it("contains <html lang=\"en\">", () => {
    expect(minimal).toContain('<html lang="en">')
  })

  it("contains WebAwesome CSS CDN link", () => {
    expect(minimal).toContain("https://cdn.jsdelivr.net/npm/@awesome.me/webawesome@3.3.1/dist-cdn/styles/themes/default.css")
  })

  it("contains WebAwesome JS CDN script", () => {
    expect(minimal).toContain("https://cdn.jsdelivr.net/npm/@awesome.me/webawesome@3.3.1/dist-cdn/webawesome.loader.js")
  })

  it("contains Phosphor Icons CDN script", () => {
    expect(minimal).toContain("https://unpkg.com/@phosphor-icons/webcomponents@2.1.0")
  })

  it("contains Google Fonts CDN link", () => {
    expect(minimal).toContain("https://fonts.googleapis.com/css2?family=Inter")
  })

  it("injects themeCSS inside a <style> block", () => {
    const html = assembleArtifact("", ":root { --color: red; }", "", "")
    expect(html).toContain(":root { --color: red; }")
    // Must be inside a <style> element.
    const styleIdx = html.indexOf("<style>")
    const colorIdx = html.indexOf("--color: red;")
    expect(styleIdx).toBeGreaterThanOrEqual(0)
    expect(colorIdx).toBeGreaterThan(styleIdx)
  })

  it("injects interactionJS inside a <script> block", () => {
    const js   = "console.log('hello wiretext');"
    const html = assembleArtifact("", "", "", js)
    expect(html).toContain(js)
    const scriptIdx = html.indexOf("<script>")
    const jsIdx     = html.indexOf(js)
    expect(scriptIdx).toBeGreaterThanOrEqual(0)
    expect(jsIdx).toBeGreaterThan(scriptIdx)
  })

  it("injects screensHtml inside <body>", () => {
    const screens = '<div class="wt-screen wt-active" data-wt-screen-id="home">hello</div>'
    const html    = assembleArtifact(screens, "", "", "")
    const bodyIdx   = html.indexOf("<body>")
    const screenIdx = html.indexOf("data-wt-screen-id")
    expect(bodyIdx).toBeGreaterThanOrEqual(0)
    expect(screenIdx).toBeGreaterThan(bodyIdx)
  })

  it("injects layoutCSS inside a <style> block", () => {
    const css  = ".wiretext-grid { display: grid; }"
    const html = assembleArtifact("", "", css, "")
    expect(html).toContain(css)
  })

  it("contains closing </html> tag", () => {
    expect(minimal).toContain("</html>")
  })
})

// ── INTERACTION_JS ────────────────────────────────────────────────────────────

describe("INTERACTION_JS", () => {
  it("is a non-empty string", () => {
    expect(typeof INTERACTION_JS).toBe("string")
    expect(INTERACTION_JS.length).toBeGreaterThan(0)
  })

  it("registers a DOMContentLoaded listener", () => {
    // The IIFE wraps a DOMContentLoaded listener for initialisation.
    expect(INTERACTION_JS).toContain("DOMContentLoaded")
  })

  it("references the wt-transition data attribute key", () => {
    expect(INTERACTION_JS).toContain("wt-transition")
  })

  it("handles the 'screen' transition type", () => {
    expect(INTERACTION_JS).toContain("screen")
  })

  it("handles the 'overlay' transition type", () => {
    expect(INTERACTION_JS).toContain("overlay")
  })

  it("handles the !close action", () => {
    expect(INTERACTION_JS).toContain("!close")
  })

  it("handles the !back action", () => {
    expect(INTERACTION_JS).toContain("!back")
  })

  it("references data-wt-screen-id for screen show/hide", () => {
    expect(INTERACTION_JS).toContain("wt-screen-id")
  })

  it("references data-wt-overlay-id for overlay management", () => {
    expect(INTERACTION_JS).toContain("wt-overlay-id")
  })

  it("wraps all logic in an IIFE (no global leaks)", () => {
    // The runtime starts with a self-invoking function expression.
    expect(INTERACTION_JS.trim()).toMatch(/^\(function/)
  })

  it("includes history stack management", () => {
    expect(INTERACTION_JS).toContain("screenHistory")
  })

  it("closes overlays on Escape key", () => {
    expect(INTERACTION_JS).toContain("Escape")
  })

  it("calls updateBackButtons after navigateToScreen", () => {
    // After navigating to a screen, back buttons need re-evaluation.
    // The navigateToScreen function must call updateBackButtons() at the end.
    expect(INTERACTION_JS).toMatch(/navigateToScreen[\s\S]*?updateBackButtons\(\)/)
  })

  it("calls updateBackButtons after navigateBack", () => {
    // After navigating back, back buttons need re-evaluation.
    expect(INTERACTION_JS).toMatch(/navigateBack[\s\S]*?updateBackButtons\(\)/)
  })

  it("overlay chaining: closes current overlay before opening new one", () => {
    // openOverlay must dismiss currentOverlay first — never stack.
    expect(INTERACTION_JS).toMatch(/function openOverlay[\s\S]*?closeCurrentOverlay/)
  })

  // task-081: sidebar nav active state tracking
  it("updates aria-current on .wt-nav-item elements during navigation", () => {
    // navigateToScreen must call updateSidebarNav to move aria-current="page".
    expect(INTERACTION_JS).toContain("updateSidebarNav")
    expect(INTERACTION_JS).toContain("aria-current")
  })

  it("references wt-nav-item class for active state updates", () => {
    // The sidebar nav update logic queries .wt-nav-item elements.
    expect(INTERACTION_JS).toContain("wt-nav-item")
  })
})

// ── renderDocument ─────────────────────────────────────────────────────────────

describe("renderDocument", () => {
  it("returns { html, errors } shape", () => {
    const result = renderDocument([])
    expect(result).toHaveProperty("html")
    expect(result).toHaveProperty("errors")
    expect(typeof result.html).toBe("string")
    expect(Array.isArray(result.errors)).toBe(true)
  })

  it("empty block array → valid HTML artifact", () => {
    const { html } = renderDocument([])
    expect(html.trimStart().startsWith("<!DOCTYPE html>")).toBe(true)
    expect(html).toContain("<html")
    expect(html).toContain("</html>")
  })

  it("empty block array → non-empty HTML", () => {
    const { html } = renderDocument([])
    expect(html.length).toBeGreaterThan(100)
  })

  it("empty block array → empty errors array", () => {
    const { errors } = renderDocument([])
    expect(errors).toHaveLength(0)
  })

  it("macro block → no visual output, no crash", () => {
    const blocks: WireTextBlock[] = [
      { type: "macro", id: "topbar", position: 0, header: {}, body: "@header\n  nav Home | Projects" },
    ]
    const { html, errors } = renderDocument(blocks)
    expect(html).toContain("<!DOCTYPE html>")
    expect(errors).toHaveLength(0)
  })

  it("theme block → no visual output, no crash", () => {
    const blocks: WireTextBlock[] = [
      { type: "theme", id: "custom", position: 0, header: {}, body: "primary: #FF0000" },
    ]
    const { html, errors } = renderDocument(blocks)
    expect(html).toContain("<!DOCTYPE html>")
    expect(errors).toHaveLength(0)
  })

  it("screen block → screen div with data-wt-screen-id", () => {
    const blocks: WireTextBlock[] = [
      { type: "screen", id: "home", position: 0, header: {}, body: "" },
    ]
    const { html } = renderDocument(blocks)
    expect(html).toContain('data-wt-screen-id="home"')
  })

  it("first screen → wt-active class", () => {
    const blocks: WireTextBlock[] = [
      { type: "screen", id: "home", position: 0, header: {}, body: "" },
      { type: "screen", id: "about", position: 1, header: {}, body: "" },
    ]
    const { html } = renderDocument(blocks)
    // First screen should have wt-active.
    const homeIdx  = html.indexOf('data-wt-screen-id="home"')
    const aboutIdx = html.indexOf('data-wt-screen-id="about"')
    expect(homeIdx).toBeGreaterThanOrEqual(0)
    expect(aboutIdx).toBeGreaterThanOrEqual(0)
    // The home screen wrapper should contain wt-active.
    const homeSection = html.slice(homeIdx - 50, homeIdx + 50)
    expect(homeSection).toContain("wt-active")
  })

  it("second screen → not wt-active", () => {
    const blocks: WireTextBlock[] = [
      { type: "screen", id: "home", position: 0, header: {}, body: "" },
      { type: "screen", id: "about", position: 1, header: {}, body: "" },
    ]
    const { html } = renderDocument(blocks)
    // Find the about screen wrapper and verify no wt-active in it.
    const aboutMarker = 'data-wt-screen-id="about"'
    const aboutIdx    = html.indexOf(aboutMarker)
    const aboutSection = html.slice(aboutIdx - 100, aboutIdx + 100)
    expect(aboutSection).not.toContain("wt-active")
  })

  it("artifact contains the interaction JS", () => {
    const { html } = renderDocument([])
    // The artifact must embed the interaction JS inline.
    expect(html).toContain("wt-transition")
    expect(html).toContain("DOMContentLoaded")
  })

  it("artifact contains WebAwesome CDN", () => {
    const { html } = renderDocument([])
    expect(html).toContain("webawesome")
  })

  it("errors are collected and returned without crashing", () => {
    // Provide a block with parse errors at the body stage. Since parseBody is
    // still a stub, errors may be empty — but the call must not throw.
    const blocks: WireTextBlock[] = [
      { type: "screen", id: "broken", position: 0, header: {}, body: "!!invalid!!" },
    ]
    let result: { html: string; errors: ParseError[] } | undefined
    expect(() => { result = renderDocument(blocks) }).not.toThrow()
    expect(result).toBeDefined()
    expect(result!.html).toContain("<!DOCTYPE html>")
  })

  it("journey block → journey container rendered", () => {
    const blocks: WireTextBlock[] = [
      {
        type:     "journey",
        id:       "onboarding",
        position: 0,
        header:   {},
        body:     "",
      },
    ]
    const { html } = renderDocument(blocks)
    // Journey produces a wt-journey container.
    expect(html).toContain("wt-journey")
    expect(html).toContain('data-wt-screen-id="onboarding"')
  })
})
