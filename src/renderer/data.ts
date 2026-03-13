// Data component renderers (task-043) — 8 data components
// table, pagination, stat, chart, feed, kanban, calendar, skeleton
import { COMPONENT_REGISTRY } from "./registry.js"
import type { ComponentNode, ParseError } from "../types.js"
import type { RenderContext, RenderResult } from "./registry.js"
import { renderChildren, isActive, el } from "./utils.js"

export const DATA_EXTRA_CSS = `
.wt-timeline { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.wt-timeline-item { display: flex; gap: 0.75rem; padding-bottom: 1.25rem; position: relative; }
.wt-timeline-item:last-child { padding-bottom: 0; }
.wt-timeline-spine { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
.wt-timeline-dot { width: 2rem; height: 2rem; border-radius: 50%; background: var(--wiretext-color-surface, #fff); border: 2px solid var(--wiretext-color-border, #E5E7EB); display: flex; align-items: center; justify-content: center; font-size: 0.875rem; color: var(--wiretext-color-muted, #6B7280); flex-shrink: 0; }
.wt-timeline-dot.wt-current { border-color: var(--wiretext-color-primary, #2563EB); background: color-mix(in srgb, var(--wiretext-color-primary, #2563EB) 10%, transparent); color: var(--wiretext-color-primary, #2563EB); }
.wt-timeline-line { width: 2px; flex: 1; background: var(--wiretext-color-border, #E5E7EB); margin-top: 0.25rem; min-height: 1rem; }
.wt-timeline-content { flex: 1; padding-top: 0.25rem; }
.wt-timeline-title { font-weight: 500; color: var(--wiretext-color-text, #111827); font-size: 0.875rem; }
.wt-timeline-meta { font-size: 0.75rem; color: var(--wiretext-color-muted, #6B7280); margin-top: 0.125rem; }
.wt-metric { display: flex; flex-direction: column; gap: 0.25rem; }
.wt-metric-label { font-size: 0.875rem; color: var(--wiretext-color-muted, #6B7280); }
.wt-metric-row { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem; }
.wt-metric-value { font-size: 1.75rem; font-weight: 600; color: var(--wiretext-color-text, #111827); line-height: 1.2; }
.wt-metric-delta { font-size: 0.875rem; font-weight: 500; }
.wt-metric-delta.positive { color: var(--wiretext-color-success, #16A34A); }
.wt-metric-delta.negative { color: var(--wiretext-color-danger, #DC2626); }
.wt-metric-spark { height: 40px; overflow: hidden; margin-top: 0.25rem; }
.wt-metric-spark svg { display: block; width: 100%; height: 40px; }
`

// ---------------------------------------------------------------------------
// Realistic mock data generators — used when no children are provided
// ---------------------------------------------------------------------------
const MOCK_NAMES    = ["Alice Johnson", "Bob Martinez", "Carol Chen", "David Park", "Emma Wilson"]
const MOCK_DATES    = ["Mar 12, 2026", "Mar 11, 2026", "Mar 10, 2026", "Mar 8, 2026", "Mar 7, 2026"]
const MOCK_STATUS   = ["Active", "Pending", "Inactive", "Active", "Pending"]
const MOCK_EMAILS   = ["alice@acme.com", "bob@acme.com", "carol@acme.com", "david@acme.com", "emma@acme.com"]
const MOCK_AMOUNTS  = ["$4,200", "$1,850", "$9,300", "$620", "$2,100"]

/** Pick a realistic mock cell value for a column header. */
function mockValue(header: string, rowIndex: number): string {
  const h = header.toLowerCase()
  if (h.includes("name")) return MOCK_NAMES[rowIndex % MOCK_NAMES.length] ?? "—"
  if (h.includes("email")) return MOCK_EMAILS[rowIndex % MOCK_EMAILS.length] ?? "—"
  if (h.includes("date") || h.includes("created") || h.includes("updated")) return MOCK_DATES[rowIndex % MOCK_DATES.length] ?? "—"
  if (h.includes("status") || h.includes("state")) return MOCK_STATUS[rowIndex % MOCK_STATUS.length] ?? "—"
  if (h.includes("amount") || h.includes("price") || h.includes("revenue") || h.includes("total")) return MOCK_AMOUNTS[rowIndex % MOCK_AMOUNTS.length] ?? "—"
  if (h.includes("id") || h.includes("#")) return `#${1000 + rowIndex + 1}`
  if (h.includes("role") || h.includes("type")) return ["Admin", "Editor", "Viewer"][rowIndex % 3] ?? "User"
  if (h.includes("count") || h.includes("qty")) return String(Math.floor(Math.random() * 50) + 1)
  return `Item ${rowIndex + 1}`
}

