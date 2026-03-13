// Compound component renderers (task-046, task-047) — 8 compound components
// login-form, signup-form, pricing-table, empty-state, user-menu,
// data-table, settings-form, file-upload
import { COMPONENT_REGISTRY } from "./registry.js"
import type { ComponentNode, ParseError, SlotNode } from "../types.js"
import type { RenderContext, RenderResult } from "./registry.js"
import { createIcon, applyTransition, isActive, isPrimary } from "./utils.js"

// Extra CSS for new compound components.
// Imported by zone-layout.ts for inclusion in WIRETEXT_CSS.
export const COMPOUNDS_EXTRA_CSS = `
.wt-hero { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 4rem 2rem; gap: 1.25rem; }
.wt-hero-eyebrow { font-size: 0.875rem; font-weight: 600; color: var(--wiretext-color-primary, #2563EB); text-transform: uppercase; letter-spacing: 0.1em; }
.wt-hero-heading { font-size: 2.5rem; font-weight: 700; color: var(--wiretext-color-text, #111827); line-height: 1.15; letter-spacing: -0.02em; max-width: 700px; margin: 0; }
.wt-hero-subtext { font-size: 1.125rem; color: var(--wiretext-color-muted, #6B7280); max-width: 560px; margin: 0; line-height: 1.6; }
.wt-hero-actions { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; justify-content: center; margin-top: 0.5rem; }
.wt-hero-visual { margin-top: 1rem; width: 100%; max-width: 640px; min-height: 200px; background: var(--wiretext-color-bg, #f9fafb); border: 2px dashed var(--wiretext-color-border, #E5E7EB); border-radius: var(--wiretext-radius, 6px); display: flex; align-items: center; justify-content: center; color: var(--wiretext-color-muted, #6B7280); font-size: 3rem; }
.wt-testimonial-grid { display: flex; gap: 1rem; flex-wrap: wrap; }
.wt-testimonial-card { flex: 1; min-width: 220px; background: var(--wiretext-color-surface, #fff); border: 1px solid var(--wiretext-color-border, #E5E7EB); border-radius: var(--wiretext-radius, 6px); padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
.wt-testimonial-quote-text { font-size: 0.9375rem; color: var(--wiretext-color-text, #111827); line-height: 1.6; flex: 1; position: relative; padding-left: 1rem; }
.wt-testimonial-quote-text::before { content: '"'; position: absolute; left: 0; top: -0.25rem; font-size: 1.5rem; color: var(--wiretext-color-primary, #2563EB); line-height: 1; }
.wt-testimonial-author { display: flex; align-items: center; gap: 0.625rem; }
.wt-testimonial-avatar { width: 2rem; height: 2rem; border-radius: 50%; background: color-mix(in srgb, var(--wiretext-color-primary, #2563EB) 15%, transparent); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; color: var(--wiretext-color-primary, #2563EB); flex-shrink: 0; }
.wt-testimonial-name { font-weight: 600; font-size: 0.875rem; color: var(--wiretext-color-text, #111827); }
.wt-testimonial-job { font-size: 0.75rem; color: var(--wiretext-color-muted, #6B7280); }
.wt-feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.25rem; }
.wt-feature-card { display: flex; flex-direction: column; gap: 0.625rem; padding: 1.25rem; background: var(--wiretext-color-surface, #fff); border: 1px solid var(--wiretext-color-border, #E5E7EB); border-radius: var(--wiretext-radius, 6px); }
.wt-feature-icon { font-size: 1.5rem; color: var(--wiretext-color-primary, #2563EB); }
.wt-feature-title { font-weight: 600; font-size: 0.9375rem; color: var(--wiretext-color-text, #111827); }
.wt-feature-desc { font-size: 0.875rem; color: var(--wiretext-color-muted, #6B7280); line-height: 1.5; margin: 0; }
.wt-logo-cloud { display: flex; flex-direction: column; align-items: center; gap: 1.25rem; padding: 2rem 1rem; }
.wt-logo-cloud-label { font-size: 0.875rem; color: var(--wiretext-color-muted, #6B7280); font-weight: 500; text-align: center; }
.wt-logo-cloud-row { display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap; justify-content: center; }
.wt-logo-pill { display: inline-flex; align-items: center; justify-content: center; padding: 0.5rem 1.25rem; border: 1px solid var(--wiretext-color-border, #E5E7EB); border-radius: var(--wiretext-radius, 6px); font-size: 0.875rem; font-weight: 600; color: var(--wiretext-color-muted, #6B7280); background: var(--wiretext-color-surface, #fff); }
.wt-onboarding-checklist { display: flex; flex-direction: column; gap: 0; }
.wt-checklist-title { font-weight: 700; font-size: 1rem; color: var(--wiretext-color-text, #111827); margin: 0 0 0.75rem; }
.wt-checklist-item { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem 0; border-bottom: 1px solid var(--wiretext-color-border, #E5E7EB); }
.wt-checklist-item:last-child { border-bottom: none; }
.wt-checklist-check { width: 1.25rem; height: 1.25rem; border-radius: 50%; border: 2px solid var(--wiretext-color-border, #E5E7EB); background: transparent; flex-shrink: 0; margin-top: 0.1rem; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; }
.wt-checklist-check.wt-done { background: var(--wiretext-color-primary, #2563EB); border-color: var(--wiretext-color-primary, #2563EB); color: #fff; }
.wt-checklist-item-title { font-weight: 500; font-size: 0.875rem; color: var(--wiretext-color-text, #111827); }
.wt-checklist-item-title.wt-done { text-decoration: line-through; color: var(--wiretext-color-muted, #6B7280); }
.wt-checklist-item-desc { font-size: 0.8125rem; color: var(--wiretext-color-muted, #6B7280); margin-top: 0.125rem; }
.wt-command-palette { background: var(--wiretext-color-surface, #fff); border: 1px solid var(--wiretext-color-border, #E5E7EB); border-radius: calc(var(--wiretext-radius, 6px) + 4px); overflow: hidden; max-width: 540px; margin: 0 auto; box-shadow: 0 20px 60px -10px rgba(0,0,0,0.2); }
.wt-command-search { display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem 1rem; border-bottom: 1px solid var(--wiretext-color-border, #E5E7EB); }
.wt-command-search-placeholder { flex: 1; font-size: 0.9375rem; color: var(--wiretext-color-muted, #6B7280); }
.wt-command-results { padding: 0.375rem 0; }
.wt-command-result { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 1rem; cursor: pointer; }
.wt-command-result:hover { background: var(--wiretext-color-hover, rgba(0,0,0,0.05)); }
.wt-command-result-icon { width: 1.5rem; height: 1.5rem; display: flex; align-items: center; justify-content: center; font-size: 1rem; color: var(--wiretext-color-muted, #6B7280); flex-shrink: 0; }
.wt-command-result-body { flex: 1; min-width: 0; }
.wt-command-result-title { font-size: 0.875rem; font-weight: 500; color: var(--wiretext-color-text, #111827); }
.wt-command-result-desc { font-size: 0.75rem; color: var(--wiretext-color-muted, #6B7280); }
.wt-command-footer { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-top: 1px solid var(--wiretext-color-border, #E5E7EB); font-size: 0.75rem; color: var(--wiretext-color-muted, #6B7280); background: var(--wiretext-color-bg, #f9fafb); }
`

