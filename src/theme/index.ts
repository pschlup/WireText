// Theme system (epic-006) — CSS custom properties and built-in themes
// See PROJECT.md §Theme Application

export { SAAS_LIGHT, SAAS_DARK, BUILT_IN_THEMES } from "./themes.js"
export { emitThemeCSS } from "./emitter.js"
export type { ThemeCSSResult } from "./emitter.js"
export { resolveTheme, resolveThemeById, parseThemeBody } from "./resolver.js"