// ---------------------------------------------------------------------------
// table — <table class="wt-table"> with thead from CSV columns, 3 mock rows
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("table", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const table = document.createElement("table")
  table.className = "wt-table"

  const headers = (node.fields[0] ?? "")
    .split(",")
    .map(h => h.trim())
    .filter(Boolean)

  if (headers.length === 0) {
    // Fallback: use text as a single column
    if (node.text) headers.push(node.text)
    else headers.push("Name", "Value", "Status")
  }

  // Header row
  const thead = document.createElement("thead")
  const headerRow = document.createElement("tr")
  for (const h of headers) {
    const th = document.createElement("th")
    th.textContent = h
    headerRow.appendChild(th)
  }
  thead.appendChild(headerRow)
  table.appendChild(thead)

  // 3 mock data rows
  const tbody = document.createElement("tbody")
  for (let i = 0; i < 3; i++) {
    const tr = document.createElement("tr")
    for (const h of headers) {
      const td = document.createElement("td")
      td.textContent = mockValue(h, i)
      tr.appendChild(td)
    }
    tbody.appendChild(tr)
  }
  table.appendChild(tbody)

  return { element: table, errors: [] }
})

// ---------------------------------------------------------------------------
// pagination — <nav class="wt-pagination"> with page buttons
// fields[0] = totalPages, fields[1] = currentPage
// No fields → prev/next only
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("pagination", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const nav = document.createElement("nav")
  nav.className = "wt-pagination"
  nav.setAttribute("aria-label", "Pagination")

  const totalPagesRaw = node.fields[0]
  const currentPageRaw = node.fields[1]

  if (totalPagesRaw) {
    const totalPages = parseInt(totalPagesRaw, 10)
    const currentPage = currentPageRaw ? parseInt(currentPageRaw, 10) : 1

    // Previous button
    const prev = document.createElement("button")
    prev.className = "wt-page-btn"
    prev.textContent = "‹"
    prev.setAttribute("aria-label", "Previous page")
    if (currentPage <= 1) prev.setAttribute("disabled", "")
    nav.appendChild(prev)

    // Page number buttons
    for (let p = 1; p <= totalPages; p++) {
      const btn = document.createElement("button")
      btn.className = "wt-page-btn"
      btn.textContent = String(p)
      if (p === currentPage) {
        btn.setAttribute("aria-current", "true")
        btn.setAttribute("aria-label", `Page ${p}, current`)
      } else {
        btn.setAttribute("aria-label", `Page ${p}`)
      }
      nav.appendChild(btn)
    }

    // Next button
    const next = document.createElement("button")
    next.className = "wt-page-btn"
    next.textContent = "›"
    next.setAttribute("aria-label", "Next page")
    if (currentPage >= totalPages) next.setAttribute("disabled", "")
    nav.appendChild(next)
  } else {
    // Simple prev/next
    const prev = document.createElement("button")
    prev.className = "wt-page-btn"
    prev.textContent = "‹ Previous"
    prev.setAttribute("aria-label", "Previous page")
    nav.appendChild(prev)

    const next = document.createElement("button")
    next.className = "wt-page-btn"
    next.textContent = "Next ›"
    next.setAttribute("aria-label", "Next page")
    nav.appendChild(next)
  }

  return { element: nav, errors: [] }
})

// ---------------------------------------------------------------------------
// stat — <div class="wt-stat"> with label, large value, optional delta
// fields[0] = value, fields[1] = delta
// Delta: + prefix → green, - prefix → red, no sign → neutral
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("stat", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const wrapper = el("div", { className: "wt-stat" },
    el("div", { className: "wt-stat-label" }, node.text))

  if (node.fields[0]) {
    wrapper.appendChild(el("div", { className: "wt-stat-value" }, node.fields[0]))
  }

  // Delta (only render if fields[1] is present)
  if (node.fields[1] !== undefined) {
    const delta = node.fields[1]
    const deltaClass = delta.startsWith("+") ? "wt-stat-delta-positive"
      : delta.startsWith("-") ? "wt-stat-delta-negative"
      : "wt-stat-delta-neutral"
    wrapper.appendChild(el("div", { className: `wt-stat-delta ${deltaClass}` }, delta))
  }

  return { element: wrapper, errors: [] }
})

