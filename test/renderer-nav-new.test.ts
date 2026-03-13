import { describe, it, expect, beforeAll } from "vitest"
import { Window } from "happy-dom"
import { parseBody } from "../src/body/index.js"
import { renderLayout } from "../src/layout/index.js"

// Set up DOM before tests
beforeAll(() => {
  const win = new Window()
  Object.assign(globalThis, {
    document: win.document,
    window: win,
    HTMLElement: win.HTMLElement,
    Element: win.Element,
    Node: win.Node,
  })
  // Load all renderers
  return import("../src/renderer/index.js")
})

describe("stepper renderer", () => {
  it("renders items from pipe-separated children", () => {
    const body = parseBody("stepper Account | Profile* | Plan | Payment", 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    expect(html).toContain("wt-stepper")
    expect(html).toContain("Account")
    expect(html).toContain("Profile")
    expect(html).toContain("Plan")
    expect(html).toContain("Payment")
  })

  it("marks active step and preceding steps as completed", () => {
    const body = parseBody("stepper Step1 | Step2* | Step3", 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    // Active step
    expect(html).toContain("wt-step-active")
    // Completed step before active
    expect(html).toContain("wt-step-completed")
  })

  it("renders single step with no connectors", () => {
    const body = parseBody("stepper Only Step", 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    expect(html).toContain("wt-stepper")
    expect(html).toContain("Only Step")
  })
})

describe("filter-bar renderer", () => {
  it("renders filter pills from pipe-separated items", () => {
    const body = parseBody("filter-bar All* | Active+12 | Archived+3", 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    expect(html).toContain("wt-filter-bar")
    expect(html).toContain("All")
    expect(html).toContain("Active")
    expect(html).toContain("Archived")
  })

  it("marks active filter with wt-active class", () => {
    const body = parseBody("filter-bar All* | Active | Archived", 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    expect(html).toContain("wt-active")
  })

  it("shows badge counts", () => {
    const body = parseBody("filter-bar All | Active+5", 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    expect(html).toContain("wa-badge")
    expect(html).toContain("5")
  })
})

describe("bottom-nav renderer", () => {
  it("renders bottom nav items", () => {
    const body = parseBody("bottom-nav ~house Home* | ~folder Projects | ~bell Notifications", 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    expect(html).toContain("wt-bottom-nav")
    expect(html).toContain("Home")
    expect(html).toContain("Projects")
    expect(html).toContain("Notifications")
  })

  it("marks active item with aria-current", () => {
    const body = parseBody("bottom-nav Home* | Projects", 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    expect(html).toContain('aria-current="page"')
  })

  it("renders badge count on item", () => {
    const body = parseBody("bottom-nav Home | Alerts+3", 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    expect(html).toContain("wa-badge")
    expect(html).toContain("3")
  })
})
