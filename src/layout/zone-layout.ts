// Zone layout renderer (task-030 to task-032) — 5-zone CSS Grid skeleton
// Maps ParsedBody zones to semantic HTML elements in a 12-column grid layout.
import type { ParsedBody, ComponentNode, ParseError } from "../types.js"
import { renderComponent, type RenderContext } from "../renderer/index.js"
import { NAV_EXTRA_CSS } from "../renderer/navigation.js"
import { DATA_EXTRA_CSS } from "../renderer/data.js"
import { PRIMITIVES_EXTRA_CSS } from "../renderer/primitives.js"
import { FORMS_EXTRA_CSS } from "../renderer/forms.js"
import { CONTAINERS_EXTRA_CSS } from "../renderer/containers.js"
import { COMPOUNDS_EXTRA_CSS } from "../renderer/compounds.js"

export interface LayoutResult {
  element: HTMLElement
  errors:  ParseError[]
}

// CSS constants for the wiretext layout system.
// Exported so the artifact assembler can include them in the <style> block.
export const WIRETEXT_CSS = `
.wt-layout { display: grid; width: 100%; min-height: 100%; box-sizing: border-box; }
.wt-header, .wt-footer { grid-column: 1 / -1; }
.wt-header-inner { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: var(--wiretext-color-surface); border-bottom: 1px solid var(--wiretext-color-border); }
.wt-header-left, .wt-header-right { display: flex; align-items: center; gap: 0.5rem; }
.wt-footer-inner { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: var(--wiretext-color-surface); border-top: 1px solid var(--wiretext-color-border); }
.wt-footer-left, .wt-footer-right { display: flex; align-items: center; gap: 0.5rem; }
.wt-sidebar { padding: 1rem; background: var(--wiretext-color-surface); border-right: 1px solid var(--wiretext-color-border); overflow-y: auto; }
.wt-main { padding: 1.5rem; background: var(--wiretext-color-bg, #f9fafb); overflow-y: auto; }
.wt-aside { padding: 1rem; background: var(--wiretext-color-surface); border-left: 1px solid var(--wiretext-color-border); overflow-y: auto; }
.wt-row { display: grid; gap: 1rem; }
.wt-cell { min-width: 0; }
.wt-nav { display: flex; flex-direction: column; gap: 0.125rem; }
.wt-header-left .wt-nav, .wt-header-right .wt-nav, .wt-footer-left .wt-nav, .wt-footer-right .wt-nav { flex-direction: row; align-items: center; gap: 0.25rem; }
.wt-nav-item { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.5rem 0.75rem; text-decoration: none; color: var(--wiretext-color-text, #111827); border-radius: var(--wiretext-radius, 6px); transition: background 0.15s; cursor: pointer; }
.wt-nav-item:hover { background: var(--wiretext-color-hover, rgba(0,0,0,0.05)); }
.wt-nav-item[aria-current="page"] { background: color-mix(in srgb, var(--wiretext-color-primary, #2563EB) 10%, transparent); color: var(--wiretext-color-primary, #2563EB); font-weight: 500; }
.wt-nav-label { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.5rem 0.75rem; color: var(--wiretext-color-muted, #6B7280); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
.wt-nav-divider { border: none; border-top: 1px solid var(--wiretext-color-border, #E5E7EB); margin: 0.5rem 0; }
.wt-text { margin: 0 0 0.5rem; color: var(--wiretext-color-text, #111827); }
.wt-subtext { margin: 0 0 0.5rem; color: var(--wiretext-color-muted, #6B7280); font-size: 0.875rem; }
.wt-spacer { display: block; }
.wt-logo { display: inline-flex; align-items: center; gap: 0.625rem; text-decoration: none; font-weight: 700; font-size: 1.375rem; color: var(--wiretext-color-text, #111827); letter-spacing: -0.01em; }
.wt-logo ph-icon, .wt-logo [data-ph-icon] { font-size: 1.75rem; }
.wt-stat { display: flex; flex-direction: column; gap: 0.25rem; }
.wt-stat-label { font-size: 0.875rem; color: var(--wiretext-color-muted, #6B7280); }
.wt-stat-value { font-size: 1.75rem; font-weight: 600; color: var(--wiretext-color-text, #111827); line-height: 1.2; }
.wt-stat-delta { font-size: 0.875rem; font-weight: 500; }
.wt-stat-delta-positive { color: var(--wiretext-color-success, #16A34A); }
.wt-stat-delta-negative { color: var(--wiretext-color-danger, #DC2626); }
.wt-stat-delta-neutral { color: var(--wiretext-color-muted, #6B7280); }
.wt-chart-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2px dashed var(--wiretext-color-border, #E5E7EB); border-radius: var(--wiretext-radius, 6px); background: var(--wiretext-color-surface, #fff); min-height: 160px; color: var(--wiretext-color-muted, #6B7280); gap: 0.5rem; }
.wt-chart-type-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.6; }
.wt-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.wt-table th { text-align: left; padding: 0.625rem 0.75rem; border-bottom: 2px solid var(--wiretext-color-border, #E5E7EB); font-weight: 600; color: var(--wiretext-color-text, #111827); }
.wt-table td { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--wiretext-color-border, #E5E7EB); color: var(--wiretext-color-text, #111827); }
.wt-table tr:last-child td { border-bottom: none; }
.wt-data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.wt-data-table th { text-align: left; padding: 0.625rem 0.75rem; border-bottom: 2px solid var(--wiretext-color-border, #E5E7EB); font-weight: 600; color: var(--wiretext-color-text, #111827); }
.wt-data-table td { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--wiretext-color-border, #E5E7EB); color: var(--wiretext-color-text, #111827); }
.wt-data-table-toolbar { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0; margin-bottom: 0.5rem; }
.wt-pagination { display: flex; align-items: center; gap: 0.25rem; justify-content: center; padding: 0.5rem; }
.wt-page-btn { display: inline-flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; border: 1px solid var(--wiretext-color-border, #E5E7EB); border-radius: var(--wiretext-radius, 6px); background: transparent; cursor: pointer; font-size: 0.875rem; color: var(--wiretext-color-text, #111827); }
.wt-page-btn[aria-current="true"] { background: var(--wiretext-color-primary, #2563EB); color: #fff; border-color: var(--wiretext-color-primary, #2563EB); }
.wt-feed { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.wt-feed-item { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem; border-radius: var(--wiretext-radius, 6px); background: var(--wiretext-color-surface, #fff); border: 1px solid var(--wiretext-color-border, #E5E7EB); }
.wt-feed-item-content { flex: 1; min-width: 0; }
.wt-kanban { display: flex; gap: 1rem; overflow-x: auto; }
.wt-kanban-column { flex: 1; min-width: 200px; background: var(--wiretext-color-bg, #f9fafb); border-radius: var(--wiretext-radius, 6px); padding: 0.75rem; }
.wt-kanban-column-title { font-weight: 600; font-size: 0.875rem; color: var(--wiretext-color-muted, #6B7280); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem; }
.wt-kanban-card { background: var(--wiretext-color-surface, #fff); border: 1px solid var(--wiretext-color-border, #E5E7EB); border-radius: var(--wiretext-radius, 6px); padding: 0.625rem 0.75rem; margin-bottom: 0.5rem; font-size: 0.875rem; color: var(--wiretext-color-text, #111827); cursor: default; }
.wt-calendar { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.wt-calendar th { text-align: center; padding: 0.5rem; background: var(--wiretext-color-surface, #fff); border-bottom: 1px solid var(--wiretext-color-border, #E5E7EB); font-weight: 600; color: var(--wiretext-color-muted, #6B7280); font-size: 0.75rem; }
.wt-calendar td { padding: 0.375rem; border: 1px solid var(--wiretext-color-border, #E5E7EB); vertical-align: top; min-height: 60px; color: var(--wiretext-color-text, #111827); }
.wt-calendar td.wt-today { background: color-mix(in srgb, var(--wiretext-color-primary, #2563EB) 8%, transparent); }
.wt-calendar-day-num { font-size: 0.75rem; font-weight: 500; }
.wt-pricing-table { display: flex; gap: 1rem; align-items: flex-start; flex-wrap: wrap; }
.wt-plan { flex: 1; min-width: 180px; }
.wt-plan-highlighted { --wa-card-border-color: var(--wiretext-color-primary, #2563EB); border-color: var(--wiretext-color-primary, #2563EB); }
.wt-plan-title { font-weight: 700; font-size: 1.125rem; margin-bottom: 0.25rem; }
.wt-plan-price { font-size: 1.5rem; font-weight: 600; color: var(--wiretext-color-primary, #2563EB); }
.wt-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; padding: 3rem 1.5rem; text-align: center; color: var(--wiretext-color-muted, #6B7280); }
.wt-empty-state-heading { font-size: 1.125rem; font-weight: 600; color: var(--wiretext-color-text, #111827); margin: 0; }
.wt-empty-state-text { font-size: 0.875rem; margin: 0; }
.wt-login-form { max-width: 400px; margin: 0 auto; }
.wt-login-logo { display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-weight: 700; font-size: 1.25rem; margin-bottom: 1.5rem; }
.wt-login-providers { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
.wt-login-divider { display: flex; align-items: center; gap: 0.75rem; margin: 1rem 0; color: var(--wiretext-color-muted, #6B7280); font-size: 0.875rem; }
.wt-login-divider::before, .wt-login-divider::after { content: ""; flex: 1; border-top: 1px solid var(--wiretext-color-border, #E5E7EB); }
.wt-login-fields { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem; }
.wt-login-footer { text-align: center; font-size: 0.875rem; margin-top: 1rem; color: var(--wiretext-color-muted, #6B7280); }
.wt-file-upload { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; padding: 2rem; border: 2px dashed var(--wiretext-color-border, #E5E7EB); border-radius: var(--wiretext-radius, 6px); text-align: center; color: var(--wiretext-color-muted, #6B7280); }
.wt-settings-form { display: flex; flex-direction: column; gap: 1.5rem; }
.wt-settings-section { display: flex; flex-direction: column; gap: 0.75rem; }
.wt-settings-section-title { font-weight: 600; font-size: 1rem; color: var(--wiretext-color-text, #111827); margin: 0 0 0.25rem; }
.wt-user-menu-trigger { cursor: pointer; }
wa-card, wa-alert, .wt-stat, .wt-feed, .wt-chart-placeholder, .wt-table, .wt-data-table, wa-details { margin-bottom: 1rem; }
wa-card:last-child, wa-alert:last-child, .wt-stat:last-child, .wt-feed:last-child, .wt-chart-placeholder:last-child, .wt-table:last-child, wa-details:last-child { margin-bottom: 0; }
.wt-row { align-items: start; }
.wt-row.wt-button-row { display: flex; gap: 0.5rem; }
.wt-text-center { text-align: center; }
`