// Known slot sets per compound component.
// Any slot name NOT in the set triggers a warning and its content is ignored.
const KNOWN_SLOTS: Record<string, Set<string>> = {
  "login-form":            new Set(["logo", "providers", "footer"]),
  "signup-form":           new Set(["logo", "providers", "fields", "footer"]),
  "pricing-table":         new Set(["plan"]),
  "empty-state":           new Set(["icon", "text", "action"]),
  "user-menu":             new Set(["items"]),
  "data-table":            new Set(["select", "columns", "row", "actions", "bulk-actions", "empty"]),
  "settings-form":         new Set(["section", "action"]),
  "file-upload":           new Set(["accept", "text"]),
  "hero":                  new Set(["eyebrow", "heading", "subtext", "actions", "visual"]),
  "testimonial":           new Set(["quote"]),
  "feature-grid":          new Set(["feature"]),
  "logo-cloud":            new Set(["logo"]),
  "onboarding-checklist":  new Set(["item"]),
  "command-palette":       new Set(["result", "footer"]),
}

/** Warn about and filter unrecognised slots for a compound component. */
function validateSlots(
  node: ComponentNode,
  componentType: string,
  blockPosition: number,
): ParseError[] {
  const known = KNOWN_SLOTS[componentType]
  if (!known) return []
  const errors: ParseError[] = []
  for (const slotName of node.slots.keys()) {
    if (!known.has(slotName)) {
      errors.push({
        severity: "warn",
        message: `Unknown slot ".${slotName}" on ${componentType} — ignored`,
        line: 0,
        blockPosition,
      })
    }
  }
  return errors
}

/** Get the first slot by name, or undefined. */
function slot(node: ComponentNode, name: string): SlotNode | undefined {
  return node.slots.get(name)?.[0]
}

/** Get all slots by name. */
function slots(node: ComponentNode, name: string): SlotNode[] {
  return node.slots.get(name) ?? []
}

// ---------------------------------------------------------------------------
// login-form — <wa-card class="wt-login-form">
// Slots: .logo, .providers, .footer
// Default: email + password inputs + "Sign in" button
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("login-form", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const errors = validateSlots(node, "login-form", ctx.blockPosition)

  const card = document.createElement("wa-card")
  card.className = "wt-login-form"

  // Logo area
  const logoSlot = slot(node, "logo")
  const logoArea = document.createElement("div")
  logoArea.className = "wt-login-logo"
  if (logoSlot) {
    if (logoSlot.icon) logoArea.appendChild(createIcon(logoSlot.icon))
    logoArea.appendChild(document.createTextNode(logoSlot.text))
  } else if (node.text) {
    logoArea.textContent = node.text
  }
  card.appendChild(logoArea)

  // Social providers
  const providerSlots = slots(node, "providers")
  if (providerSlots.length > 0) {
    const providersEl = document.createElement("div")
    providersEl.className = "wt-login-providers"
    for (const p of providerSlots) {
      const btn = document.createElement("wa-button")
      btn.setAttribute("variant", "outline")
      btn.style.cssText = "width: 100%;"
      if (p.icon) {
        const iconEl = createIcon(p.icon)
        iconEl.setAttribute("slot", "prefix")
        btn.appendChild(iconEl)
      }
      btn.appendChild(document.createTextNode(p.text))
      providersEl.appendChild(btn)
    }
    card.appendChild(providersEl)

    // "or" divider
    const divider = document.createElement("div")
    divider.className = "wt-login-divider"
    divider.textContent = "or"
    card.appendChild(divider)
  }

  // Default fields: email + password + submit
  const fields = document.createElement("div")
  fields.className = "wt-login-fields"

  const emailInput = document.createElement("wa-input")
  emailInput.setAttribute("label", "Email")
  emailInput.setAttribute("type", "email")
  emailInput.setAttribute("placeholder", "you@company.com")
  fields.appendChild(emailInput)

  const passwordInput = document.createElement("wa-input")
  passwordInput.setAttribute("label", "Password")
  passwordInput.setAttribute("type", "password")
  passwordInput.setAttribute("placeholder", "••••••••")
  fields.appendChild(passwordInput)

  const submitBtn = document.createElement("wa-button")
  submitBtn.setAttribute("variant", "primary")
  submitBtn.style.cssText = "width: 100%; margin-top: 0.25rem;"
  submitBtn.textContent = "Sign in"
  fields.appendChild(submitBtn)

  card.appendChild(fields)

  // Footer link
  const footerSlot = slot(node, "footer")
  if (footerSlot) {
    const footer = document.createElement("div")
    footer.className = "wt-login-footer"
    const link = document.createElement("a")
    link.href = "#"
    if (footerSlot.transition) applyTransition(link, footerSlot.transition)
    link.textContent = footerSlot.text
    footer.appendChild(link)
    card.appendChild(footer)
  }

  return { element: card, errors }
})

