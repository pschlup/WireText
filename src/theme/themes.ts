// Built-in theme definitions (task-050, task-053)
// Values from PROJECT.md §Theme Application — saas-light token table
import type { ThemeTokens } from "../types.js"

/** Built-in saas-light theme (Phase 1 default) */
export const SAAS_LIGHT: ThemeTokens = {
  primary: "#2563EB",
  surface: "#FFFFFF",
  border:  "#E5E7EB",
  text:    "#111827",
  muted:   "#6B7280",
  danger:  "#DC2626",
  success: "#16A34A",
  radius:  "8px",
  font:    "Inter, sans-serif",
  size:    "14px",
}

/** Built-in saas-dark theme (Phase 2) */
export const SAAS_DARK: ThemeTokens = {
  primary: "#3B82F6",
  surface: "#111827",
  border:  "#374151",
  text:    "#F9FAFB",
  muted:   "#9CA3AF",
  danger:  "#EF4444",
  success: "#22C55E",
  radius:  "8px",
  font:    "Inter, sans-serif",
  size:    "14px",
}

/** All built-in themes indexed by ID */
export const BUILT_IN_THEMES: Record<string, ThemeTokens> = {
  "saas-light": SAAS_LIGHT,
  "saas-dark":  SAAS_DARK,
}