// Zone name → number of columns it occupies by default
const ZONE_DEFAULT_COLS: Record<string, number> = {
  header: 12,
  sidebar: 2,
  main: 0,  // computed as remainder
  aside: 3,
  footer: 12,
}

/**
 * Render a ParsedBody into a 5-zone CSS Grid layout.
 * Handles zone column allocation, header/footer sub-slots, and row/column rendering.
 */
export function renderLayout(body: ParsedBody, blockPosition: number): LayoutResult {
  const errors: ParseError[] = []
  const themeTokens: Record<string, string> = {}

  // Determine which zones are present and their column widths.
  // Zone width can be specified as "@sidebar 3" — stored in zone key "sidebar:3".
  const hasSidebar = body.zones.has("sidebar") || hasZoneWithWidth(body, "sidebar")
  const hasAside   = body.zones.has("aside")   || hasZoneWithWidth(body, "aside")
  const hasHeader  = body.zones.has("header")  || hasZoneWithWidth(body, "header")
  const hasFooter  = body.zones.has("footer")  || hasZoneWithWidth(body, "footer")
  const hasMain    = body.zones.has("main")    || hasZoneWithWidth(body, "main")

  // Validate @main is present whenever sidebar or aside is present
  if ((hasSidebar || hasAside) && !hasMain) {
    errors.push({
      severity: "error",
      message: "@main zone is required when @sidebar or @aside is present",
      line: 0,
      blockPosition,
    })
  }

  // Resolve sidebar and aside column widths (checking for explicit widths like "sidebar:3")
  const sidebarCols = hasSidebar ? resolveZoneWidth(body, "sidebar") : 0
  const asideCols   = hasAside   ? resolveZoneWidth(body, "aside")   : 0

  // Validate sidebar + aside don't exceed 12
  if (sidebarCols + asideCols >= 12) {
    errors.push({
      severity: "error",
      message: `@sidebar (${sidebarCols} cols) + @aside (${asideCols} cols) leaves no room for @main (must be < 12 total)`,
      line: 0,
      blockPosition,
    })
  }

  const mainCols = 12 - sidebarCols - asideCols

  // Build CSS Grid template
  const wrapper = document.createElement("div")
  wrapper.className = "wt-layout"

  // Compose grid-template-columns (sidebar | main | aside as fr units)
  const colParts: string[] = []
  if (hasSidebar) colParts.push(`${sidebarCols}fr`)
  colParts.push(`${mainCols}fr`)
  if (hasAside) colParts.push(`${asideCols}fr`)

  // Grid areas: header/footer always span full width
  const gridAreas: string[] = []
  if (hasHeader) gridAreas.push(buildGridAreaRow("header", hasSidebar, hasAside))
  gridAreas.push(buildGridAreaRow("body-row", hasSidebar, hasAside, { hasSidebar, hasMain, hasAside }))
  if (hasFooter) gridAreas.push(buildGridAreaRow("footer", hasSidebar, hasAside))

  wrapper.style.gridTemplateColumns = colParts.join(" ")
  wrapper.style.gridTemplateRows = "auto 1fr auto"

  // Inject the CSS reset/base styles as a style element
  const styleEl = document.createElement("style")
  styleEl.textContent = WIRETEXT_CSS
  wrapper.appendChild(styleEl)

  // Render header zone
  if (hasHeader) {
    const headerEl = document.createElement("header")
    headerEl.className = "wt-header"
    const zoneNodes = getZoneNodes(body, "header")
    const innerEl = renderHeaderFooterZone(zoneNodes, 12, blockPosition, themeTokens, "header", errors)
    headerEl.appendChild(innerEl)
    wrapper.appendChild(headerEl)
  }

  // Render sidebar zone
  if (hasSidebar) {
    const sidebarEl = document.createElement("nav")
    sidebarEl.className = "wt-sidebar"
    const zoneNodes = getZoneNodes(body, "sidebar")
    renderZoneChildren(zoneNodes, sidebarEl, sidebarCols, blockPosition, themeTokens, errors, null)
    wrapper.appendChild(sidebarEl)
  }

  // Render main zone
  if (hasMain) {
    const mainEl = document.createElement("main")
    mainEl.className = "wt-main"
    const zoneNodes = getZoneNodes(body, "main")
    renderZoneChildren(zoneNodes, mainEl, mainCols, blockPosition, themeTokens, errors, null)
    wrapper.appendChild(mainEl)
  } else if (!hasSidebar && !hasAside) {
    // Implicit @main — entire body is main
    const mainEl = document.createElement("main")
    mainEl.className = "wt-main"
    mainEl.style.gridColumn = "1 / -1"
    wrapper.appendChild(mainEl)
  }

  // Render aside zone
  if (hasAside) {
    const asideEl = document.createElement("aside")
    asideEl.className = "wt-aside"
    const zoneNodes = getZoneNodes(body, "aside")
    renderZoneChildren(zoneNodes, asideEl, asideCols, blockPosition, themeTokens, errors, null)
    wrapper.appendChild(asideEl)
  }

  // Render footer zone
  if (hasFooter) {
    const footerEl = document.createElement("footer")
    footerEl.className = "wt-footer"
    const zoneNodes = getZoneNodes(body, "footer")
    const innerEl = renderHeaderFooterZone(zoneNodes, 12, blockPosition, themeTokens, "footer", errors)
    footerEl.appendChild(innerEl)
    wrapper.appendChild(footerEl)
  }

  return { element: wrapper, errors }
}

