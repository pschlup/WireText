// Component line parser — parses a single DSL line into structured fields.
// Handles icons, transitions, quoted strings, pipe-separated fields, modifiers,
// and the special nav/tabs/breadcrumb item-splitting mode.
import type { Modifier, Transition, ComponentNode, ParseError } from "../types.js"

/**
 * Result of parsing a single component line.
 * isSlot/isRow distinguish the three structural line variants.
 */
export interface ParsedLine {
  type:       string
  text:       string
  fields:     string[]
  icon:       string | null
  modifiers:  Modifier[]
  transition: Transition | null
  /** True when the line starts with '.' (slot definition). */
  isSlot:     boolean
  /** The slot name extracted after the dot, e.g. "logo" for ".logo Acme". */
  slotName:   string
  /** True when the component type is "row". */
  isRow:      boolean
  /** Explicit column widths for "row N, N" syntax; null for plain "row". */
  rowColumns: number[] | null
}

// Components whose pipes split into items instead of fields.
const ITEM_MODE_TYPES = new Set(["nav", "tabs", "breadcrumb"])

// Components that should NOT carry transitions (produces warn + discard).
const NON_INTERACTIVE_TYPES = new Set([
  "card", "modal", "drawer", "details",
  "text", "heading", "subtext", "badge", "avatar", "icon", "divider", "spacer",
  "progress", "tag", "input", "select", "checkbox", "radio", "toggle", "textarea",
  "datepicker", "search", "slider", "rating", "table", "stat", "chart", "feed",
  "kanban", "calendar", "skeleton", "pagination", "hamburger", "tree",
  "callout", "toast", "tooltip", "alert",
])

/**
 * Parse a single body component line string into a ParsedLine.
 * The caller is responsible for stripping leading indentation before passing content.
 * Errors are pushed into the provided array (partial results always returned).
 */
export function parseLine(
  content:       string,
  lineNum:       number,
  blockPosition: number,
  errors:        ParseError[],
): ParsedLine {
  // Slot line: starts with '.'
  if (content.startsWith(".")) {
    return parseSlotLine(content, lineNum, blockPosition, errors)
  }
  return parseComponentLine(content, lineNum, blockPosition, errors)
}

// ---------------------------------------------------------------------------
// Slot line: .slot-name [content...]
// ---------------------------------------------------------------------------

function parseSlotLine(
  content:       string,
  lineNum:       number,
  blockPosition: number,
  errors:        ParseError[],
): ParsedLine {
  // Extract slot name: everything from '.' to the first space (or end)
  const afterDot    = content.slice(1) // drop the leading '.'
  const spaceIdx    = afterDot.search(/\s/)
  const slotName    = spaceIdx === -1 ? afterDot : afterDot.slice(0, spaceIdx)
  const rest        = spaceIdx === -1 ? "" : afterDot.slice(spaceIdx + 1)

  const parsed = parseContentTokens(rest, "." + slotName, lineNum, blockPosition, errors)

  return {
    ...parsed,
    type:     "." + slotName,
    isSlot:   true,
    slotName,
    isRow:    false,
    rowColumns: null,
  }
}

// ---------------------------------------------------------------------------
// Component line: type [~icon] [text] [| fields...] [→ target] [modifiers]
// ---------------------------------------------------------------------------

function parseComponentLine(
  content:       string,
  lineNum:       number,
  blockPosition: number,
  errors:        ParseError[],
): ParsedLine {
  // Extract the component type (first whitespace-delimited token)
  const spaceIdx = content.search(/\s/)
  const type     = spaceIdx === -1 ? content : content.slice(0, spaceIdx)
  const rest     = spaceIdx === -1 ? "" : content.slice(spaceIdx + 1)

  // Row component gets its own handling
  if (type === "row") {
    return parseRowLine(rest, lineNum, blockPosition, errors)
  }

  const parsed = parseContentTokens(rest, type, lineNum, blockPosition, errors)

  // Validate and discard transitions on non-interactive components
  if (parsed.transition !== null && NON_INTERACTIVE_TYPES.has(type)) {
    errors.push({
      severity:      "warn",
      message:       `Transition on non-interactive component "${type}" will be ignored`,
      line:          lineNum,
      blockPosition,
    })
    parsed.transition = null
  }

  return {
    ...parsed,
    type,
    isSlot:     false,
    slotName:   "",
    isRow:      false,
    rowColumns: null,
  }
}

