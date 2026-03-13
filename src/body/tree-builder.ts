// Tree builder — assembles tokenized lines into the full ParsedBody structure.
// Handles zone labels (@zone), overlay blocks (#id), inline journey screens (screen: id),
// slots (.name), rows, and general parent-child nesting via indentation.
import type {
  ParsedBody,
  ComponentNode,
  SlotNode,
  BlockType,
  ParseError,
} from "../types.js"
import { ZONE_NAMES, HEADER_FOOTER_ZONES } from "../types.js"
import type { LineToken } from "./tokenizer.js"
import {
  parseLine,
  parseNavItems,
  parseCsvItems,
  parseRowCells,
} from "./component-parser.js"

// (HEADER_FOOTER_ZONES imported from types.ts)

// Components whose .items/.actions slots use CSV item splitting.
const CSV_SLOT_NAMES = new Set(["items", "actions", "bulk-actions"])

// (ZONE_NAMES imported from types.ts — replaces local ZONE_NAMES)

// Item-mode navigation components.
const NAV_ITEM_TYPES = new Set(["nav", "tabs", "breadcrumb", "stepper", "filter-bar", "bottom-nav"])

// Valid root children for overlay blocks.
const OVERLAY_ROOT_TYPES = new Set(["modal", "drawer", "alert"])

/**
 * Build a ParsedBody from tokenized lines, given the block type.
 * Returns partial results alongside any errors encountered.
 */
export function buildTree(
  tokens:        LineToken[],
  blockType:     BlockType,
  blockPosition: number,
): { body: ParsedBody; errors: ParseError[] } {
  const errors: ParseError[] = []

  const body: ParsedBody = {
    zones:    new Map(),
    overlays: new Map(),
    screens:  new Map(),
    tokens:   null,
  }

  if (blockType === "journey") {
    buildJourneyTree(tokens, body, blockPosition, errors)
  } else {
    buildScreenOrMacroTree(tokens, body, blockType, blockPosition, errors)
  }

  return { body, errors }
}

// ---------------------------------------------------------------------------
// Journey body: only screen: blocks allowed at indent 0
// ---------------------------------------------------------------------------

function buildJourneyTree(
  tokens:        LineToken[],
  body:          ParsedBody,
  blockPosition: number,
  errors:        ParseError[],
): void {
  let i = 0

  while (i < tokens.length) {
    const token = tokens[i]!

    if (token.indent !== 0) {
      // Content not under a screen: — this can be properly indented content
      // that belongs to a currently-open screen. If we reach indent > 0 without
      // a current screen, it's an error. We handle this inside the screen block
      // parsing; orphaned non-zero lines here are errors.
      errors.push({
        severity:      "error",
        message:       `Unexpected indented content in journey body outside a screen: block`,
        line:          token.lineNum,
        blockPosition,
      })
      i++
      continue
    }

    // screen: id — inline screen definition
    const screenMatch = token.content.match(/^screen:\s*([a-z0-9-]+)$/)
    if (screenMatch) {
      const screenId = screenMatch[1]!
      i++
      // Collect all tokens that are indented below this screen: label
      const screenTokens: LineToken[] = []
      while (i < tokens.length && tokens[i]!.indent > 0) {
        // Re-base indent: subtract 1 from each level (screen content is at "relative 0")
        screenTokens.push({ ...tokens[i]!, indent: tokens[i]!.indent - 1 })
        i++
      }
      // Validate: no zone labels inside inline screens
      for (const st of screenTokens) {
        if (st.indent === 0 && st.content.startsWith("@")) {
          errors.push({
            severity:      "error",
            message:       `Zone labels not allowed inside inline journey screens`,
            line:          st.lineNum,
            blockPosition,
          })
        }
      }
      // Build the main zone components for this screen
      const screenComponents = buildComponentList(screenTokens, 0, null, blockPosition, errors)
      body.screens.set(screenId, screenComponents)
      continue
    }

    // Overlay #id definitions are NOT allowed in journey bodies
    if (token.content.startsWith("#")) {
      errors.push({
        severity:      "error",
        message:       `Overlay #id definitions are only valid in screen bodies, not journey bodies`,
        line:          token.lineNum,
        blockPosition,
      })
      i++
      // Skip overlay content
      while (i < tokens.length && tokens[i]!.indent > 0) i++
      continue
    }

    // Any non-screen content at indent 0 in a journey body is an error
    errors.push({
      severity:      "error",
      message:       `Journey body may only contain "screen: id" blocks — unexpected: "${token.content}"`,
      line:          token.lineNum,
      blockPosition,
    })
    i++
    // Skip any indented content below this invalid line
    while (i < tokens.length && tokens[i]!.indent > 0) i++
  }
}

