// Shared renderer utilities — icon creation, modifier application, transition wiring.
// These are internal helpers used across all renderer modules.
import type { ComponentNode, Modifier, ParseError, Transition } from "../types.js"
import { renderComponent, type RenderContext, type RenderResult } from "./registry.js"

/** Create a Phosphor icon custom element: "trash" → <ph-trash> */
export function createIcon(name: string): HTMLElement {
  return document.createElement(`ph-${name}`)
}

/** Apply component modifiers to an element. Badge count is returned, not applied here
 *  since different components handle badge display differently. */
export function applyModifiers(el: HTMLElement, modifiers: Modifier[]): void {
  for (const mod of modifiers) {
    if (mod.type === "active") {
      el.setAttribute("aria-current", "page")
    }
    if (mod.type === "primary") {
      el.setAttribute("variant", "primary")
    }
    // badge counts are handled per-component
  }
}

/** Attach a transition as a data attribute for the interaction system (epic-008). */
export function applyTransition(el: HTMLElement, transition: Transition | null): void {
  if (!transition) return
  el.dataset["wtTransition"] = JSON.stringify(transition)
}

/** Extract the badge count from modifiers, or null if none present. */
export function getBadgeCount(modifiers: Modifier[]): number | null {
  for (const mod of modifiers) {
    if (mod.type === "badge") return mod.count
  }
  return null
}

/** Check if the active modifier is present. */
export function isActive(modifiers: Modifier[]): boolean {
  return modifiers.some(m => m.type === "active")
}

/** Check if the primary modifier is present. */
export function isPrimary(modifiers: Modifier[]): boolean {
  return modifiers.some(m => m.type === "primary")
}

/** Recursively render child ComponentNodes into a container element. */
export function renderChildren(
  node: ComponentNode,
  container: HTMLElement,
  ctx: RenderContext,
  errors: ParseError[],
): void {
  for (const child of node.children) {
    const childCtx: RenderContext = {
      ...ctx,
      parentComponentType: node.type,
    }
    const result: RenderResult = renderComponent(child, childCtx)
    errors.push(...result.errors)
    container.appendChild(result.element)
  }
}

/** Validate and normalise an alert/variant string.
 *  Returns the variant and any warning error if the variant was unknown. */
export function resolveVariant(
  raw: string | undefined,
  blockPosition: number,
): { variant: string; error: ParseError | null } {
  const valid = new Set(["success", "warning", "danger", "neutral"])
  const v = (raw ?? "neutral").toLowerCase()
  if (valid.has(v)) return { variant: v, error: null }

  return {
    variant: "neutral",
    error: {
      severity: "warn",
      message: `Unknown variant "${raw}" — falling back to neutral`,
      line: 0,
      blockPosition,
    },
  }
}
