// Comprehensive tests for the WireText body DSL parser.
// Covers: tokenizer, component parser, tree builder, and parseBody() public API.
import { describe, it, expect } from "vitest"
import { tokenize } from "../src/body/tokenizer.js"
import { parseLine, parseNavItems, parseCsvItems, parseRowCells } from "../src/body/component-parser.js"
import { buildTree } from "../src/body/tree-builder.js"
import { parseBody } from "../src/body/parse-body.js"
import type { ParseError } from "../src/types.js"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function noErrors(errors: ParseError[]): void {
  if (errors.length > 0) {
    throw new Error("Expected no errors but got:\n" + errors.map(e => `  [${e.severity}] L${e.line}: ${e.message}`).join("\n"))
  }
}

// ---------------------------------------------------------------------------
// 1. Tokenizer
// ---------------------------------------------------------------------------

describe("tokenizer", () => {
  it("tokenizes simple flat content", () => {
    const { tokens, errors } = tokenize("heading Dashboard\ntext Welcome", 0)
    noErrors(errors)
    expect(tokens).toHaveLength(2)
    expect(tokens[0]).toMatchObject({ indent: 0, content: "heading Dashboard", lineNum: 1 })
    expect(tokens[1]).toMatchObject({ indent: 0, content: "text Welcome", lineNum: 2 })
  })

  it("tokenizes 0-1-2 level indentation", () => {
    const body = `card Overview
  heading Title
    text Details`
    const { tokens, errors } = tokenize(body, 0)
    noErrors(errors)
    expect(tokens).toHaveLength(3)
    expect(tokens[0]!.indent).toBe(0)
    expect(tokens[1]!.indent).toBe(1)
    expect(tokens[2]!.indent).toBe(2)
  })

  it("skips blank lines and whitespace-only lines", () => {
    const body = `text One\n\n   \ntext Two`
    const { tokens, errors } = tokenize(body, 0)
    noErrors(errors)
    expect(tokens).toHaveLength(2)
    expect(tokens[0]!.content).toBe("text One")
    expect(tokens[1]!.content).toBe("text Two")
  })

  it("errors on odd-space indentation (1 space)", () => {
    const { tokens, errors } = tokenize(" text indented 1 space", 0)
    expect(errors).toHaveLength(1)
    expect(errors[0]!.severity).toBe("error")
    expect(errors[0]!.message).toMatch(/multiple of 2/)
  })

  it("errors on odd-space indentation (3 spaces)", () => {
    const { errors } = tokenize("   text indented 3 spaces", 0)
    expect(errors.some(e => e.message.match(/multiple of 2/))).toBe(true)
  })

  it("errors on tab indentation", () => {
    const { errors } = tokenize("\ttext indented with tab", 0)
    expect(errors.some(e => e.message.match(/Tab character/))).toBe(true)
  })

  it("errors on mixed tabs and spaces", () => {
    const { errors } = tokenize(" \ttext mixed indent", 0)
    expect(errors.some(e => e.message.match(/Tab character/))).toBe(true)
  })

  it("errors on indent jump > 1 level (level 0 to level 2)", () => {
    const { errors } = tokenize("card Title\n    text Skipped level", 0)
    expect(errors.some(e => e.message.match(/jump too large/))).toBe(true)
  })

  it("allows de-indent by multiple levels (level 3 to level 0)", () => {
    const body = `card
  row
    stat Label
text After`
    const { tokens, errors } = tokenize(body, 0)
    noErrors(errors)
    expect(tokens[3]!.indent).toBe(0)
    expect(tokens[3]!.content).toBe("text After")
  })

  it("preserves 1-indexed line numbers including blank lines", () => {
    const body = `\ntext First`
    const { tokens } = tokenize(body, 0)
    expect(tokens[0]!.lineNum).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// 2. Component line parser
// ---------------------------------------------------------------------------

describe("component parser — parseLine()", () => {
  function parse(content: string) {
    const errors: ParseError[] = []
    const result = parseLine(content, 1, 0, errors)
    return { result, errors }
  }

  it("parses button with primary modifier and transition", () => {
    const { result, errors } = parse("button Save+ → dashboard")
    noErrors(errors)
    expect(result.type).toBe("button")
    expect(result.text).toBe("Save")
    expect(result.modifiers).toContainEqual({ type: "primary" })
    expect(result.transition).toEqual({ type: "screen", target: "dashboard" })
  })

  it("parses button with icon, no text, overlay transition", () => {
    const { result, errors } = parse("button ~trash → #confirm-delete")
    noErrors(errors)
    expect(result.type).toBe("button")
    expect(result.icon).toBe("trash")
    expect(result.text).toBe("")
    expect(result.transition).toEqual({ type: "overlay", target: "#confirm-delete" })
  })

  it("parses button with icon and text", () => {
    const { result, errors } = parse("button ~trash Delete → #confirm")
    noErrors(errors)
    expect(result.icon).toBe("trash")
    expect(result.text).toBe("Delete")
    expect(result.transition).toEqual({ type: "overlay", target: "#confirm" })
  })

  it("parses active modifier *", () => {
    const { result } = parse("input Password*")
    expect(result.type).toBe("input")
    expect(result.text).toBe("Password")
    expect(result.modifiers).toContainEqual({ type: "active" })
  })

  it("parses badge modifier +N", () => {
    const { result } = parse("button Notifications+5")
    expect(result.modifiers).toContainEqual({ type: "badge", count: 5 })
  })

  it("stat: +18% in pipe field is NOT a badge modifier (literal text)", () => {
    const { result, errors } = parse("stat MRR | $4,200 | +18%")
    noErrors(errors)
    expect(result.type).toBe("stat")
    expect(result.text).toBe("MRR")
    expect(result.fields).toEqual(["$4,200", "+18%"])
    // No badge modifier
    expect(result.modifiers.some(m => m.type === "badge")).toBe(false)
  })

  it("stat: -0.3% in pipe field is NOT a modifier", () => {
    const { result } = parse("stat Churn | 5.2% | -0.3%")
    expect(result.fields).toEqual(["5.2%", "-0.3%"])
    expect(result.modifiers).toHaveLength(0)
  })

  it("parses action transition !close", () => {
    const { result } = parse("button Cancel → !close")
    expect(result.transition).toEqual({ type: "action", target: "!close" })
  })

  it("parses action transition !back", () => {
    const { result } = parse("button ~arrow-left Back → !back")
    expect(result.icon).toBe("arrow-left")
    expect(result.text).toBe("Back")
    expect(result.transition).toEqual({ type: "action", target: "!back" })
  })

  it("parses quoted string as literal text", () => {
    const { result } = parse('button "Save & Continue"+ → next')
    expect(result.text).toBe("Save & Continue")
    expect(result.modifiers).toContainEqual({ type: "primary" })
    expect(result.transition).toEqual({ type: "screen", target: "next" })
  })

  it("parses -> as transition operator (ASCII arrow)", () => {
    const { result } = parse("button Go -> next-screen")
    expect(result.transition).toEqual({ type: "screen", target: "next-screen" })
  })

  it("parses heading with level field", () => {
    const { result } = parse("heading Dashboard | 2")
    expect(result.text).toBe("Dashboard")
    expect(result.fields).toEqual(["2"])
  })

  it("parses link with url field", () => {
    const { result, errors } = parse("link View docs | /docs")
    noErrors(errors)
    expect(result.text).toBe("View docs")
    expect(result.fields).toEqual(["/docs"])
    expect(result.transition).toBeNull()
  })

  it("link: transition takes precedence over | url field (with warning)", () => {
    const { result, errors } = parse("link View docs | /docs → documentation")
    // Should get a warning
    expect(errors.some(e => e.severity === "warn" && e.message.match(/transition takes precedence/))).toBe(true)
    expect(result.transition).toEqual({ type: "screen", target: "documentation" })
    // url field should be removed
    expect(result.fields).not.toContain("/docs")
  })

  it("discards transition on non-interactive component (text) with warning", () => {
    const { result, errors } = parse("text Some content → somewhere")
    expect(errors.some(e => e.severity === "warn" && e.message.match(/non-interactive/))).toBe(true)
    expect(result.transition).toBeNull()
  })

  it("discards transition on container component (card) with warning", () => {
    const { result, errors } = parse("card Title → somewhere")
    expect(errors.some(e => e.severity === "warn" && e.message.match(/non-interactive/))).toBe(true)
    expect(result.transition).toBeNull()
  })

  it("parses plain text content with no modifiers", () => {
    const { result, errors } = parse("text plain content no modifiers")
    noErrors(errors)
    expect(result.text).toBe("plain content no modifiers")
    expect(result.modifiers).toHaveLength(0)
  })

  it("* in middle of content is literal text (modifier only at end of last segment)", () => {
    const { result, errors } = parse("text Hello * World")
    noErrors(errors)
    // * in the middle should not be extracted as a modifier
    // The text "Hello * World" has no trailing * at end
    expect(result.text).toBe("Hello * World")
    expect(result.modifiers).toHaveLength(0)
  })

  it("parses avatar with trailing ~icon", () => {
    const { result, errors } = parse("avatar Alice ~caret-down")
    noErrors(errors)
    expect(result.text).toBe("Alice")
    expect(result.icon).toBe("caret-down")
  })

  it("parses row with explicit column widths", () => {
    const { result, errors } = parse("row 6, 6")
    noErrors(errors)
    expect(result.isRow).toBe(true)
    expect(result.rowColumns).toEqual([6, 6])
  })

  it("parses plain row with null rowColumns", () => {
    const { result, errors } = parse("row")
    noErrors(errors)
    expect(result.isRow).toBe(true)
    expect(result.rowColumns).toBeNull()
  })

  it("parses row 3, 9 with explicit widths", () => {
    const { result } = parse("row 3, 9")
    expect(result.rowColumns).toEqual([3, 9])
  })

  it("parses slot line: .logo ~cube Acme", () => {
    const errors: ParseError[] = []
    const result = parseLine(".logo ~cube Acme", 1, 0, errors)
    noErrors(errors)
    expect(result.isSlot).toBe(true)
    expect(result.slotName).toBe("logo")
    expect(result.icon).toBe("cube")
    expect(result.text).toBe("Acme")
  })

  it("parses slot line with transition: .action New Project+ → project-create", () => {
    const errors: ParseError[] = []
    const result = parseLine(".action New Project+ → project-create", 1, 0, errors)
    noErrors(errors)
    expect(result.isSlot).toBe(true)
    expect(result.slotName).toBe("action")
    expect(result.text).toBe("New Project")
    expect(result.modifiers).toContainEqual({ type: "primary" })
    expect(result.transition).toEqual({ type: "screen", target: "project-create" })
  })
})

// ---------------------------------------------------------------------------
// 3. Nav/tabs/breadcrumb item parser
// ---------------------------------------------------------------------------

describe("component parser — parseNavItems()", () => {
  function parseNav(content: string, isBreadcrumb = false) {
    const errors: ParseError[] = []
    const items = parseNavItems(content, isBreadcrumb, 1, 0, errors)
    return { items, errors }
  }

  it("parses nav with active item and transitions", () => {
    const { items, errors } = parseNav("~house Home → home | ~folder Projects* | ~gear Settings → settings")
    noErrors(errors)
    expect(items).toHaveLength(3)
    expect(items[0]!.icon).toBe("house")
    expect(items[0]!.text).toBe("Home")
    expect(items[0]!.transition).toEqual({ type: "screen", target: "home" })
    expect(items[1]!.text).toBe("Projects")
    expect(items[1]!.modifiers).toContainEqual({ type: "active" })
    expect(items[1]!.transition).toBeNull()
    expect(items[2]!.transition).toEqual({ type: "screen", target: "settings" })
  })

  it("parses nav with badge count +N on item", () => {
    const { items } = parseNav("Dashboard | Projects+3 | Team")
    expect(items[1]!.text).toBe("Projects")
    expect(items[1]!.modifiers).toContainEqual({ type: "badge", count: 3 })
  })

  it("parses --- as divider item", () => {
    const { items } = parseNav("Dashboard | --- | Settings")
    expect(items).toHaveLength(3)
    expect(items[1]!.text).toBe("---")
  })

  it("breadcrumb: last item transition is ignored (current page rule)", () => {
    const { items } = parseNav("Home → home | Projects → projects | Detail → detail", true)
    expect(items).toHaveLength(3)
    expect(items[0]!.transition).not.toBeNull()
    expect(items[1]!.transition).not.toBeNull()
    // Last item transition should be discarded
    expect(items[2]!.transition).toBeNull()
  })

  it("tabs: per-tab transitions", () => {
    const { items } = parseNav("General* | Security → security | Billing → billing")
    expect(items[0]!.modifiers).toContainEqual({ type: "active" })
    expect(items[1]!.transition).toEqual({ type: "screen", target: "security" })
    expect(items[2]!.transition).toEqual({ type: "screen", target: "billing" })
  })
})

// ---------------------------------------------------------------------------
// 4. CSV item parser
// ---------------------------------------------------------------------------

describe("component parser — parseCsvItems()", () => {
  it("parses actions with per-item transitions", () => {
    const errors: ParseError[] = []
    const items = parseCsvItems("Edit → edit, Delete → #confirm", 1, 0, errors)
    noErrors(errors)
    expect(items).toHaveLength(2)
    expect(items[0]!.text).toBe("Edit")
    expect(items[0]!.transition).toEqual({ type: "screen", target: "edit" })
    expect(items[1]!.text).toBe("Delete")
    expect(items[1]!.transition).toEqual({ type: "overlay", target: "#confirm" })
  })

  it("parses items with --- divider", () => {
    const errors: ParseError[] = []
    const items = parseCsvItems("Profile → profile, ---, Log out → logout", 1, 0, errors)
    noErrors(errors)
    expect(items).toHaveLength(3)
    expect(items[1]!.text).toBe("---")
  })
})

// ---------------------------------------------------------------------------
// 5. Tree builder
// ---------------------------------------------------------------------------

describe("tree builder — buildTree()", () => {
  it("implicit @main: no zone labels — entire body becomes @main", () => {
    const body = `heading Dashboard\ntext Welcome`
    const { tokens } = tokenize(body, 0)
    const { body: parsedBody, errors } = buildTree(tokens, "screen", 0)
    noErrors(errors)
    expect(parsedBody.zones.has("main")).toBe(true)
    expect(parsedBody.zones.get("main")!).toHaveLength(2)
  })

  it("full screen with @header, @sidebar, @main, @footer zones", () => {
    const body = `@header
  logo ~cube Acme
@sidebar
  nav Dashboard
@main
  heading Projects
@footer
  text Footer`
    const { tokens } = tokenize(body, 0)
    const { body: parsedBody, errors } = buildTree(tokens, "screen", 0)
    noErrors(errors)
    expect(parsedBody.zones.has("header")).toBe(true)
    expect(parsedBody.zones.has("sidebar")).toBe(true)
    expect(parsedBody.zones.has("main")).toBe(true)
    expect(parsedBody.zones.has("footer")).toBe(true)
  })

  it("@header with left/right sub-slots", () => {
    const body = `@header
  left
    logo ~cube Acme
    nav Dashboard* | Projects
  right
    avatar Alice ~caret-down
@main
  text Content`
    const { tokens } = tokenize(body, 0)
    const { body: parsedBody, errors } = buildTree(tokens, "screen", 0)
    noErrors(errors)
    const headerZone = parsedBody.zones.get("header")!
    expect(headerZone).toHaveLength(2)
    expect(headerZone[0]!.type).toBe("left")
    expect(headerZone[0]!.children).toHaveLength(2)
    expect(headerZone[1]!.type).toBe("right")
  })

  it("@header + unlabeled content → header zone + implicit @main", () => {
    const body = `@header
  logo Acme
heading Dashboard
text Welcome`
    const { tokens } = tokenize(body, 0)
    const { body: parsedBody, errors } = buildTree(tokens, "screen", 0)
    noErrors(errors)
    expect(parsedBody.zones.has("header")).toBe(true)
    expect(parsedBody.zones.has("main")).toBe(true)
    expect(parsedBody.zones.get("main")!).toHaveLength(2)
  })

  it("overlay block #confirm with modal child", () => {
    const body = `heading Projects
#confirm-delete
  modal Confirm Deletion
    text Are you sure?
    button Cancel → !close`
    const { tokens } = tokenize(body, 0)
    const { body: parsedBody, errors } = buildTree(tokens, "screen", 0)
    noErrors(errors)
    expect(parsedBody.overlays.has("confirm-delete")).toBe(true)
    const overlay = parsedBody.overlays.get("confirm-delete")!
    expect(overlay[0]!.type).toBe("modal")
    expect(overlay[0]!.children).toHaveLength(2)
  })

  it("nav items with per-item modifiers stored as children", () => {
    const body = `@main
  nav ~house Home → home | ~folder Projects* | ~gear Settings → settings`
    const { tokens } = tokenize(body, 0)
    const { body: parsedBody, errors } = buildTree(tokens, "screen", 0)
    noErrors(errors)
    const mainZone = parsedBody.zones.get("main")!
    const navNode  = mainZone[0]!
    expect(navNode.type).toBe("nav")
    expect(navNode.children).toHaveLength(3)
    expect(navNode.children[1]!.modifiers).toContainEqual({ type: "active" })
  })

  it("compound component slots (.logo, .plan, .action)", () => {
    const body = `pricing-table
  .plan Starter | Free | 5 projects
  .plan Pro* | $29/mo | Unlimited projects`
    const { tokens } = tokenize(body, 0)
    const { body: parsedBody, errors } = buildTree(tokens, "screen", 0)
    noErrors(errors)
    const main = parsedBody.zones.get("main")!
    const pt   = main[0]!
    expect(pt.type).toBe("pricing-table")
    expect(pt.slots.has("plan")).toBe(true)
    expect(pt.slots.get("plan")!).toHaveLength(2)
    expect(pt.slots.get("plan")![1]!.modifiers).toContainEqual({ type: "active" })
  })

  it("row with plain row: rowColumns null", () => {
    const body = `row
  stat MRR | $4,200
  stat Projects | 12`
    const { tokens } = tokenize(body, 0)
    const { body: parsedBody, errors } = buildTree(tokens, "screen", 0)
    noErrors(errors)
    const rowNode = parsedBody.zones.get("main")![0]!
    expect(rowNode.type).toBe("row")
    expect(rowNode.rowColumns).toBeNull()
    expect(rowNode.children).toHaveLength(2)
  })

  it("row 6, 6 with explicit column widths", () => {
    const body = `row 6, 6
  card Plan A
  card Plan B`
    const { tokens } = tokenize(body, 0)
    const { body: parsedBody, errors } = buildTree(tokens, "screen", 0)
    noErrors(errors)
    const rowNode = parsedBody.zones.get("main")![0]!
    expect(rowNode.type).toBe("row")
    expect(rowNode.rowColumns).toEqual([6, 6])
    expect(rowNode.children).toHaveLength(2)
  })

  it("nested components: card > input + button", () => {
    const body = `card Login
  input Email | you@example.com
  button Sign In+`
    const { tokens } = tokenize(body, 0)
    const { body: parsedBody, errors } = buildTree(tokens, "screen", 0)
    noErrors(errors)
    const card = parsedBody.zones.get("main")![0]!
    expect(card.type).toBe("card")
    expect(card.children).toHaveLength(2)
    expect(card.children[0]!.type).toBe("input")
    expect(card.children[1]!.type).toBe("button")
  })

  it("settings-form with .section slots that have children", () => {
    const body = `settings-form
  .section General
    input Full Name
    input Email
  .action Save changes+`
    const { tokens } = tokenize(body, 0)
    const { body: parsedBody, errors } = buildTree(tokens, "screen", 0)
    noErrors(errors)
    const form = parsedBody.zones.get("main")![0]!
    expect(form.slots.has("section")).toBe(true)
    expect(form.slots.get("section")![0]!.children).toHaveLength(2)
    expect(form.slots.has("action")).toBe(true)
  })

  it("data-table with .row slot in item mode (pipe-separated cells)", () => {
    const body = `data-table
  .columns Name, Status, Owner
  .row Acme Corp → detail | Active* | Alice`
    const { tokens } = tokenize(body, 0)
    const { body: parsedBody, errors } = buildTree(tokens, "screen", 0)
    noErrors(errors)
    const dt  = parsedBody.zones.get("main")![0]!
    const row = dt.slots.get("row")![0]!
    expect(row.cells).not.toBeNull()
    expect(row.cells!).toHaveLength(3)
    expect(row.cells![0]!.text).toBe("Acme Corp")
    expect(row.cells![0]!.transition).toEqual({ type: "screen", target: "detail" })
    expect(row.cells![1]!.modifiers).toContainEqual({ type: "active" })
  })

  it("data-table .actions CSV slot with per-item transitions", () => {
    const body = `data-table
  .actions Edit → edit, Delete → #confirm-delete`
    const { tokens } = tokenize(body, 0)
    const { body: parsedBody, errors } = buildTree(tokens, "screen", 0)
    noErrors(errors)
    const dt      = parsedBody.zones.get("main")![0]!
    const actions = dt.slots.get("actions")![0]!
    expect(actions.children).toHaveLength(2)
    expect(actions.children[0]!.text).toBe("Edit")
    expect(actions.children[0]!.transition).toEqual({ type: "screen", target: "edit" })
    expect(actions.children[1]!.transition).toEqual({ type: "overlay", target: "#confirm-delete" })
  })

  it("user-menu .items with --- divider", () => {
    const body = `user-menu
  .avatar Alice Chen
  .items Profile → profile, ---, Log out → logout`
    const { tokens } = tokenize(body, 0)
    const { body: parsedBody, errors } = buildTree(tokens, "screen", 0)
    noErrors(errors)
    const menu  = parsedBody.zones.get("main")![0]!
    const items = menu.slots.get("items")![0]!
    expect(items.children).toHaveLength(3)
    expect(items.children[1]!.text).toBe("---")
  })

  it("@sidebar N → stores zone width annotation", () => {
    const body = `@sidebar 3
  nav Overview
@main
  heading Content`
    const { tokens } = tokenize(body, 0)
    const { body: parsedBody, errors } = buildTree(tokens, "screen", 0)
    noErrors(errors)
    const sidebarZone = parsedBody.zones.get("sidebar")!
    // Width annotation stored as first child with type "_zone-width"
    expect(sidebarZone[0]!.type).toBe("_zone-width")
    expect(sidebarZone[0]!.text).toBe("3")
  })

  // -- Error cases --

  it("error: duplicate zone", () => {
    const body = `@main
  text First
@main
  text Second`
    const { tokens } = tokenize(body, 0)
    const { errors } = buildTree(tokens, "screen", 0)
    expect(errors.some(e => e.severity === "error" && e.message.match(/Duplicate zone/))).toBe(true)
  })

  it("error: overlay in macro body", () => {
    const body = `@main
  heading Title
#confirm
  modal Confirm
    text Are you sure?`
    const { tokens } = tokenize(body, 0)
    const { errors } = buildTree(tokens, "macro", 0)
    expect(errors.some(e => e.severity === "error" && e.message.match(/macro/))).toBe(true)
  })

  it("error: zone labels in inline journey screen", () => {
    const body = `screen: dashboard
  @main
    heading Title`
    const { tokens } = tokenize(body, 0)
    const { errors } = buildTree(tokens, "journey", 0)
    expect(errors.some(e => e.severity === "error" && e.message.match(/Zone labels not allowed/))).toBe(true)
  })

  it("error: non-screen content in journey body at indent 0", () => {
    const body = `heading Dashboard`
    const { tokens } = tokenize(body, 0)
    const { errors } = buildTree(tokens, "journey", 0)
    expect(errors.some(e => e.severity === "error" && e.message.match(/Journey body/))).toBe(true)
  })

  it("error: row at indent 0 in journey body is non-screen content", () => {
    const body = `row
  stat MRR | $4,200`
    const { tokens } = tokenize(body, 0)
    const { errors } = buildTree(tokens, "journey", 0)
    expect(errors.some(e => e.severity === "error" && e.message.match(/Journey body/))).toBe(true)
  })

  it("error: screen: separator in screen body", () => {
    const body = `screen: dashboard
  heading Title`
    const { tokens } = tokenize(body, 0)
    const { errors } = buildTree(tokens, "screen", 0)
    expect(errors.some(e => e.severity === "error" && e.message.match(/journey/))).toBe(true)
  })

  it("error: overlay #id with card as root child", () => {
    const body = `heading Projects
#sidebar
  card Not Allowed
    text Content`
    const { tokens } = tokenize(body, 0)
    const { errors } = buildTree(tokens, "screen", 0)
    expect(errors.some(e => e.severity === "error" && e.message.match(/modal, drawer, or alert/))).toBe(true)
  })

  it("error: non-integer zone width @sidebar abc", () => {
    const body = `@sidebar abc
  nav Overview
@main
  text Content`
    const { tokens } = tokenize(body, 0)
    const { errors } = buildTree(tokens, "screen", 0)
    expect(errors.some(e => e.severity === "error" && e.message.match(/Non-integer zone width/))).toBe(true)
  })

  it("error: explicit @main zone followed by unlabeled content", () => {
    const body = `@main
  heading First
text Outside zone`
    const { tokens } = tokenize(body, 0)
    const { errors } = buildTree(tokens, "screen", 0)
    expect(errors.some(e => e.severity === "error" && e.message.match(/duplicate @main|Duplicate.*main/))).toBe(true)
  })

  it("warn: left/right outside @header/@footer → unknown component warning", () => {
    const body = `@main
  left
    text Content`
    const { tokens } = tokenize(body, 0)
    const { errors } = buildTree(tokens, "screen", 0)
    expect(errors.some(e => e.severity === "warn" && e.message.match(/only valid as a direct child/))).toBe(true)
  })

  it("item outside tree/kanban/feed is an error", () => {
    const body = `card My Card
  item Something`
    const { tokens } = tokenize(body, 0)
    const { errors } = buildTree(tokens, "screen", 0)
    expect(errors.some(e => e.severity === "error" && e.message.match(/item.*only valid/))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 6. Journey tree builder
// ---------------------------------------------------------------------------

describe("tree builder — journey bodies", () => {
  it("journey body with inline screens", () => {
    const body = `screen: signup
  heading Create your account
  signup-form
    .logo ~cube Acme

screen: verify-email
  empty-state
    .icon ~envelope
    .heading Check your inbox`
    const { tokens } = tokenize(body, 0)
    const { body: parsedBody, errors } = buildTree(tokens, "journey", 0)
    noErrors(errors)
    expect(parsedBody.screens.has("signup")).toBe(true)
    expect(parsedBody.screens.has("verify-email")).toBe(true)
    expect(parsedBody.screens.get("signup")![0]!.type).toBe("heading")
    expect(parsedBody.screens.get("verify-email")![0]!.type).toBe("empty-state")
  })

  it("journey screen content is properly nested", () => {
    const body = `screen: dashboard
  row
    stat MRR | $4,200 | +18%
    stat Projects | 12`
    const { tokens } = tokenize(body, 0)
    const { body: parsedBody, errors } = buildTree(tokens, "journey", 0)
    noErrors(errors)
    const screenContent = parsedBody.screens.get("dashboard")!
    expect(screenContent[0]!.type).toBe("row")
    expect(screenContent[0]!.children).toHaveLength(2)
  })

  it("error: overlay #id in journey body", () => {
    const body = `#my-overlay
  modal My Modal`
    const { tokens } = tokenize(body, 0)
    const { errors } = buildTree(tokens, "journey", 0)
    expect(errors.some(e => e.severity === "error" && e.message.match(/journey/))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 7. parseBody() public API
// ---------------------------------------------------------------------------

describe("parseBody()", () => {
  it("screen body → zones + overlays + tokens=null", () => {
    const body = `heading Dashboard | 2
button New Project+ → project-create

#confirm-delete
  modal Confirm
    button Cancel → !close`
    const { body: parsed, errors } = parseBody(body, "screen", 0)
    noErrors(errors)
    expect(parsed.tokens).toBeNull()
    expect(parsed.zones.has("main")).toBe(true)
    expect(parsed.overlays.has("confirm-delete")).toBe(true)
    expect(parsed.screens.size).toBe(0)
  })

  it("macro body → zones only, tokens=null, no overlays", () => {
    const body = `@header
  logo Acme
@footer
  text Footer`
    const { body: parsed, errors } = parseBody(body, "macro", 0)
    noErrors(errors)
    expect(parsed.tokens).toBeNull()
    expect(parsed.zones.has("header")).toBe(true)
    expect(parsed.zones.has("footer")).toBe(true)
  })

  it("journey body → screens Map populated", () => {
    const body = `screen: step1
  heading Step 1

screen: step2
  heading Step 2`
    const { body: parsed, errors } = parseBody(body, "journey", 0)
    noErrors(errors)
    expect(parsed.tokens).toBeNull()
    expect(parsed.screens.has("step1")).toBe(true)
    expect(parsed.screens.has("step2")).toBe(true)
    expect(parsed.zones.size).toBe(0)
  })

  it("theme body → tokens populated, zones/overlays/screens empty", () => {
    const body = `primary: #2563EB
surface: #FFFFFF
border: #E5E7EB
text: #111827
muted: #6B7280
danger: #DC2626
success: #16A34A
radius: 8px
font: Inter, sans-serif
size: 14px`
    const { body: parsed, errors } = parseBody(body, "theme", 0)
    noErrors(errors)
    expect(parsed.tokens).not.toBeNull()
    expect(parsed.tokens!["primary"]).toBe("#2563EB")
    expect(parsed.tokens!["radius"]).toBe("8px")
    expect(parsed.zones.size).toBe(0)
    expect(parsed.overlays.size).toBe(0)
    expect(parsed.screens.size).toBe(0)
  })

  it("theme body with unknown key → warn", () => {
    const body = `primary: #2563EB\nunknown-key: value`
    const { errors } = parseBody(body, "theme", 0)
    expect(errors.some(e => e.severity === "warn" && e.message.match(/Unknown theme token/))).toBe(true)
  })

  it("theme body with empty content → warn", () => {
    const { errors } = parseBody("", "theme", 0)
    expect(errors.some(e => e.severity === "warn" && e.message.match(/no recognizable/))).toBe(true)
  })

  it("full dashboard screen body end-to-end", () => {
    const body = `@header
  left
    logo ~cube Acme
    nav Dashboard* | Projects+3 | Team
  right
    search Search...
    avatar Alice ~caret-down
@sidebar
  nav ~house Dashboard | ~chart-bar Analytics | ~gear Settings | --- | ~question Help
@main
  row
    stat MRR | $4,200 | +18%
    stat Active Projects | 12 | +2
  row
    data-table
      .columns Name, Status, Owner
      .row Acme Corp → detail | Active* | Alice
      .actions Edit → project-edit, Delete → #confirm-delete
@footer
  left
    text © 2026 Acme Inc.
  right
    nav Privacy | Terms | Contact`

    const { body: parsed, errors } = parseBody(body, "screen", 0)
    noErrors(errors)

    // Header
    expect(parsed.zones.has("header")).toBe(true)
    const header = parsed.zones.get("header")!
    expect(header[0]!.type).toBe("left")
    expect(header[0]!.children[0]!.type).toBe("logo")
    expect(header[0]!.children[1]!.type).toBe("nav")
    expect(header[0]!.children[1]!.children).toHaveLength(3) // nav items

    // Sidebar
    const sidebar = parsed.zones.get("sidebar")!
    expect(sidebar[0]!.type).toBe("nav")
    expect(sidebar[0]!.children).toHaveLength(5) // 4 items + divider

    // Main
    const main = parsed.zones.get("main")!
    expect(main[0]!.type).toBe("row")
    expect(main[0]!.children[0]!.text).toBe("MRR")
    expect(main[0]!.children[0]!.fields).toEqual(["$4,200", "+18%"])

    // data-table
    const dt = main[1]!.children[0]!
    expect(dt.type).toBe("data-table")
    expect(dt.slots.has("row")).toBe(true)
    expect(dt.slots.get("row")![0]!.cells![0]!.text).toBe("Acme Corp")

    // Footer
    expect(parsed.zones.has("footer")).toBe(true)
  })

  it("respects blockPosition in error line numbers", () => {
    const body = `\t text with tab indent`
    const { errors } = parseBody(body, "screen", 5)
    expect(errors[0]!.blockPosition).toBe(5)
    expect(errors[0]!.line).toBe(1)
  })

  it("login-form with .logo, .providers, .footer slots", () => {
    const body = `login-form
  .logo ~cube Acme
  .providers google, github
  .footer No account? Sign up → signup`
    const { body: parsed, errors } = parseBody(body, "screen", 0)
    noErrors(errors)
    const form = parsed.zones.get("main")![0]!
    expect(form.type).toBe("login-form")
    expect(form.slots.has("logo")).toBe(true)
    expect(form.slots.get("logo")![0]!.icon).toBe("cube")
    expect(form.slots.get("logo")![0]!.text).toBe("Acme")
    expect(form.slots.has("providers")).toBe(true)
    expect(form.slots.has("footer")).toBe(true)
    expect(form.slots.get("footer")![0]!.transition).toEqual({ type: "screen", target: "signup" })
  })
})

// ---------------------------------------------------------------------------
// 8. Edge cases and regression tests
// ---------------------------------------------------------------------------

describe("edge cases", () => {
  it("empty body → implicit empty @main", () => {
    const { body: parsed, errors } = parseBody("", "screen", 0)
    noErrors(errors)
    expect(parsed.zones.has("main")).toBe(true)
    expect(parsed.zones.get("main")!).toHaveLength(0)
  })

  it("nav Dashboard* is parsed as item with active modifier", () => {
    const { tokens } = tokenize("nav Dashboard* | Projects | Team", 0)
    const { body: parsed } = buildTree(tokens, "screen", 0)
    const nav = parsed.zones.get("main")![0]!
    expect(nav.children[0]!.text).toBe("Dashboard")
    expect(nav.children[0]!.modifiers).toContainEqual({ type: "active" })
  })

  it("text Hello * World — * in middle is literal", () => {
    const { body: parsed, errors } = parseBody("text Hello * World", "screen", 0)
    noErrors(errors)
    const textNode = parsed.zones.get("main")![0]!
    expect(textNode.text).toBe("Hello * World")
    expect(textNode.modifiers).toHaveLength(0)
  })

  it("overlay target #overlay-id includes the hash", () => {
    const { tokens } = tokenize("button Delete → #confirm-delete", 0)
    const { body: parsed } = buildTree(tokens, "screen", 0)
    const btn = parsed.zones.get("main")![0]!
    expect(btn.transition).toEqual({ type: "overlay", target: "#confirm-delete" })
  })

  it("multiple .plan slots are all stored in slots map array", () => {
    const body = `pricing-table
  .plan Free | Free | 5 projects
  .plan Pro* | $29/mo | Unlimited
  .plan Enterprise | Custom | SSO`
    const { body: parsed, errors } = parseBody(body, "screen", 0)
    noErrors(errors)
    const pt = parsed.zones.get("main")![0]!
    expect(pt.slots.get("plan")!).toHaveLength(3)
  })

  it("breadcrumb: parses items correctly, last has no transition", () => {
    const { body: parsed } = parseBody("breadcrumb Home → home | Projects → projects | Detail → detail", "screen", 0)
    const crumb = parsed.zones.get("main")![0]!
    expect(crumb.type).toBe("breadcrumb")
    expect(crumb.children).toHaveLength(3)
    expect(crumb.children[0]!.transition).not.toBeNull()
    expect(crumb.children[2]!.transition).toBeNull() // last item discarded
  })

  it("input with placeholder in field: input Password* | placeholder", () => {
    const { body: parsed, errors } = parseBody("input Password* | Enter your password", "screen", 0)
    noErrors(errors)
    const input = parsed.zones.get("main")![0]!
    expect(input.text).toBe("Password")
    expect(input.modifiers).toContainEqual({ type: "active" })
    expect(input.fields[0]).toBe("Enter your password")
  })
})
