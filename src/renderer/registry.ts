// Component renderer registry (task-040) — maps component type names to render functions
import type { ComponentNode, ParseError } from "../types.js"

export interface RenderContext {
  parentColumnWidth: number          // parent zone/cell column span (1-12)
  parentComponentType: string | null // for context-dependent rendering (e.g. item in kanban)
  themeTokens: Record<string, string>
  blockPosition: number
}

export type RenderFunction = (node: ComponentNode, ctx: RenderContext) => RenderResult

export interface RenderResult {
  element: HTMLElement
  errors:  ParseError[]
}

// Registry: component type name → render function
// Populated by each renderer module (primitives, forms, data, etc.)
export const COMPONENT_REGISTRY = new Map<string, RenderFunction>()

/** Render a ComponentNode using the registered renderer, or the unknown placeholder. */
export function renderComponent(node: ComponentNode, ctx: RenderContext): RenderResult {
  const renderer = COMPONENT_REGISTRY.get(node.type)
  if (renderer) return renderer(node, ctx)

  // Unknown component — render placeholder div (graceful degradation)
  // PROJECT.md §Validation: unknown component type → warn (render placeholder)
  const el = document.createElement("div")
  el.className = "wiretext-unknown"
  el.textContent = `[unknown: ${node.type}]`
  return {
    element: el,
    errors: [{
      severity: "warn",
      message: `Unknown component type: "${node.type}"`,
      line: 0,
      blockPosition: ctx.blockPosition,
    }],
  }
}
