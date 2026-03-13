// Tests for epic-006: Theme System
import { describe, it, expect, vi, afterEach } from "vitest"
import { emitThemeCSS } from "../src/theme/emitter.js"
import { resolveTheme, resolveThemeById, parseThemeBody } from "../src/theme/resolver.js"
import { SAAS_LIGHT, SAAS_DARK, BUILT_IN_THEMES } from "../src/theme/themes.js"
import { createResolver } from "../src/macro/resolver.js"
import type { WireTextBlock, Resolver, ThemeTokens } from "../src/types.js"

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeScreenBlock(
  overrides: Partial<WireTextBlock> = {},
): WireTextBlock {
  return {
    type:     "screen",
    id:       "test-screen",
    position: 10,
    header:   {},
    body:     "",
    ...overrides,
  }
}

function makeThemeBlock(
  id: string,
  position: number,
  body: string,
  headerExtras: Record<string, string | string[]> = {},
): WireTextBlock {
  return {
    type:     "theme",
    id,
    position,
    header:   headerExtras,
    body,
  }
}

// ── emitThemeCSS ──────────────────────────────────────────────────────────────

describe("emitThemeCSS", () => {
  it("produces a :root { } block", () => {
    const { styleBlock } = emitThemeCSS(SAAS_LIGHT)
    expect(styleBlock).toMatch(/^:root \{/)
    expect(styleBlock).toMatch(/\}$/)
  })

  it("maps all 10 SAAS_LIGHT tokens to --wiretext-* CSS properties", () => {
    const { styleBlock } = emitThemeCSS(SAAS_LIGHT)
    expect(styleBlock).toContain("--wiretext-color-primary: #2563EB")
    expect(styleBlock).toContain("--wiretext-color-surface: #FFFFFF")
    expect(styleBlock).toContain("--wiretext-color-border: #E5E7EB")
    expect(styleBlock).toContain("--wiretext-color-text: #111827")
    expect(styleBlock).toContain("--wiretext-color-muted: #6B7280")
    expect(styleBlock).toContain("--wiretext-color-danger: #DC2626")
    expect(styleBlock).toContain("--wiretext-color-success: #16A34A")
    expect(styleBlock).toContain("--wiretext-radius: 8px")
    expect(styleBlock).toContain("--wiretext-font-family: Inter, sans-serif")
    expect(styleBlock).toContain("--wiretext-font-size: 14px")
  })

  it("emits WebAwesome bridge variables", () => {
    const { styleBlock } = emitThemeCSS(SAAS_LIGHT)
    expect(styleBlock).toContain("--wa-color-brand: var(--wiretext-color-primary)")
    expect(styleBlock).toContain("--wa-color-danger: var(--wiretext-color-danger)")
    expect(styleBlock).toContain("--wa-color-success: var(--wiretext-color-success)")
    expect(styleBlock).toContain("--wa-border-radius-medium: var(--wiretext-radius)")
    expect(styleBlock).toContain("--wa-font-sans: var(--wiretext-font-family)")
  })

  it("generates a Google Fonts link for Inter", () => {
    const { fontLink } = emitThemeCSS(SAAS_LIGHT)
    expect(fontLink).toContain("<link")
    expect(fontLink).toContain("fonts.googleapis.com")
    expect(fontLink).toContain("Inter")
  })

  it("does not generate a font link when the font is not a web font", () => {
    const customTokens: ThemeTokens = {
      ...SAAS_LIGHT,
      font: "Arial, sans-serif",
    }
    const { fontLink } = emitThemeCSS(customTokens)
    expect(fontLink).toBe("")
  })

  it("handles partial token maps — emits only provided tokens", () => {
    const partial: ThemeTokens = { primary: "#FF0000", radius: "4px" }
    const { styleBlock } = emitThemeCSS(partial)
    expect(styleBlock).toContain("--wiretext-color-primary: #FF0000")
    expect(styleBlock).toContain("--wiretext-radius: 4px")
    expect(styleBlock).not.toContain("--wiretext-color-surface")
  })

  it("SAAS_DARK tokens produce correct primary and surface values", () => {
    const { styleBlock } = emitThemeCSS(SAAS_DARK)
    expect(styleBlock).toContain("--wiretext-color-primary: #3B82F6")
    expect(styleBlock).toContain("--wiretext-color-surface: #111827")
    expect(styleBlock).toContain("--wiretext-color-text: #F9FAFB")
  })

  it("font link uses display=swap for performance", () => {
    const { fontLink } = emitThemeCSS(SAAS_LIGHT)
    expect(fontLink).toContain("display=swap")
  })
})

