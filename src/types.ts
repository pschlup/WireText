// Core TypeScript interfaces from PROJECT.md §Plugin Interface
// These are the data contracts between all pipeline stages.

// §Block Types
export type BlockType = "macro" | "theme" | "screen" | "journey"

// §Block Format — output of the block parser (epic-002)
export interface WireTextBlock {
  type:     BlockType
  id:       string
  position: number                       // ordinal in document, for nearest-previous resolution
  header:   Record<string, string | string[]>
  body:     string                       // raw body string — DSL for screen/macro/journey, key-value for theme
}

// §Plugin Interface
export interface Resolver {
  // Returns nearest-previous definition for given type + id, before given position
  resolve(type: BlockType, id: string, beforePosition: number): WireTextBlock | null
  // Returns nearest-previous definition for given type (any id), before given position
  resolveByType(type: BlockType, beforePosition: number): WireTextBlock | null
}

export interface WireTextPlugin {
  // Produces visible output — called for screen and journey blocks
  render(block: WireTextBlock, resolver: Resolver): HTMLElement

  // No visual output — called for macro and theme blocks to register them
  register(block: WireTextBlock, resolver: Resolver): void
}

// §Parsed Body — output of the body DSL parser (epic-003)
export interface ParsedBody {
  zones:    Map<string, ComponentNode[]> // @zone → component tree
  overlays: Map<string, ComponentNode[]> // #id → overlay component tree
  screens:  Map<string, ComponentNode[]> // journey only: screen-id → main zone content
  // theme blocks only: flat key-value token definitions; null for all non-theme blocks
  tokens:   ThemeTokens | null
}

// §Component Node — single node in the parsed component tree
export interface ComponentNode {
  type:       string                   // component name from vocabulary
  text:       string                   // primary label
  fields:     string[]                 // pipe-delimited additional fields (positional)
  icon:       string | null            // Phosphor icon name (from ~name)
  modifiers:  Modifier[]               // *, +, +N
  transition: Transition | null        // → target
  slots:      Map<string, SlotNode[]>  // .slot-name children (compound components)
  children:   ComponentNode[]          // nested components (indentation-based); also used for nav/tabs/breadcrumb items (synthetic type "item")
  // For "row" nodes with explicit column widths (e.g. row 6, 6): column spans in grid units; null = infer from child count
  rowColumns: number[] | null
}

// §Slot — named slot on a compound component
// Mirrors ComponentNode structure but type field holds slot name
export interface SlotNode {
  name:       string                   // slot name (e.g. "logo", "plan", "action")
  text:       string                   // primary text content
  fields:     string[]                 // pipe-delimited fields (raw, for non-item-mode slots)
  icon:       string | null
  modifiers:  Modifier[]
  transition: Transition | null
  children:   ComponentNode[]          // for slots with indented child components (e.g. .section)
  // For .row slots in data-table: each pipe-separated cell parsed independently as a ComponentNode;
  // null for all other slots. Supersedes fields[] for item-mode pipe splitting.
  cells:      ComponentNode[] | null
}

// §Transitions
export interface Transition {
  type:   "screen" | "overlay" | "action" | "external"
  target: string                       // screen id, #overlay-id (with #), !action-name (with !), or https:// URL
}

// §Modifiers — at most one active, at most one primary or badge
export type Modifier =
  | { type: "active" }                 // * — active/selected; renderer interprets per component
  | { type: "primary" }                // + — primary variant (button)
  | { type: "badge"; count: number }   // +N — badge count overlay

// §Error reporting — shared across all pipeline stages
export interface ParseError {
  severity:      "error" | "warn"
  message:       string
  line:          number                // 1-indexed line number within the block body
  blockPosition: number                // ordinal of the block in the document
}

// Theme token map
export type ThemeTokens = Record<string, string>

// Zone names — centralized constants used by parser, layout, and renderer
export type ZoneName = "header" | "sidebar" | "main" | "aside" | "footer"
export const ZONE_NAMES: ReadonlySet<string> = new Set<ZoneName>(["header", "sidebar", "main", "aside", "footer"])
export const HEADER_FOOTER_ZONES: ReadonlySet<string> = new Set<ZoneName>(["header", "footer"])

// §Component Hierarchy — four-level classification from page layout down to atomic elements
export type ComponentLevel = "page" | "section" | "component" | "element"

export const COMPONENT_LEVELS: Readonly<Record<string, ComponentLevel>> = {
  // Page level — full page sections and top-level layout compositions
  "hero":                  "page",
  "login-form":            "page",
  "signup-form":           "page",
  "pricing-table":         "page",
  "empty-state":           "page",
  "feature-grid":          "page",
  "logo-cloud":            "page",
  "onboarding-checklist":  "page",
  "command-palette":       "page",

  // Section level — mid-level containers, cards, and compound panels
  "card":                  "section",
  "modal":                 "section",
  "drawer":                "section",
  "details":               "section",
  "action-sheet":          "section",
  "data-table":            "section",
  "settings-form":         "section",
  "file-upload":           "section",
  "testimonial":           "section",
  "user-menu":             "section",

  // Component level — functional components: data display, navigation, feedback
  "table":                 "component",
  "nav":                   "component",
  "tabs":                  "component",
  "breadcrumb":            "component",
  "stepper":               "component",
  "filter-bar":            "component",
  "bottom-nav":            "component",
  "tree":                  "component",
  "pagination":            "component",
  "stat":                  "component",
  "chart":                 "component",
  "feed":                  "component",
  "kanban":                "component",
  "calendar":              "component",
  "timeline":              "component",
  "metric":                "component",
  "skeleton":              "component",
  "alert":                 "component",
  "toast":                 "component",
  "callout":               "component",
  "tooltip":               "component",
  "logo":                  "component",

  // Element level — atomic UI elements: buttons, form fields, text, icons
  "text":                  "element",
  "heading":               "element",
  "subtext":               "element",
  "link":                  "element",
  "button":                "element",
  "badge":                 "element",
  "avatar":                "element",
  "icon":                  "element",
  "divider":               "element",
  "spacer":                "element",
  "progress":              "element",
  "tag":                   "element",
  "code":                  "element",
  "item":                  "element",
  "hamburger":             "element",
  "input":                 "element",
  "select":                "element",
  "checkbox":              "element",
  "radio":                 "element",
  "toggle":                "element",
  "textarea":              "element",
  "datepicker":            "element",
  "search":                "element",
  "slider":                "element",
  "rating":                "element",
  "combobox":              "element",
}

/** Look up the hierarchy level for a component type; returns undefined for unknown types. */
export function getComponentLevel(type: string): ComponentLevel | undefined {
  return COMPONENT_LEVELS[type]
}

/** Get all component type names at a given hierarchy level. */
export function getComponentsByLevel(level: ComponentLevel): string[] {
  return Object.entries(COMPONENT_LEVELS)
    .filter(([, l]) => l === level)
    .map(([name]) => name)
}