// ---------------------------------------------------------------------------
// signup-form — similar to login-form but with .fields slot for custom fields
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("signup-form", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const errors = validateSlots(node, "signup-form", ctx.blockPosition)

  const card = document.createElement("wa-card")
  card.className = "wt-login-form"

  // Logo area
  const logoSlot = slot(node, "logo")
  const logoArea = document.createElement("div")
  logoArea.className = "wt-login-logo"
  if (logoSlot) {
    if (logoSlot.icon) logoArea.appendChild(createIcon(logoSlot.icon))
    logoArea.appendChild(document.createTextNode(logoSlot.text))
  } else if (node.text) {
    logoArea.textContent = node.text
  }
  card.appendChild(logoArea)

  // Provider buttons
  const providerSlots = slots(node, "providers")
  if (providerSlots.length > 0) {
    const providersEl = document.createElement("div")
    providersEl.className = "wt-login-providers"
    for (const p of providerSlots) {
      const btn = document.createElement("wa-button")
      btn.setAttribute("variant", "outline")
      btn.style.cssText = "width: 100%;"
      if (p.icon) {
        const iconEl = createIcon(p.icon)
        iconEl.setAttribute("slot", "prefix")
        btn.appendChild(iconEl)
      }
      btn.appendChild(document.createTextNode(p.text))
      providersEl.appendChild(btn)
    }
    card.appendChild(providersEl)

    const divider = document.createElement("div")
    divider.className = "wt-login-divider"
    divider.textContent = "or"
    card.appendChild(divider)
  }

  // Custom fields from .fields slot, or defaults
  const fieldsContainer = document.createElement("div")
  fieldsContainer.className = "wt-login-fields"

  const fieldSlots = slots(node, "fields")
  if (fieldSlots.length > 0) {
    for (const f of fieldSlots) {
      const input = document.createElement("wa-input")
      input.setAttribute("label", f.text)
      if (f.fields[0]) input.setAttribute("placeholder", f.fields[0])
      if (isActive(f.modifiers)) input.setAttribute("type", "password")
      fieldsContainer.appendChild(input)
    }
  } else {
    // Default signup fields
    const nameInput = document.createElement("wa-input")
    nameInput.setAttribute("label", "Full name")
    nameInput.setAttribute("placeholder", "Jane Smith")
    fieldsContainer.appendChild(nameInput)

    const emailInput = document.createElement("wa-input")
    emailInput.setAttribute("label", "Email")
    emailInput.setAttribute("type", "email")
    emailInput.setAttribute("placeholder", "jane@company.com")
    fieldsContainer.appendChild(emailInput)

    const passwordInput = document.createElement("wa-input")
    passwordInput.setAttribute("label", "Password")
    passwordInput.setAttribute("type", "password")
    passwordInput.setAttribute("placeholder", "••••••••")
    fieldsContainer.appendChild(passwordInput)
  }

  const submitBtn = document.createElement("wa-button")
  submitBtn.setAttribute("variant", "primary")
  submitBtn.style.cssText = "width: 100%; margin-top: 0.25rem;"
  submitBtn.textContent = "Create account"
  fieldsContainer.appendChild(submitBtn)

  card.appendChild(fieldsContainer)

  // Footer
  const footerSlot = slot(node, "footer")
  if (footerSlot) {
    const footer = document.createElement("div")
    footer.className = "wt-login-footer"
    const link = document.createElement("a")
    link.href = "#"
    if (footerSlot.transition) applyTransition(link, footerSlot.transition)
    link.textContent = footerSlot.text
    footer.appendChild(link)
    card.appendChild(footer)
  }

  return { element: card, errors }
})

// ---------------------------------------------------------------------------
// pricing-table — flex row of <wa-card class="wt-plan"> per .plan slot
// * → highlighted with primary border styling
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("pricing-table", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const errors = validateSlots(node, "pricing-table", ctx.blockPosition)

  const table = document.createElement("div")
  table.className = "wt-pricing-table"

  const planSlots = slots(node, "plan")
  for (const plan of planSlots) {
    const card = document.createElement("wa-card")
    card.className = "wt-plan"

    if (isActive(plan.modifiers)) {
      card.classList.add("wt-plan-highlighted")
      card.style.cssText = "--wa-card-border-width: 2px; --wa-card-border-color: var(--wiretext-color-primary, #2563EB);"
    }

    // Plan title (slot text) and price (fields[0])
    const titleEl = document.createElement("div")
    titleEl.className = "wt-plan-title"
    titleEl.textContent = plan.text
    card.appendChild(titleEl)

    if (plan.fields[0]) {
      const priceEl = document.createElement("div")
      priceEl.className = "wt-plan-price"
      priceEl.textContent = plan.fields[0]
      card.appendChild(priceEl)
    }

    // Additional plan features from children
    for (const child of plan.children) {
      const featureEl = document.createElement("p")
      featureEl.style.cssText = "font-size: 0.875rem; color: var(--wiretext-color-muted, #6B7280); margin: 0.25rem 0;"
      featureEl.textContent = child.text
      card.appendChild(featureEl)
    }

    // CTA button
    const btn = document.createElement("wa-button")
    btn.style.cssText = "width: 100%; margin-top: 0.75rem;"
    if (isActive(plan.modifiers)) btn.setAttribute("variant", "primary")
    btn.textContent = "Get started"
    if (plan.transition) applyTransition(btn, plan.transition)
    card.appendChild(btn)

    table.appendChild(card)
  }

  return { element: table, errors }
})

