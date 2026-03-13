// Primitive component renderers (task-041) — 13 base components
// text, heading, subtext, link, button, badge, avatar, icon, divider, spacer, progress, tag, item
import { COMPONENT_REGISTRY } from "./registry.js"
import type { ComponentNode, ParseError } from "../types.js"
import type { RenderContext, RenderResult } from "./registry.js"
import {
  createIcon,
  applyTransition,
  getBadgeCount,
  isActive,
  isPrimary,
  resolveVariant,
} from "./utils.js"

// ---------------------------------------------------------------------------
// text — <p class="wt-text">
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("text", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const el = document.createElement("p")
  el.className = "wt-text"
  el.textContent = node.text
  return { element: el, errors: [] }
})

// ---------------------------------------------------------------------------
// heading — <h1>-<h6> based on fields[0] level (default h2)
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("heading", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const level = parseInt(node.fields[0] ?? "2", 10)
  const safeLevel = isNaN(level) || level < 1 || level > 6 ? 2 : level
  const el = document.createElement(`h${safeLevel}`)
  el.textContent = node.text
  return { element: el, errors: [] }
})

// ---------------------------------------------------------------------------
// subtext — <p class="wt-subtext"> (smaller, muted)
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("subtext", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const el = document.createElement("p")
  el.className = "wt-subtext"
  el.textContent = node.text
  return { element: el, errors: [] }
})

// ---------------------------------------------------------------------------
// link — <a href="..."> with optional icon; fields[0] is URL
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("link", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const el = document.createElement("a")

  if (node.transition) {
    // Internal navigation via transition system
    applyTransition(el, node.transition)
    el.href = "#"
  } else if (node.fields[0]) {
    el.href = node.fields[0]
    el.target = "_blank"
    el.rel = "noopener noreferrer"
  }

  if (node.icon) {
    el.appendChild(createIcon(node.icon))
    if (node.text) {
      const span = document.createElement("span")
      span.textContent = node.text
      el.appendChild(span)
    }
  } else {
    el.textContent = node.text
  }

  return { element: el, errors: [] }
})

// ---------------------------------------------------------------------------
// button — <wa-button>; variant=primary when +; icon when ~name
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("button", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const el = document.createElement("wa-button")

  if (isPrimary(node.modifiers)) {
    el.setAttribute("variant", "primary")
  }

  if (node.icon) {
    const iconEl = createIcon(node.icon)
    // Use a named slot for the icon prefix
    iconEl.setAttribute("slot", "prefix")
    el.appendChild(iconEl)
  }

  if (node.text) {
    // Use a text node so we don't overwrite the icon child via textContent
    el.appendChild(document.createTextNode(node.text))
  }

  applyTransition(el, node.transition)

  // Badge count on button — append a badge element
  const badgeCount = getBadgeCount(node.modifiers)
  if (badgeCount !== null) {
    const badge = document.createElement("wa-badge")
    badge.setAttribute("slot", "suffix")
    badge.textContent = String(badgeCount)
    el.appendChild(badge)
  }

  return { element: el, errors: [] }
})

// ---------------------------------------------------------------------------
// badge — <wa-badge> with variant from fields[0]
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("badge", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const { variant, error } = resolveVariant(node.fields[0], ctx.blockPosition)
  const errors: ParseError[] = error ? [error] : []

  const el = document.createElement("wa-badge")
  el.setAttribute("variant", variant)
  el.textContent = node.text

  return { element: el, errors }
})

// ---------------------------------------------------------------------------
// avatar — <wa-avatar> with initials; optional image URL in fields[0]
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("avatar", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const el = document.createElement("wa-avatar")

  if (node.fields[0]) {
    // Image URL provided
    el.setAttribute("src", node.fields[0])
    el.setAttribute("alt", node.text)
  } else {
    // Derive initials from the name
    const initials = node.text
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0]?.toUpperCase() ?? "")
      .join("")
    el.setAttribute("initials", initials)
    el.setAttribute("label", node.text)
  }

  // Trailing icon (e.g. ~caret-down for dropdown trigger)
  if (node.icon) {
    const wrapper = document.createElement("span")
    wrapper.style.cssText = "display: inline-flex; align-items: center; gap: 0.25rem;"
    wrapper.appendChild(el)
    const iconEl = createIcon(node.icon)
    iconEl.style.fontSize = "0.75rem"
    wrapper.appendChild(iconEl)
    return { element: wrapper, errors: [] }
  }

  return { element: el, errors: [] }
})