// ---------------------------------------------------------------------------
// Row line: parses explicit column widths (e.g. "6, 6" or "3, 9") or plain "row"
// ---------------------------------------------------------------------------

function parseRowLine(
  rest:          string,
  lineNum:       number,
  blockPosition: number,
  errors:        ParseError[],
): ParsedLine {
  const trimmed = rest.trim()
  let rowColumns: number[] | null = null

  if (trimmed !== "") {
    // Attempt to parse as comma-separated integers
    const parts = trimmed.split(",").map(p => p.trim())
    const cols  = parts.map(p => parseInt(p, 10))
    if (cols.some(isNaN)) {
      errors.push({
        severity:      "error",
        message:       `Invalid row column widths: "${trimmed}" — expected comma-separated integers`,
        line:          lineNum,
        blockPosition,
      })
    } else {
      rowColumns = cols
    }
  }

  return {
    type:       "row",
    text:       "",
    fields:     [],
    icon:       null,
    modifiers:  [],
    transition: null,
    isSlot:     false,
    slotName:   "",
    isRow:      true,
    rowColumns,
  }
}

// ---------------------------------------------------------------------------
// Content token parser: handles the portion after the component type (or slot name).
// Used for both component and slot lines.
// ---------------------------------------------------------------------------

interface ParsedContent {
  text:       string
  fields:     string[]
  icon:       string | null
  modifiers:  Modifier[]
  transition: Transition | null
}

