// Navigation component renderers (task-044) — 6 navigation components
// logo, nav, tabs, breadcrumb, hamburger, tree
import { COMPONENT_REGISTRY } from "./registry.js"
import type { ComponentNode } from "../types.js"
import type { RenderContext, RenderResult } from "./registry.js"
import { createIcon, applyTransition, getBadgeCount, isActive, el } from "./utils.js"

// Extra CSS for new navigation components (stepper, filter-bar, bottom-nav).
// Imported by zone-layout.ts to include in WIRETEXT_CSS.
export const NAV_EXTRA_CSS = `
.wt-stepper { display: flex; align-items: flex-start; }
.wt-stepper-step { display: flex; align-items: flex-start; flex: 1; }
.wt-stepper-step:last-child { flex: 0; }
.wt-stepper-step-inner { display: flex; flex-direction: column; align-items: center; }
.wt-stepper-circle { width: 2rem; height: 2rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; border: 2px solid var(--wiretext-color-border, #E5E7EB); background: var(--wiretext-color-surface, #fff); color: var(--wiretext-color-muted, #6B7280); flex-shrink: 0; }
.wt-stepper-circle.wt-step-completed { background: var(--wiretext-color-primary, #2563EB); border-color: var(--wiretext-color-primary, #2563EB); color: #fff; }
.wt-stepper-circle.wt-step-active { background: var(--wiretext-color-primary, #2563EB); border-color: var(--wiretext-color-primary, #2563EB); color: #fff; }
.wt-stepper-label { font-size: 0.75rem; font-weight: 500; color: var(--wiretext-color-muted, #6B7280); margin-top: 0.375rem; white-space: nowrap; }
.wt-stepper-label.wt-step-active { color: var(--wiretext-color-primary, #2563EB); font-weight: 600; }
.wt-stepper-label.wt-step-completed { color: var(--wiretext-color-text, #111827); }
.wt-stepper-connector { flex: 1; height: 2px; background: var(--wiretext-color-border, #E5E7EB); margin: 1rem 0.25rem 0; }
.wt-stepper-connector.wt-step-completed { background: var(--wiretext-color-primary, #2563EB); }
.wt-filter-bar { display: flex; align-items: center; gap: 0.375rem; flex-wrap: wrap; }
.wt-filter-btn { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.375rem 0.75rem; border: 1px solid var(--wiretext-color-border, #E5E7EB); border-radius: 9999px; background: transparent; cursor: pointer; font-size: 0.875rem; color: var(--wiretext-color-text, #111827); transition: all 0.15s; }
.wt-filter-btn:hover { background: var(--wiretext-color-hover, rgba(0,0,0,0.05)); }
.wt-filter-btn.wt-active { background: var(--wiretext-color-primary, #2563EB); border-color: var(--wiretext-color-primary, #2563EB); color: #fff; }
.wt-bottom-nav { display: flex; align-items: stretch; background: var(--wiretext-color-surface, #fff); border-top: 1px solid var(--wiretext-color-border, #E5E7EB); }
.wt-bottom-nav-item { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.25rem; flex: 1; padding: 0.625rem 0.25rem; text-decoration: none; color: var(--wiretext-color-muted, #6B7280); font-size: 0.6875rem; cursor: pointer; position: relative; }
.wt-bottom-nav-item[aria-current="page"] { color: var(--wiretext-color-primary, #2563EB); }
.wt-bottom-nav-item-icon { position: relative; font-size: 1.25rem; }
`

// ---------------------------------------------------------------------------
// logo — <a class="wt-logo"> with optional icon + text
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("logo", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const el = document.createElement("a")
  el.className = "wt-logo"

  applyTransition(el, node.transition)
  if (!node.transition) el.href = "#"

  if (node.icon) {
    el.appendChild(createIcon(node.icon))
  }

  if (node.text) {
    const span = document.createElement("span")
    span.textContent = node.text
    el.appendChild(span)
  }

  return { element: el, errors: [] }
})