// ---------------------------------------------------------------------------
// empty-state — centered div with icon, heading, subtext, action button
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("empty-state", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const errors = validateSlots(node, "empty-state", ctx.blockPosition)

  const el = document.createElement("div")
  el.className = "wt-empty-state"

  // Icon — from .icon slot or node.icon
  const iconSlot = slot(node, "icon")
  const iconName = iconSlot?.icon ?? iconSlot?.text ?? node.icon
  if (iconName) {
    const iconEl = createIcon(iconName)
    iconEl.style.cssText = "font-size: 3rem; opacity: 0.3; color: var(--wiretext-color-muted, #6B7280);"
    el.appendChild(iconEl)
  } else {
    // Default empty state icon
    const defaultIcon = document.createElement("span")
    defaultIcon.style.cssText = "font-size: 3rem; opacity: 0.3;"
    defaultIcon.textContent = "📭"
    el.appendChild(defaultIcon)
  }

  // Heading from node.text
  if (node.text) {
    const heading = document.createElement("h3")
    heading.className = "wt-empty-state-heading"
    heading.textContent = node.text
    el.appendChild(heading)
  }

  // Subtext from .text slot
  const textSlot = slot(node, "text")
  if (textSlot) {
    const p = document.createElement("p")
    p.className = "wt-empty-state-text"
    p.textContent = textSlot.text
    el.appendChild(p)
  }

  // Action button from .action slot
  const actionSlot = slot(node, "action")
  if (actionSlot) {
    const btn = document.createElement("wa-button")
    btn.setAttribute("variant", "primary")
    btn.textContent = actionSlot.text
    if (actionSlot.transition) applyTransition(btn, actionSlot.transition)
    el.appendChild(btn)
  }

  return { element: el, errors }
})

// ---------------------------------------------------------------------------
// user-menu — <wa-dropdown> with avatar trigger + menu items from .items slot
// .items slot: comma-separated items; "---" → divider; per-item transitions
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("user-menu", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const errors = validateSlots(node, "user-menu", ctx.blockPosition)

  const dropdown = document.createElement("wa-dropdown")

  // Trigger: avatar with user name initials
  const trigger = document.createElement("wa-avatar")
  trigger.setAttribute("slot", "trigger")
  trigger.className = "wt-user-menu-trigger"
  const initials = node.text.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("")
  trigger.setAttribute("initials", initials)
  trigger.setAttribute("label", node.text)
  dropdown.appendChild(trigger)

  // Menu items from .items slot
  const itemsSlot = slot(node, "items")
  const menu = document.createElement("wa-menu")

  if (itemsSlot) {
    // Items can be in children or as comma-separated text
    if (itemsSlot.children.length > 0) {
      for (const child of itemsSlot.children) {
        if (child.text === "---") {
          const dividerEl = document.createElement("wa-divider")
          menu.appendChild(dividerEl)
        } else {
          const menuItem = document.createElement("wa-menu-item")
          if (child.icon) {
            const iconEl = createIcon(child.icon)
            iconEl.setAttribute("slot", "prefix")
            menuItem.appendChild(iconEl)
          }
          menuItem.appendChild(document.createTextNode(child.text))
          if (child.transition) applyTransition(menuItem, child.transition)
          menu.appendChild(menuItem)
        }
      }
    } else if (itemsSlot.text) {
      // Comma-separated text items
      const parts = itemsSlot.text.split(",").map(p => p.trim())
      for (const part of parts) {
        if (part === "---") {
          const dividerEl = document.createElement("wa-divider")
          menu.appendChild(dividerEl)
        } else {
          const menuItem = document.createElement("wa-menu-item")
          menuItem.textContent = part
          menu.appendChild(menuItem)
        }
      }
    }
  } else {
    // Default menu items
    const defaults = ["Profile", "Settings", "---", "Sign out"]
    for (const d of defaults) {
      if (d === "---") {
        menu.appendChild(document.createElement("wa-divider"))
      } else {
        const item = document.createElement("wa-menu-item")
        item.textContent = d
        menu.appendChild(item)
      }
    }
  }

  dropdown.appendChild(menu)

  return { element: dropdown, errors }
})