function parseContentTokens(
  rest:          string,
  componentType: string, // used to detect item-mode and avatar trailing icon
  lineNum:       number,
  blockPosition: number,
  errors:        ParseError[],
): ParsedContent {
  // 1. Extract transition (→ or ->) — must happen before pipe splitting
  //    to avoid → appearing in field values confusing the pipe split.
  let transition: Transition | null = null
  let restNoTransition = rest

  // Match → or -> followed by the target (to end of string or next significant token)
  // We extract the LAST → since modifiers come after text but before transition is unusual.
  // Per spec: "→ target" is extracted first, then remove from string.
  const arrowMatch = rest.match(/(→|->)\s*(\S+)\s*$/)
  if (arrowMatch) {
    const target = arrowMatch[2]!
    transition   = buildTransition(target)
    // Remove the transition arrow + target from the rest string
    restNoTransition = rest.slice(0, arrowMatch.index).trimEnd()
  }

  // 2. Detect item-mode (nav/tabs/breadcrumb): pipes split into items.
  // The tree builder calls parseNavItems separately; here we just return empty content
  // so the parent ComponentNode gets populated by the tree builder.
  const bareType = componentType.startsWith(".") ? componentType.slice(1) : componentType
  if (ITEM_MODE_TYPES.has(bareType)) {
    return {
      text:       "",
      fields:     [],
      icon:       null,
      modifiers:  [],
      // A transition on the nav line itself is unusual but preserved
      transition,
    }
  }

  // 3. Extract leading ~icon (immediately after component type, before any text)
  let icon: string | null = null
  let workStr = restNoTransition

  const iconMatch = workStr.match(/^~([\w-]+)(\s|$)/)
  if (iconMatch) {
    icon    = iconMatch[1]!
    workStr = workStr.slice(iconMatch[0].length)
  }

  // 4. Quoted string handling: replace quoted segments with placeholders
  //    to prevent pipe/modifier parsing inside quotes, then restore.
  const quotedSegments: string[] = []
  workStr = workStr.replace(/"([^"]*)"/g, (_match, inner: string) => {
    const idx = quotedSegments.length
    quotedSegments.push(inner)
    return `\x00Q${idx}\x00`
  })

  // 5. Split on pipe
  const rawSegments = workStr.split("|").map(s => s.trim())

  // 6. Extract modifiers from the PRIMARY TEXT segment (first segment).
  //    Per spec: modifiers appear at the end of the primary text or the last segment.
  //    The test case "input Password* | Enter your password" confirms * is extracted
  //    from the primary text even when additional fields follow.
  //    For the LAST segment, modifiers are also extracted (handles "button Save+").
  //    When there is only one segment, both rules converge.
  const firstSegIdx                           = 0
  const lastSegIdx                            = rawSegments.length - 1
  const modifiers: ReturnType<typeof extractTrailingModifiers>["modifiers"] = []

  // Extract from primary text (first segment)
  const { text: firstText, modifiers: firstMods } = extractTrailingModifiers(rawSegments[firstSegIdx] ?? "")
  modifiers.push(...firstMods)
  rawSegments[firstSegIdx] = firstText

  // Extract from last segment too (if different from first — avoids double extraction)
  if (lastSegIdx !== firstSegIdx) {
    const { text: lastText, modifiers: lastMods } = extractTrailingModifiers(rawSegments[lastSegIdx] ?? "")
    modifiers.push(...lastMods)
    rawSegments[lastSegIdx] = lastText
  }

  // Avatar special case: trailing ~icon after text (e.g. "avatar Alice ~caret-down")
  // After modifier extraction, check if the primary text ends with ~icon-name
  let trailingIcon: string | null = null
  if (bareType === "avatar") {
    const trailingIconMatch = (rawSegments[firstSegIdx] ?? "").match(/^(.*?)\s+~([\w-]+)\s*$/)
    if (trailingIconMatch) {
      rawSegments[firstSegIdx] = trailingIconMatch[1]!.trim()
      trailingIcon             = trailingIconMatch[2]!
    }
  }

  // Use trailing icon for avatar if no leading icon was found
  if (trailingIcon !== null && icon === null) {
    icon = trailingIcon
  }

  // 7. Restore quoted segments
  const segments = rawSegments.map(seg =>
    seg.replace(/\x00Q(\d+)\x00/g, (_m, idx: string) => quotedSegments[parseInt(idx, 10)] ?? ""),
  )

  // 8. Primary text = first segment; additional segments = fields
  const primaryText = segments[0] ?? ""
  const fields      = segments.slice(1)

  // 9. link special case: if both | url field and → transition exist, keep transition
  if (bareType === "link" && transition !== null && fields.length > 0) {
    // Check if the first field looks like a URL (starts with / or http)
    const urlField = fields[0] ?? ""
    if (urlField.startsWith("/") || urlField.startsWith("http")) {
      errors.push({
        severity:      "warn",
        message:       `link has both | url field and → transition; transition takes precedence, url field removed`,
        line:          lineNum,
        blockPosition,
      })
      fields.splice(0, 1)
    }
  }

  return {
    text:       primaryText.trim(),
    fields:     fields.map(f => f.trim()),
    icon,
    modifiers,
    transition,
  }
}

// ---------------------------------------------------------------------------
// Nav/tabs/breadcrumb item parsing
// ---------------------------------------------------------------------------

/**
 * Parse a nav/tabs/breadcrumb content string (the portion after the component type)
 * into an array of child ComponentNode items.
 * Each pipe-separated segment becomes one item node.
 */