// ---------------------------------------------------------------------------
// nav — <nav> containing <a class="wt-nav-item"> per child item
// Items come from node.children (parsed as synthetic "item" nodes)
// * modifier → aria-current="page"
// "---" text → <hr class="wt-nav-divider">
// Items without transition → <span class="wt-nav-label">
// +N badge → <wa-badge> appended
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("nav", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const navEl = document.createElement("nav")
  navEl.className = "wt-nav"

  for (const item of node.children) {
    // Separator
    if (item.text === "---") {
      const hr = document.createElement("hr")
      hr.className = "wt-nav-divider"
      navEl.appendChild(hr)
      continue
    }

    // Non-interactive label (no transition)
    if (!item.transition) {
      const label = document.createElement("span")
      label.className = "wt-nav-label"
      if (item.icon) label.appendChild(createIcon(item.icon))
      const textSpan = document.createElement("span")
      textSpan.textContent = item.text
      label.appendChild(textSpan)
      navEl.appendChild(label)
      continue
    }

    // Interactive nav item
    const a = document.createElement("a")
    a.className = "wt-nav-item"
    applyTransition(a, item.transition)
    a.href = "#"

    if (isActive(item.modifiers)) {
      a.setAttribute("aria-current", "page")
    }

    if (item.icon) {
      a.appendChild(createIcon(item.icon))
    }

    const textSpan = document.createElement("span")
    textSpan.textContent = item.text
    a.appendChild(textSpan)

    // Badge count overlay (+N modifier)
    const badgeCount = getBadgeCount(item.modifiers)
    if (badgeCount !== null) {
      const badge = document.createElement("wa-badge")
      badge.setAttribute("variant", "neutral")
      badge.textContent = String(badgeCount)
      badge.style.cssText = "margin-left: auto;"
      a.appendChild(badge)
    }

    navEl.appendChild(a)
  }

  return { element: navEl, errors: [] }
})

// ---------------------------------------------------------------------------
// tabs — <wa-tab-group> with <wa-tab slot="nav"> per child item
// * modifier → active tab
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("tabs", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const tabGroup = document.createElement("wa-tab-group")

  for (const item of node.children) {
    const tab = document.createElement("wa-tab")
    tab.setAttribute("slot", "nav")

    // Generate a panel name from the text for wa-tab pairing
    const panelName = item.text.toLowerCase().replace(/\s+/g, "-")
    tab.setAttribute("panel", panelName)

    if (isActive(item.modifiers)) {
      tab.setAttribute("active", "")
    }

    if (item.icon) {
      const iconEl = createIcon(item.icon)
      iconEl.setAttribute("slot", "prefix")
      tab.appendChild(iconEl)
    }

    tab.appendChild(document.createTextNode(item.text))
    tabGroup.appendChild(tab)

    // Create an empty tab panel for each tab
    const panel = document.createElement("wa-tab-panel")
    panel.setAttribute("name", panelName)
    tabGroup.appendChild(panel)
  }

  return { element: tabGroup, errors: [] }
})

// ---------------------------------------------------------------------------
// breadcrumb — <wa-breadcrumb> with <wa-breadcrumb-item> per child
// Last item has no link (no transition)
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("breadcrumb", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const breadcrumb = document.createElement("wa-breadcrumb")

  node.children.forEach((item, i) => {
    const crumb = document.createElement("wa-breadcrumb-item")

    // Last item: no transition (current page)
    if (i < node.children.length - 1 && item.transition) {
      applyTransition(crumb, item.transition)
      crumb.setAttribute("href", "#")
    }

    crumb.textContent = item.text
    breadcrumb.appendChild(crumb)
  })

  return { element: breadcrumb, errors: [] }
})

// ---------------------------------------------------------------------------
// hamburger — <wa-icon-button name="list">
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("hamburger", (_node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const el = document.createElement("wa-icon-button")
  el.setAttribute("name", "list")
  el.setAttribute("label", "Menu")
  return { element: el, errors: [] }
})

// ---------------------------------------------------------------------------
// tree — <wa-tree> with recursive <wa-tree-item> children
// * → selected attribute on item
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("tree", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const tree = document.createElement("wa-tree")

  for (const item of node.children) {
    const treeItem = buildTreeItem(item, ctx)
    tree.appendChild(treeItem)
  }

  return { element: tree, errors: [] }
})

/** Recursively build a <wa-tree-item> with nested children. */
function buildTreeItem(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const item = document.createElement("wa-tree-item")

  if (isActive(node.modifiers)) {
    item.setAttribute("selected", "")
  }

  if (node.icon) {
    const iconEl = createIcon(node.icon)
    iconEl.setAttribute("slot", "expand-icon")
    item.appendChild(iconEl)
  }

  item.appendChild(document.createTextNode(node.text))
  applyTransition(item, node.transition)

  // Recursively render child tree items
  for (const child of node.children) {
    item.appendChild(buildTreeItem(child, ctx))
  }

  return item
}

