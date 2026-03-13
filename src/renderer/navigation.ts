// Navigation component renderers (task-044) — 6 navigation components
// logo, nav, tabs, breadcrumb, hamburger, tree
import { COMPONENT_REGISTRY } from "./registry.js"
import type { ComponentNode } from "../types.js"
import type { RenderContext, RenderResult } from "./registry.js"
import { createIcon, applyTransition, getBadgeCount, isActive } from "./utils.js"

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