// ---------------------------------------------------------------------------
// Screen / macro body: zone labels, overlays, component trees
// ---------------------------------------------------------------------------

function buildScreenOrMacroTree(
  tokens:        LineToken[],
  body:          ParsedBody,
  blockType:     BlockType,
  blockPosition: number,
  errors:        ParseError[],
): void {
  // First pass: check if any zone labels exist at indent 0
  const hasZoneLabels = tokens.some(
    t => t.indent === 0 && t.content.startsWith("@"),
  )

  let i          = 0
  let hasMain    = false
  // Track unlabeled content found outside any @ zone (will become implicit @main)
  const implicitMainTokens: LineToken[] = []
  let inImplicitMain = !hasZoneLabels

  if (!hasZoneLabels) {
    // Implicit @main: scan the body for overlay blocks (#id at indent 0) and
    // screen: separators, then build @main from the remaining tokens.
    const mainTokens: LineToken[] = []
    let j = 0

    while (j < tokens.length) {
      const t = tokens[j]!

      if (t.indent === 0 && t.content.startsWith("#")) {
        // Overlay block — extract it (only valid in screen bodies)
        if (blockType === "macro") {
          errors.push({
            severity:      "error",
            message:       `Overlay #id definitions are not allowed in macro bodies`,
            line:          t.lineNum,
            blockPosition,
          })
          j++
          while (j < tokens.length && tokens[j]!.indent > 0) j++
          continue
        }

        const overlayId = t.content.slice(1).trim()
        j++
        const overlayTokens: LineToken[] = []
        while (j < tokens.length && tokens[j]!.indent > 0) {
          overlayTokens.push({ ...tokens[j]!, indent: tokens[j]!.indent - 1 })
          j++
        }
        const overlayComponents = buildComponentList(overlayTokens, 0, null, blockPosition, errors)
        const firstChild = overlayComponents[0]
        if (!firstChild) {
          errors.push({
            severity:      "warn",
            message:       `Overlay "#${overlayId}" has no content`,
            line:          t.lineNum,
            blockPosition,
          })
        } else if (!OVERLAY_ROOT_TYPES.has(firstChild.type)) {
          errors.push({
            severity:      "error",
            message:       `Overlay "#${overlayId}" root child must be modal, drawer, or alert (found "${firstChild.type}")`,
            line:          t.lineNum,
            blockPosition,
          })
        }
        body.overlays.set(overlayId, overlayComponents)
        continue
      }

      if (t.indent === 0 && t.content.match(/^screen:\s*/)) {
        errors.push({
          severity:      "error",
          message:       `"screen:" separator is only valid in journey bodies`,
          line:          t.lineNum,
          blockPosition,
        })
        j++
        while (j < tokens.length && tokens[j]!.indent > 0) j++
        continue
      }

      // Regular content — accumulate for @main
      mainTokens.push(t)
      j++
      // Also include indented children
      while (j < tokens.length && tokens[j]!.indent > 0) {
        mainTokens.push(tokens[j]!)
        j++
      }
    }

    const components = buildComponentList(mainTokens, 0, null, blockPosition, errors)
    body.zones.set("main", components)
    return
  }

  // Has zone labels: iterate, collecting zone/overlay blocks
  while (i < tokens.length) {
    const token = tokens[i]!

    if (token.indent !== 0) {
      // Unlabeled indented content between zone blocks → implicit @main
      // This shouldn't happen since zones are at indent 0, but handle defensively
      implicitMainTokens.push(token)
      i++
      continue
    }

    // Zone label: @zone-name [width]
    if (token.content.startsWith("@")) {
      const zoneStr    = token.content.slice(1).trim() // e.g. "sidebar 3" or "main"
      const zoneParts  = zoneStr.split(/\s+/)
      const zoneName   = zoneParts[0] ?? ""

      if (!ZONE_NAMES.has(zoneName)) {
        errors.push({
          severity:      "error",
          message:       `Unknown zone "@${zoneName}" — allowed: header, sidebar, main, aside, footer`,
          line:          token.lineNum,
          blockPosition,
        })
        i++
        while (i < tokens.length && tokens[i]!.indent > 0) i++
        continue
      }

      // Parse optional column width
      if (zoneParts.length > 1) {
        const widthStr = zoneParts[1]!
        const width    = parseInt(widthStr, 10)
        if (isNaN(width) || String(width) !== widthStr) {
          errors.push({
            severity:      "error",
            message:       `Non-integer zone width "@${zoneName} ${widthStr}"`,
            line:          token.lineNum,
            blockPosition,
          })
        }
        // Width is recorded in the zone name as a metadata concern for the layout engine.
        // The body parser stores it as a special "@zone:N" key.
        // Per spec, the width is communicated to the layout engine; we store it in a
        // separate metadata entry using the key format "<zone>:width".
        // For now, we record it as a sibling entry — the layout engine reads it.
        // We encode it as a fake ComponentNode with type "zone-width" and text = width string.
        // Actually, looking at the types, ParsedBody.zones is Map<string,ComponentNode[]>.
        // The cleanest approach: store the width in a "width" entry in the zones map using
        // key "@sidebar:width" as a convention. But this is outside the scope of the parser.
        // The parser's job is just to produce the component tree; the layout engine handles widths.
        // We can encode it as the first component having type "zone-width" — but that pollutes
        // the component tree. Better: just proceed and let the layout engine infer from zone name + spec defaults.
        // The acceptance criteria says "Zone width integer parsed" — we validate it above.
        // For now, we will inject a virtual node with type "_zone-width" and text = the integer string.
        // The layout engine can recognize and consume this node.
      }

      if (body.zones.has(zoneName)) {
        // Explicit @main + unlabeled content → error already handled above
        // Duplicate explicit zone → error
        if (zoneName === "main" && implicitMainTokens.length > 0) {
          errors.push({
            severity:      "error",
            message:       `Duplicate @main: explicit @main zone found after unlabeled content (which would become implicit @main)`,
            line:          token.lineNum,
            blockPosition,
          })
        } else {
          errors.push({
            severity:      "error",
            message:       `Duplicate zone "@${zoneName}" in body`,
            line:          token.lineNum,
            blockPosition,
          })
        }
        i++
        while (i < tokens.length && tokens[i]!.indent > 0) i++
        continue
      }

      if (zoneName === "main") {
        if (implicitMainTokens.length > 0) {
          errors.push({
            severity:      "error",
            message:       `Explicit @main zone found after unlabeled content (which would become implicit @main) — duplicate @main`,
            line:          token.lineNum,
            blockPosition,
          })
        }
        hasMain = true
      }

      i++

      // Collect zone body tokens (all lines with indent > 0 following this zone label)
      const zoneTokens: LineToken[] = []
      while (i < tokens.length && tokens[i]!.indent > 0) {
        zoneTokens.push({ ...tokens[i]!, indent: tokens[i]!.indent - 1 })
        i++
      }

      // Build component tree for this zone
      // For @header and @footer: left/right sub-slot handling
      let components: ComponentNode[]
      if (HEADER_FOOTER_ZONES.has(zoneName)) {
        components = buildHeaderFooterZone(zoneTokens, zoneName, blockPosition, errors)
      } else {
        components = buildComponentList(zoneTokens, 0, null, blockPosition, errors)
      }

      // Store width annotation as first child if specified
      if (zoneParts.length > 1) {
        const width = parseInt(zoneParts[1]!, 10)
        if (!isNaN(width)) {
          components = [
            {
              type:       "_zone-width",
              text:       String(width),
              fields:     [],
              icon:       null,
              modifiers:  [],
              transition: null,
              slots:      new Map(),
              children:   [],
              rowColumns: null,
            },
            ...components,
          ]
        }
      }

      body.zones.set(zoneName, components)
      continue
    }

    // Overlay block: #id at indent 0 (only in screen bodies)
    if (token.content.startsWith("#")) {
      if (blockType === "macro") {
        errors.push({
          severity:      "error",
          message:       `Overlay #id definitions are not allowed in macro bodies`,
          line:          token.lineNum,
          blockPosition,
        })
        i++
        while (i < tokens.length && tokens[i]!.indent > 0) i++
        continue
      }

      const overlayId = token.content.slice(1).trim()
      i++

      const overlayTokens: LineToken[] = []
      while (i < tokens.length && tokens[i]!.indent > 0) {
        overlayTokens.push({ ...tokens[i]!, indent: tokens[i]!.indent - 1 })
        i++
      }

      const overlayComponents = buildComponentList(overlayTokens, 0, null, blockPosition, errors)

      // Validate: first child must be modal, drawer, or alert
      const firstChild = overlayComponents[0]
      if (!firstChild) {
        errors.push({
          severity:      "warn",
          message:       `Overlay "#${overlayId}" has no content`,
          line:          token.lineNum,
          blockPosition,
        })
      } else if (!OVERLAY_ROOT_TYPES.has(firstChild.type)) {
        errors.push({
          severity:      "error",
          message:       `Overlay "#${overlayId}" root child must be modal, drawer, or alert (found "${firstChild.type}")`,
          line:          token.lineNum,
          blockPosition,
        })
      }

      body.overlays.set(overlayId, overlayComponents)
      continue
    }

    // screen: separator in non-journey body is an error
    if (token.content.match(/^screen:\s*/)) {
      errors.push({
        severity:      "error",
        message:       `"screen:" separator is only valid in journey bodies`,
        line:          token.lineNum,
        blockPosition,
      })
      i++
      while (i < tokens.length && tokens[i]!.indent > 0) i++
      continue
    }

    // Unlabeled content at indent 0 while zone labels exist
    // This becomes implicit @main content
    // If @main was already explicitly defined, this is a conflict
    if (body.zones.has("main")) {
      errors.push({
        severity:      "error",
        message:       `Unlabeled content found after explicit @main zone — would create duplicate @main`,
        line:          token.lineNum,
        blockPosition,
      })
      i++
      continue
    }

    // Collect implicit main tokens: this line + all indented below it
    implicitMainTokens.push(token)
    i++
    while (i < tokens.length && tokens[i]!.indent > 0) {
      implicitMainTokens.push(tokens[i]!)
      i++
    }
  }

  // Finalize implicit @main from unlabeled content
  if (implicitMainTokens.length > 0 && !body.zones.has("main")) {
    const components = buildComponentList(implicitMainTokens, 0, null, blockPosition, errors)
    body.zones.set("main", components)
  }
}