// ---------------------------------------------------------------------------
// icon — <ph-{name}> Phosphor icon
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("icon", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  // Icon name comes from node.icon (~name) or node.text as fallback
  const name = node.icon ?? node.text
  const el = createIcon(name)
  return { element: el, errors: [] }
})

// ---------------------------------------------------------------------------
// divider — <wa-divider>
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("divider", (_node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const el = document.createElement("wa-divider")
  return { element: el, errors: [] }
})

// ---------------------------------------------------------------------------
// spacer — <div class="wt-spacer"> with configurable height
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("spacer", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const el = document.createElement("div")
  el.className = "wt-spacer"
  // Optional size override from fields[0] (e.g. "2rem" or "sm/md/lg")
  const sizeMap: Record<string, string> = { sm: "0.75rem", md: "1.5rem", lg: "3rem" }
  const rawSize = node.fields[0] ?? node.text
  const height = sizeMap[rawSize] ?? rawSize ?? "1.5rem"
  el.style.height = height
  return { element: el, errors: [] }
})

// ---------------------------------------------------------------------------
// progress — <wa-progress-bar> value as percentage
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("progress", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const el = document.createElement("wa-progress-bar")

  if (node.fields.length >= 2) {
    // Two fields: current / total
    const current = parseFloat(node.fields[0] ?? "0")
    const total   = parseFloat(node.fields[1] ?? "100")
    const pct     = total > 0 ? Math.round((current / total) * 100) : 0
    el.setAttribute("value", String(pct))
  } else if (node.fields[0]) {
    // Single field: treat as raw percentage
    el.setAttribute("value", node.fields[0])
  } else {
    el.setAttribute("value", "0")
  }

  if (node.text) {
    el.setAttribute("label", node.text)
  }

  return { element: el, errors: [] }
})

// ---------------------------------------------------------------------------
// tag — <wa-tag> with variant from fields[0]
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("tag", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const { variant, error } = resolveVariant(node.fields[0], ctx.blockPosition)
  const errors: ParseError[] = error ? [error] : []

  const el = document.createElement("wa-tag")
  el.setAttribute("variant", variant)
  el.textContent = node.text

  return { element: el, errors }
})

// ---------------------------------------------------------------------------
// item — context-dependent: tree-item, kanban-card, or feed-item
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("item", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const parent = ctx.parentComponentType

  if (parent === "tree") {
    const el = document.createElement("wa-tree-item")
    el.textContent = node.text
    if (isActive(node.modifiers)) el.setAttribute("selected", "")
    applyTransition(el, node.transition)
    // Render nested items (tree supports recursion)
    for (const child of node.children) {
      const childResult = COMPONENT_REGISTRY.get("item")?.(child, {
        ...ctx,
        parentComponentType: "tree",
      })
      if (childResult) el.appendChild(childResult.element)
    }
    return { element: el, errors: [] }
  }

  if (parent === "kanban") {
    const el = document.createElement("div")
    el.className = "wt-kanban-card"
    el.textContent = node.text
    return { element: el, errors: [] }
  }

  if (parent === "feed") {
    const li = document.createElement("li")
    li.className = "wt-feed-item"
    const content = document.createElement("div")
    content.className = "wt-feed-item-content"
    content.textContent = node.text
    li.appendChild(content)
    return { element: li, errors: [] }
  }

  // Generic fallback
  const el = document.createElement("div")
  el.className = "wt-item"
  el.textContent = node.text
  return { element: el, errors: [] }
})