// ---------------------------------------------------------------------------
// data-table — <table class="wt-data-table">
// .select → checkbox column
// .columns → <thead> with CSV column names
// .row → <tbody> rows; cells[] provides cell values
//   - cell with * modifier → <wa-badge variant="success">
//   - cell with transition → first cell as <a> link
// .actions → action buttons column per row
// .bulk-actions → toolbar above table
// .empty → shown if no .row slots
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("data-table", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const errors = validateSlots(node, "data-table", ctx.blockPosition)

  const wrapper = document.createElement("div")
  wrapper.className = "wt-data-table-wrapper"

  // Bulk actions toolbar
  const bulkSlot = slot(node, "bulk-actions")
  if (bulkSlot) {
    const toolbar = document.createElement("div")
    toolbar.className = "wt-data-table-toolbar"

    if (bulkSlot.children.length > 0) {
      for (const action of bulkSlot.children) {
        const btn = document.createElement("wa-button")
        btn.setAttribute("size", "small")
        btn.textContent = action.text
        if (action.transition) applyTransition(btn, action.transition)
        toolbar.appendChild(btn)
      }
    } else if (bulkSlot.text) {
      const parts = bulkSlot.text.split(",").map(p => p.trim())
      for (const p of parts) {
        const btn = document.createElement("wa-button")
        btn.setAttribute("size", "small")
        btn.textContent = p
        toolbar.appendChild(btn)
      }
    }

    wrapper.appendChild(toolbar)
  }

  const table = document.createElement("table")
  table.className = "wt-data-table"

  const hasSelect  = node.slots.has("select")
  const hasActions = node.slots.has("actions")

  // Parse column names from .columns slot, or fall back to pipe-separated
  // header line (text + fields) for when data-table is used without slot syntax
  const columnsSlot = slot(node, "columns")
  let columnNames: string[]
  if (columnsSlot) {
    columnNames = columnsSlot.text.split(",").map(c => c.trim()).filter(Boolean)
  } else if (node.text) {
    // Pipe-separated: text is first column, fields are remaining
    columnNames = [node.text, ...node.fields.filter(Boolean)]
  } else {
    columnNames = []
  }

  // Build thead
  const thead = document.createElement("thead")
  const headRow = document.createElement("tr")

  if (hasSelect) {
    const th = document.createElement("th")
    th.style.cssText = "width: 2.5rem;"
    const checkAll = document.createElement("wa-checkbox")
    th.appendChild(checkAll)
    headRow.appendChild(th)
  }

  for (const col of columnNames) {
    const th = document.createElement("th")
    th.textContent = col
    headRow.appendChild(th)
  }

  if (hasActions) {
    const th = document.createElement("th")
    th.textContent = "Actions"
    th.style.cssText = "width: 1%;"  // shrink to fit content
    headRow.appendChild(th)
  }

  thead.appendChild(headRow)
  table.appendChild(thead)

  // Build tbody
  const tbody = document.createElement("tbody")
  const rowSlots = slots(node, "row")
  const actionSlots = slots(node, "actions")

  if (rowSlots.length > 0) {
    rowSlots.forEach((row, rowIdx) => {
      const tr = document.createElement("tr")

      if (hasSelect) {
        const td = document.createElement("td")
        const check = document.createElement("wa-checkbox")
        td.appendChild(check)
        tr.appendChild(td)
      }

      // row.cells contains parsed cell ComponentNodes
      const cells = row.cells ?? []

      cells.forEach((cell, colIdx) => {
        const td = document.createElement("td")
        const hasActiveModifier = cell.modifiers.some(m => m.type === "active")

        if (hasActiveModifier) {
          // Highlighted cell — render as a badge
          const badge = document.createElement("wa-badge")
          badge.setAttribute("variant", "success")
          badge.textContent = cell.text
          td.appendChild(badge)
        } else if (cell.transition && colIdx === 0) {
          // First cell with transition → render as a link
          const link = document.createElement("a")
          link.href = "#"
          link.style.cssText = "color: var(--wiretext-color-primary, #2563EB); text-decoration: none; font-weight: 500;"
          link.textContent = cell.text
          applyTransition(link, cell.transition)
          td.appendChild(link)
        } else {
          td.textContent = cell.text
        }

        tr.appendChild(td)
      })

      // Pad missing cells
      for (let i = cells.length; i < columnNames.length; i++) {
        tr.appendChild(document.createElement("td"))
      }

      // Action buttons for this row
      if (hasActions && actionSlots.length > 0) {
        const td = document.createElement("td")
        td.style.cssText = "white-space: nowrap;"
        const actionsWrapper = document.createElement("div")
        actionsWrapper.style.cssText = "display: flex; gap: 0.25rem;"

        // Use the first .actions slot for all rows (it defines available actions)
        const actSlot = actionSlots[0]
        if (actSlot) {
          for (const action of actSlot.children) {
            const btn = document.createElement("wa-button")
            btn.setAttribute("size", "small")
            btn.setAttribute("variant", "text")
            if (action.icon) {
              const iconEl = createIcon(action.icon)
              iconEl.setAttribute("slot", "prefix")
              btn.appendChild(iconEl)
            }
            btn.appendChild(document.createTextNode(action.text))
            if (action.transition) applyTransition(btn, action.transition)
            actionsWrapper.appendChild(btn)
          }
        }

        td.appendChild(actionsWrapper)
        tr.appendChild(td)
      }

      tbody.appendChild(tr)
    })
  } else if (node.children.length > 0) {
    // Fallback: children used as row data (no slot syntax). Each child's
    // text + fields provide pipe-separated cell values, same as table component.
    for (const child of node.children) {
      const tr = document.createElement("tr")
      if (hasSelect) {
        const td = document.createElement("td")
        const check = document.createElement("wa-checkbox")
        td.appendChild(check)
        tr.appendChild(td)
      }
      const cellValues = [child.text, ...child.fields]
      for (let i = 0; i < columnNames.length; i++) {
        const td = document.createElement("td")
        td.textContent = cellValues[i] ?? ""
        tr.appendChild(td)
      }
      tbody.appendChild(tr)
    }
  } else {
    // No rows — show empty state if .empty slot provided, otherwise empty tbody
    const emptySlot = slot(node, "empty")
    if (emptySlot) {
      const tr = document.createElement("tr")
      const td = document.createElement("td")
      const totalCols = (hasSelect ? 1 : 0) + columnNames.length + (hasActions ? 1 : 0)
      td.setAttribute("colspan", String(totalCols || 1))
      td.style.cssText = "text-align: center; padding: 2rem; color: var(--wiretext-color-muted, #6B7280);"
      td.textContent = emptySlot.text || "No data"
      tr.appendChild(td)
      tbody.appendChild(tr)
    }
  }

  table.appendChild(tbody)
  wrapper.appendChild(table)

  return { element: wrapper, errors }
})