// ---------------------------------------------------------------------------
// @header / @footer zone: handle left/right sub-slots
// ---------------------------------------------------------------------------

function buildHeaderFooterZone(
  tokens:        LineToken[],
  zoneName:      string,
  blockPosition: number,
  errors:        ParseError[],
): ComponentNode[] {
  // Check if any direct children (indent 0) are "left" or "right"
  const hasSubSlots = tokens.some(
    t => t.indent === 0 && (t.content === "left" || t.content === "right"),
  )

  if (!hasSubSlots) {
    // No sub-slots — all content treated normally
    return buildComponentList(tokens, 0, null, blockPosition, errors)
  }

  // Build sub-slot containers: left and right become ComponentNode with type "left"/"right"
  const result: ComponentNode[] = []
  let i = 0

  while (i < tokens.length) {
    const token = tokens[i]!

    if (token.indent === 0 && (token.content === "left" || token.content === "right")) {
      const slotType = token.content // "left" or "right"
      i++
      const slotTokens: LineToken[] = []
      while (i < tokens.length && tokens[i]!.indent > 0) {
        slotTokens.push({ ...tokens[i]!, indent: tokens[i]!.indent - 1 })
        i++
      }
      const children = buildComponentList(slotTokens, 0, null, blockPosition, errors)
      result.push({
        type:       slotType,
        text:       "",
        fields:     [],
        icon:       null,
        modifiers:  [],
        transition: null,
        slots:      new Map(),
        children,
        rowColumns: null,
      })
      continue
    }

    // Component directly in header/footer (no sub-slot) — treat as component
    const component = buildSingleComponent(token, tokens, i, blockPosition, errors)
    result.push(component.node)
    i = component.nextIndex
  }

  return result
}