// Returns zone nodes, checking for plain key and zone-with-width key (e.g. "sidebar" or "sidebar:3")
function getZoneNodes(body: ParsedBody, zoneName: string): ComponentNode[] {
  if (body.zones.has(zoneName)) return body.zones.get(zoneName) ?? []
  // Also check for zone keys with explicit width suffix
  for (const [key, nodes] of body.zones) {
    if (key.startsWith(zoneName + ":")) return nodes
  }
  return []
}

// Check if a zone exists (including with width suffix)
function hasZoneWithWidth(body: ParsedBody, zoneName: string): boolean {
  for (const key of body.zones.keys()) {
    if (key === zoneName || key.startsWith(zoneName + ":")) return true
  }
  return false
}

// Resolve the column width for a zone, checking for explicit width in key like "sidebar:3"
function resolveZoneWidth(body: ParsedBody, zoneName: string): number {
  // Explicit override like "sidebar:3"
  for (const key of body.zones.keys()) {
    if (key.startsWith(zoneName + ":")) {
      const width = parseInt(key.slice(zoneName.length + 1), 10)
      if (!isNaN(width)) return width
    }
  }
  // Default
  return ZONE_DEFAULT_COLS[zoneName] ?? 2
}

// Build a CSS grid-template-areas row string (simplified approach — not strictly needed, using
// numeric column layout instead via grid-template-columns + manual element ordering)
function buildGridAreaRow(
  area: string,
  _hasSidebar: boolean,
  _hasAside: boolean,
  _opts?: { hasSidebar: boolean; hasMain: boolean; hasAside: boolean },
): string {
  return area
}