// ---------------------------------------------------------------------------
// settings-form — <form class="wt-settings-form">
// .section slots → sections with heading + form fields
// .action slot → submit button
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("settings-form", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const errors = validateSlots(node, "settings-form", ctx.blockPosition)

  const form = document.createElement("form")
  form.className = "wt-settings-form"
  // Prevent default form submission in mockup context
  form.setAttribute("onsubmit", "return false")

  const sectionSlots = slots(node, "section")
  for (const section of sectionSlots) {
    const sectionEl = document.createElement("div")
    sectionEl.className = "wt-settings-section"

    if (section.text) {
      const heading = document.createElement("h3")
      heading.className = "wt-settings-section-title"
      heading.textContent = section.text
      sectionEl.appendChild(heading)

      const divider = document.createElement("wa-divider")
      sectionEl.appendChild(divider)
    }

    // Render child form fields from the section
    for (const child of section.children) {
      const renderer = COMPONENT_REGISTRY.get(child.type)
      if (renderer) {
        const result = renderer(child, ctx)
        errors.push(...result.errors)
        sectionEl.appendChild(result.element)
      } else {
        // Unknown component inside section — render placeholder
        const placeholder = document.createElement("div")
        placeholder.textContent = `[${child.type}: ${child.text}]`
        sectionEl.appendChild(placeholder)
      }
    }

    form.appendChild(sectionEl)
  }

  // Action button (submit)
  const actionSlot = slot(node, "action")
  if (actionSlot) {
    const btn = document.createElement("wa-button")
    btn.setAttribute("variant", "primary")
    btn.setAttribute("type", "submit")
    btn.textContent = actionSlot.text
    if (actionSlot.transition) applyTransition(btn, actionSlot.transition)
    form.appendChild(btn)
  } else if (node.text) {
    const btn = document.createElement("wa-button")
    btn.setAttribute("variant", "primary")
    btn.setAttribute("type", "submit")
    btn.textContent = "Save changes"
    form.appendChild(btn)
  }

  return { element: form, errors }
})

// ---------------------------------------------------------------------------
// file-upload — dashed-border drop zone
// .text slot → description text
// .accept slot → accepted file types
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("file-upload", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const errors = validateSlots(node, "file-upload", ctx.blockPosition)

  const wrapper = document.createElement("div")
  wrapper.className = "wt-file-upload"

  // Upload icon
  const uploadIcon = createIcon("upload-simple")
  uploadIcon.style.cssText = "font-size: 2rem; opacity: 0.5;"
  wrapper.appendChild(uploadIcon)

  // Primary text
  const mainText = document.createElement("div")
  mainText.style.cssText = "font-weight: 500; color: var(--wiretext-color-text, #111827);"
  mainText.textContent = node.text || "Drop files here or click to upload"
  wrapper.appendChild(mainText)

  // Custom description text from .text slot
  const textSlot = slot(node, "text")
  if (textSlot) {
    const desc = document.createElement("p")
    desc.style.cssText = "font-size: 0.875rem; color: var(--wiretext-color-muted, #6B7280); margin: 0;"
    desc.textContent = textSlot.text
    wrapper.appendChild(desc)
  }

  // Accepted file types from .accept slot
  const acceptSlot = slot(node, "accept")
  if (acceptSlot) {
    const acceptEl = document.createElement("div")
    acceptEl.style.cssText = "font-size: 0.75rem; color: var(--wiretext-color-muted, #6B7280); margin-top: 0.25rem;"
    acceptEl.textContent = acceptSlot.text
    wrapper.appendChild(acceptEl)
  }

  return { element: wrapper, errors }
})

// ---------------------------------------------------------------------------
// hero — full-width landing page hero section
// Slots: .eyebrow, .heading, .subtext, .actions (with button children), .visual
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("hero", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const errors = validateSlots(node, "hero", ctx.blockPosition)

  const el = document.createElement("div")
  el.className = "wt-hero"

  const eyebrowSlot = slot(node, "eyebrow")
  if (eyebrowSlot) {
    const eyebrow = document.createElement("div")
    eyebrow.className = "wt-hero-eyebrow"
    eyebrow.textContent = eyebrowSlot.text
    el.appendChild(eyebrow)
  }

  const headingSlot = slot(node, "heading")
  if (headingSlot) {
    const h = document.createElement("h1")
    h.className = "wt-hero-heading"
    h.textContent = headingSlot.text
    el.appendChild(h)
  } else if (node.text) {
    const h = document.createElement("h1")
    h.className = "wt-hero-heading"
    h.textContent = node.text
    el.appendChild(h)
  }

  const subtextSlot = slot(node, "subtext")
  if (subtextSlot) {
    const p = document.createElement("p")
    p.className = "wt-hero-subtext"
    p.textContent = subtextSlot.text
    el.appendChild(p)
  }

  const actionsSlot = slot(node, "actions")
  if (actionsSlot) {
    const actionsEl = document.createElement("div")
    actionsEl.className = "wt-hero-actions"
    for (const child of actionsSlot.children) {
      const renderer = COMPONENT_REGISTRY.get(child.type)
      if (renderer) {
        const result = renderer(child, ctx)
        errors.push(...result.errors)
        actionsEl.appendChild(result.element)
      }
    }
    // If no children, render the slot text as a button
    if (actionsSlot.children.length === 0 && actionsSlot.text) {
      const btn = document.createElement("wa-button")
      btn.setAttribute("variant", "primary")
      btn.textContent = actionsSlot.text
      if (actionsSlot.transition) applyTransition(btn, actionsSlot.transition)
      actionsEl.appendChild(btn)
    }
    el.appendChild(actionsEl)
  }

  const visualSlot = slot(node, "visual")
  if (visualSlot) {
    const visual = document.createElement("div")
    visual.className = "wt-hero-visual"
    if (visualSlot.icon) {
      visual.appendChild(createIcon(visualSlot.icon))
    } else if (visualSlot.text) {
      // Treat text as icon name first, then as literal text
      const iconEl = document.createElement(`ph-${visualSlot.text}`)
      visual.appendChild(iconEl)
    }
    el.appendChild(visual)
  }

  return { element: el, errors }
})

