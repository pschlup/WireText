// Compound component renderers (task-046, task-047) — 8 compound components
// login-form, signup-form, pricing-table, empty-state, user-menu,
// data-table, settings-form, file-upload
import { COMPONENT_REGISTRY } from "./registry.js"
import type { ComponentNode, ParseError, SlotNode } from "../types.js"
import type { RenderContext, RenderResult } from "./registry.js"
import { createIcon, applyTransition, isActive, isPrimary } from "./utils.js"

// Known slot sets per compound component.
// Any slot name NOT in the set triggers a warning and its content is ignored.
const KNOWN_SLOTS: Record<string, Set<string>> = {
  "login-form":     new Set(["logo", "providers", "footer"]),
  "signup-form":    new Set(["logo", "providers", "fields", "footer"]),
  "pricing-table":  new Set(["plan"]),
  "empty-state":    new Set(["icon", "text", "action"]),
  "user-menu":      new Set(["items"]),
  "data-table":     new Set(["select", "columns", "row", "actions", "bulk-actions", "empty"]),
  "settings-form":  new Set(["section", "action"]),
  "file-upload":    new Set(["accept", "text"]),
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

  // Parse column names from .columns slot
  const columnsSlot = slot(node, "columns")
  const columnNames: string[] = columnsSlot
    ? columnsSlot.text.split(",").map(c => c.trim()).filter(Boolean)
    : []

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
