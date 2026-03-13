// Form component renderers (task-042) — 10 form components
// input, select, checkbox, radio, toggle, textarea, datepicker, search, slider, rating
import { COMPONENT_REGISTRY } from "./registry.js"
import type { ComponentNode } from "../types.js"
import type { RenderContext, RenderResult } from "./registry.js"
import { createIcon, isActive, isPrimary } from "./utils.js"

// ---------------------------------------------------------------------------
// input — <wa-input> with label, placeholder, type=password when *
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("input", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const el = document.createElement("wa-input")

  if (node.text) el.setAttribute("label", node.text)
  if (node.fields[0]) el.setAttribute("placeholder", node.fields[0])

  // * modifier → password type
  if (isActive(node.modifiers)) {
    el.setAttribute("type", "password")
  }

  return { element: el, errors: [] }
})

// ---------------------------------------------------------------------------
// select — <wa-select> with <wa-option> per CSV item in fields[0]
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("select", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const el = document.createElement("wa-select")

  if (node.text) el.setAttribute("label", node.text)

  // Parse comma-separated options from fields[0]
  const optionsRaw = node.fields[0] ?? ""
  const options = optionsRaw.split(",").map(o => o.trim()).filter(Boolean)

  for (const opt of options) {
    const optEl = document.createElement("wa-option")
    optEl.setAttribute("value", opt.toLowerCase().replace(/\s+/g, "-"))
    optEl.textContent = opt
    el.appendChild(optEl)
  }

  return { element: el, errors: [] }
})

// ---------------------------------------------------------------------------
// checkbox — <wa-checkbox>; checked when * modifier
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("checkbox", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const el = document.createElement("wa-checkbox")
  el.textContent = node.text

  if (isActive(node.modifiers)) {
    el.setAttribute("checked", "")
  }

  return { element: el, errors: [] }
})

// ---------------------------------------------------------------------------
// radio — <wa-radio-group> with label + <wa-radio> per CSV option
// * modifier → first option pre-selected
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("radio", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const group = document.createElement("wa-radio-group")

  if (node.text) group.setAttribute("label", node.text)

  const optionsRaw = node.fields[0] ?? ""
  const options = optionsRaw.split(",").map(o => o.trim()).filter(Boolean)
  const preSelect = isActive(node.modifiers)

  options.forEach((opt, i) => {
    const radio = document.createElement("wa-radio")
    radio.setAttribute("value", opt.toLowerCase().replace(/\s+/g, "-"))
    radio.textContent = opt
    // * on the group pre-selects the first option
    if (preSelect && i === 0) {
      radio.setAttribute("checked", "")
    }
    group.appendChild(radio)
  })

  return { element: group, errors: [] }
})

// ---------------------------------------------------------------------------
// toggle — <wa-switch>; checked when * modifier
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("toggle", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const el = document.createElement("wa-switch")
  el.textContent = node.text

  if (isActive(node.modifiers)) {
    el.setAttribute("checked", "")
  }

  return { element: el, errors: [] }
})

// ---------------------------------------------------------------------------
// textarea — <wa-textarea> with label, placeholder from fields[0]
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("textarea", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const el = document.createElement("wa-textarea")

  if (node.text) el.setAttribute("label", node.text)
  if (node.fields[0]) el.setAttribute("placeholder", node.fields[0])

  return { element: el, errors: [] }
})

// ---------------------------------------------------------------------------
// datepicker — <wa-input type="date"> with label
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("datepicker", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const el = document.createElement("wa-input")
  el.setAttribute("type", "date")

  if (node.text) el.setAttribute("label", node.text)

  return { element: el, errors: [] }
})

// ---------------------------------------------------------------------------
// search — <wa-input type="search"> with placeholder; prepend magnifying-glass icon
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("search", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const el = document.createElement("wa-input")
  el.setAttribute("type", "search")

  // Primary text is the placeholder for search (no label, per spec)
  if (node.text) el.setAttribute("placeholder", node.text)

  // Prepend magnifying glass icon in the prefix slot
  const iconEl = createIcon("magnifying-glass")
  iconEl.setAttribute("slot", "prefix")
  el.appendChild(iconEl)

  return { element: el, errors: [] }
})

// ---------------------------------------------------------------------------
// slider — <wa-range> with label; fields[0] = "min, max"
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("slider", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const el = document.createElement("wa-range")

  if (node.text) el.setAttribute("label", node.text)

  const rangeRaw = node.fields[0] ?? ""
  const parts = rangeRaw.split(",").map(p => p.trim())
  if (parts[0]) el.setAttribute("min", parts[0])
  if (parts[1]) el.setAttribute("max", parts[1])

  return { element: el, errors: [] }
})

// ---------------------------------------------------------------------------
// rating — <wa-rating> with label shown above
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("rating", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const wrapper = document.createElement("div")
  wrapper.className = "wt-rating-wrapper"
  wrapper.style.cssText = "display: flex; flex-direction: column; gap: 0.25rem;"

  if (node.text) {
    const label = document.createElement("label")
    label.textContent = node.text
    label.style.cssText = "font-size: 0.875rem; font-weight: 500; color: var(--wiretext-color-text, #111827);"
    wrapper.appendChild(label)
  }

  const rating = document.createElement("wa-rating")
  if (node.fields[0]) {
    rating.setAttribute("value", node.fields[0])
  }
  wrapper.appendChild(rating)

  return { element: wrapper, errors: [] }
})
