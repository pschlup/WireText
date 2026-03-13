// Layout engine tests (epic-004) — zone layout, header/footer sub-slots, row/column grid
import { describe, it, expect } from "vitest"
import { renderLayout, inferRowColumns, WIRETEXT_CSS } from "../src/layout/zone-layout.js"
import type { ParsedBody, ComponentNode } from "../src/types.js"

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Build a minimal ComponentNode for use in tests. */
function makeNode(type: string, text = "", overrides: Partial<ComponentNode> = {}): ComponentNode {
  return {
    type,
    text,
    fields: [],
    icon: null,
    modifiers: [],
    transition: null,
    slots: new Map(),
    children: [],
    rowColumns: null,
    ...overrides,
  }
}

/** Build a ParsedBody with only the zones you specify. */
function makeBody(zones: Record<string, ComponentNode[]> = {}): ParsedBody {
  return {
    zones: new Map(Object.entries(zones)),
    overlays: new Map(),
    screens: new Map(),
    tokens: null,
  }
}

// ---------------------------------------------------------------------------
// inferRowColumns unit tests
// ---------------------------------------------------------------------------
describe("inferRowColumns", () => {
  it("1 child → full parent width", () => {
    expect(inferRowColumns(1, 12)).toEqual([12])
  })

  it("2 children → [8, 4] in 12-col parent", () => {
    expect(inferRowColumns(2, 12)).toEqual([8, 4])
  })

  it("3 children → [4, 4, 4] in 12-col parent", () => {
    expect(inferRowColumns(3, 12)).toEqual([4, 4, 4])
  })

  it("4 children → [3, 3, 3, 3] in 12-col parent", () => {
    expect(inferRowColumns(4, 12)).toEqual([3, 3, 3, 3])
  })

  it("5 children in 12-col parent → [2,2,2,2,4] (remainder to last)", () => {
    const cols = inferRowColumns(5, 12)
    expect(cols).toHaveLength(5)
    expect(cols.reduce((a, b) => a + b, 0)).toBe(12)
    // floor(12/5) = 2, last = 12 - 2*4 = 4
    expect(cols[0]).toBe(2)
    expect(cols[cols.length - 1]).toBe(4)
  })

  it("6 children in 12-col parent → [2,2,2,2,2,2] (even split)", () => {
    const cols = inferRowColumns(6, 12)
    expect(cols).toHaveLength(6)
    expect(cols).toEqual([2, 2, 2, 2, 2, 2])
  })

  it("7 children in 12-col parent → last gets the remainder", () => {
    const cols = inferRowColumns(7, 12)
    expect(cols).toHaveLength(7)
    expect(cols.reduce((a, b) => a + b, 0)).toBe(12)
    // floor(12/7) = 1, last = 12 - 1*6 = 6
    expect(cols[0]).toBe(1)
    expect(cols[cols.length - 1]).toBe(6)
  })

  it("1 child in 4-col cell → [4]", () => {
    expect(inferRowColumns(1, 4)).toEqual([4])
  })

  it("2 children in 4-col cell → equal split with remainder to last", () => {
    const cols = inferRowColumns(2, 4)
    expect(cols).toHaveLength(2)
    expect(cols.reduce((a, b) => a + b, 0)).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// renderLayout — zone structure
// ---------------------------------------------------------------------------
describe("renderLayout — zone structure", () => {
  it("main-only layout: no sidebar, no aside → <main> spans full width", () => {
    const body = makeBody({ main: [makeNode("text", "Hello")] })
    const { element, errors } = renderLayout(body, 0)

    expect(errors).toHaveLength(0)
    const main = element.querySelector("main.wt-main")
    expect(main).not.toBeNull()
    // No sidebar or aside
    expect(element.querySelector("nav.wt-sidebar")).toBeNull()
    expect(element.querySelector("aside.wt-aside")).toBeNull()
  })

  it("full 5-zone layout includes all semantic elements", () => {
    const body = makeBody({
      header:  [makeNode("text", "header")],
      sidebar: [makeNode("text", "sidebar")],
      main:    [makeNode("text", "main")],
      aside:   [makeNode("text", "aside")],
      footer:  [makeNode("text", "footer")],
    })
    const { element, errors } = renderLayout(body, 0)

    expect(errors).toHaveLength(0)
    expect(element.querySelector("header.wt-header")).not.toBeNull()
    expect(element.querySelector("nav.wt-sidebar")).not.toBeNull()
    expect(element.querySelector("main.wt-main")).not.toBeNull()
    expect(element.querySelector("aside.wt-aside")).not.toBeNull()
    expect(element.querySelector("footer.wt-footer")).not.toBeNull()
  })

  it("sidebar + main (no aside) → correct elements present", () => {
    const body = makeBody({
      sidebar: [makeNode("text", "sidebar")],
      main:    [makeNode("text", "main")],
    })
    const { element, errors } = renderLayout(body, 0)

    expect(errors).toHaveLength(0)
    expect(element.querySelector("nav.wt-sidebar")).not.toBeNull()
    expect(element.querySelector("main.wt-main")).not.toBeNull()
    expect(element.querySelector("aside.wt-aside")).toBeNull()
  })

  it("main + aside (no sidebar) → correct elements present", () => {
    const body = makeBody({
      main:  [makeNode("text", "main")],
      aside: [makeNode("text", "aside")],
    })
    const { element, errors } = renderLayout(body, 0)

    expect(errors).toHaveLength(0)
    expect(element.querySelector("nav.wt-sidebar")).toBeNull()
    expect(element.querySelector("main.wt-main")).not.toBeNull()
    expect(element.querySelector("aside.wt-aside")).not.toBeNull()
  })

  it("custom sidebar width via 'sidebar:3' zone key", () => {
    const body: ParsedBody = {
      zones: new Map([
        ["sidebar:3", [makeNode("text", "sidebar")]],
        ["main",      [makeNode("text", "main")]],
      ]),
      overlays: new Map(),
      screens:  new Map(),
      tokens:   null,
    }
    const { element, errors } = renderLayout(body, 0)

    expect(errors).toHaveLength(0)
    // The grid should reflect 3fr sidebar, 9fr main
    expect(element.style.gridTemplateColumns).toContain("3fr")
    expect(element.style.gridTemplateColumns).toContain("9fr")
  })

  it("error: @sidebar + @aside present but no @main", () => {
    const body = makeBody({
      sidebar: [makeNode("text", "sidebar")],
      aside:   [makeNode("text", "aside")],
    })
    const { errors } = renderLayout(body, 1)

    expect(errors.some(e => e.severity === "error" && e.message.includes("@main zone is required"))).toBe(true)
  })

  it("error: sidebar + aside columns >= 12 (no room for main)", () => {
    const body: ParsedBody = {
      zones: new Map([
        ["sidebar:7", [makeNode("text", "sidebar")]],
        ["aside:6",   [makeNode("text", "aside")]],
        ["main",      [makeNode("text", "main")]],
      ]),
      overlays: new Map(),
      screens:  new Map(),
      tokens:   null,
    }
    const { errors } = renderLayout(body, 1)
    expect(errors.some(e => e.severity === "error" && e.message.includes("no room for @main"))).toBe(true)
  })

  it("CSS styles injected into the layout wrapper", () => {
    const body = makeBody({ main: [makeNode("text", "Hello")] })
    const { element } = renderLayout(body, 0)
    const style = element.querySelector("style")
    expect(style).not.toBeNull()
    expect(style?.textContent).toContain("wt-layout")
  })

  it("WIRETEXT_CSS is exported and non-empty", () => {
    expect(typeof WIRETEXT_CSS).toBe("string")
    expect(WIRETEXT_CSS.length).toBeGreaterThan(100)
    expect(WIRETEXT_CSS).toContain("wt-layout")
  })
})

// ---------------------------------------------------------------------------
// renderLayout — header/footer left/right sub-slots
// ---------------------------------------------------------------------------
describe("renderLayout — header/footer sub-slots", () => {
  it("header with left and right children → flex wrapper with sub-divs", () => {
    const left  = makeNode("left",  "", { children: [makeNode("logo", "Acme")] })
    const right = makeNode("right", "", { children: [makeNode("button", "Sign in")] })
    const body  = makeBody({
      header: [left, right],
      main:   [makeNode("text", "content")],
    })
    const { element, errors } = renderLayout(body, 0)

    expect(errors).toHaveLength(0)
    const leftDiv  = element.querySelector(".wt-header-left")
    const rightDiv = element.querySelector(".wt-header-right")
    expect(leftDiv).not.toBeNull()
    expect(rightDiv).not.toBeNull()
  })

  it("header without sub-slots → single left wrapper with all children", () => {
    const body = makeBody({
      header: [makeNode("logo", "Acme"), makeNode("nav", "")],
      main:   [makeNode("text", "content")],
    })
    const { element, errors } = renderLayout(body, 0)

    expect(errors).toHaveLength(0)
    const inner = element.querySelector(".wt-header-inner")
    expect(inner).not.toBeNull()
    // Left div should exist with children
    const leftDiv = element.querySelector(".wt-header-left")
    expect(leftDiv).not.toBeNull()
  })

  it("footer with left and right sub-slots", () => {
    const left  = makeNode("left",  "", { children: [makeNode("text", "© 2026")] })
    const right = makeNode("right", "", { children: [makeNode("link", "Privacy")] })
    const body = makeBody({
      footer: [left, right],
      main:   [makeNode("text", "content")],
    })
    const { element, errors } = renderLayout(body, 0)

    expect(errors).toHaveLength(0)
    const footerEl = element.querySelector("footer.wt-footer")
    expect(footerEl).not.toBeNull()
    expect(element.querySelector(".wt-footer-left")).not.toBeNull()
    expect(element.querySelector(".wt-footer-right")).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// renderLayout — row rendering
// ---------------------------------------------------------------------------
describe("renderLayout — row rendering", () => {
  it("row with 1 child → single full-width cell", () => {
    const row = makeNode("row", "", { children: [makeNode("text", "A")] })
    const body = makeBody({ main: [row] })
    const { element, errors } = renderLayout(body, 0)

    expect(errors).toHaveLength(0)
    const rowEl = element.querySelector(".wt-row")
    expect(rowEl).not.toBeNull()
    const cells = element.querySelectorAll(".wt-cell")
    expect(cells).toHaveLength(1)
  })

  it("row with 2 children → 8fr + 4fr grid template", () => {
    const row = makeNode("row", "", {
      children: [makeNode("text", "A"), makeNode("text", "B")],
    })
    const body = makeBody({ main: [row] })
    const { element } = renderLayout(body, 0)

    const rowEl = element.querySelector(".wt-row") as HTMLElement | null
    expect(rowEl).not.toBeNull()
    expect(rowEl?.style.gridTemplateColumns).toBe("8fr 4fr")
  })

  it("row with 3 children → 4fr 4fr 4fr", () => {
    const row = makeNode("row", "", {
      children: [makeNode("text", "A"), makeNode("text", "B"), makeNode("text", "C")],
    })
    const body = makeBody({ main: [row] })
    const { element } = renderLayout(body, 0)

    const rowEl = element.querySelector(".wt-row") as HTMLElement | null
    expect(rowEl?.style.gridTemplateColumns).toBe("4fr 4fr 4fr")
  })

  it("explicit row 6, 6 → 6fr 6fr grid template", () => {
    const row = makeNode("row", "", {
      children:   [makeNode("text", "A"), makeNode("text", "B")],
      rowColumns: [6, 6],
    })
    const body = makeBody({ main: [row] })
    const { element, errors } = renderLayout(body, 0)

    expect(errors).toHaveLength(0)
    const rowEl = element.querySelector(".wt-row") as HTMLElement | null
    expect(rowEl?.style.gridTemplateColumns).toBe("6fr 6fr")
  })

  it("explicit row 3, 9 → 3fr 9fr grid template", () => {
    const row = makeNode("row", "", {
      children:   [makeNode("text", "A"), makeNode("text", "B")],
      rowColumns: [3, 9],
    })
    const body = makeBody({ main: [row] })
    const { element, errors } = renderLayout(body, 0)

    expect(errors).toHaveLength(0)
    const rowEl = element.querySelector(".wt-row") as HTMLElement | null
    expect(rowEl?.style.gridTemplateColumns).toBe("3fr 9fr")
  })

  it("error: explicit col count mismatch (2 cols for 3 children)", () => {
    const row = makeNode("row", "", {
      children:   [makeNode("text", "A"), makeNode("text", "B"), makeNode("text", "C")],
      rowColumns: [6, 6],
    })
    const body = makeBody({ main: [row] })
    const { errors } = renderLayout(body, 0)

    expect(errors.some(e => e.severity === "error" && e.message.includes("column widths"))).toBe(true)
  })

  it("error: explicit cols sum exceeds parent width", () => {
    const row = makeNode("row", "", {
      children:   [makeNode("text", "A"), makeNode("text", "B")],
      rowColumns: [8, 8],
    })
    const body = makeBody({ main: [row] })
    const { errors } = renderLayout(body, 0)

    expect(errors.some(e => e.severity === "error" && e.message.includes("sum to"))).toBe(true)
  })

  it("error: row with no children emits error", () => {
    const row = makeNode("row", "", { children: [] })
    const body = makeBody({ main: [row] })
    const { errors } = renderLayout(body, 0)

    expect(errors.some(e => e.severity === "error" && e.message.includes("at least one child"))).toBe(true)
  })

  it("nested row: inner row inherits parent cell width", () => {
    // Outer row: 2 children → [8, 4]; inner row is inside the 4-col cell
    const innerRow = makeNode("row", "", {
      children: [makeNode("text", "X"), makeNode("text", "Y")],
    })
    const outerRow = makeNode("row", "", {
      children: [makeNode("text", "Wide"), innerRow],
    })
    const body = makeBody({ main: [outerRow] })
    const { element, errors } = renderLayout(body, 0)

    expect(errors).toHaveLength(0)
    const rows = element.querySelectorAll(".wt-row")
    // At least 2 rows (outer + inner)
    expect(rows.length).toBeGreaterThanOrEqual(2)
  })

  it("error: nested row 3, 3 inside 4-col cell (sum 6 > 4)", () => {
    // Outer row: explicit [8, 4]; inner row has explicit [3, 3] — exceeds 4-col cell
    const innerRow = makeNode("row", "", {
      children:   [makeNode("text", "X"), makeNode("text", "Y")],
      rowColumns: [3, 3],
    })
    const outerRow = makeNode("row", "", {
      children:   [makeNode("text", "Wide"), innerRow],
      rowColumns: [8, 4],
    })
    const body = makeBody({ main: [outerRow] })
    const { errors } = renderLayout(body, 0)

    expect(errors.some(e => e.severity === "error" && e.message.includes("sum to"))).toBe(true)
  })
})