/** Render header/footer children, handling left/right sub-slots. */
function renderHeaderFooterZone(
  nodes: ComponentNode[],
  colWidth: number,
  blockPosition: number,
  themeTokens: Record<string, string>,
  zoneType: "header" | "footer",
  errors: ParseError[],
): HTMLElement {
  // Check if there are left/right groupings in the children
  const leftNodes  = nodes.filter(n => n.type === "left")
  const rightNodes = nodes.filter(n => n.type === "right")

  if (leftNodes.length > 0 || rightNodes.length > 0) {
    const innerClass = zoneType === "header" ? "wt-header-inner" : "wt-footer-inner"
    const inner = document.createElement("div")
    inner.className = innerClass

    const leftEl = document.createElement("div")
    leftEl.className = zoneType === "header" ? "wt-header-left" : "wt-footer-left"
    for (const group of leftNodes) {
      renderZoneChildren(group.children, leftEl, colWidth, blockPosition, themeTokens, errors, null)
    }

    const rightEl = document.createElement("div")
    rightEl.className = zoneType === "header" ? "wt-header-right" : "wt-footer-right"
    for (const group of rightNodes) {
      renderZoneChildren(group.children, rightEl, colWidth, blockPosition, themeTokens, errors, null)
    }

    inner.appendChild(leftEl)
    inner.appendChild(rightEl)
    return inner
  }

  // No sub-slots — render all children directly in an inner wrapper
  const innerClass = zoneType === "header" ? "wt-header-inner" : "wt-footer-inner"
  const inner = document.createElement("div")
  inner.className = innerClass

  const leftEl = document.createElement("div")
  leftEl.className = zoneType === "header" ? "wt-header-left" : "wt-footer-left"
  renderZoneChildren(nodes, leftEl, colWidth, blockPosition, themeTokens, errors, null)
  inner.appendChild(leftEl)

  return inner
}

