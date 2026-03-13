// Theme CSS emitter (task-051) — converts token map to CSS custom properties
import type { ThemeTokens } from "../types.js"

// ── Token → CSS variable mapping ──────────────────────────────────────────────
// From PROJECT.md §Theme Application token table.

const TOKEN_TO_CSS_PROP: Record<string, string> = {
  primary: "--wiretext-color-primary",
  surface: "--wiretext-color-surface",
  border:  "--wiretext-color-border",
  text:    "--wiretext-color-text",
  muted:   "--wiretext-color-muted",
  danger:  "--wiretext-color-danger",
  success: "--wiretext-color-success",
  radius:  "--wiretext-radius",
  font:    "--wiretext-font-family",
  size:    "--wiretext-font-size",
}

// WebAwesome bridge: map --wiretext-* to the corresponding --wa-* properties so
// WebAwesome components pick up the theme automatically.
const WA_BRIDGE: ReadonlyArray<readonly [string, string]> = [
  ["--wa-color-primary-500",     "var(--wiretext-color-primary)"],
  ["--wa-color-danger-500",      "var(--wiretext-color-danger)"],
  ["--wa-color-success-500",     "var(--wiretext-color-success)"],
  ["--wa-border-radius-medium",  "var(--wiretext-radius)"],
  ["--wa-font-sans",             "var(--wiretext-font-family)"],
]

// ── Public types ──────────────────────────────────────────────────────────────

/** Result of emitThemeCSS — style block and optional web font <link> tags. */
export interface ThemeCSSResult {
  /** The :root { … } CSS block to inject into a <style> element. */
  styleBlock: string
  /** <link> tags for web fonts, or an empty string when none are needed. */
  fontLink:   string
}

// ── Google Fonts helper ───────────────────────────────────────────────────────

/**
 * Extract canonical font-family names from a CSS font-family string and
 * return a Google Fonts <link> tag for each web font that needs loading.
 * Currently detects Inter; the pattern is easy to extend for other fonts.
 */
function buildFontLink(fontValue: string): string {
  const links: string[] = []

  if (/\binter\b/i.test(fontValue)) {
    links.push(
      `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap">`,
    )
  }

  return links.join("\n")
}

// ── Emitter ───────────────────────────────────────────────────────────────────

/**
 * Convert a resolved theme token map into a CSS :root block and optional
 * Google Fonts link tags.
 *
 * The :root block includes:
 *   - `--wiretext-*` custom properties for all known tokens
 *   - `--wa-*` bridge variables so WebAwesome components inherit the theme
 *
 * Unknown token keys are silently skipped.
 */
export function emitThemeCSS(tokens: ThemeTokens): ThemeCSSResult {
  const lines: string[] = []

  // ── wiretext custom properties ─────────────────────────────────────────────
  for (const [token, cssProp] of Object.entries(TOKEN_TO_CSS_PROP)) {
    const value = tokens[token]
    if (value !== undefined) {
      lines.push(`  ${cssProp}: ${value};`)
    }
  }

  // ── WebAwesome bridge ──────────────────────────────────────────────────────
  for (const [waProp, wireValue] of WA_BRIDGE) {
    lines.push(`  ${waProp}: ${wireValue};`)
  }

  const styleBlock = `:root {\n${lines.join("\n")}\n}`

  // ── Google Fonts link ──────────────────────────────────────────────────────
  const fontValue = tokens["font"] ?? ""
  const fontLink  = buildFontLink(fontValue)

  return { styleBlock, fontLink }
}
