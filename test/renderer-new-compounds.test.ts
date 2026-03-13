import { describe, it, expect, beforeAll } from "vitest"
import { Window } from "happy-dom"
import { parseBody } from "../src/body/index.js"
import { renderLayout } from "../src/layout/index.js"

beforeAll(() => {
  const win = new Window()
  Object.assign(globalThis, {
    document: win.document,
    window: win,
    HTMLElement: win.HTMLElement,
    Element: win.Element,
    Node: win.Node,
  })
  return import("../src/renderer/index.js")
})

describe("hero renderer", () => {
  it("renders hero with all slots", () => {
    const dsl = `hero
  .eyebrow New in 2026
  .heading Build UI mocks in seconds
  .subtext Generate clickable prototypes from plain English
  .visual ~monitor`
    const body = parseBody(dsl, 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    expect(html).toContain("wt-hero")
    expect(html).toContain("New in 2026")
    expect(html).toContain("Build UI mocks in seconds")
    expect(html).toContain("Generate clickable prototypes")
  })

  it("renders hero with just heading", () => {
    const body = parseBody("hero Welcome to Acme", 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    expect(html).toContain("wt-hero")
    expect(html).toContain("Welcome to Acme")
  })
})

describe("testimonial renderer", () => {
  it("renders testimonial cards from .quote slots", () => {
    const dsl = `testimonial
  .quote WireText is amazing | Sarah Chen | Head of Design, Acme`
    const body = parseBody(dsl, 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    expect(html).toContain("wt-testimonial")
    expect(html).toContain("WireText is amazing")
    expect(html).toContain("Sarah Chen")
  })

  it("renders default placeholder when no slots", () => {
    const body = parseBody("testimonial", 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    expect(html).toContain("wt-testimonial")
  })
})

describe("feature-grid renderer", () => {
  it("renders features from .feature slots", () => {
    const dsl = `feature-grid
  .feature ~lightning-bolt Fast | Generate mockups in seconds
  .feature ~puzzle-piece Flexible | 67 components`
    const body = parseBody(dsl, 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    expect(html).toContain("wt-feature-grid")
    expect(html).toContain("Fast")
    expect(html).toContain("Generate mockups in seconds")
    expect(html).toContain("Flexible")
  })

  it("renders default placeholder when no slots", () => {
    const body = parseBody("feature-grid", 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    expect(html).toContain("wt-feature-grid")
    expect(html).toContain("wt-feature-card")
  })
})

describe("logo-cloud renderer", () => {
  it("renders logo pills from .logo slots", () => {
    const dsl = `logo-cloud Trusted by teams
  .logo Acme Corp
  .logo Globex`
    const body = parseBody(dsl, 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    expect(html).toContain("wt-logo-cloud")
    expect(html).toContain("Trusted by teams")
    expect(html).toContain("Acme Corp")
    expect(html).toContain("Globex")
  })

  it("renders default logos when no slots", () => {
    const body = parseBody("logo-cloud", 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    expect(html).toContain("wt-logo-cloud")
    expect(html).toContain("wt-logo-pill")
  })
})

describe("onboarding-checklist renderer", () => {
  it("renders items with completed and pending states", () => {
    const dsl = `onboarding-checklist Getting started
  .item Connect repo* | Done
  .item Set up billing | Add payment method`
    const body = parseBody(dsl, 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    expect(html).toContain("wt-onboarding-checklist")
    expect(html).toContain("Getting started")
    expect(html).toContain("Connect repo")
    expect(html).toContain("wt-done")
    expect(html).toContain("Set up billing")
  })
})

describe("command-palette renderer", () => {
  it("renders search bar and results", () => {
    const dsl = `command-palette
  .result ~house Dashboard | Go home -> dashboard
  .result ~gear Settings | App preferences -> settings
  .footer Press Esc to close`
    const body = parseBody(dsl, 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    expect(html).toContain("wt-command-palette")
    expect(html).toContain("Dashboard")
    expect(html).toContain("Settings")
    expect(html).toContain("Press Esc to close")
  })

  it("renders default results when no slots", () => {
    const body = parseBody("command-palette", 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    expect(html).toContain("wt-command-palette")
    expect(html).toContain("wt-command-result")
  })
})
