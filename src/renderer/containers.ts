// Container component renderers (task-045) — 8 container components
// card, modal, drawer, alert, toast, tooltip, callout, details
import { COMPONENT_REGISTRY, renderComponent } from "./registry.js"
import type { ComponentNode, ParseError } from "../types.js"
import type { RenderContext, RenderResult } from "./registry.js"
import { renderChildren, resolveVariant, createIcon } from "./utils.js"

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
    header.style.cssText = "font-weight: 600; font-size: 1rem; display: inline-flex; align-items: center; gap: 0.5rem;"
    if (node.icon) {
      const iconEl = createIcon(node.icon)
      iconEl.style.cssText = "color: var(--wiretext-color-primary, #2563EB); font-size: 1.125rem;"
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
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("drawer", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const errors: ParseError[] = []
  const el = document.createElement("wa-drawer")

  if (node.text) el.setAttribute("label", node.text)
  // Placement defaults to end (right side) — standard drawer behaviour
  el.setAttribute("placement", "end")
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
