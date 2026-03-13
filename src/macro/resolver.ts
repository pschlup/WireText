// Nearest-previous resolution algorithm (task-060)
// Finds the nearest definition of type+id before a given block position.
import type { WireTextBlock, BlockType, Resolver } from "../types.js"

/** Create a Resolver from a list of parsed blocks.
 *  Implements nearest-previous resolution: for a given type+id,
 *  returns the block with the highest position < beforePosition. */
export function createResolver(blocks: WireTextBlock[]): Resolver {
  return {
    resolve(type: BlockType, id: string, beforePosition: number): WireTextBlock | null {
      // Filter by type+id with position < beforePosition, take last (nearest-previous)
      let best: WireTextBlock | null = null
      for (const block of blocks) {
        if (block.type === type && block.id === id && block.position < beforePosition) {
          if (best === null || block.position > best.position) {
            best = block
          }
        }
      }
      return best
    },
  }
}
