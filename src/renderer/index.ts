// Component renderer registry (epic-005) — 53 components to HTML/WebAwesome
// See PROJECT.md §Component → WebAwesome / HTML Mapping

export { renderComponent, COMPONENT_REGISTRY } from "./registry.js"
export type { RenderContext, RenderFunction, RenderResult } from "./registry.js"

// Import all renderer modules to trigger self-registration in COMPONENT_REGISTRY.
// Order matters: primitives must register before compounds that reuse them.
import "./primitives.js"
import "./forms.js"
import "./navigation.js"
import "./containers.js"
import "./data.js"
import "./compounds.js"