// ── parseThemeBody ────────────────────────────────────────────────────────────

describe("parseThemeBody", () => {
  it("parses key-value lines into a token map", () => {
    const body = "primary: #FF0000\nradius: 4px"
    const tokens = parseThemeBody(body)
    expect(tokens["primary"]).toBe("#FF0000")
    expect(tokens["radius"]).toBe("4px")
  })

  it("ignores lines without ': '", () => {
    const body = "primary: #FF0000\njust a line without colon-space"
    const tokens = parseThemeBody(body)
    expect(Object.keys(tokens)).toHaveLength(1)
  })

  it("preserves values containing colons", () => {
    const body = "font: Inter, sans-serif\nurl: https://example.com"
    const tokens = parseThemeBody(body)
    expect(tokens["url"]).toBe("https://example.com")
  })

  it("trims key and value whitespace", () => {
    const tokens = parseThemeBody("  primary  :  #FF0000  ")
    // Leading key whitespace trimmed; value trimmed.
    expect(tokens["primary"]).toBe("#FF0000")
  })

  it("returns an empty record for an empty body", () => {
    expect(parseThemeBody("")).toEqual({})
  })
})

// ── resolveTheme ──────────────────────────────────────────────────────────────

describe("resolveTheme", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns SAAS_LIGHT when block has theme: saas-light header", () => {
    const block = makeScreenBlock({ header: { theme: "saas-light" } })
    const resolver = createResolver([])
    const tokens = resolveTheme(block, resolver)
    expect(tokens).toEqual(SAAS_LIGHT)
  })

  it("returns SAAS_DARK when block has theme: saas-dark header", () => {
    const block = makeScreenBlock({ header: { theme: "saas-dark" } })
    const resolver = createResolver([])
    const tokens = resolveTheme(block, resolver)
    expect(tokens).toEqual(SAAS_DARK)
  })

  it("warns and falls back to SAAS_LIGHT for an unknown theme reference", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const block = makeScreenBlock({ header: { theme: "nonexistent-theme" } })
    const resolver = createResolver([])
    const tokens = resolveTheme(block, resolver)
    expect(tokens).toEqual(SAAS_LIGHT)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("nonexistent-theme"))
  })

  it("resolves a custom theme block referenced in the header", () => {
    const customThemeBlock = makeThemeBlock("brand", 5, "primary: #7C3AED\nradius: 12px")
    const block = makeScreenBlock({ position: 10, header: { theme: "brand" } })
    const resolver = createResolver([customThemeBlock])
    const tokens = resolveTheme(block, resolver)
    expect(tokens["primary"]).toBe("#7C3AED")
    expect(tokens["radius"]).toBe("12px")
  })

  it("returns SAAS_LIGHT as default when block has no theme header", () => {
    const block = makeScreenBlock({ header: {} })
    const resolver = createResolver([])
    const tokens = resolveTheme(block, resolver)
    expect(tokens).toEqual(SAAS_LIGHT)
  })

  it("surfaces a console.error and falls back for circular extends (A→B→A)", () => {
    // A extends B, B extends A — create both as custom blocks visible to each
    // other.  We test resolveThemeById directly because resolveTheme wraps the
    // error and falls back silently.
    const blockA = makeThemeBlock("theme-a", 1, "primary: #AA0000", { extends: "theme-b" })
    const blockB = makeThemeBlock("theme-b", 2, "surface: #FFFFFF", { extends: "theme-a" })
    const resolver = createResolver([blockA, blockB])

    // Resolving "theme-a" at position 10 should throw a cycle error.
    expect(() => resolveThemeById("theme-a", 10, resolver)).toThrowError(/circular/i)
  })

  it("resolveTheme catches circular error and falls back to SAAS_LIGHT", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const blockA = makeThemeBlock("theme-a", 1, "primary: #AA0000", { extends: "theme-b" })
    const blockB = makeThemeBlock("theme-b", 2, "surface: #FFFFFF", { extends: "theme-a" })
    const resolver = createResolver([blockA, blockB])
    const screenBlock = makeScreenBlock({ position: 10, header: { theme: "theme-a" } })

    const tokens = resolveTheme(screenBlock, resolver)
    expect(tokens).toEqual(SAAS_LIGHT)
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Circular"))
  })
})

// ── resolveThemeById ──────────────────────────────────────────────────────────