// ---------------------------------------------------------------------------
// chart — <div class="wt-chart-placeholder"> skeleton placeholder
// Valid types: line, bar, pie, donut, area; unknown → line + warn
// ---------------------------------------------------------------------------
const VALID_CHART_TYPES = new Set(["line", "bar", "pie", "donut", "area"])

COMPONENT_REGISTRY.set("chart", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const errors: ParseError[] = []
  const rawType = (node.fields[0] ?? "line").toLowerCase()

  let chartType = rawType
  if (!VALID_CHART_TYPES.has(rawType)) {
    chartType = "line"
    errors.push({
      severity: "warn",
      message: `Unknown chart type "${rawType}" — falling back to line`,
      line: 0,
      blockPosition: ctx.blockPosition,
    })
  }

  const el = document.createElement("div")
  el.className = "wt-chart-placeholder"
  el.setAttribute("data-chart-type", chartType)
  el.setAttribute("role", "img")
  el.setAttribute("aria-label", `${chartType} chart: ${node.text}`)

  // Skeleton class for CSS shimmer animation (no emoji icons)
  el.classList.add("wt-skeleton-chart")

  if (node.text) {
    const label = document.createElement("div")
    label.style.cssText = "font-weight: 500; color: var(--wiretext-color-text, #111827); opacity: 0.6;"
    label.textContent = node.text
    el.appendChild(label)
  }

  const typeLabel = document.createElement("div")
  typeLabel.className = "wt-chart-type-label"
  typeLabel.textContent = `${chartType} chart`
  el.appendChild(typeLabel)

  return { element: el, errors }
})

// ---------------------------------------------------------------------------
// feed — <ul class="wt-feed"> with item children; 3 placeholders if no children
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("feed", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const errors: ParseError[] = []
  const ul = document.createElement("ul")
  ul.className = "wt-feed"

  if (node.children.length > 0) {
    renderChildren(node, ul, { ...ctx, parentComponentType: "feed" }, errors)
  } else {
    // Empty — show placeholder items
    const placeholders = [
      { name: "Alice Johnson", text: "Completed the project onboarding", time: "2 hours ago" },
      { name: "Bob Martinez",  text: "Left a comment on Dashboard design", time: "4 hours ago" },
      { name: "Carol Chen",    text: "Updated the team settings",         time: "Yesterday"    },
    ]
    for (const p of placeholders) {
      const initials = p.name.split(" ").map(w => w[0]).join("").toUpperCase()
      const avatar = el("wa-avatar", { initials, label: p.name })
      const content = el("div", { className: "wt-feed-item-content" },
        el("strong", { style: "font-size: 0.875rem; display: block;" }, p.name),
        el("span", { style: "font-size: 0.875rem; color: var(--wiretext-color-text, #111827);" }, p.text),
        el("time", { style: "font-size: 0.75rem; color: var(--wiretext-color-muted, #6B7280); display: block; margin-top: 0.125rem;" }, p.time))
      ul.appendChild(el("li", { className: "wt-feed-item" }, avatar, content))
    }
  }

  return { element: ul, errors }
})

// ---------------------------------------------------------------------------
// kanban — flex row of columns; item children grouped by column name (fields[0])
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("kanban", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const errors: ParseError[] = []
  const board = document.createElement("div")
  board.className = "wt-kanban"

  // Determine column names: from node.text (pipe-separated) or from item field[0] values
  const textCols = node.text
    ? node.text.split("|").map(c => c.trim()).filter(Boolean)
    : []

  // Gather columns from item children (item.fields[0] = column name)
  const itemsByColumn = new Map<string, ComponentNode[]>()
  for (const item of node.children) {
    const colName = item.fields[0] ?? textCols[0] ?? "Backlog"
    if (!itemsByColumn.has(colName)) {
      itemsByColumn.set(colName, [])
    }
    itemsByColumn.get(colName)!.push(item)
  }

  // Determine final column list (text columns take precedence for ordering)
  let columnNames: string[]
  if (textCols.length > 0) {
    columnNames = textCols
    // Warn about items in columns not listed in the text definition
    for (const col of itemsByColumn.keys()) {
      if (!textCols.includes(col)) {
        errors.push({
          severity: "warn",
          message: `Kanban item references column "${col}" which is not in the column list`,
          line: 0,
          blockPosition: ctx.blockPosition,
        })
      }
    }
  } else if (itemsByColumn.size > 0) {
    columnNames = [...itemsByColumn.keys()]
  } else {
    // No children, no text columns — show default empty columns
    columnNames = ["To Do", "In Progress", "Done"]
  }

  for (const colName of columnNames) {
    const col = document.createElement("div")
    col.className = "wt-kanban-column"

    const title = document.createElement("div")
    title.className = "wt-kanban-column-title"
    title.textContent = colName
    col.appendChild(title)

    const items = itemsByColumn.get(colName) ?? []
    for (const item of items) {
      const card = document.createElement("div")
      card.className = "wt-kanban-card"
      card.textContent = item.text
      col.appendChild(card)
    }

    board.appendChild(col)
  }

  return { element: board, errors }
})

