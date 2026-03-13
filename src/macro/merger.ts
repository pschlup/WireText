// Zone-level merging (task-062) — last-writer-wins composition
// Implements depth-first flatten (task-061) + zone merge (task-062)
import type { WireTextBlock, ParsedBody, Resolver, ComponentNode } from "../types.js"
import { parseBody } from "../body/index.js"

// ── Public types ──────────────────────────────────────────────────────────────

export interface CompositionResult {
  body:   ParsedBody
  errors: Array<{ message: string; blockPosition: number }>
}

// ── Depth-first flatten (task-061) ────────────────────────────────────────────

/**
 * Recursively expand a macro's `use:` list depth-first, collecting a deduplicated
 * ordered list of macro IDs.  `seen` tracks IDs already added to the output
 * (first-occurrence wins); `visiting` tracks the current recursion stack for
 * cycle detection.
 *
 * `screenPosition` is the position of the composing screen/journey block and is
 * used for all resolver lookups.  This ensures every macro defined anywhere
 * before the screen is visible, regardless of the positions of intermediary
 * macros in the chain.
 *
 * Fail-fast: on the first error (unknown macro or cycle), stop processing the
 * remaining items in the current `useList` at this depth.
 */
function flattenUseList(
  useList: string[],
  screenPosition: number,
  resolver: Resolver,
  seen: Set<string>,
  visiting: Set<string>,
): { ids: string[]; errors: Array<{ message: string; blockPosition: number }> } {
  const ids:    string[] = []
  const errors: Array<{ message: string; blockPosition: number }> = []

  for (const macroId of useList) {
    // ── Cycle detection ──────────────────────────────────────────────────────
    if (visiting.has(macroId)) {
      const chain = [...visiting, macroId].join(" → ")
      errors.push({
        message:       `Circular macro composition: ${chain}`,
        blockPosition: screenPosition,
      })
      // Fail-fast: stop processing further items at this level.
      return { ids, errors }
    }

    // ── Unknown macro ────────────────────────────────────────────────────────
    // Always resolve relative to the composing screen so that all macros
    // defined before the screen are reachable from within the chain.
    const macroBlock = resolver.resolve("macro", macroId, screenPosition)
    if (macroBlock === null) {
      errors.push({
        message:       `Unknown macro "${macroId}"`,
        blockPosition: screenPosition,
      })
      // Fail-fast: remaining macros in the list are not applied after an error.
      return { ids, errors }
    }

    // ── Recurse into the macro's own use: list first (depth-first) ───────────
    const childUse = normalizeUseList(macroBlock.header["use"])
    if (childUse.length > 0) {
      visiting.add(macroId)
      // Pass screenPosition through so all recursion levels see the same scope.
      const child = flattenUseList(childUse, screenPosition, resolver, seen, visiting)
      visiting.delete(macroId)

      ids.push(...child.ids)
      if (child.errors.length > 0) {
        errors.push(...child.errors)
        // Fail-fast on child errors.
        return { ids, errors }
      }
    }

    // ── Add this macro after its dependencies (dedup by first occurrence) ────
    if (!seen.has(macroId)) {
      seen.add(macroId)
      ids.push(macroId)
    }
  }

  return { ids, errors }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normalise the `use:` header value to a string array. */
function normalizeUseList(raw: string | string[] | undefined): string[] {
  if (raw === undefined) return []
  if (Array.isArray(raw)) return raw
  // Single string — treat as a single-element list.
  return raw.length > 0 ? [raw] : []
}

/** Parse the body of a macro block, returning its zones. */
function parseMacroZones(block: WireTextBlock): Map<string, ComponentNode[]> {
  if (block.body.trim().length === 0) {
    // Empty body — composition-only macro; contributes no zones of its own.
    return new Map()
  }
  const { body } = parseBody(block.body, "macro")
  return body.zones
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Apply macro composition to produce a merged ParsedBody for a screen or journey.
 *
 * Steps:
 *   1. Depth-first flatten and deduplicate the `use:` list (task-061)
 *   2. Apply macro zones in order — last-writer-wins per zone key (task-062)
 *   3. Screen body zones override macro zones
 *   4. Overlays and inline screens come from the screen body only
 */
export function composeMacros(
  block: WireTextBlock,
  screenBody: ParsedBody,
  resolver: Resolver,
): CompositionResult {
  const useList = normalizeUseList(block.header["use"])

  // No macros: return the screen body unchanged.
  if (useList.length === 0) {
    return { body: screenBody, errors: [] }
  }

  // ── Step 1: flatten ────────────────────────────────────────────────────────
  const { ids: flatIds, errors } = flattenUseList(
    useList,
    block.position,
    resolver,
    new Set<string>(),
    new Set<string>(),
  )

  // ── Step 2: zone merge — last-writer-wins across flattened macro list ──────
  const mergedZones = new Map<string, ComponentNode[]>()

  for (const macroId of flatIds) {
    // Each macro in the flattened list is guaranteed to exist (errors caught above).
    const macroBlock = resolver.resolve("macro", macroId, block.position)
    if (macroBlock === null) continue  // unreachable after flatten, defensive guard

    const macroZones = parseMacroZones(macroBlock)
    for (const [zoneName, nodes] of macroZones) {
      mergedZones.set(zoneName, nodes)
    }
  }

  // ── Step 3: screen body zones override macro zones ─────────────────────────
  for (const [zoneName, nodes] of screenBody.zones) {
    mergedZones.set(zoneName, nodes)
  }

  // ── Step 4: overlays and screens come from the screen body only ────────────
  const mergedBody: ParsedBody = {
    zones:    mergedZones,
    overlays: screenBody.overlays,
    screens:  screenBody.screens,
    tokens:   screenBody.tokens,
  }

  return { body: mergedBody, errors }
}