export function parseNavItems(
  content:       string,
  isBreadcrumb:  boolean,
  lineNum:       number,
  blockPosition: number,
  errors:        ParseError[],
): ComponentNode[] {
  // Extract any trailing transition from the whole line first
  // (This handles the case where the entire nav line has a trailing →,
  //  but per spec transitions are per-item, so this should be unusual.)

  const segments = splitOnPipesRespectingQuotes(content)
  const items: ComponentNode[] = []

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!.trim()
    const isLast = i === segments.length - 1

    // Divider item
    if (seg === "---") {
      items.push({
        type:       "item",
        text:       "---",
        fields:     [],
        icon:       null,
        modifiers:  [],
        transition: null,
        slots:      new Map(),
        children:   [],
        rowColumns: null,
      })
      continue
    }

    // Parse individual item segment
    let itemStr = seg

    // Extract trailing transition from item segment
    let itemTransition: Transition | null = null
    const arrowMatch = itemStr.match(/(→|->)\s*(\S+)\s*$/)
    if (arrowMatch) {
      const target    = arrowMatch[2]!
      itemTransition  = buildTransition(target)
      itemStr         = itemStr.slice(0, arrowMatch.index).trimEnd()
    }

    // Breadcrumb last item: transition is discarded (current page rule)
    if (isBreadcrumb && isLast && itemTransition !== null) {
      itemTransition = null
    }

    // Extract leading icon
    let itemIcon: string | null = null
    const iconMatch = itemStr.match(/^~([\w-]+)(\s|$)/)
    if (iconMatch) {
      itemIcon = iconMatch[1]!
      itemStr  = itemStr.slice(iconMatch[0].length)
    }

    // Handle quoted string in item
    const quotedParts: string[] = []
    itemStr = itemStr.replace(/"([^"]*)"/g, (_m, inner: string) => {
      const idx = quotedParts.length
      quotedParts.push(inner)
      return `\x00Q${idx}\x00`
    })

    // Extract trailing modifiers
    const { text: itemText, modifiers: itemModifiers } = extractTrailingModifiers(itemStr.trim())

    // Restore quoted parts
    const finalText = itemText.replace(
      /\x00Q(\d+)\x00/g,
      (_m, idx: string) => quotedParts[parseInt(idx, 10)] ?? "",
    ).trim()

    items.push({
      type:       "item",
      text:       finalText,
      fields:     [],
      icon:       itemIcon,
      modifiers:  itemModifiers,
      transition: itemTransition,
      slots:      new Map(),
      children:   [],
      rowColumns: null,
    })
  }

  return items
}

// ---------------------------------------------------------------------------
// CSV slot item parsing (.actions, .items)
// ---------------------------------------------------------------------------

/**
 * Parse a CSV-style slot value into item nodes with optional per-item transitions.
 * Used for .actions, .items, .bulk-actions slots.
 * Items are comma-separated; each may have its own "→ target".
 */
export function parseCsvItems(
  content:       string,
  lineNum:       number,
  blockPosition: number,
  errors:        ParseError[],
): ComponentNode[] {
  // Split on commas, but respect → to avoid splitting inside transition targets
  const parts = content.split(",").map(p => p.trim()).filter(p => p.length > 0)
  const items: ComponentNode[] = []

  for (const part of parts) {
    if (part === "---") {
      items.push({
        type:       "item",
        text:       "---",
        fields:     [],
        icon:       null,
        modifiers:  [],
        transition: null,
        slots:      new Map(),
        children:   [],
        rowColumns: null,
      })
      continue
    }

    let itemStr = part
    let itemTransition: Transition | null = null

    const arrowMatch = itemStr.match(/(→|->)\s*(\S+)\s*$/)
    if (arrowMatch) {
      itemTransition = buildTransition(arrowMatch[2]!)
      itemStr        = itemStr.slice(0, arrowMatch.index).trimEnd()
    }

    let icon: string | null = null
    const iconMatch = itemStr.match(/^~([\w-]+)(\s|$)/)
    if (iconMatch) {
      icon    = iconMatch[1]!
      itemStr = itemStr.slice(iconMatch[0].length)
    }

    const { text, modifiers } = extractTrailingModifiers(itemStr.trim())

    items.push({
      type:       "item",
      text,
      fields:     [],
      icon,
      modifiers,
      transition: itemTransition,
      slots:      new Map(),
      children:   [],
      rowColumns: null,
    })
  }

  return items
}