// ---------------------------------------------------------------------------
// calendar — <table class="wt-calendar"> grid
// View type from fields[0]: month (default), week, day
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("calendar", (node: ComponentNode, ctx: RenderContext): RenderResult => {
  const errors: ParseError[] = []
  const viewType = (node.fields[0] ?? "month").toLowerCase()

  const wrapper = document.createElement("div")
  wrapper.className = "wt-calendar-wrapper"

  // Calendar header with title and current view type indicator
  const header = document.createElement("div")
  header.style.cssText = "display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;"

  const title = document.createElement("h3")
  title.style.cssText = "font-weight: 600; font-size: 1rem; margin: 0; color: var(--wiretext-color-text, #111827);"
  title.textContent = node.text || "March 2026"
  header.appendChild(title)

  const viewBadge = document.createElement("wa-tag")
  viewBadge.textContent = viewType
  header.appendChild(viewBadge)
  wrapper.appendChild(header)

  if (viewType === "month") {
    wrapper.appendChild(buildMonthCalendar())
  } else if (viewType === "week") {
    wrapper.appendChild(buildWeekCalendar())
  } else if (viewType === "day") {
    wrapper.appendChild(buildDayCalendar())
  } else {
    wrapper.appendChild(buildMonthCalendar())
  }

  return { element: wrapper, errors }
})

function buildMonthCalendar(): HTMLElement {
  const table = document.createElement("table")
  table.className = "wt-calendar"

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const thead = document.createElement("thead")
  const headRow = document.createElement("tr")
  for (const d of days) {
    const th = document.createElement("th")
    th.textContent = d
    headRow.appendChild(th)
  }
  thead.appendChild(headRow)
  table.appendChild(thead)

  // 5-week month grid starting on a Wednesday (March 2026)
  const tbody = document.createElement("tbody")
  const startOffset = 0  // Sunday start
  let dayNum = 1
  const totalDays = 31

  for (let week = 0; week < 5; week++) {
    const tr = document.createElement("tr")
    for (let dow = 0; dow < 7; dow++) {
      const td = document.createElement("td")
      const cellIdx = week * 7 + dow
      // March 2026 starts on Sunday
      if (cellIdx >= startOffset && dayNum <= totalDays) {
        const daySpan = document.createElement("span")
        daySpan.className = "wt-calendar-day-num"
        // Highlight today (day 13)
        if (dayNum === 13) td.classList.add("wt-today")
        daySpan.textContent = String(dayNum++)
        td.appendChild(daySpan)
      }
      tr.appendChild(td)
    }
    tbody.appendChild(tr)
    if (dayNum > totalDays) break
  }

  table.appendChild(tbody)
  return table
}

