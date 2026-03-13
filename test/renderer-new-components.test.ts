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

describe("timeline renderer", () => {
  it("renders default placeholder items when no children", () => {
    const body = parseBody("timeline", 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    expect(html).toContain("wt-timeline")
  })

  it("renders timeline items from children", () => {
    const dsl = `timeline
  item ~check Deployed | Mar 12, 2026*
  item ~code PR merged | Mar 11, 2026`
    const body = parseBody(dsl, 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    expect(html).toContain("wt-timeline")
    expect(html).toContain("Deployed")
    expect(html).toContain("PR merged")
    expect(html).toContain("wt-current")
  })
})

describe("metric renderer", () => {
  it("renders label, value, delta, sparkline", () => {
    const body = parseBody("metric MRR | $4,200 | +18% | line", 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    expect(html).toContain("wt-metric")
    expect(html).toContain("MRR")
    expect(html).toContain("$4,200")
    expect(html).toContain("+18%")
    expect(html).toContain("wt-metric-spark")
  })

  it("renders bar sparkline", () => {
    const body = parseBody("metric Revenue | $12k | -5% | bar", 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    expect(html).toContain("rect")
  })

  it("renders without delta or sparkline", () => {
    const body = parseBody("metric Users | 1,240", 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    expect(html).toContain("wt-metric")
    expect(html).toContain("1,240")
  })
})

describe("code renderer", () => {
  it("renders code block with language", () => {
    const body = parseBody("code npm install wiretext | bash", 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    expect(html).toContain("wt-code-block")
    expect(html).toContain("npm install wiretext")
    expect(html).toContain("bash")
  })

  it("renders code block without language", () => {
    const body = parseBody("code console.log('hello')", 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    expect(html).toContain("wt-code-block")
    expect(html).toContain("console.log")
  })
})

describe("combobox renderer", () => {
  it("renders label and placeholder", () => {
    const body = parseBody("combobox Assign to | Search team members...", 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    expect(html).toContain("wt-combobox")
    expect(html).toContain("Assign to")
    expect(html).toContain("Search team members")
  })

  it("renders without label", () => {
    const body = parseBody("combobox | Choose option", 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    expect(html).toContain("wt-combobox")
  })
})

describe("action-sheet renderer", () => {
  it("renders action sheet with title and buttons", () => {
    const dsl = `action-sheet Share post
  button ~share-network Share to Social
  button ~link Copy link`
    const body = parseBody(dsl, 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    expect(html).toContain("wt-action-sheet")
    expect(html).toContain("Share post")
    expect(html).toContain("Share to Social")
    expect(html).toContain("Copy link")
  })

  it("renders drag handle", () => {
    const body = parseBody("action-sheet Actions", 0)
    const result = renderLayout(body.body, 0)
    const html = result.element.outerHTML
    expect(html).toContain("wt-action-sheet-handle")
  })
})