/** Render a list of ComponentNodes into a container element, handling row types specially. */
function renderZoneChildren(
  nodes: ComponentNode[],
  container: HTMLElement,
  parentCols: number,
  blockPosition: number,
  themeTokens: Record<string, string>,
  errors: ParseError[],
  parentComponentType: string | null,
): void {
  for (const node of nodes) {
    if (node.type === "row") {
      const result = renderRow(node, parentCols, blockPosition, themeTokens, errors)
      errors.push(...result.errors)
      container.appendChild(result.element)
    } else {
      const ctx: RenderContext = {
        parentColumnWidth: parentCols,
        parentComponentType,
        themeTokens,
        blockPosition,
      }
      const result = renderComponent(node, ctx)
      errors.push(...result.errors)
      container.appendChild(result.element)
    }
  }
}

/**
 * Infer column widths for a row's children based on the parent column width.
 * Rules from PROJECT.md §Row Column Inference:
 *   1 → [12], 2 → [8,4], 3 → [4,4,4], 4 → [3,3,3,3], >4 → equal split with remainder to last
 */
export function inferRowColumns(childCount: number, parentCols: number): number[] {
  if (childCount === 0) return []
  if (childCount === 1) return [parentCols]
  if (parentCols === 12) {
    if (childCount === 2) return [8, 4]
    if (childCount === 3) return [4, 4, 4]
    if (childCount === 4) return [3, 3, 3, 3]
  }
  // General case: equal split with remainder to last cell
  const base = Math.floor(parentCols / childCount)
  const cols = Array<number>(childCount).fill(base)
  // Give the remainder to the last cell
  const allocated = base * childCount
  if (cols.length > 0) {
    cols[cols.length - 1] = (cols[cols.length - 1] ?? base) + (parentCols - allocated)
  }
  return cols
}

