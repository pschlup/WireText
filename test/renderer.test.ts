// Component renderer tests (epic-005) — key component types
import { describe, it, expect } from "vitest"

// Import index to trigger all renderer registrations
import { COMPONENT_REGISTRY, renderComponent } from "../src/renderer/index.js"
import type { ComponentNode, Modifier, Transition } from "../src/types.js"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

const DEFAULT_CTX = {
  parentColumnWidth: 12,
  parentComponentType: null as string | null,
  themeTokens: {} as Record<string, string>,
  blockPosition: 0,
}

function render(node: ComponentNode) {
  return renderComponent(node, DEFAULT_CTX)
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------
describe("COMPONENT_REGISTRY", () => {
  it("is a Map", () => {
    expect(COMPONENT_REGISTRY).toBeInstanceOf(Map)
  })

  it("registers all 53 components", () => {
    const expected = [
      // Primitives
      "text", "heading", "subtext", "link", "button", "badge", "avatar",
      "icon", "divider", "spacer", "progress", "tag", "item",
      // Forms
      "input", "select", "checkbox", "radio", "toggle", "textarea",
      "datepicker", "search", "slider", "rating",
      // Navigation
      "logo", "nav", "tabs", "breadcrumb", "hamburger", "tree",
      // Containers
      "card", "modal", "drawer", "alert", "toast", "tooltip", "callout", "details",
      // Data
      "table", "pagination", "stat", "chart", "feed", "kanban", "calendar", "skeleton",
      // Compounds
      "login-form", "signup-form", "pricing-table", "empty-state",
      "user-menu", "data-table", "settings-form", "file-upload",
    ]
    for (const name of expected) {
      expect(COMPONENT_REGISTRY.has(name), `Missing renderer: ${name}`).toBe(true)
    }
  })

  it("unknown component → placeholder div with class wiretext-unknown", () => {
    const node = makeNode("does-not-exist", "test")
    const { element, errors } = render(node)
    expect(element.className).toBe("wiretext-unknown")
    expect(errors).toHaveLength(1)
    expect(errors[0]?.severity).toBe("warn")
  })
})

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------
describe("primitives", () => {
  it("text → <p class='wt-text'>", () => {
    const { element } = render(makeNode("text", "Hello world"))
    expect(element.tagName.toLowerCase()).toBe("p")
    expect(element.className).toBe("wt-text")
    expect(element.textContent).toBe("Hello world")
  })

  it("heading default → <h2>", () => {
    const { element } = render(makeNode("heading", "Dashboard"))
    expect(element.tagName.toLowerCase()).toBe("h2")
    expect(element.textContent).toBe("Dashboard")
  })

  it("heading with level 3 → <h3>", () => {
    const { element } = render(makeNode("heading", "Section", { fields: ["3"] }))
    expect(element.tagName.toLowerCase()).toBe("h3")
  })

  it("heading with level 0 → defaults to <h2>", () => {
    const { element } = render(makeNode("heading", "X", { fields: ["0"] }))
    expect(element.tagName.toLowerCase()).toBe("h2")
  })

  it("heading with level 7 → defaults to <h2>", () => {
    const { element } = render(makeNode("heading", "X", { fields: ["7"] }))
    expect(element.tagName.toLowerCase()).toBe("h2")
  })

  it("heading with non-numeric level → defaults to <h2>", () => {
    const { element } = render(makeNode("heading", "X", { fields: ["abc"] }))
    expect(element.tagName.toLowerCase()).toBe("h2")
  })

  it("heading with level 1 → <h1>", () => {
    const { element } = render(makeNode("heading", "Title", { fields: ["1"] }))
    expect(element.tagName.toLowerCase()).toBe("h1")
  })

  it("heading with level 6 → <h6>", () => {
    const { element } = render(makeNode("heading", "Small", { fields: ["6"] }))
    expect(element.tagName.toLowerCase()).toBe("h6")
  })

  it("subtext → <p class='wt-subtext'>", () => {
    const { element } = render(makeNode("subtext", "Muted text"))
    expect(element.tagName.toLowerCase()).toBe("p")
    expect(element.className).toBe("wt-subtext")
  })

  it("link with both url and transition → transition wins", () => {
    const trans: Transition = { type: "screen", target: "detail" }
    const { element } = render(makeNode("link", "Details", { fields: ["https://example.com"], transition: trans }))
    // Transition should be applied
    expect(element.dataset["wtTransition"]).toContain("detail")
    // External URL should NOT be applied (→ takes precedence)
    expect(element.getAttribute("target")).toBeNull()
    expect(element.getAttribute("rel")).toBeNull()
  })

  it("button → <wa-button>", () => {
    const { element } = render(makeNode("button", "Save"))
    expect(element.tagName.toLowerCase()).toBe("wa-button")
    expect(element.textContent).toBe("Save")
  })

  it("button + modifier → variant=primary", () => {
    const mods: Modifier[] = [{ type: "primary" }]
    const { element } = render(makeNode("button", "Save", { modifiers: mods }))
    expect(element.tagName.toLowerCase()).toBe("wa-button")
    expect(element.getAttribute("variant")).toBe("primary")
  })

  it("button without + → no variant attribute", () => {
    const { element } = render(makeNode("button", "Cancel"))
    expect(element.getAttribute("variant")).toBeNull()
  })

  it("button with ~trash icon → icon element in button", () => {
    const { element } = render(makeNode("button", "Delete", { icon: "trash" }))
    const iconEl = element.querySelector("ph-trash")
    expect(iconEl).not.toBeNull()
  })

  it("icon-only button (no text) → wa-button with icon only", () => {
    const { element } = render(makeNode("button", "", { icon: "trash" }))
    expect(element.tagName.toLowerCase()).toBe("wa-button")
    const iconEl = element.querySelector("ph-trash")
    expect(iconEl).not.toBeNull()
  })

  it("badge → <wa-badge>", () => {
    const { element } = render(makeNode("badge", "New", { fields: ["success"] }))
    expect(element.tagName.toLowerCase()).toBe("wa-badge")
    expect(element.getAttribute("variant")).toBe("success")
    expect(element.textContent).toBe("New")
  })

  it("badge with unknown variant → neutral + warn", () => {
    const { element, errors } = render(makeNode("badge", "X", { fields: ["magenta"] }))
    expect(element.getAttribute("variant")).toBe("neutral")
    expect(errors).toHaveLength(1)
    expect(errors[0]?.severity).toBe("warn")
  })

  it("avatar with name → <wa-avatar> with initials", () => {
    const { element } = render(makeNode("avatar", "Alice Johnson"))
    expect(element.tagName.toLowerCase()).toBe("wa-avatar")
    expect(element.getAttribute("initials")).toBe("AJ")
  })

  it("avatar with image URL → src attribute set", () => {
    const { element } = render(makeNode("avatar", "Alice", { fields: ["/img/alice.jpg"] }))
    expect(element.tagName.toLowerCase()).toBe("wa-avatar")
    expect(element.getAttribute("src")).toBe("/img/alice.jpg")
  })

  it("icon → <ph-{name}> element", () => {
    const { element } = render(makeNode("icon", "", { icon: "house" }))
    expect(element.tagName.toLowerCase()).toBe("ph-house")
  })

  it("icon from text fallback → <ph-{text}>", () => {
    const { element } = render(makeNode("icon", "star"))
    expect(element.tagName.toLowerCase()).toBe("ph-star")
  })

  it("divider → <wa-divider>", () => {
    const { element } = render(makeNode("divider"))
    expect(element.tagName.toLowerCase()).toBe("wa-divider")
  })

  it("spacer → div with wt-spacer class and height", () => {
    const { element } = render(makeNode("spacer"))
    expect(element.tagName.toLowerCase()).toBe("div")
    expect(element.className).toBe("wt-spacer")
  })

  it("progress with current/total → percentage value", () => {
    const { element } = render(makeNode("progress", "", { fields: ["2", "5"] }))
    expect(element.tagName.toLowerCase()).toBe("wa-progress-bar")
    expect(element.getAttribute("value")).toBe("40")
  })

  it("progress 0/5 → 0%", () => {
    const { element } = render(makeNode("progress", "", { fields: ["0", "5"] }))
    expect(element.getAttribute("value")).toBe("0")
  })

  it("progress 5/5 → 100%", () => {
    const { element } = render(makeNode("progress", "", { fields: ["5", "5"] }))
    expect(element.getAttribute("value")).toBe("100")
  })

  it("progress single field → raw value", () => {
    const { element } = render(makeNode("progress", "", { fields: ["75"] }))
    expect(element.getAttribute("value")).toBe("75")
  })

  it("tag → <wa-tag>", () => {
    const { element } = render(makeNode("tag", "Featured", { fields: ["success"] }))
    expect(element.tagName.toLowerCase()).toBe("wa-tag")
    expect(element.getAttribute("variant")).toBe("success")
    expect(element.textContent).toBe("Featured")
  })

  it("tag with variant=danger sets correct attribute", () => {
    const { element, errors } = render(makeNode("tag", "High", { fields: ["danger"] }))
    expect(element.tagName.toLowerCase()).toBe("wa-tag")
    expect(element.getAttribute("variant")).toBe("danger")
    expect(errors).toHaveLength(0)
  })

  it("tag with variant=warning sets correct attribute", () => {
    const { element, errors } = render(makeNode("tag", "Medium", { fields: ["warning"] }))
    expect(element.tagName.toLowerCase()).toBe("wa-tag")
    expect(element.getAttribute("variant")).toBe("warning")
    expect(errors).toHaveLength(0)
  })

  it("tag with no variant defaults to neutral", () => {
    const { element, errors } = render(makeNode("tag", "Label"))
    expect(element.tagName.toLowerCase()).toBe("wa-tag")
    expect(element.getAttribute("variant")).toBe("neutral")
    expect(errors).toHaveLength(0)
  })

  it("tag with variant=primary sets correct attribute", () => {
    const { element, errors } = render(makeNode("tag", "Info", { fields: ["primary"] }))
    expect(element.tagName.toLowerCase()).toBe("wa-tag")
    expect(element.getAttribute("variant")).toBe("primary")
    expect(errors).toHaveLength(0)
  })

  it("item in tree parent → <wa-tree-item>", () => {
    const node = makeNode("item", "Home")
    const { element } = renderComponent(node, { ...DEFAULT_CTX, parentComponentType: "tree" })
    expect(element.tagName.toLowerCase()).toBe("wa-tree-item")
  })

  it("item in kanban parent → <div class='wt-kanban-card'>", () => {
    const node = makeNode("item", "Fix bug")
    const { element } = renderComponent(node, { ...DEFAULT_CTX, parentComponentType: "kanban" })
    expect(element.tagName.toLowerCase()).toBe("div")
    expect(element.className).toBe("wt-kanban-card")
  })

  it("item in feed parent → <li class='wt-feed-item'>", () => {
    const node = makeNode("item", "Alice joined")
    const { element } = renderComponent(node, { ...DEFAULT_CTX, parentComponentType: "feed" })
    expect(element.tagName.toLowerCase()).toBe("li")
    expect(element.className).toBe("wt-feed-item")
  })
})

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------
describe("forms", () => {
  it("input → <wa-input> with label", () => {
    const { element } = render(makeNode("input", "Email"))
    expect(element.tagName.toLowerCase()).toBe("wa-input")
    expect(element.getAttribute("label")).toBe("Email")
  })

  it("input with placeholder from fields[0]", () => {
    const { element } = render(makeNode("input", "Email", { fields: ["you@company.com"] }))
    expect(element.getAttribute("placeholder")).toBe("you@company.com")
  })

  it("input * modifier → type=password", () => {
    const mods: Modifier[] = [{ type: "active" }]
    const { element } = render(makeNode("input", "Password", { modifiers: mods }))
    expect(element.getAttribute("type")).toBe("password")
  })

  it("select → <wa-select> with options", () => {
    const { element } = render(makeNode("select", "Role", { fields: ["Admin, Editor, Viewer"] }))
    expect(element.tagName.toLowerCase()).toBe("wa-select")
    const options = element.querySelectorAll("wa-option")
    expect(options).toHaveLength(3)
  })

  it("checkbox → <wa-checkbox>", () => {
    const { element } = render(makeNode("checkbox", "Remember me"))
    expect(element.tagName.toLowerCase()).toBe("wa-checkbox")
    expect(element.textContent).toBe("Remember me")
  })

  it("checkbox * → checked attribute", () => {
    const mods: Modifier[] = [{ type: "active" }]
    const { element } = render(makeNode("checkbox", "Remember me", { modifiers: mods }))
    expect(element.hasAttribute("checked")).toBe(true)
  })

  it("toggle * → checked attribute", () => {
    const mods: Modifier[] = [{ type: "active" }]
    const { element } = render(makeNode("toggle", "Dark mode", { modifiers: mods }))
    expect(element.tagName.toLowerCase()).toBe("wa-switch")
    expect(element.hasAttribute("checked")).toBe(true)
  })

  it("search → <wa-input type='search'> with placeholder", () => {
    const { element } = render(makeNode("search", "Search projects..."))
    expect(element.tagName.toLowerCase()).toBe("wa-input")
    expect(element.getAttribute("type")).toBe("search")
    expect(element.getAttribute("placeholder")).toBe("Search projects...")
    // Magnifying glass icon in prefix slot
    const icon = element.querySelector("ph-magnifying-glass")
    expect(icon).not.toBeNull()
  })

  it("slider → <wa-range> with min/max", () => {
    const { element } = render(makeNode("slider", "Volume", { fields: ["0, 100"] }))
    expect(element.tagName.toLowerCase()).toBe("wa-range")
    expect(element.getAttribute("min")).toBe("0")
    expect(element.getAttribute("max")).toBe("100")
  })
})

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
describe("navigation", () => {
  it("nav with active item → aria-current on that item", () => {
    const items: ComponentNode[] = [
      makeNode("item", "Home",     { transition: { type: "screen", target: "home" },     modifiers: [{ type: "active" }] }),
      makeNode("item", "Projects", { transition: { type: "screen", target: "projects" }, modifiers: [] }),
    ]
    const node = makeNode("nav", "", { children: items })
    const { element } = render(node)

    const navItems = element.querySelectorAll(".wt-nav-item")
    expect(navItems).toHaveLength(2)

    const activeItem = navItems[0] as HTMLElement | undefined
    expect(activeItem?.getAttribute("aria-current")).toBe("page")

    const inactiveItem = navItems[1] as HTMLElement | undefined
    expect(inactiveItem?.getAttribute("aria-current")).toBeNull()
  })

  it("nav with '---' divider → <hr class='wt-nav-divider'>", () => {
    const items: ComponentNode[] = [
      makeNode("item", "Dashboard", { transition: { type: "screen", target: "dash" }, modifiers: [] }),
      makeNode("item", "---",       { transition: null, modifiers: [] }),
      makeNode("item", "Settings",  { transition: { type: "screen", target: "settings" }, modifiers: [] }),
    ]
    const node = makeNode("nav", "", { children: items })
    const { element } = render(node)

    const divider = element.querySelector("hr.wt-nav-divider")
    expect(divider).not.toBeNull()
  })

  it("nav item without transition → non-interactive label (no anchor)", () => {
    const items: ComponentNode[] = [
      makeNode("item", "Section Label", { transition: null, modifiers: [] }),
    ]
    const node = makeNode("nav", "", { children: items })
    const { element } = render(node)

    // Should be a span.wt-nav-label, not an anchor
    const label = element.querySelector(".wt-nav-label")
    expect(label).not.toBeNull()
    const anchor = element.querySelector(".wt-nav-item")
    expect(anchor).toBeNull()
  })

  it("tabs → <wa-tab-group> with wa-tab elements", () => {
    const items: ComponentNode[] = [
      makeNode("item", "Overview", { modifiers: [{ type: "active" }] }),
      makeNode("item", "Analytics", { modifiers: [] }),
    ]
    const node = makeNode("tabs", "", { children: items })
    const { element } = render(node)

    expect(element.tagName.toLowerCase()).toBe("wa-tab-group")
    const tabs = element.querySelectorAll("wa-tab")
    expect(tabs).toHaveLength(2)

    const activeTab = tabs[0] as HTMLElement | undefined
    expect(activeTab?.hasAttribute("active")).toBe(true)
  })

  it("breadcrumb → <wa-breadcrumb> with items", () => {
    const items: ComponentNode[] = [
      makeNode("item", "Home",    { transition: { type: "screen", target: "home" }, modifiers: [] }),
      makeNode("item", "Projects",{ transition: { type: "screen", target: "projects" }, modifiers: [] }),
      makeNode("item", "Alpha",   { transition: null, modifiers: [] }),
    ]
    const node = makeNode("breadcrumb", "", { children: items })
    const { element } = render(node)

    expect(element.tagName.toLowerCase()).toBe("wa-breadcrumb")
    const crumbs = element.querySelectorAll("wa-breadcrumb-item")
    expect(crumbs).toHaveLength(3)
  })

  it("breadcrumb last item transition is ignored even if specified", () => {
    const items: ComponentNode[] = [
      makeNode("item", "Home",    { transition: { type: "screen", target: "home" }, modifiers: [] }),
      makeNode("item", "Current", { transition: { type: "screen", target: "current" }, modifiers: [] }),
    ]
    const node = makeNode("breadcrumb", "", { children: items })
    const { element } = render(node)

    const crumbs = element.querySelectorAll("wa-breadcrumb-item")
    expect(crumbs).toHaveLength(2)

    // First item should have transition wired
    const first = crumbs[0] as HTMLElement
    expect(first?.dataset["wtTransition"]).toBeDefined()

    // Last item must NOT have transition — spec says it's ignored
    const last = crumbs[1] as HTMLElement
    expect(last?.dataset["wtTransition"]).toBeUndefined()
  })

  it("hamburger → <wa-icon-button name='list'>", () => {
    const { element } = render(makeNode("hamburger"))
    expect(element.tagName.toLowerCase()).toBe("wa-icon-button")
    expect(element.getAttribute("name")).toBe("list")
  })

  it("tree → <wa-tree> with wa-tree-item children", () => {
    const children: ComponentNode[] = [
      makeNode("item", "Home",     { modifiers: [{ type: "active" }] }),
      makeNode("item", "Projects", { modifiers: [] }),
    ]
    const node = makeNode("tree", "", { children })
    const { element } = render(node)

    expect(element.tagName.toLowerCase()).toBe("wa-tree")
    const items = element.querySelectorAll("wa-tree-item")
    expect(items).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// Containers
// ---------------------------------------------------------------------------
describe("containers", () => {
  it("card → <wa-card>", () => {
    const { element } = render(makeNode("card", "My Card"))
    expect(element.tagName.toLowerCase()).toBe("wa-card")
  })

  it("modal → <wa-dialog> hidden by default (no open attribute)", () => {
    const { element } = render(makeNode("modal", "Confirm Delete"))
    expect(element.tagName.toLowerCase()).toBe("wa-dialog")
    expect(element.getAttribute("label")).toBe("Confirm Delete")
    // Must NOT have `open` attribute — shown by interaction system
    expect(element.hasAttribute("open")).toBe(false)
  })

  it("drawer → <wa-drawer> hidden by default", () => {
    const { element } = render(makeNode("drawer", "Filters"))
    expect(element.tagName.toLowerCase()).toBe("wa-drawer")
    expect(element.hasAttribute("open")).toBe(false)
  })

  it("alert with variant → <wa-alert variant=danger>", () => {
    const { element, errors } = render(makeNode("alert", "Access denied", { fields: ["danger"] }))
    expect(element.tagName.toLowerCase()).toBe("wa-alert")
    expect(element.getAttribute("variant")).toBe("danger")
    expect(errors).toHaveLength(0)
  })

  it("alert with unknown variant → neutral + warn", () => {
    const { element, errors } = render(makeNode("alert", "Notice", { fields: ["info"] }))
    expect(element.getAttribute("variant")).toBe("neutral")
    expect(errors.some(e => e.severity === "warn")).toBe(true)
  })

  it("details → <wa-details> with summary", () => {
    const { element } = render(makeNode("details", "Advanced settings"))
    expect(element.tagName.toLowerCase()).toBe("wa-details")
    expect(element.getAttribute("summary")).toBe("Advanced settings")
  })
})

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
describe("data", () => {
  it("table → <table> with thead and mock tbody rows", () => {
    const { element } = render(makeNode("table", "", { fields: ["Name, Email, Status"] }))
    expect(element.tagName.toLowerCase()).toBe("table")
    const headers = element.querySelectorAll("th")
    expect(headers).toHaveLength(3)
    const rows = element.querySelectorAll("tbody tr")
    expect(rows).toHaveLength(3)
  })

  it("stat with positive delta → green styling class", () => {
    const { element } = render(makeNode("stat", "MRR", { fields: ["$4,200", "+18%"] }))
    const delta = element.querySelector(".wt-stat-delta")
    expect(delta).not.toBeNull()
    expect(delta?.classList.contains("wt-stat-delta-positive")).toBe(true)
  })

  it("stat with negative delta → red styling class", () => {
    const { element } = render(makeNode("stat", "Churn", { fields: ["3.2%", "-0.5%"] }))
    const delta = element.querySelector(".wt-stat-delta")
    expect(delta?.classList.contains("wt-stat-delta-negative")).toBe(true)
  })

  it("stat with no sign delta → neutral styling class", () => {
    const { element } = render(makeNode("stat", "Users", { fields: ["450", "12"] }))
    const delta = element.querySelector(".wt-stat-delta")
    expect(delta?.classList.contains("wt-stat-delta-neutral")).toBe(true)
  })

  it("stat with 2 fields (no delta) → no delta element", () => {
    const { element } = render(makeNode("stat", "Open", { fields: ["12"] }))
    const delta = element.querySelector(".wt-stat-delta")
    expect(delta).toBeNull()
  })

  it("stat element has wt-stat class with container styling", () => {
    const { element } = render(makeNode("stat", "MRR", { fields: ["$4,200"] }))
    expect(element.className).toBe("wt-stat")
    // Container styling is applied via CSS class; verify the element has the class
    // that maps to border, padding, background, border-radius in WIRETEXT_CSS
    expect(element.tagName.toLowerCase()).toBe("div")
  })

  it("chart with valid type → placeholder with data-chart-type", () => {
    const { element, errors } = render(makeNode("chart", "Revenue", { fields: ["bar"] }))
    expect(element.getAttribute("data-chart-type")).toBe("bar")
    expect(errors).toHaveLength(0)
  })

  it("chart with unknown type → fallback to line + warn", () => {
    const { element, errors } = render(makeNode("chart", "Graph", { fields: ["radar"] }))
    expect(element.getAttribute("data-chart-type")).toBe("line")
    expect(errors.some(e => e.severity === "warn")).toBe(true)
  })

  it("chart with no fields → defaults to line", () => {
    const { element } = render(makeNode("chart", "Revenue"))
    expect(element.getAttribute("data-chart-type")).toBe("line")
  })

  it("calendar defaults to month view", () => {
    const { element } = render(makeNode("calendar", "Sprint Schedule"))
    // Month calendar renders a <table>
    const table = element.querySelector("table.wt-calendar")
    expect(table).not.toBeNull()
  })

  it("calendar with week view → week layout (no wt-calendar table)", () => {
    const { element } = render(makeNode("calendar", "Week", { fields: ["week"] }))
    // Week view uses a div grid, not a table
    const weekGrid = element.querySelector("div[style*='grid-template-columns']")
    expect(weekGrid).not.toBeNull()
  })

  it("calendar with day view → day layout", () => {
    const { element } = render(makeNode("calendar", "Day", { fields: ["day"] }))
    // Day view is a 2-column grid
    const dayGrid = element.querySelector("div[style*='grid-template-columns: 60px 1fr']")
    expect(dayGrid).not.toBeNull()
  })

  it("feed with item children renders them", () => {
    const items: ComponentNode[] = [
      makeNode("item", "Alice joined", { modifiers: [] }),
      makeNode("item", "Bob commented", { modifiers: [] }),
    ]
    const { element } = render(makeNode("feed", "", { children: items }))
    expect(element.tagName.toLowerCase()).toBe("ul")
    expect(element.children).toHaveLength(2)
  })

  it("feed with no children → 3 placeholder items", () => {
    const { element } = render(makeNode("feed"))
    expect(element.querySelectorAll(".wt-feed-item")).toHaveLength(3)
  })

  it("kanban with item children → placed in correct column", () => {
    const items: ComponentNode[] = [
      makeNode("item", "Fix bug",      { fields: ["Todo"],        modifiers: [] }),
      makeNode("item", "Write tests",  { fields: ["In Progress"], modifiers: [] }),
    ]
    const { element } = render(makeNode("kanban", "", { children: items }))
    const cols = element.querySelectorAll(".wt-kanban-column")
    expect(cols).toHaveLength(2)
    const todoCol = [...cols].find(c => c.querySelector(".wt-kanban-column-title")?.textContent === "Todo")
    expect(todoCol).not.toBeNull()
    expect(todoCol?.querySelector(".wt-kanban-card")?.textContent).toBe("Fix bug")
  })

  it("skeleton with count field → N skeleton elements", () => {
    const { element } = render(makeNode("skeleton", "", { fields: ["3"] }))
    const skels = element.querySelectorAll("wa-skeleton")
    expect(skels).toHaveLength(3)
  })

  it("skeleton default count → 1 element", () => {
    const { element } = render(makeNode("skeleton"))
    const skels = element.querySelectorAll("wa-skeleton")
    expect(skels).toHaveLength(1)
  })

  it("pagination with total/current fields → page buttons", () => {
    const { element } = render(makeNode("pagination", "", { fields: ["5", "2"] }))
    const buttons = element.querySelectorAll("button.wt-page-btn")
    // prev + 5 pages + next = 7
    expect(buttons).toHaveLength(7)
    // Current page button
    const currentBtn = [...buttons].find(b => (b as HTMLElement).getAttribute("aria-current") === "true")
    expect(currentBtn).not.toBeNull()
    expect(currentBtn?.textContent).toBe("2")
  })

  it("pagination with no fields → prev/next only", () => {
    const { element } = render(makeNode("pagination"))
    const buttons = element.querySelectorAll("button.wt-page-btn")
    expect(buttons).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// Compounds
// ---------------------------------------------------------------------------
describe("compounds", () => {
  it("login-form → wa-card with email/password inputs", () => {
    const { element } = render(makeNode("login-form", "Acme"))
    expect(element.tagName.toLowerCase()).toBe("wa-card")
    const inputs = element.querySelectorAll("wa-input")
    expect(inputs.length).toBeGreaterThanOrEqual(2)
  })

  it("login-form with unknown slot → warning emitted", () => {
    const node = makeNode("login-form", "Test")
    node.slots.set("bogus", [{ name: "bogus", text: "x", fields: [], icon: null, modifiers: [], transition: null, children: [], cells: null }])
    const { errors } = render(node)
    expect(errors.some(e => e.severity === "warn" && e.message.includes("bogus"))).toBe(true)
  })

  it("pricing-table with .plan slots → plan cards", () => {
    const node = makeNode("pricing-table")
    node.slots.set("plan", [
      { name: "plan", text: "Starter", fields: ["$9/mo"],  icon: null, modifiers: [],                    transition: null, children: [], cells: null },
      { name: "plan", text: "Pro",     fields: ["$29/mo"], icon: null, modifiers: [{ type: "active" }],  transition: null, children: [], cells: null },
    ])
    const { element } = render(node)
    expect(element.className).toBe("wt-pricing-table")
    const plans = element.querySelectorAll(".wt-plan")
    expect(plans).toHaveLength(2)
    // Active/highlighted plan should have the highlighted class
    const highlighted = element.querySelector(".wt-plan-highlighted")
    expect(highlighted).not.toBeNull()
  })

  it("empty-state with .action slot → button with transition", () => {
    const trans: Transition = { type: "screen", target: "new-project" }
    const node = makeNode("empty-state", "No projects yet")
    node.slots.set("action", [
      { name: "action", text: "Create project", fields: [], icon: null, modifiers: [], transition: trans, children: [], cells: null },
    ])
    const { element } = render(node)
    expect(element.className).toBe("wt-empty-state")
    const btn = element.querySelector("wa-button")
    expect(btn).not.toBeNull()
    expect(btn?.textContent).toBe("Create project")
    // Transition should be wired up
    expect(btn?.dataset["wtTransition"]).toContain("new-project")
  })

  it("data-table with .columns, .row, .actions", () => {
    const node = makeNode("data-table")
    node.slots.set("columns", [
      { name: "columns", text: "Name, Status, Date", fields: [], icon: null, modifiers: [], transition: null, children: [], cells: null },
    ])
    node.slots.set("row", [
      {
        name: "row", text: "", fields: [], icon: null, modifiers: [], transition: null, children: [],
        cells: [
          makeNode("text", "Acme Corp"),
          makeNode("text", "Active"),
          makeNode("text", "Mar 12"),
        ],
      },
    ])
    node.slots.set("actions", [
      {
        name: "actions", text: "", fields: [], icon: null, modifiers: [], transition: null,
        children: [makeNode("button", "Edit")],
        cells: null,
      },
    ])
    const { element } = render(node)
    const table = element.querySelector("table.wt-data-table")
    expect(table).not.toBeNull()
    const ths = table?.querySelectorAll("th")
    expect(ths?.length).toBeGreaterThanOrEqual(3)
    const tds = table?.querySelectorAll("tbody td")
    expect(tds).not.toBeNull()
  })

  it("data-table .row with * modifier on cell → wa-badge", () => {
    const node = makeNode("data-table")
    node.slots.set("columns", [
      { name: "columns", text: "Name, Status", fields: [], icon: null, modifiers: [], transition: null, children: [], cells: null },
    ])
    node.slots.set("row", [
      {
        name: "row", text: "", fields: [], icon: null, modifiers: [], transition: null, children: [],
        cells: [
          makeNode("text", "Acme Corp"),
          makeNode("text", "Active", { modifiers: [{ type: "active" }] }),
        ],
      },
    ])
    const { element } = render(node)
    const badge = element.querySelector("wa-badge")
    expect(badge).not.toBeNull()
    expect(badge?.textContent).toBe("Active")
  })

  it("data-table .row first cell with transition → rendered as link", () => {
    const trans: Transition = { type: "screen", target: "detail" }
    const node = makeNode("data-table")
    node.slots.set("columns", [
      { name: "columns", text: "Name, Status", fields: [], icon: null, modifiers: [], transition: null, children: [], cells: null },
    ])
    node.slots.set("row", [
      {
        name: "row", text: "", fields: [], icon: null, modifiers: [], transition: null, children: [],
        cells: [
          makeNode("text", "Acme Corp", { transition: trans }),
          makeNode("text", "Active"),
        ],
      },
    ])
    const { element } = render(node)
    const link = element.querySelector("tbody td a")
    expect(link).not.toBeNull()
    expect(link?.textContent).toBe("Acme Corp")
  })

  it("data-table with .empty slot and no .row → shows empty state", () => {
    const node = makeNode("data-table")
    node.slots.set("columns", [
      { name: "columns", text: "Name", fields: [], icon: null, modifiers: [], transition: null, children: [], cells: null },
    ])
    node.slots.set("empty", [
      { name: "empty", text: "No records found", fields: [], icon: null, modifiers: [], transition: null, children: [], cells: null },
    ])
    const { element } = render(node)
    const td = element.querySelector("tbody td")
    expect(td?.textContent).toBe("No records found")
  })

  it("data-table with .row and .empty → rows shown (empty hidden)", () => {
    const node = makeNode("data-table")
    node.slots.set("columns", [
      { name: "columns", text: "Name", fields: [], icon: null, modifiers: [], transition: null, children: [], cells: null },
    ])
    node.slots.set("row", [
      { name: "row", text: "", fields: [], icon: null, modifiers: [], transition: null, children: [], cells: [makeNode("text", "Acme")] },
    ])
    node.slots.set("empty", [
      { name: "empty", text: "No records found", fields: [], icon: null, modifiers: [], transition: null, children: [], cells: null },
    ])
    const { element } = render(node)
    const rows = element.querySelectorAll("tbody tr")
    // Should have 1 data row (not empty state row)
    expect(rows).toHaveLength(1)
    const firstTd = rows[0]?.querySelector("td")
    expect(firstTd?.textContent).toBe("Acme")
  })
})
