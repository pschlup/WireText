// Block parser (epic-002) — extract wiretext fences, split header/body, parse headers
// See PROJECT.md §Block Format and §Plugin Interface

export type { ParseResult } from "./block-parser.js"
export { parseDocument, parseBlock, extractBlocks } from "./block-parser.js"