/**
 * Parse a .row slot's pipe-separated cells in item mode.
 * Each pipe-separated segment is parsed as a ComponentNode (type "item").
 */
export function parseRowCells(
  content:       string,
  lineNum:       number,
  blockPosition: number,
  errors:        ParseError[],
): ComponentNode[] {
  const segments = splitOnPipesRespectingQuotes(content)
  const cells: ComponentNode[] = []

  for (const seg of segments) {
    let cellStr = seg.trim()
    let cellTransition: Transition | null = null

    const arrowMatch = cellStr.match(/(→|->)\s*(\S+)\s*$/)
    if (arrowMatch) {
      cellTransition = buildTransition(arrowMatch[2]!)
      cellStr        = cellStr.slice(0, arrowMatch.index).trimEnd()
    }

    let icon: string | null = null
    const iconMatch = cellStr.match(/^~([\w-]+)(\s|$)/)
    if (iconMatch) {
      icon    = iconMatch[1]!
      cellStr = cellStr.slice(iconMatch[0].length)
    }

    const { text, modifiers } = extractTrailingModifiers(cellStr.trim())

    cells.push({
      type:       "item",
      text,
      fields:     [],
      icon,
      modifiers,
      transition: cellTransition,
      slots:      new Map(),
      children:   [],
      rowColumns: null,
    })
  }

  return cells
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Extract trailing modifier tokens from the end of a text segment.
 * Modifiers: * (active), + (primary), +N (badge count).
 * Only matches modifiers at the very END of the string.
 * "+18%" in the middle is literal text, not a badge.
 */
function extractTrailingModifiers(text: string): { text: string; modifiers: Modifier[] } {
  const modifiers: Modifier[] = []
  let working = text

  // Loop to handle multiple trailing modifiers (e.g. "Foo*+3")
  let changed = true
  while (changed) {
    changed = false

    // Match +N badge at end (only pure integer, not +18% or +text)
    const badgeMatch = working.match(/\+(\d+)$/)
    if (badgeMatch) {
      modifiers.unshift({ type: "badge", count: parseInt(badgeMatch[1]!, 10) })
      working = working.slice(0, -badgeMatch[0].length).trimEnd()
      changed = true
      continue
    }

    // Match + (primary) at end — must not be followed by digits
    if (working.endsWith("+")) {
      modifiers.unshift({ type: "primary" })
      working = working.slice(0, -1).trimEnd()
      changed = true
      continue
    }

    // Match * (active) at end
    if (working.endsWith("*")) {
      modifiers.unshift({ type: "active" })
      working = working.slice(0, -1).trimEnd()
      changed = true
      continue
    }
  }

  return { text: working.trim(), modifiers }
}

/** Build a Transition object from the raw target string (with or without # / !). */
function buildTransition(target: string): Transition {
  if (target.startsWith("#")) {
    return { type: "overlay", target }
  }
  if (target.startsWith("!")) {
    return { type: "action", target }
  }
  return { type: "screen", target }
}

/**
 * Split a string on pipe characters, but not inside double-quoted substrings.
 * Returns the raw (non-trimmed) segments.
 */
function splitOnPipesRespectingQuotes(str: string): string[] {
  const segments: string[] = []
  let current  = ""
  let inQuotes = false

  for (let i = 0; i < str.length; i++) {
    const ch = str[i]!
    if (ch === '"') {
      inQuotes = !inQuotes
      current += ch
    } else if (ch === "|" && !inQuotes) {
      segments.push(current)
      current = ""
    } else {
      current += ch
    }
  }
  segments.push(current)
  return segments
}