describe("resolveThemeById", () => {
  it("resolves a built-in theme by id", () => {
    const resolver = createResolver([])
    expect(resolveThemeById("saas-light", 0, resolver)).toEqual(SAAS_LIGHT)
    expect(resolveThemeById("saas-dark", 0, resolver)).toEqual(SAAS_DARK)
  })

  it("custom theme with extends: saas-light merges parent tokens + child overrides", () => {
    const customBlock = makeThemeBlock(
      "my-brand",
      1,
      "primary: #7C3AED",
      { extends: "saas-light" },
    )
    const resolver = createResolver([customBlock])
    const tokens = resolveThemeById("my-brand", 10, resolver)

    // Child override applied.
    expect(tokens["primary"]).toBe("#7C3AED")
    // Inherited from SAAS_LIGHT.
    expect(tokens["surface"]).toBe(SAAS_LIGHT["surface"])
    expect(tokens["radius"]).toBe(SAAS_LIGHT["radius"])
  })

  it("supports three-level extends chain C extends B extends A", () => {
    const blockA = makeThemeBlock("theme-a", 1, "primary: #AA0000")
    const blockB = makeThemeBlock("theme-b", 2, "surface: #BBBBBB", { extends: "theme-a" })
    const blockC = makeThemeBlock("theme-c", 3, "radius: 16px", { extends: "theme-b" })
    const resolver = createResolver([blockA, blockB, blockC])

    const tokens = resolveThemeById("theme-c", 10, resolver)
    // C's own token
    expect(tokens["radius"]).toBe("16px")
    // Inherited from B
    expect(tokens["surface"]).toBe("#BBBBBB")
    // Inherited from A (via B→A chain)
    expect(tokens["primary"]).toBe("#AA0000")
  })

  it("custom theme with same id as built-in shadows the built-in", () => {
    // A custom block named "saas-light" placed at position 1 overrides the built-in
    // for any screen at position > 1.
    const customBlock = makeThemeBlock("saas-light", 1, "primary: #FF6600")
    const resolver = createResolver([customBlock])

    const tokens = resolveThemeById("saas-light", 10, resolver)
    expect(tokens["primary"]).toBe("#FF6600")
  })

  it("warns and returns SAAS_LIGHT for a completely unknown id", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const resolver = createResolver([])
    const tokens = resolveThemeById("no-such-theme", 0, resolver)
    expect(tokens).toEqual(SAAS_LIGHT)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("no-such-theme"))
    vi.restoreAllMocks()
  })

  it("detects a direct self-reference extends cycle", () => {
    // A theme that extends itself.
    const blockA = makeThemeBlock("looping", 1, "primary: #000", { extends: "looping" })
    const resolver = createResolver([blockA])
    expect(() => resolveThemeById("looping", 10, resolver)).toThrowError(/circular/i)
  })

  it("detects a two-step cycle (A→B→A)", () => {
    const blockA = makeThemeBlock("a", 1, "primary: #AA0000", { extends: "b" })
    const blockB = makeThemeBlock("b", 2, "surface: #FFFFFF", { extends: "a" })
    const resolver = createResolver([blockA, blockB])
    expect(() => resolveThemeById("a", 10, resolver)).toThrowError(/circular/i)
  })

  it("cycle error message includes the cycle chain", () => {
    const blockA = makeThemeBlock("x", 1, "", { extends: "y" })
    const blockB = makeThemeBlock("y", 2, "", { extends: "x" })
    const resolver = createResolver([blockA, blockB])
    let errorMessage = ""
    try {
      resolveThemeById("x", 10, resolver)
    } catch (err) {
      errorMessage = (err as Error).message
    }
    // The cycle chain x → y → x should appear in the error.
    expect(errorMessage).toMatch(/x/)
    expect(errorMessage).toMatch(/y/)
  })

  it("BUILT_IN_THEMES contains both saas-light and saas-dark", () => {
    expect(BUILT_IN_THEMES["saas-light"]).toBeDefined()
    expect(BUILT_IN_THEMES["saas-dark"]).toBeDefined()
  })
})

// ── Integration: emitThemeCSS output structure ────────────────────────────────

describe("emitThemeCSS output structure", () => {
  it("result has styleBlock and fontLink properties", () => {
    const result = emitThemeCSS(SAAS_LIGHT)
    expect(result).toHaveProperty("styleBlock")
    expect(result).toHaveProperty("fontLink")
    expect(typeof result.styleBlock).toBe("string")
    expect(typeof result.fontLink).toBe("string")
  })

  it("styleBlock can be injected directly into a <style> tag", () => {
    const { styleBlock } = emitThemeCSS(SAAS_LIGHT)
    // Should not contain <style> tags — just the content to go inside them.
    expect(styleBlock).not.toContain("<style>")
    expect(styleBlock).not.toContain("</style>")
  })
})