/** Render a "row" ComponentNode as a CSS Grid row with proper column cells. */
function renderRow(
  node: ComponentNode,
  parentCols: number,
  blockPosition: number,
  themeTokens: Record<string, string>,
  errors: ParseError[],
): { element: HTMLElement; errors: ParseError[] } {
  const rowErrors: ParseError[] = []

  if (node.children.length === 0) {
    rowErrors.push({
      severity: "error",
      message: "row must have at least one child component",
      line: 0,
      blockPosition,
    })
    const el = document.createElement("div")
    el.className = "wt-row"
    return { element: el, errors: rowErrors }
  }

  let columns: number[]

  if (node.rowColumns !== null) {
    // Explicit column widths specified (e.g. "row 6, 6")
    columns = node.rowColumns

    // Validate child count matches column count
    if (columns.length !== node.children.length) {
      rowErrors.push({
        severity: "error",
        message: `row has ${columns.length} column widths but ${node.children.length} children`,
        line: 0,
        blockPosition,
      })
    }

    // Validate sum equals parent width
    const sum = columns.reduce((a, b) => a + b, 0)
    if (sum !== parentCols) {
      rowErrors.push({
        severity: "error",
        message: `row column widths sum to ${sum} but parent zone is ${parentCols} columns`,
        line: 0,
        blockPosition,
      })
    }
  } else {
    // Infer from child count
    columns = inferRowColumns(node.children.length, parentCols)
  }

  const rowEl = document.createElement("div")
  rowEl.className = "wt-row"

  // Detect button-only rows: all children are buttons → cluster with flex gap
  // instead of spreading across the full grid width
  const allButtons = node.children.every(c => c.type === "button")
  if (allButtons) {
    rowEl.classList.add("wt-button-row")
  }

  // Build grid-template-columns using fr units proportional to col values
  rowEl.style.gridTemplateColumns = columns.map(c => `${c}fr`).join(" ")

  // Render each child in its cell
  node.children.forEach((child, i) => {
    const cellEl = document.createElement("div")
    cellEl.className = "wt-cell"

    const cellCols = columns[i] ?? Math.floor(parentCols / node.children.length)

    if (child.type === "row") {
      // Nested row — inner row's parent width is the cell's column span
      const nested = renderRow(child, cellCols, blockPosition, themeTokens, rowErrors)
      rowErrors.push(...nested.errors)
      cellEl.appendChild(nested.element)
    } else {
      const ctx: RenderContext = {
        parentColumnWidth: cellCols,
        parentComponentType: null,
        themeTokens,
        blockPosition,
      }
      const result = renderComponent(child, ctx)
      rowErrors.push(...result.errors)
      cellEl.appendChild(result.element)
    }

    rowEl.appendChild(cellEl)
  })

  return { element: rowEl, errors: rowErrors }
}