// ---------------------------------------------------------------------------
// Core component tree builder — processes a flat list of tokens into a tree
// ---------------------------------------------------------------------------

/**
 * Build a component list from a token slice starting at the given base indent.
 * The parentZone parameter is used to validate left/right sub-slot placement.
 */
function buildComponentList(
  tokens:        LineToken[],
  baseIndent:    number,
  parentZone:    string | null,
  blockPosition: number,
  errors:        ParseError[],
): ComponentNode[] {
  const result: ComponentNode[] = []
  let i = 0

  while (i < tokens.length) {
    const token = tokens[i]!

    if (token.indent !== baseIndent) {
      // This token belongs to a different nesting level — skip (handled by parent)
      i++
      continue
    }

    const { node, nextIndex } = buildSingleComponent(
      token, tokens, i, blockPosition, errors, parentZone,
    )
    result.push(node)
    i = nextIndex
  }

  return result
}

/**
 * Build a single ComponentNode from a token at `tokens[startIdx]`, plus its
 * indented children. Returns the node and the next index to process.
 */
function buildSingleComponent(
  token:         LineToken,
  tokens:        LineToken[],
  startIdx:      number,
  blockPosition: number,
  errors:        ParseError[],
  parentZone:    string | null = null,
): { node: ComponentNode; nextIndex: number } {
  const parsed = parseLine(token.content, token.lineNum, blockPosition, errors)

  // left/right outside @header/@footer → warn and treat as unknown component
  if ((parsed.type === "left" || parsed.type === "right") && !parsed.isSlot) {
    if (parentZone !== "header" && parentZone !== "footer") {
      errors.push({
        severity:      "warn",
        message:       `"${parsed.type}" is only valid as a direct child of @header or @footer — treating as unknown component`,
        line:          token.lineNum,
        blockPosition,
      })
    }
  }

  const node: ComponentNode = {
    type:       parsed.type,
    text:       parsed.text,
    fields:     parsed.fields,
    icon:       parsed.icon,
    modifiers:  parsed.modifiers,
    transition: parsed.transition,
    slots:      new Map(),
    children:   [],
    rowColumns: parsed.rowColumns,
  }

  // For nav/tabs/breadcrumb: parse items from the original line content
  if (NAV_ITEM_TYPES.has(parsed.type)) {
    const afterType   = token.content.slice(parsed.type.length).trim()
    const isBreadcrumb = parsed.type === "breadcrumb"
    node.children = parseNavItems(
      afterType, isBreadcrumb, token.lineNum, blockPosition, errors,
    )
  }

  // Collect children and slots (lines indented one more level)
  let i = startIdx + 1
  while (i < tokens.length && tokens[i]!.indent > token.indent) {
    const childToken = tokens[i]!

    // Only process direct children (exactly one more indent level)
    if (childToken.indent !== token.indent + 1) {
      i++
      continue
    }

    const childParsed = parseLine(childToken.content, childToken.lineNum, blockPosition, errors)

    if (childParsed.isSlot) {
      // Slot child: collect children of this slot too
      const slotResult = buildSlotNode(
        childToken, childParsed.slotName, tokens, i, blockPosition, errors,
      )
      const existing = node.slots.get(childParsed.slotName) ?? []
      existing.push(slotResult.slot)
      node.slots.set(childParsed.slotName, existing)
      i = slotResult.nextIndex
    } else {
      // Regular child component
      const childResult = buildSingleComponent(
        childToken, tokens, i, blockPosition, errors,
      )
      // For item validation: item only valid inside tree, kanban, feed
      if (childParsed.type === "item" && !["tree", "kanban", "feed"].includes(node.type)) {
        errors.push({
          severity:      "error",
          message:       `"item" component is only valid inside tree, kanban, or feed (parent is "${node.type}")`,
          line:          childToken.lineNum,
          blockPosition,
        })
      }
      node.children.push(childResult.node)
      i = childResult.nextIndex
    }
  }

  return { node, nextIndex: i }
}

