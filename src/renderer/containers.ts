// Container component renderers (task-045) — 8 container components
// card, modal, drawer, alert, toast, tooltip, callout, details
import { COMPONENT_REGISTRY } from "./registry.js"
import type { ComponentNode, ParseError } from "../types.js"
import type { RenderContext, RenderResult } from "./registry.js"
import { renderChildren, resolveVariant, createIcon, el } from "./utils.js"

export const CONTAINERS_EXTRA_CSS = `
.wt-action-sheet-wrap { display: flex; align-items: flex-end; background: rgba(0,0,0,0.3); border-radius: var(--wiretext-radius, 6px); overflow: hidden; }
.wt-action-sheet { background: var(--wiretext-color-surface, #fff); border-radius: 1rem 1rem 0 0; padding: 1.25rem 1rem 1.5rem; width: 100%; display: flex; flex-direction: column; gap: 0.5rem; }
.wt-action-sheet-handle { width: 2.5rem; height: 4px; background: var(--wiretext-color-border, #E5E7EB); border-radius: 2px; margin: 0 auto 0.75rem; }
.wt-action-sheet-title { font-weight: 600; font-size: 0.875rem; color: var(--wiretext-color-muted, #6B7280); text-align: center; padding-bottom: 0.75rem; border-bottom: 1px solid var(--wiretext-color-border, #E5E7EB); margin-bottom: 0.25rem; }
`

// ---------------------------------------------------------------------------
// card — <wa-card> with header slot for title, children in default slot
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("card", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const errors: ParseError[] = []
  const el = document.createElement("wa-card")

  // Card title in the header slot, with optional icon
  if (node.text || node.icon) {
    const header = document.createElement("span")
    header.setAttribute("slot", "header")
    header.className = "wt-card-header"
    if (node.icon) {
      const iconEl = createIcon(node.icon)
      iconEl.className = "wt-card-header-icon"
      header.appendChild(iconEl)
    }
    if (node.text) {
      header.appendChild(document.createTextNode(node.text))
    }
    el.appendChild(header)
  }

  // Render children into card body
  renderChildren(node, el, ctx, errors)

  return { element: el, errors }
})

// ---------------------------------------------------------------------------
// modal — <wa-dialog> hidden by default; shown via overlay system
// No `open` attribute — the interaction system adds it on transition trigger.
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("modal", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const errors: ParseError[] = []
  const el = document.createElement("wa-dialog")

  if (node.text) el.setAttribute("label", node.text)
  // Hidden by default — per spec: no `open` attribute

  renderChildren(node, el, ctx, errors)

  return { element: el, errors }
})

// ---------------------------------------------------------------------------
// drawer — <wa-drawer> hidden by default
// fields[0] = "left" | "right" (default "right")
// Left drawers use placement="start", right drawers use placement="end".
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("drawer", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const errors: ParseError[] = []
  const el = document.createElement("wa-drawer")

  if (node.text) el.setAttribute("label", node.text)

  // Determine placement from fields[0]: "left" → start, "right" or default → end
  const side = (node.fields[0] ?? "").toLowerCase().trim()
  if (side === "left" || side === "start") {
    el.setAttribute("placement", "start")
    el.setAttribute("data-wt-drawer-side", "left")
  } else {
    el.setAttribute("placement", "end")
    el.setAttribute("data-wt-drawer-side", "right")
  }
  // Hidden by default — no `open` attribute

  renderChildren(node, el, ctx, errors)

  return { element: el, errors }
})

// ---------------------------------------------------------------------------
// alert — <wa-alert> with variant from fields[0]
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("alert", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const errors: ParseError[] = []
  const { variant, error } = resolveVariant(node.fields[0], ctx.blockPosition)
  if (error) errors.push(error)

  const el = document.createElement("wa-alert")
  el.setAttribute("variant", variant)
  el.setAttribute("open", "")

  if (node.text) {
    const msg = document.createElement("span")
    msg.textContent = node.text
    el.appendChild(msg)
  }

  renderChildren(node, el, ctx, errors)

  return { element: el, errors }
})

// ---------------------------------------------------------------------------
// toast — <wa-alert class="wt-toast"> fixed position at bottom
// Same variant handling as alert, but positioned as a toast notification.
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("toast", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const errors: ParseError[] = []
  const { variant, error } = resolveVariant(node.fields[0], ctx.blockPosition)
  if (error) errors.push(error)

  const el = document.createElement("wa-alert")
  el.className = "wt-toast"
  el.setAttribute("variant", variant)
  el.setAttribute("open", "")
  // Toast positioning — fixed bottom-right, like a notification
  el.style.cssText = "position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 9999; min-width: 280px; max-width: 400px;"

  if (node.text) {
    const msg = document.createElement("span")
    msg.textContent = node.text
    el.appendChild(msg)
  }

  renderChildren(node, el, ctx, errors)

  return { element: el, errors }
})

// ---------------------------------------------------------------------------
// tooltip — <wa-tooltip> with content attribute; children in trigger slot
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("tooltip", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const errors: ParseError[] = []
  const el = document.createElement("wa-tooltip")

  el.setAttribute("content", node.text)

  // Children are the trigger content
  renderChildren(node, el, ctx, errors)

  return { element: el, errors }
})

// ---------------------------------------------------------------------------
// callout — <wa-alert> full-width banner style
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("callout", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const errors: ParseError[] = []
  const { variant, error } = resolveVariant(node.fields[0], ctx.blockPosition)
  if (error) errors.push(error)

  const el = document.createElement("wa-alert")
  el.setAttribute("variant", variant)
  el.setAttribute("open", "")
  // Banner style — full width
  el.style.cssText = "width: 100%; border-radius: 0; border-left: none; border-right: none;"

  if (node.text) {
    const msg = document.createElement("span")
    msg.textContent = node.text
    el.appendChild(msg)
  }

  renderChildren(node, el, ctx, errors)

  return { element: el, errors }
})

// ---------------------------------------------------------------------------
// details — <wa-details> with summary attribute, children inside
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("details", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const errors: ParseError[] = []
  const el = document.createElement("wa-details")

  if (node.text) el.setAttribute("summary", node.text)

  renderChildren(node, el, ctx, errors)

  return { element: el, errors }
})

// ---------------------------------------------------------------------------
// action-sheet — mobile bottom sheet with button list
// text = optional title; children = button nodes
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("action-sheet", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const errors: ParseError[] = []

  const wrap = el("div", { className: "wt-action-sheet-wrap" })
  const sheet = el("div", { className: "wt-action-sheet" },
    el("div", { className: "wt-action-sheet-handle" }),
    ...(node.text ? [el("div", { className: "wt-action-sheet-title" }, node.text)] : []))

  // Render children (buttons, links, etc.)
  for (const child of node.children) {
    const childCtx: RenderContext = { ...ctx, parentComponentType: "action-sheet" }
    const renderer = COMPONENT_REGISTRY.get(child.type)
    if (renderer) {
      const result = renderer(child, childCtx)
      errors.push(...result.errors)
      // Make buttons full-width
      result.element.style.cssText = (result.element.style.cssText || "") + "width: 100%;"
      sheet.appendChild(result.element)
    }
  }

  wrap.appendChild(sheet)
  return { element: wrap, errors }
})
