import { describe, it, expect } from "vitest"
import { extractBlocks, parseBlock, parseDocument } from "../src/parser/block-parser.js"

// ---------------------------------------------------------------------------
// extractBlocks
// ---------------------------------------------------------------------------

describe("extractBlocks", () => {
  it("returns [] for an empty document", () => {
    expect(extractBlocks("")).toEqual([])
  })

  it("returns [] when there are no wiretext blocks", () => {
    const md = "# Hello\n\nSome text.\n\n```js\nconst x = 1\n```"
    expect(extractBlocks(md)).toEqual([])
  })

  it("extracts a single wiretext block with position 0", () => {
    const md = "```wiretext\nscreen: dashboard\n---\nbutton Save\n```"
    const result = extractBlocks(md)
    expect(result).toHaveLength(1)
    expect(result[0]!.position).toBe(0)
    expect(result[0]!.content).toBe("screen: dashboard\n---\nbutton Save")
  })

  it("does not include the fence lines in the content", () => {
    const md = "```wiretext\nscreen: home\n---\ntext Hello\n```"
    const { content } = extractBlocks(md)[0]!
    expect(content).not.toContain("```wiretext")
    expect(content).not.toContain("```")
  })

  it("extracts multiple wiretext blocks with incrementing positions", () => {
    const md = [
      "```wiretext",
      "screen: alpha",
      "---",
      "text A",
      "```",
      "",
      "Some prose in between.",
      "",
      "```wiretext",
      "screen: beta",
      "---",
      "text B",
      "```",
      "",
      "```wiretext",
      "macro: topbar",
      "---",
      "text C",
      "```",
    ].join("\n")

    const result = extractBlocks(md)
    expect(result).toHaveLength(3)
    expect(result[0]!.position).toBe(0)
    expect(result[1]!.position).toBe(1)
    expect(result[2]!.position).toBe(2)
  })

  it("ignores non-wiretext fenced blocks (js, mermaid, etc.)", () => {
    const md = [
      "```js",
      "const x = 1",
      "```",
      "```mermaid",
      "graph TD",
      "```",
      "```wiretext",
      "screen: only-one",
      "---",
      "text hi",
      "```",
      "```ts",
      "type Foo = string",
      "```",
    ].join("\n")

    const result = extractBlocks(md)
    expect(result).toHaveLength(1)
    expect(result[0]!.position).toBe(0)
  })

  it("ignores ~~~wiretext tilde fences (not supported per spec)", () => {
    const md = "~~~wiretext\nscreen: tilde\n---\ntext hi\n~~~"
    expect(extractBlocks(md)).toEqual([])
  })

  it("handles a block with no body content (empty between fences)", () => {
    const md = "```wiretext\n```"
    const result = extractBlocks(md)
    expect(result).toHaveLength(1)
    expect(result[0]!.content).toBe("")
  })

  it("preserves internal blank lines in block content", () => {
    const md = "```wiretext\nscreen: x\n---\n\ntext A\n\ntext B\n\n```"
    const { content } = extractBlocks(md)[0]!
    expect(content).toBe("screen: x\n---\n\ntext A\n\ntext B\n")
  })

  it("handles wiretext block at the very end of document without trailing newline", () => {
    const md = "```wiretext\nscreen: end\n---\ntext Hi\n```"
    const result = extractBlocks(md)
    expect(result).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// parseBlock
// ---------------------------------------------------------------------------

describe("parseBlock", () => {
  // --- Fatal errors ---

  it("returns error when --- separator is missing", () => {
    const { block, errors } = parseBlock("screen: dashboard\nbutton Save", 0)
    expect(block).toBeNull()
    expect(errors).toHaveLength(1)
    expect(errors[0]!.severity).toBe("error")
    expect(errors[0]!.message).toMatch(/missing --- separator/i)
    expect(errors[0]!.blockPosition).toBe(0)
    expect(errors[0]!.line).toBe(1)
  })

  it("returns error for an unknown block type", () => {
    const { block, errors } = parseBlock("widget: foo\n---\ntext hi", 2)
    expect(block).toBeNull()
    expect(errors[0]!.severity).toBe("error")
    expect(errors[0]!.message).toMatch(/unknown block type/i)
    expect(errors[0]!.blockPosition).toBe(2)
  })

  it("returns error for an invalid ID containing uppercase letters", () => {
    const { block, errors } = parseBlock("screen: Dashboard\n---\ntext hi", 0)
    expect(block).toBeNull()
    expect(errors[0]!.severity).toBe("error")
    expect(errors[0]!.message).toMatch(/invalid block id/i)
  })

  it("returns error for an ID containing underscores", () => {
    const { block, errors } = parseBlock("screen: my_screen\n---\ntext hi", 0)
    expect(block).toBeNull()
    expect(errors[0]!.severity).toBe("error")
    expect(errors[0]!.message).toMatch(/invalid block id/i)
  })

  it("returns error for an ID containing spaces", () => {
    const { block, errors } = parseBlock("screen: my screen\n---\ntext hi", 0)
    expect(block).toBeNull()
    expect(errors[0]!.severity).toBe("error")
    expect(errors[0]!.message).toMatch(/invalid block id/i)
  })

  // --- Successful parses ---

  it("parses a screen block with theme: and use: header fields", () => {
    const content = [
      "screen: dashboard",
      "theme: saas-light",
      "use: topbar",
      "---",
      "@header",
      "  logo Acme",
    ].join("\n")

    const { block, errors } = parseBlock(content, 0)

    expect(errors).toHaveLength(0)
    expect(block).not.toBeNull()
    expect(block!.type).toBe("screen")
    expect(block!.id).toBe("dashboard")
    expect(block!.position).toBe(0)
    expect(block!.header["theme"]).toBe("saas-light")
    expect(block!.header["use"]).toBe("topbar")
  })

  it("parses a macro block with use: [topbar, sidebar-nav] as string[]", () => {
    const content = [
      "macro: page-shell",
      "use: [topbar, sidebar-nav]",
      "---",
      "@header",
      "  logo Acme",
    ].join("\n")

    const { block, errors } = parseBlock(content, 1)

    expect(errors).toHaveLength(0)
    expect(block!.type).toBe("macro")
    expect(block!.id).toBe("page-shell")
    expect(block!.header["use"]).toEqual(["topbar", "sidebar-nav"])
  })

  it("parses a theme block with extends: saas-light", () => {
    const content = [
      "theme: custom",
      "extends: saas-light",
      "---",
      "primary: #FF0000",
    ].join("\n")

    const { block, errors } = parseBlock(content, 0)

    expect(errors).toHaveLength(0)
    expect(block!.type).toBe("theme")
    expect(block!.id).toBe("custom")
    expect(block!.header["extends"]).toBe("saas-light")
  })

  it("parses a journey block with screens: [welcome, profile, plan] as string[]", () => {
    const content = [
      "journey: onboarding",
      "theme: saas-light",
      "screens: [welcome, profile, plan]",
      "---",
      "screen welcome",
    ].join("\n")

    const { block, errors } = parseBlock(content, 3)

    expect(errors).toHaveLength(0)
    expect(block!.type).toBe("journey")
    expect(block!.id).toBe("onboarding")
    expect(block!.position).toBe(3)
    expect(block!.header["theme"]).toBe("saas-light")
    expect(block!.header["screens"]).toEqual(["welcome", "profile", "plan"])
  })

  it("uses last-writer-wins when a header key appears multiple times", () => {
    const content = [
      "screen: settings",
      "theme: saas-light",
      "theme: saas-dark",
      "---",
      "text hi",
    ].join("\n")

    const { block } = parseBlock(content, 0)
    expect(block!.header["theme"]).toBe("saas-dark")
  })

  it("trims whitespace from header keys and values", () => {
    const content = [
      "screen: settings",
      "  theme  :  saas-light  ",
      "---",
      "text hi",
    ].join("\n")

    const { block } = parseBlock(content, 0)
    expect(block!.header["theme"]).toBe("saas-light")
  })

  it("warns on unrecognized header keys but still returns the block", () => {
    const content = [
      "screen: dashboard",
      "color: blue",
      "---",
      "text hi",
    ].join("\n")

    const { block, errors } = parseBlock(content, 0)

    expect(block).not.toBeNull()
    expect(errors.some(e => e.severity === "warn" && /unrecognized header key/i.test(e.message))).toBe(true)
  })

  it("warns when the body is empty but still returns the block", () => {
    const content = "screen: empty\n---\n"

    const { block, errors } = parseBlock(content, 0)

    expect(block).not.toBeNull()
    expect(block!.body).toBe("")
    expect(errors.some(e => e.severity === "warn" && /empty/i.test(e.message))).toBe(true)
  })

  it("warns for empty body with no lines after ---", () => {
    const content = "screen: bare\n---"

    const { block, errors } = parseBlock(content, 0)

    expect(block).not.toBeNull()
    expect(block!.body).toBe("")
    expect(errors.some(e => e.severity === "warn")).toBe(true)
  })

  it("uses only the first --- as the separator; subsequent --- lines become part of the body", () => {
    const content = [
      "screen: tricky",
      "---",
      "text above",
      "---",
      "text below",
    ].join("\n")

    const { block, errors } = parseBlock(content, 0)

    expect(errors.filter(e => e.severity === "error")).toHaveLength(0)
    expect(block!.body).toContain("---")
    expect(block!.body).toContain("text above")
    expect(block!.body).toContain("text below")
  })

  it("preserves body whitespace and indentation exactly", () => {
    const bodyLines = [
      "@header",
      "  left",
      "    logo ~cube Acme",
      "  right",
      "    button Login",
    ]
    const content = ["screen: app", "---", ...bodyLines].join("\n")

    const { block } = parseBlock(content, 0)

    expect(block!.body).toBe(bodyLines.join("\n"))
  })

  it("strips leading and trailing blank lines from the body only", () => {
    const content = "screen: spaces\n---\n\n\ntext Hello\n\ntext World\n\n\n"

    const { block } = parseBlock(content, 0)

    expect(block!.body).toBe("text Hello\n\ntext World")
  })

  it("assigns the correct position to the parsed block", () => {
    const content = "macro: nav\n---\nlogo Acme"
    const { block } = parseBlock(content, 7)
    expect(block!.position).toBe(7)
  })

  it("does not include the type/id line in the header record", () => {
    const content = "screen: home\ntheme: saas-light\n---\ntext hi"
    const { block } = parseBlock(content, 0)
    // The header record should not contain a "screen" key from the first line
    expect("screen" in block!.header).toBe(false)
  })

  it("handles a macro block with no header keys beyond type: id", () => {
    const content = "macro: simple\n---\nlogo Acme"
    const { block, errors } = parseBlock(content, 0)
    expect(block!.type).toBe("macro")
    expect(block!.id).toBe("simple")
    expect(Object.keys(block!.header)).toHaveLength(0)
    expect(errors).toHaveLength(0)
  })

  it("handles an ID with only digits and dashes", () => {
    const content = "screen: page-1\n---\ntext hi"
    const { block } = parseBlock(content, 0)
    expect(block!.id).toBe("page-1")
  })

  it("parses array value with spaces around commas gracefully", () => {
    const content = "journey: flow\nscreens: [  welcome ,profile , plan  ]\n---\ntext hi"
    const { block } = parseBlock(content, 0)
    expect(block!.header["screens"]).toEqual(["welcome", "profile", "plan"])
  })
})

// ---------------------------------------------------------------------------
// parseDocument
// ---------------------------------------------------------------------------

describe("parseDocument", () => {
  it("returns empty blocks and errors for a document with no wiretext blocks", () => {
    const md = "# Hello\n\nSome prose.\n\n```ts\nconst x = 1\n```"
    const result = parseDocument(md)
    expect(result.blocks).toEqual([])
    expect(result.errors).toEqual([])
  })

  it("parses a full markdown document with 2+ wiretext blocks", () => {
    const md = [
      "# My UI",
      "",
      "```wiretext",
      "macro: topbar",
      "---",
      "logo Acme",
      "```",
      "",
      "Some prose between blocks.",
      "",
      "```wiretext",
      "screen: dashboard",
      "theme: saas-light",
      "use: topbar",
      "---",
      "@main",
      "  heading Dashboard",
      "```",
    ].join("\n")

    const { blocks, errors } = parseDocument(md)

    expect(errors.filter(e => e.severity === "error")).toHaveLength(0)
    expect(blocks).toHaveLength(2)
    expect(blocks[0]!.type).toBe("macro")
    expect(blocks[0]!.id).toBe("topbar")
    expect(blocks[0]!.position).toBe(0)
    expect(blocks[1]!.type).toBe("screen")
    expect(blocks[1]!.id).toBe("dashboard")
    expect(blocks[1]!.position).toBe(1)
  })

  it("handles interleaved markdown and wiretext without confusion", () => {
    const md = [
      "## Intro",
      "This is the intro.",
      "```js",
      "console.log('ignored')",
      "```",
      "```wiretext",
      "theme: brand",
      "---",
      "primary: #FF6600",
      "```",
      "More prose after.",
    ].join("\n")

    const { blocks, errors } = parseDocument(md)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.type).toBe("theme")
    expect(errors.filter(e => e.severity === "error")).toHaveLength(0)
  })

  it("collects errors from a bad block but still parses subsequent good blocks", () => {
    const md = [
      "```wiretext",
      "widget: foo",
      "---",
      "text hi",
      "```",
      "```wiretext",
      "screen: valid",
      "---",
      "text ok",
      "```",
    ].join("\n")

    const { blocks, errors } = parseDocument(md)

    // First block has an error (unknown type "widget") → not included
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.id).toBe("valid")

    // Error from the first block is collected
    expect(errors.some(e => e.severity === "error" && e.blockPosition === 0)).toBe(true)
  })

  it("accumulates errors from multiple bad blocks", () => {
    const md = [
      "```wiretext",
      "no separator here",
      "```",
      "```wiretext",
      "widget: also-bad",
      "---",
      "text",
      "```",
      "```wiretext",
      "screen: good",
      "---",
      "text",
      "```",
    ].join("\n")

    const { blocks, errors } = parseDocument(md)

    expect(blocks).toHaveLength(1)
    expect(errors.filter(e => e.severity === "error")).toHaveLength(2)
  })

  it("assigns correct blockPosition to errors from different blocks", () => {
    const md = [
      "```wiretext",
      "widget: bad1",
      "---",
      "text",
      "```",
      "```wiretext",
      "screen: ok",
      "---",
      "text",
      "```",
      "```wiretext",
      "gadget: bad2",
      "---",
      "text",
      "```",
    ].join("\n")

    const { errors } = parseDocument(md)
    const errorPositions = errors.filter(e => e.severity === "error").map(e => e.blockPosition)

    expect(errorPositions).toContain(0)
    expect(errorPositions).toContain(2)
    expect(errorPositions).not.toContain(1)
  })

  it("returns warnings (not errors) for blocks with empty bodies", () => {
    const md = "```wiretext\nscreen: empty\n---\n```"
    const { blocks, errors } = parseDocument(md)
    expect(blocks).toHaveLength(1)
    expect(errors.every(e => e.severity === "warn")).toBe(true)
  })
})