// ---------------------------------------------------------------------------
// testimonial — grid of quote cards
// Slots: .quote text | Author | Job Title
// Each .quote becomes a card with quoted text, author name, and job title
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("testimonial", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const errors = validateSlots(node, "testimonial", ctx.blockPosition)

  const grid = document.createElement("div")
  grid.className = "wt-testimonial-grid"

  const quoteSlots = slots(node, "quote")

  for (const q of quoteSlots) {
    const card = document.createElement("div")
    card.className = "wt-testimonial-card"

    const quoteText = document.createElement("div")
    quoteText.className = "wt-testimonial-quote-text"
    quoteText.textContent = q.text
    card.appendChild(quoteText)

    // Author info from fields
    const authorName = q.fields[0]
    const authorTitle = q.fields[1]

    if (authorName || authorTitle) {
      const authorEl = document.createElement("div")
      authorEl.className = "wt-testimonial-author"

      // Avatar with initials
      const avatar = document.createElement("div")
      avatar.className = "wt-testimonial-avatar"
      const initials = (authorName ?? "?").split(/\s+/).slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? "").join("")
      avatar.textContent = initials
      authorEl.appendChild(avatar)

      const authorMeta = document.createElement("div")
      if (authorName) {
        const nameEl = document.createElement("div")
        nameEl.className = "wt-testimonial-name"
        nameEl.textContent = authorName
        authorMeta.appendChild(nameEl)
      }
      if (authorTitle) {
        const titleEl = document.createElement("div")
        titleEl.className = "wt-testimonial-job"
        titleEl.textContent = authorTitle
        authorMeta.appendChild(titleEl)
      }
      authorEl.appendChild(authorMeta)
      card.appendChild(authorEl)
    }

    grid.appendChild(card)
  }

  // Default placeholder testimonial when no slots provided
  if (quoteSlots.length === 0) {
    const card = document.createElement("div")
    card.className = "wt-testimonial-card"
    const quoteText = document.createElement("div")
    quoteText.className = "wt-testimonial-quote-text"
    quoteText.textContent = "WireText transformed how our team communicates design intent"
    card.appendChild(quoteText)
    const authorEl = document.createElement("div")
    authorEl.className = "wt-testimonial-author"
    const avatar = document.createElement("div")
    avatar.className = "wt-testimonial-avatar"
    avatar.textContent = "AC"
    authorEl.appendChild(avatar)
    const authorMeta = document.createElement("div")
    const nameEl = document.createElement("div")
    nameEl.className = "wt-testimonial-name"
    nameEl.textContent = "Alex Chen"
    authorMeta.appendChild(nameEl)
    const titleEl = document.createElement("div")
    titleEl.className = "wt-testimonial-job"
    titleEl.textContent = "Head of Design, Acme Corp"
    authorMeta.appendChild(titleEl)
    authorEl.appendChild(authorMeta)
    card.appendChild(authorEl)
    grid.appendChild(card)
  }

  return { element: grid, errors }
})

// ---------------------------------------------------------------------------
// feature-grid — responsive grid of feature cards
// Slots: .feature ~icon Title | description
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("feature-grid", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const errors = validateSlots(node, "feature-grid", ctx.blockPosition)

  const grid = document.createElement("div")
  grid.className = "wt-feature-grid"

  const featureSlots = slots(node, "feature")

  if (featureSlots.length === 0) {
    // Default 3-feature placeholder
    const defaults = [
      { icon: "lightning", title: "Fast", desc: "Generate UI mocks in seconds" },
      { icon: "puzzle-piece", title: "Flexible", desc: "67 components for any UI" },
      { icon: "code-simple", title: "Precise", desc: "AI edits surgically, not regenerating" },
    ]
    for (const d of defaults) {
      const card = buildFeatureCard(d.icon, d.title, d.desc)
      grid.appendChild(card)
    }
    return { element: grid, errors }
  }

  for (const feature of featureSlots) {
    const card = buildFeatureCard(feature.icon ?? null, feature.text, feature.fields[0] ?? "")
    grid.appendChild(card)
  }

  return { element: grid, errors }
})

function buildFeatureCard(icon: string | null, title: string, desc: string): HTMLElement {
  const card = document.createElement("div")
  card.className = "wt-feature-card"

  if (icon) {
    const iconWrap = document.createElement("div")
    iconWrap.className = "wt-feature-icon"
    iconWrap.appendChild(document.createElement(`ph-${icon}`))
    card.appendChild(iconWrap)
  }

  const titleEl = document.createElement("div")
  titleEl.className = "wt-feature-title"
  titleEl.textContent = title
  card.appendChild(titleEl)

  if (desc) {
    const descEl = document.createElement("p")
    descEl.className = "wt-feature-desc"
    descEl.textContent = desc
    card.appendChild(descEl)
  }

  return card
}

// ---------------------------------------------------------------------------
// logo-cloud — strip of company logo placeholders
// text = optional label; .logo slots = company name pills
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("logo-cloud", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const errors = validateSlots(node, "logo-cloud", ctx.blockPosition)

  const wrap = document.createElement("div")
  wrap.className = "wt-logo-cloud"

  if (node.text) {
    const label = document.createElement("div")
    label.className = "wt-logo-cloud-label"
    label.textContent = node.text
    wrap.appendChild(label)
  }

  const row = document.createElement("div")
  row.className = "wt-logo-cloud-row"

  const logoSlots = slots(node, "logo")

  if (logoSlots.length === 0) {
    // Default placeholder logos
    for (const name of ["Acme Corp", "Globex", "Initech", "Umbrella", "Oscorp"]) {
      row.appendChild(buildLogoPill(name))
    }
  } else {
    for (const logo of logoSlots) {
      row.appendChild(buildLogoPill(logo.text))
    }
  }

  wrap.appendChild(row)
  return { element: wrap, errors }
})

