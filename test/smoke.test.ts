// Smoke test — verifies the package exports exist and imports work.
// See epic-002 task-010: "Smoke test: import the package and verify exports exist"
import { describe, it, expect } from "vitest"

import {
  parseDocument,
  parseBlock,
  extractBlocks,
  parseBody,
  resolveTheme,
  emitThemeCSS,
  SAAS_LIGHT,
  SAAS_DARK,
  composeMacros,
  createResolver,
  COMPONENT_REGISTRY,
  renderDocument,
  assembleArtifact,
} from "../src/index.js"

describe("package exports", () => {
  it("exports parseDocument", () => expect(parseDocument).toBeTypeOf("function"))
  it("exports parseBlock", () => expect(parseBlock).toBeTypeOf("function"))
  it("exports extractBlocks", () => expect(extractBlocks).toBeTypeOf("function"))
  it("exports parseBody", () => expect(parseBody).toBeTypeOf("function"))
  it("exports resolveTheme", () => expect(resolveTheme).toBeTypeOf("function"))
  it("exports emitThemeCSS", () => expect(emitThemeCSS).toBeTypeOf("function"))
  it("exports SAAS_LIGHT with 10 tokens", () => {
    const keys = Object.keys(SAAS_LIGHT)
    expect(keys).toHaveLength(10)
    expect(keys).toContain("primary")
    expect(keys).toContain("surface")
    expect(keys).toContain("font")
  })
  it("exports SAAS_DARK with 10 tokens", () => {
    expect(Object.keys(SAAS_DARK)).toHaveLength(10)
  })
  it("SAAS_LIGHT token values match spec", () => {
    expect(SAAS_LIGHT.primary).toBe("#2563EB")
    expect(SAAS_LIGHT.surface).toBe("#FFFFFF")
    expect(SAAS_LIGHT.border).toBe("#E5E7EB")
    expect(SAAS_LIGHT.text).toBe("#111827")
    expect(SAAS_LIGHT.muted).toBe("#6B7280")
    expect(SAAS_LIGHT.danger).toBe("#DC2626")
    expect(SAAS_LIGHT.success).toBe("#16A34A")
    expect(SAAS_LIGHT.radius).toBe("8px")
    expect(SAAS_LIGHT.size).toBe("14px")
  })
  it("exports composeMacros", () => expect(composeMacros).toBeTypeOf("function"))
  it("exports createResolver", () => expect(createResolver).toBeTypeOf("function"))
  it("exports COMPONENT_REGISTRY as a Map", () => expect(COMPONENT_REGISTRY).toBeInstanceOf(Map))
  it("exports renderDocument", () => expect(renderDocument).toBeTypeOf("function"))
  it("exports assembleArtifact", () => expect(assembleArtifact).toBeTypeOf("function"))
})

describe("createResolver", () => {
  it("returns null when no blocks", () => {
    const r = createResolver([])
    expect(r.resolve("macro", "topbar", 10)).toBeNull()
  })

  it("resolves nearest-previous block", () => {
    const blocks = [
      { type: "macro" as const, id: "topbar", position: 0, header: {}, body: "" },
      { type: "macro" as const, id: "topbar", position: 5, header: {}, body: "" },
    ]
    const r = createResolver(blocks)
    // Position 3 should resolve to pos 0 (only block before 3)
    expect(r.resolve("macro", "topbar", 3)?.position).toBe(0)
    // Position 7 should resolve to pos 5 (nearest before 7)
    expect(r.resolve("macro", "topbar", 7)?.position).toBe(5)
    // Position 0 — nothing before
    expect(r.resolve("macro", "topbar", 0)).toBeNull()
  })

  it("does not resolve wrong type", () => {
    const blocks = [{ type: "macro" as const, id: "topbar", position: 0, header: {}, body: "" }]
    const r = createResolver(blocks)
    expect(r.resolve("theme", "topbar", 5)).toBeNull()
  })
})