// ---------------------------------------------------------------------------
// Slot node builder
// ---------------------------------------------------------------------------

function buildSlotNode(
  token:         LineToken,
  slotName:      string,
  tokens:        LineToken[],
  startIdx:      number,
  blockPosition: number,
  errors:        ParseError[],
): { slot: SlotNode; nextIndex: number } {
  const parsed = parseLine(token.content, token.lineNum, blockPosition, errors)

  // Determine if this is a .row slot (data-table cell-mode) or CSV slot
  const isRowSlot = slotName === "row"
  const isCsvSlot = CSV_SLOT_NAMES.has(slotName)

  let cells: ComponentNode[] | null = null
  let fields: string[]              = parsed.fields

  if (isRowSlot) {
    // Item-mode pipe splitting: each segment is a cell
    const afterSlotName = token.content.slice(slotName.length + 1).trim() // +1 for the dot
    cells  = parseRowCells(afterSlotName, token.lineNum, blockPosition, errors)
    // For .row slots, transition is on the first cell (already parsed by parseRowCells)
    // The slot itself doesn't carry a transition
    fields = []
  } else if (isCsvSlot) {
    // CSV mode: parse as items
    // The "text" from parseLine contains the CSV string
    const csvContent = parsed.text + (parsed.fields.length > 0 ? ", " + parsed.fields.join(", ") : "")
    // Actually: the entire content after ".slotname " is the CSV value.
    // Re-parse from the raw content for accuracy.
    const afterSlotName = token.content.slice(slotName.length + 1).trim()
    // For CSV slots, the children array is populated with items
    // We store them in `children` of the slot
    cells = null // Not row cells
    fields = [] // No fields for CSV slots — items go in children
  }

  const slot: SlotNode = {
    name:       slotName,
    text:       isRowSlot ? "" : parsed.text,
    fields:     isRowSlot ? [] : parsed.fields,
    icon:       parsed.icon,
    modifiers:  parsed.modifiers,
    transition: isRowSlot ? null : parsed.transition,
    children:   [],
    cells:      cells,
  }

  // Collect slot children (indented below the slot line)
  let i = startIdx + 1
  while (i < tokens.length && tokens[i]!.indent > token.indent) {
    const childToken = tokens[i]!
    if (childToken.indent !== token.indent + 1) {
      i++
      continue
    }

    const childResult = buildSingleComponent(childToken, tokens, i, blockPosition, errors)
    slot.children.push(childResult.node)
    i = childResult.nextIndex
  }

  // For CSV slots: parse the slot text as CSV items and store in children
  if (isCsvSlot && !isRowSlot) {
    const afterSlotName = token.content.slice(slotName.length + 1).trim()
    const csvItems = parseCsvItems(afterSlotName, token.lineNum, blockPosition, errors)
    slot.children.push(...csvItems)
  }

  return { slot, nextIndex: i }
}