function buildLogoPill(name: string): HTMLElement {
  const pill = document.createElement("div")
  pill.className = "wt-logo-pill"
  pill.textContent = name
  return pill
}

// ---------------------------------------------------------------------------
// onboarding-checklist — vertical checklist with completed/pending states
// text = title; .item slots — * = completed; fields[0] = description
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("onboarding-checklist", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const errors = validateSlots(node, "onboarding-checklist", ctx.blockPosition)

  const wrap = document.createElement("div")
  wrap.className = "wt-onboarding-checklist"

  if (node.text) {
    const title = document.createElement("div")
    title.className = "wt-checklist-title"
    title.textContent = node.text
    wrap.appendChild(title)
  }

  const itemSlots = slots(node, "item")

  if (itemSlots.length === 0) {
    // Default placeholder items
    const defaults = [
      { text: "Connect your repo", desc: "Completed", done: true },
      { text: "Invite your team", desc: "Completed", done: true },
      { text: "Set up integrations", desc: "Connect Slack, GitHub, Jira", done: false },
      { text: "Start your first project", desc: "Create a project to begin", done: false },
    ]
    for (const d of defaults) {
      wrap.appendChild(buildChecklistItem(d.text, d.desc, d.done))
    }
    return { element: wrap, errors }
  }

  for (const item of itemSlots) {
    const isDone = isActive(item.modifiers)
    const desc = item.fields[0] ?? ""
    wrap.appendChild(buildChecklistItem(item.text, desc, isDone))
  }

  return { element: wrap, errors }
})

function buildChecklistItem(text: string, desc: string, isDone: boolean): HTMLElement {
  const row = document.createElement("div")
  row.className = "wt-checklist-item"

  const check = document.createElement("div")
  check.className = "wt-checklist-check"
  if (isDone) {
    check.classList.add("wt-done")
    check.textContent = "✓"
  }
  row.appendChild(check)

  const content = document.createElement("div")

  const titleEl = document.createElement("div")
  titleEl.className = "wt-checklist-item-title"
  if (isDone) titleEl.classList.add("wt-done")
  titleEl.textContent = text
  content.appendChild(titleEl)

  if (desc) {
    const descEl = document.createElement("div")
    descEl.className = "wt-checklist-item-desc"
    descEl.textContent = desc
    content.appendChild(descEl)
  }

  row.appendChild(content)
  return row
}

// ---------------------------------------------------------------------------
// command-palette — search dialog with result list
// Slots: .result ~icon Title | description -> target, .footer text
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("command-palette", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const errors = validateSlots(node, "command-palette", ctx.blockPosition)

  const palette = document.createElement("div")
  palette.className = "wt-command-palette"
  palette.setAttribute("role", "dialog")
  palette.setAttribute("aria-label", "Command palette")

  // Search bar
  const searchBar = document.createElement("div")
  searchBar.className = "wt-command-search"
  const searchIcon = document.createElement("ph-magnifying-glass")
  searchIcon.style.cssText = "color: var(--wiretext-color-muted, #6B7280); font-size: 1rem;"
  searchBar.appendChild(searchIcon)
  const placeholder = document.createElement("div")
  placeholder.className = "wt-command-search-placeholder"
  placeholder.textContent = node.text || "Search commands..."
  searchBar.appendChild(placeholder)
  palette.appendChild(searchBar)

  // Result items
  const resultSlots = slots(node, "result")
  const resultsEl = document.createElement("div")
  resultsEl.className = "wt-command-results"
  resultsEl.setAttribute("role", "listbox")

  if (resultSlots.length === 0) {
    // Default placeholder results
    const defaults = [
      { icon: "house", title: "Dashboard", desc: "Go to main dashboard" },
      { icon: "users", title: "Team", desc: "Manage team members" },
      { icon: "gear", title: "Settings", desc: "App preferences" },
    ]
    for (const d of defaults) {
      resultsEl.appendChild(buildCommandResult(d.icon, d.title, d.desc, null))
    }
  } else {
    for (const r of resultSlots) {
      resultsEl.appendChild(buildCommandResult(r.icon ?? null, r.text, r.fields[0] ?? "", r.transition))
    }
  }

  palette.appendChild(resultsEl)

  // Footer
  const footerSlot = slot(node, "footer")
  const footer = document.createElement("div")
  footer.className = "wt-command-footer"
  footer.textContent = footerSlot?.text ?? "↑↓ Navigate · ↵ Open · Esc Close"
  palette.appendChild(footer)

  return { element: palette, errors }
})

function buildCommandResult(
  icon: string | null,
  title: string,
  desc: string,
  transition: import("../types.js").Transition | null,
): HTMLElement {
  const result = document.createElement("div")
  result.className = "wt-command-result"
  result.setAttribute("role", "option")

  const iconWrap = document.createElement("div")
  iconWrap.className = "wt-command-result-icon"
  if (icon) {
    iconWrap.appendChild(document.createElement(`ph-${icon}`))
  }
  result.appendChild(iconWrap)

  const body = document.createElement("div")
  body.className = "wt-command-result-body"

  const titleEl = document.createElement("div")
  titleEl.className = "wt-command-result-title"
  titleEl.textContent = title
  body.appendChild(titleEl)

  if (desc) {
    const descEl = document.createElement("div")
    descEl.className = "wt-command-result-desc"
    descEl.textContent = desc
    body.appendChild(descEl)
  }

  result.appendChild(body)
  applyTransition(result, transition)

  return result
}