// ---------------------------------------------------------------------------
// stepper — horizontal step indicator
// Items: node.children (parsed in ITEM_MODE from pipes or indented)
// * = active step; steps before active = completed; steps after = upcoming
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("stepper", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const wrapper = el("div", { className: "wt-stepper", role: "list" })

  const items = node.children
  const activeIdx = items.findIndex(item => isActive(item.modifiers))

  items.forEach((item, i) => {
    const isCompleted = activeIdx >= 0 && i < activeIdx
    const isCurrentStep = i === activeIdx

    // Step inner (circle + label)
    const circleClass = `wt-stepper-circle${isCompleted ? " wt-step-completed" : isCurrentStep ? " wt-step-active" : ""}`
    const circleText = isCompleted ? "✓" : String(i + 1)
    const labelClass = `wt-stepper-label${isCurrentStep ? " wt-step-active" : isCompleted ? " wt-step-completed" : ""}`

    const stepInner = el("div", { className: "wt-stepper-step-inner" },
      el("div", { className: circleClass }, circleText),
      el("div", { className: labelClass }, item.text))

    // Connector between steps (not after last step)
    const stepWrapper = el("div", { className: "wt-stepper-step", role: "listitem" }, stepInner)
    if (i < items.length - 1) {
      const connClass = `wt-stepper-connector${isCompleted ? " wt-step-completed" : ""}`
      stepWrapper.appendChild(el("div", { className: connClass }))
    }

    wrapper.appendChild(stepWrapper)
  })

  return { element: wrapper, errors: [] }
})

// ---------------------------------------------------------------------------
// filter-bar — horizontal filter pills
// Items: node.children (ITEM_MODE from pipes)
// * = active/selected filter; +N = item count badge
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("filter-bar", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const el = document.createElement("div")
  el.className = "wt-filter-bar"
  el.setAttribute("role", "group")

  for (const item of node.children) {
    const btn = document.createElement("button")
    btn.className = "wt-filter-btn"
    btn.type = "button"

    if (isActive(item.modifiers)) {
      btn.classList.add("wt-active")
      btn.setAttribute("aria-pressed", "true")
    }

    if (item.icon) {
      btn.appendChild(createIcon(item.icon))
    }

    btn.appendChild(document.createTextNode(item.text))

    const badgeCount = getBadgeCount(item.modifiers)
    if (badgeCount !== null) {
      const badge = document.createElement("wa-badge")
      badge.setAttribute("variant", isActive(item.modifiers) ? "neutral" : "neutral")
      badge.style.cssText = "margin-left: 0.125rem;"
      badge.textContent = String(badgeCount)
      btn.appendChild(badge)
    }

    if (item.transition) applyTransition(btn, item.transition)

    el.appendChild(btn)
  }

  return { element: el, errors: [] }
})

// ---------------------------------------------------------------------------
// bottom-nav — fixed bottom tab bar for mobile
// Items: node.children (ITEM_MODE from pipes)
// * = active tab; +N = badge count; ~icon = tab icon
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("bottom-nav", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const navEl = el("nav", { className: "wt-bottom-nav", role: "tablist" })

  for (const item of node.children) {
    const a = el("a", { className: "wt-bottom-nav-item", href: "#", role: "tab" })

    if (isActive(item.modifiers)) {
      a.setAttribute("aria-current", "page")
      a.setAttribute("aria-selected", "true")
    }

    if (item.transition) applyTransition(a, item.transition)

    // Icon with optional badge
    const iconWrap = el("div", { className: "wt-bottom-nav-item-icon" },
      ...(item.icon ? [createIcon(item.icon)] : []))

    const badgeCount = getBadgeCount(item.modifiers)
    if (badgeCount !== null) {
      iconWrap.appendChild(el("wa-badge", {
        variant: "danger", pill: "",
        style: "position: absolute; top: -0.375rem; right: -0.5rem; font-size: 0.625rem;"
      }, String(badgeCount)))
    }

    a.appendChild(iconWrap)
    a.appendChild(el("span", null, item.text))

    navEl.appendChild(a)
  }

  return { element: navEl, errors: [] }
})
