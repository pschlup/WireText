// wiretext — public API entry point
// See PROJECT.md for the full specification.

export type {
  BlockType,
  WireTextBlock,
  WireTextPlugin,
  Resolver,
  ParsedBody,
  ComponentNode,
  SlotNode,
  Transition,
  Modifier,
  ParseError,
  ThemeTokens,
} from "./types.js"

// Block parser (epic-002) — extract and parse wiretext blocks from markdown
export { parseDocument, parseBlock, extractBlocks } from "./parser/index.js"

// Body DSL parser (epic-003) — parse block body into component tree
export { parseBody } from "./body/index.js"

// Theme system (epic-006) — resolve and emit CSS for themes
export { resolveTheme, emitThemeCSS, SAAS_LIGHT, SAAS_DARK } from "./theme/index.js"

// Macro composition (epic-007) — flatten use: lists and merge zones
export { composeMacros, createResolver } from "./macro/index.js"

// Component renderers (epic-005) — render ComponentNode trees to HTML
export { renderComponent, COMPONENT_REGISTRY } from "./renderer/index.js"

// Layout engine (epic-004) — render zone skeleton and row grids
export { renderLayout } from "./layout/index.js"

// Interactions (epic-008) — assemble final HTML artifact
export { renderDocument, assembleArtifact, INTERACTION_JS } from "./interactions/index.js"
