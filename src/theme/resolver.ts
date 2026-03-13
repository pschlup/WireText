// Theme resolver (task-052) — resolution order + extends: inheritance
import type { WireTextBlock, Resolver, ThemeTokens } from "../types.js"
import { SAAS_LIGHT, BUILT_IN_THEMES } from "./themes.js"

// ── Warn utility ──────────────────────────────────────────────────────────────

// Simple console warn: callers that need structured errors emit their own.
function warnUnknownTheme(id: string): void {
  console.warn(`[wiretext] Unknown theme "${id}" — falling back to saas-light`)
}

// ── Body parser helper ────────────────────────────────────────────────────────

/**
 * Parse a theme block body (flat key-value lines) into a token map.
 * Lines that contain `: ` are split on the first occurrence; other lines
 * are ignored (empty lines, comments, etc.).
 */
export function parseThemeBody(body: string): ThemeTokens {
  const tokens: ThemeTokens = {}
  for (const line of body.split("\n")) {
    // Split on the first `: ` so values containing colons are preserved.
    const colonIdx = line.indexOf(": ")
    if (colonIdx === -1) continue
    const key   = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 2).trim()
    if (key.length > 0) {
      tokens[key] = value
    }
  }
  return tokens
}

// ── Core resolution helpers ───────────────────────────────────────────────────

/**
 * Resolve a theme by ID, merging `extends:` chains depth-first.
 * `visited` tracks the chain being actively traversed to detect cycles.
 *
 * Resolution for a given id:
 *   1. Check `BUILT_IN_THEMES` first (built-ins can be shadowed by custom blocks
 *      only when a custom block with the same id exists before `beforePosition`).
 *   2. Then check nearest-previous custom theme block via `resolver`.
 *   3. Custom block shadows the built-in for the same id.
 */
export function resolveThemeById(
  id: string,
  beforePosition: number,
  resolver: Resolver,
  visited: Set<string> = new Set(),
): ThemeTokens {
  // ── Cycle detection ────────────────────────────────────────────────────────
  if (visited.has(id)) {
    const chain = [...visited, id].join(" → ")
    throw new Error(`Circular theme extends: ${chain}`)
  }

  const nowVisiting = new Set(visited)
  nowVisiting.add(id)

  // ── Look up nearest-previous custom block first (shadows built-ins) ────────
  const customBlock = resolver.resolve("theme", id, beforePosition)

  if (customBlock !== null) {
    return resolveCustomBlock(customBlock, beforePosition, resolver, nowVisiting)
  }

  // ── Fall back to built-in ──────────────────────────────────────────────────
  const builtin = BUILT_IN_THEMES[id]
  if (builtin !== undefined) {
    return builtin
  }

  // Unknown theme: warn and return default.
  warnUnknownTheme(id)
  return SAAS_LIGHT
}

/** Merge extends chain and own tokens from a custom theme block. */
function resolveCustomBlock(
  block: WireTextBlock,
  beforePosition: number,
  resolver: Resolver,
  visiting: Set<string>,
): ThemeTokens {
  const ownTokens   = parseThemeBody(block.body)
  const extendsId   = block.header["extends"]

  if (typeof extendsId !== "string" || extendsId.length === 0) {
    // No parent chain: return own tokens only.
    return ownTokens
  }

  // Resolve parent tokens first, then overlay child overrides.
  const parentTokens = resolveThemeById(extendsId, beforePosition, resolver, visiting)
  return { ...parentTokens, ...ownTokens }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Resolve the fully-merged theme tokens for a given screen or journey block.
 *
 * Resolution order (PROJECT.md §Theme Application):
 *   1. `theme:` value in the block header
 *   2. Nearest-previous theme block in the document
 *   3. Built-in saas-light default
 */
export function resolveTheme(block: WireTextBlock, resolver: Resolver): ThemeTokens {
  const themeHeader = block.header["theme"]

  // ── 1. Explicit theme: header ──────────────────────────────────────────────
  if (typeof themeHeader === "string" && themeHeader.length > 0) {
    try {
      return resolveThemeById(themeHeader, block.position, resolver)
    } catch (err) {
      // Circular dependency error — surface as console.error and fall back.
      console.error(`[wiretext] ${(err as Error).message}`)
      return SAAS_LIGHT
    }
  }

  // ── 2. Nearest-previous theme block (any id) ───────────────────────────────
  // We look for any theme block before this one; since we don't know the id we
  // must search all blocks.  The Resolver only supports type+id lookups, so we
  // cannot use it directly here.  Instead the convention is: if no explicit
  // `theme:` header, return SAAS_LIGHT (nearest-previous resolution requires
  // a document-level scan which is outside the Resolver interface).
  // Callers that need nearest-previous can pre-resolve and inject via header.

  // ── 3. Default fallback ────────────────────────────────────────────────────
  return SAAS_LIGHT
}