function buildWeekCalendar(): HTMLElement {
  const wrapper = document.createElement("div")
  wrapper.style.cssText = "display: grid; grid-template-columns: 50px repeat(7, 1fr); gap: 0; border: 1px solid var(--wiretext-color-border, #E5E7EB); border-radius: var(--wiretext-radius, 6px); overflow: hidden; font-size: 0.75rem;"

  const days = ["", "Sun 8", "Mon 9", "Tue 10", "Wed 11", "Thu 12", "Fri 13", "Sat 14"]
  for (const d of days) {
    const cell = document.createElement("div")
    cell.style.cssText = "padding: 0.375rem; background: var(--wiretext-color-surface, #fff); border-bottom: 1px solid var(--wiretext-color-border, #E5E7EB); font-weight: 600; text-align: center; color: var(--wiretext-color-muted, #6B7280);"
    cell.textContent = d
    wrapper.appendChild(cell)
  }

  // 4 hour slots
  const hours = ["9 AM", "10 AM", "11 AM", "12 PM"]
  for (const h of hours) {
    const timeCell = document.createElement("div")
    timeCell.style.cssText = "padding: 0.375rem; background: var(--wiretext-color-surface, #fff); border-bottom: 1px solid var(--wiretext-color-border, #E5E7EB); color: var(--wiretext-color-muted, #6B7280); text-align: right; border-right: 1px solid var(--wiretext-color-border, #E5E7EB);"
    timeCell.textContent = h
    wrapper.appendChild(timeCell)

    for (let i = 0; i < 7; i++) {
      const cell = document.createElement("div")
      cell.style.cssText = "padding: 0.375rem; background: var(--wiretext-color-surface, #fff); border-bottom: 1px solid var(--wiretext-color-border, #E5E7EB); border-right: 1px solid var(--wiretext-color-border, #E5E7EB); min-height: 40px;"
      wrapper.appendChild(cell)
    }
  }

  return wrapper
}

function buildDayCalendar(): HTMLElement {
  const wrapper = document.createElement("div")
  wrapper.style.cssText = "display: grid; grid-template-columns: 60px 1fr; gap: 0; border: 1px solid var(--wiretext-color-border, #E5E7EB); border-radius: var(--wiretext-radius, 6px); overflow: hidden; font-size: 0.875rem;"

  const hours = ["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM"]
  for (const h of hours) {
    const timeCell = document.createElement("div")
    timeCell.style.cssText = "padding: 0.375rem 0.5rem; background: var(--wiretext-color-surface, #fff); border-bottom: 1px solid var(--wiretext-color-border, #E5E7EB); color: var(--wiretext-color-muted, #6B7280); text-align: right; border-right: 1px solid var(--wiretext-color-border, #E5E7EB);"
    timeCell.textContent = h
    wrapper.appendChild(timeCell)

    const eventCell = document.createElement("div")
    eventCell.style.cssText = "padding: 0.375rem; background: var(--wiretext-color-surface, #fff); border-bottom: 1px solid var(--wiretext-color-border, #E5E7EB); min-height: 44px;"
    wrapper.appendChild(eventCell)
  }

  return wrapper
}

// ---------------------------------------------------------------------------
// skeleton — N × <wa-skeleton> stacked; N from fields[0] (default 1)
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("skeleton", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const count = parseInt(node.fields[0] ?? "1", 10)
  const safeCount = isNaN(count) || count < 1 ? 1 : Math.min(count, 20)

  const wrapper = document.createElement("div")
  wrapper.className = "wt-skeleton-group"
  wrapper.style.cssText = "display: flex; flex-direction: column; gap: 0.5rem;"

  for (let i = 0; i < safeCount; i++) {
    const skel = document.createElement("wa-skeleton")
    // Vary widths slightly for visual interest
    const widths = ["100%", "100%", "75%", "100%", "85%"]
    const w = widths[i % widths.length] ?? "100%"
    skel.style.width = w
    wrapper.appendChild(skel)
  }

  return { element: wrapper, errors: [] }
})

// ---------------------------------------------------------------------------
// timeline — vertical timeline list with item children
// Children: item nodes with text = event label, fields[0] = metadata, * = current
// ~icon on item = icon in the timeline dot
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("timeline", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const list = document.createElement("ul")
  list.className = "wt-timeline"

  const items = node.children.length > 0 ? node.children : []

  if (items.length === 0) {
    // Default placeholder items
    const defaults = [
      { text: "Project launched", meta: "Mar 12, 2026", current: false },
      { text: "Beta testing completed", meta: "Mar 10, 2026", current: true },
      { text: "Development started", meta: "Mar 1, 2026", current: false },
    ]
    for (const d of defaults) {
      const li = buildTimelineItem(d.text, d.meta, null, d.current)
      list.appendChild(li)
    }
    return { element: list, errors: [] }
  }

  items.forEach((item, i) => {
    const isCurrent = isActive(item.modifiers)
    const meta = item.fields[0] ?? ""
    const li = buildTimelineItem(item.text, meta, item.icon ?? null, isCurrent)
    // No line connector after last item
    if (i === items.length - 1) {
      const spine = li.querySelector(".wt-timeline-spine")
      const line = spine?.querySelector(".wt-timeline-line")
      if (line) (line as HTMLElement).style.display = "none"
    }
    list.appendChild(li)
  })

  return { element: list, errors: [] }
})

function buildTimelineItem(text: string, meta: string, icon: string | null, isCurrent: boolean): HTMLElement {
  const dot = el("div", { className: `wt-timeline-dot${isCurrent ? " wt-current" : ""}` },
    ...(icon ? [document.createElement(`ph-${icon}`)] : []))
  const spine = el("div", { className: "wt-timeline-spine" },
    dot, el("div", { className: "wt-timeline-line" }))
  const content = el("div", { className: "wt-timeline-content" },
    el("div", { className: "wt-timeline-title" }, text),
    ...(meta ? [el("div", { className: "wt-timeline-meta" }, meta)] : []))
  return el("li", { className: "wt-timeline-item" }, spine, content)
}

// ---------------------------------------------------------------------------
// metric — stat card with sparkline SVG placeholder
// text = label, fields[0] = value, fields[1] = delta, fields[2] = sparkline type (line/bar/area)
// ---------------------------------------------------------------------------
COMPONENT_REGISTRY.set("metric", (node: ComponentNode, _ctx: RenderContext): RenderResult => {
  const el = document.createElement("div")
  el.className = "wt-metric"

  // Label
  if (node.text) {
    const label = document.createElement("div")
    label.className = "wt-metric-label"
    label.textContent = node.text
    el.appendChild(label)
  }

  const row = document.createElement("div")
  row.className = "wt-metric-row"

  // Value
  const valueEl = document.createElement("div")
  valueEl.className = "wt-metric-value"
  valueEl.textContent = node.fields[0] ?? "—"
  row.appendChild(valueEl)

  // Delta
  const delta = node.fields[1]
  if (delta) {
    const deltaEl = document.createElement("div")
    deltaEl.className = "wt-metric-delta"
    const isPos = delta.startsWith("+")
    const isNeg = delta.startsWith("-")
    deltaEl.classList.add(isPos ? "positive" : isNeg ? "negative" : "")
    deltaEl.textContent = delta
    row.appendChild(deltaEl)
  }

  el.appendChild(row)

  // Sparkline SVG placeholder
  const sparkType = (node.fields[2] ?? "line").toLowerCase()
  const spark = document.createElement("div")
  spark.className = "wt-metric-spark"

  const svgNS = "http://www.w3.org/2000/svg"
  const svg = document.createElementNS(svgNS, "svg")
  svg.setAttribute("viewBox", "0 0 120 40")
  svg.setAttribute("preserveAspectRatio", "none")

  if (sparkType === "bar") {
    // Simple bar chart
    const barData = [15, 28, 22, 35, 18, 42, 30, 45, 25, 38]
    const barWidth = 8
    const gap = 4
    barData.forEach((h, i) => {
      const rect = document.createElementNS(svgNS, "rect")
      rect.setAttribute("x", String(i * (barWidth + gap) + 2))
      rect.setAttribute("y", String(40 - h))
      rect.setAttribute("width", String(barWidth))
      rect.setAttribute("height", String(h))
      rect.setAttribute("fill", "var(--wiretext-color-primary, #2563EB)")
      rect.setAttribute("opacity", "0.6")
      svg.appendChild(rect)
    })
  } else {
    // Line or area chart
    const points = [8,25,15,30,20,35,25,28,32,38,28,42].map((y, i) => `${i * 11},${40 - y}`).join(" ")
    if (sparkType === "area") {
      const area = document.createElementNS(svgNS, "polygon")
      const areaPoints = `0,40 ${points} 120,40`
      area.setAttribute("points", areaPoints)
      area.setAttribute("fill", "var(--wiretext-color-primary, #2563EB)")
      area.setAttribute("opacity", "0.15")
      svg.appendChild(area)
    }
    const polyline = document.createElementNS(svgNS, "polyline")
    polyline.setAttribute("points", points)
    polyline.setAttribute("fill", "none")
    polyline.setAttribute("stroke", "var(--wiretext-color-primary, #2563EB)")
    polyline.setAttribute("stroke-width", "2")
    polyline.setAttribute("stroke-linecap", "round")
    polyline.setAttribute("stroke-linejoin", "round")
    svg.appendChild(polyline)
  }

  spark.appendChild(svg)
  el.appendChild(spark)

  return { element: el, errors: [] }
})
